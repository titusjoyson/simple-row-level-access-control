const db = require('../database');
const rbacService = require('../services/rbac.service');

const getKPIs = (req, res) => {
    const user = req.user;

    // Get all KPIs the user has access to via ANY role
    const kpis = db.prepare(`
    SELECT DISTINCT k.id, k.name, k.description 
    FROM kpis k
    JOIN permissions p ON k.id = p.kpi_id
    JOIN roles r ON p.role_id = r.id
    WHERE r.name IN (${user.roles.map(() => '?').join(',')})
  `).all(...user.roles);

    res.json(kpis);
};

const getKPIData = (req, res) => {
    const user = req.user;
    const kpiId = req.params.id;

    const access = rbacService.canAccessKPI(user, kpiId);
    if (!access) {
        return res.status(403).json({ error: 'Access Denied' });
    }

    const kpi = db.prepare('SELECT base_data FROM kpis WHERE id = ?').get(kpiId);
    let data = JSON.parse(kpi.base_data);
    let filters = null;

    if (access.type === 'RESTRICTED') {
        filters = rbacService.getRLSFilters(user, access.policy);

        if (filters) {
            // Apply RLS
            // Note: Data keys must match dimension names (lowercase)
            data = data.filter(row => filters.values.includes(row[filters.dimension]));
        } else {
            // Restricted but no scopes found -> Empty result
            data = [];
        }
    }

    // Audit Log
    db.prepare('INSERT INTO audit_logs (user_id, action, target, details) VALUES (?, ?, ?, ?)')
        .run(user.id, 'VIEW_KPI', `kpi:${kpiId}`, JSON.stringify({ access_type: access.type }));

    res.json({
        kpiId,
        accessType: access.type,
        filters,
        data
    });
};

module.exports = {
    getKPIs,
    getKPIData
};
