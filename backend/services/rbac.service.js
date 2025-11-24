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

    // 1. Get all permissions for user's roles for this KPI
    const permissions = db.prepare(`
    SELECT p.*
    FROM permissions p
    JOIN roles r ON p.role_id = r.id
    WHERE p.kpi_id = ? AND r.name IN (${user.roles.map(() => '?').join(',')})
  `).all(kpiId, ...user.roles);

    let result = null;

    if (permissions.length > 0) {
        // 2. Check for ANY Full Access
        const fullAccess = permissions.find(p => p.access_type === 'FULL');
        if (fullAccess) {
            result = { type: 'FULL' };
        } else {
            // 3. If no FULL access, but has permissions, it must be RESTRICTED
            result = { type: 'RESTRICTED' };
        }
    }

    permissionCache.set(cacheKey, { value: result, timestamp: Date.now() });
    return result;
};

const getRLSFilters = (user, kpiId) => {
    // 1. Get Dimensions configured for this KPI
    const dimensions = db.prepare(`
    SELECT d.id, d.name
    FROM kpi_dimensions kd
    JOIN dimensions d ON kd.dimension_id = d.id
    WHERE kd.kpi_id = ?
  `).all(kpiId);

    if (dimensions.length === 0) return null; // No dimensions configured = No filtering possible (or block all? usually block all if restricted but no dims)

    const filters = {};

    // 2. For each dimension, fetch User's Scopes
    dimensions.forEach(dim => {
        const scopes = db.prepare(`
      SELECT s.value
      FROM access_scopes s
      WHERE s.entity_type = 'USER' 
        AND s.entity_id = ? 
        AND s.dimension_id = ?
        AND (s.valid_until IS NULL OR s.valid_until > CURRENT_TIMESTAMP)
    `).all(user.id, dim.id);

        filters[dim.name.toLowerCase()] = scopes.map(s => s.value);
    });

    return filters;
};

module.exports = {
    canAccessKPI,
    getRLSFilters
};
