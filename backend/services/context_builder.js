const db = require('../database');

/**
 * Service to build the full User Context Object
 * Uses Optimized Batch Queries for both Permissions and Capabilities.
 */
class ContextBuilder {

    static build(userId) {
        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
        if (!user) throw new Error('User not found');

        // QUERY 1: FETCH DATA ACCESS (Permissions + Scopes + Dimensions) - "The Master Query"
        const accessRows = db.prepare(`
            SELECT 
                p.access_type,
                k.resource_key as kpi_key,
                d.name as dimension_name,
                s.value as scope_value,
                r.name as role_name
            FROM users u
            JOIN user_roles ur ON ur.user_id = u.id
            JOIN roles r ON r.id = ur.role_id
            -- Permissions
            LEFT JOIN permissions p ON p.role_id = r.id
            LEFT JOIN kpis k ON k.id = p.kpi_id
            -- Dimensions for the KPI
            LEFT JOIN kpi_dimensions kd ON kd.kpi_id = k.id
            LEFT JOIN dimensions d ON d.id = kd.dimension_id
            -- Scopes
            LEFT JOIN access_scopes s ON s.dimension_id = d.id 
                AND (
                    (s.entity_type = 'USER' AND s.entity_id = u.id)
                    OR 
                    (s.entity_type = 'GROUP' AND s.entity_id IN (SELECT group_id FROM user_groups WHERE user_id = u.id))
                )
            WHERE u.id = ?
            ORDER BY CASE WHEN p.access_type = 'FULL' THEN 1 ELSE 2 END
        `).all(userId);

        // QUERY 2: FETCH CAPABILITIES (Role + Group + User)
        // Source tags: ROLE, GROUP_GRANT, GROUP_REVOKE, USER_GRANT, USER_REVOKE
        const capRows = db.prepare(`
            SELECT DISTINCT c.slug, 'ROLE' as source
            FROM capabilities c
            JOIN role_capabilities rc ON rc.capability_id = c.id
            JOIN user_roles ur ON ur.role_id = rc.role_id
            WHERE ur.user_id = ?
            
            UNION ALL
            
            SELECT c.slug, 'GROUP_' || gc.action as source
            FROM capabilities c
            JOIN group_capabilities gc ON gc.capability_id = c.id
            JOIN user_groups ug ON ug.group_id = gc.group_id
            WHERE ug.user_id = ?
            
            UNION ALL
            
            SELECT c.slug, 'USER_' || uc.action as source
            FROM capabilities c
            JOIN user_capabilities uc ON uc.capability_id = c.id
            WHERE uc.user_id = ?
        `).all(userId, userId, userId);


        // --- PROCESSING DATA ACCESS ---
        const roles = new Set();
        const data_access = {};

        for (const row of accessRows) {
            roles.add(row.role_name);
            if (!row.kpi_key) continue;

            if (!data_access[row.kpi_key]) {
                data_access[row.kpi_key] = { type: row.access_type, filters: null };
            }

            const access = data_access[row.kpi_key];
            if (access.type === 'FULL') continue;

            if (row.access_type === 'FULL') {
                access.type = 'FULL';
                access.filters = null;
            } else if (row.access_type === 'RESTRICTED') {
                if (!access.filters) access.filters = {};
                if (row.dimension_name && row.scope_value) {
                    const dimKey = row.dimension_name.toLowerCase();
                    if (!access.filters[dimKey]) access.filters[dimKey] = [];
                    if (!access.filters[dimKey].includes(row.scope_value)) {
                        access.filters[dimKey].push(row.scope_value);
                    }
                }
            }
        }

        // --- PROCESSING CAPABILITIES ---
        const finalCapabilities = new Set();
        const capabilityMap = {}; // slug -> Set(sources)

        for (const row of capRows) {
            if (!capabilityMap[row.slug]) capabilityMap[row.slug] = new Set();
            capabilityMap[row.slug].add(row.source);
        }

        for (const slug in capabilityMap) {
            const sources = capabilityMap[slug];

            // 1. User Explicitly Bans -> No
            if (sources.has('USER_REVOKE')) continue;

            // 2. User Explicitly Grants -> Yes
            if (sources.has('USER_GRANT')) {
                finalCapabilities.add(slug);
                continue;
            }

            // 3. Group Explicitly Bans -> No
            if (sources.has('GROUP_REVOKE')) continue;

            // 4. Group Explicitly Grants -> Yes
            if (sources.has('GROUP_GRANT')) {
                finalCapabilities.add(slug);
                continue;
            }

            // 5. Role Grants -> Yes
            if (sources.has('ROLE')) {
                finalCapabilities.add(slug);
            }
        }

        return {
            user: { id: user.id, username: user.username },
            roles: Array.from(roles),
            capabilities: Array.from(finalCapabilities),
            data_access
        };
    }
}

module.exports = ContextBuilder;
