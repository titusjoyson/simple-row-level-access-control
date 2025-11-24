const db = require('../database');

// Simple In-Memory Cache (In production, use Redis)
const permissionCache = new Map();
const CACHE_TTL_MS = 60 * 1000; // 1 minute

const canAccessKPI = (user, kpiId) => {
    const cacheKey = `perm:${user.id}:${kpiId}`;
    const cached = permissionCache.get(cacheKey);

    if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
        return cached.value;
    }

    // Check if ANY of the user's roles grant access
    // We prioritize "Full Access" (policy_id IS NULL) over "Restricted Access"

    // 1. Get all permissions for user's roles for this KPI
    const permissions = db.prepare(`
    SELECT p.*, pol.name as policy_name, pol.logic_json
    FROM permissions p
    JOIN roles r ON p.role_id = r.id
    LEFT JOIN policies pol ON p.policy_id = pol.id
    WHERE p.kpi_id = ? AND r.name IN (${user.roles.map(() => '?').join(',')})
  `).all(kpiId, ...user.roles);

    let result = null;

    if (permissions.length > 0) {
        // 2. Check for Full Access (policy_id is null)
        const fullAccess = permissions.find(p => p.policy_id === null);
        if (fullAccess) {
            result = { type: 'FULL', policy: null };
        } else {
            // 3. Otherwise, return the first restricted policy
            const restriction = permissions[0];
            result = {
                type: 'RESTRICTED',
                policy: {
                    id: restriction.policy_id,
                    name: restriction.policy_name,
                    logic: JSON.parse(restriction.logic_json)
                }
            };
        }
    }

    permissionCache.set(cacheKey, { value: result, timestamp: Date.now() });
    return result;
};

const getRLSFilters = (user, policy) => {
    if (!policy || !policy.logic) return null;

    const logic = policy.logic;

    if (logic.operator === 'IN') {
        // Fetch scopes for the user AND their groups
        const scopes = db.prepare(`
      SELECT s.value, d.name as dimension_name
      FROM access_scopes s
      JOIN dimensions d ON s.dimension_id = d.id
      WHERE s.entity_type = 'USER' 
        AND s.entity_id = ? 
        AND s.dimension_id = ?
        AND (s.valid_until IS NULL OR s.valid_until > CURRENT_TIMESTAMP)
    `).all(user.id, logic.dimension_id);

        if (scopes.length === 0) return { dimension: 'unknown', values: [] };

        return {
            dimension: scopes[0].dimension_name.toLowerCase(), // 'region'
            values: scopes.map(s => s.value)
        };
    }

    return null;
};

module.exports = {
    canAccessKPI,
    getRLSFilters
};
