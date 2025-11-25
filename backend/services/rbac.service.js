const db = require('../database');

// Simple In-Memory Cache
const permissionCache = new Map();
const CACHE_TTL_MS = 60 * 1000;

// --- Legacy Functions (Kept for backward compatibility) ---

const canAccessKPI = (user, kpiId) => {
    const cacheKey = `perm:${user.id}:${kpiId}`;
    const cached = permissionCache.get(cacheKey);

    if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
        return cached.value;
    }

    const permissions = db.prepare(`
    SELECT p.*
    FROM permissions p
    JOIN roles r ON p.role_id = r.id
    WHERE p.kpi_id = ? AND r.name IN (${user.roles.map(() => '?').join(',')})
  `).all(kpiId, ...user.roles);

    let result = null;

    if (permissions.length > 0) {
        const fullAccess = permissions.find(p => p.access_type === 'FULL');
        if (fullAccess) {
            result = { type: 'FULL' };
        } else {
            result = { type: 'RESTRICTED' };
        }
    }

    permissionCache.set(cacheKey, { value: result, timestamp: Date.now() });
    return result;
};

const getRLSFilters = (user, kpiId) => {
    const dimensions = db.prepare(`
    SELECT d.id, d.name
    FROM kpi_dimensions kd
    JOIN dimensions d ON kd.dimension_id = d.id
    WHERE kd.kpi_id = ?
  `).all(kpiId);

    if (dimensions.length === 0) return null;

    const filters = {};

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

// --- New Unified Function ---

const getKPIAccess = (user, kpiId) => {
    const cacheKey = `access:${user.id}:${kpiId}`;
    const cached = permissionCache.get(cacheKey);

    if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
        return cached.value;
    }

    const rows = db.prepare(`
    SELECT 
      p.access_type,
      d.name as dimension,
      s.value as scope_value
    FROM permissions p
    JOIN user_roles ur ON p.role_id = ur.role_id
    LEFT JOIN kpi_dimensions kd ON p.kpi_id = kd.kpi_id
    LEFT JOIN dimensions d ON kd.dimension_id = d.id
    LEFT JOIN access_scopes s ON s.dimension_id = d.id 
      AND (
        (s.entity_type = 'USER' AND s.entity_id = ur.user_id)
        OR 
        (s.entity_type = 'GROUP' AND s.entity_id IN (
           SELECT group_id FROM user_groups WHERE user_id = ur.user_id
        ))
      )
      AND (s.valid_until IS NULL OR s.valid_until > datetime('now'))
    WHERE ur.user_id = ? AND p.kpi_id = ?
  `).all(user.id, kpiId);
    if (rows.length === 0) return null;

    // Check for OWNER or FULL access
    const ownerPermission = rows.find(r => r.access_type === 'OWNER');
    if (ownerPermission) return { type: 'OWNER', filters: null };

    const fullPermission = rows.find(r => r.access_type === 'FULL');
    if (fullPermission) return { type: 'FULL', filters: null };

    // Aggregate Filters for RESTRICTED access
    const filters = {};
    rows.forEach(row => {
        if (row.dimension && row.scope_value) {
            const dimKey = row.dimension.toLowerCase();
            if (!filters[dimKey]) filters[dimKey] = [];
            if (!filters[dimKey].includes(row.scope_value)) {
                filters[dimKey].push(row.scope_value);
            }
        }
    });

    const result = { type: 'RESTRICTED', filters };
    permissionCache.set(cacheKey, { value: result, timestamp: Date.now() });
    return result;
};

module.exports = {
    canAccessKPI,
    getRLSFilters,
    getKPIAccess
};
