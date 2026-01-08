const db = require('../database');
const ContextBuilder = require('../services/context_builder');

// --- HELPER: Audit Logging ---
const logAudit = (adminUserId, targetUserId, action, details) => {
    try {
        db.prepare(`
            INSERT INTO audit_logs (user_id, action, target, details)
            VALUES (?, ?, ?, ?)
        `).run(adminUserId, action, `User:${targetUserId}`, JSON.stringify(details));
    } catch (e) {
        console.error('Audit Log Failed:', e);
    }
};

// GET /api/admin/users
exports.getUsers = (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 12; // Card grid fits 12 nicely
        const search = req.query.q ? `%${req.query.q}%` : '%';
        const offset = (page - 1) * limit;

        // 1. Get Total Count
        const countResult = db.prepare(`
            SELECT COUNT(*) as count 
            FROM users u
            WHERE u.username LIKE ? OR u.email LIKE ?
        `).get(search, search);
        const total = countResult.count;

        // 2. Get Page Data
        const users = db.prepare(`
            SELECT u.id, u.username, u.email, u.status, r.name as role_name 
            FROM users u
            JOIN user_roles ur ON ur.user_id = u.id
            JOIN roles r ON r.id = ur.role_id
            WHERE u.username LIKE ? OR u.email LIKE ?
            LIMIT ? OFFSET ?
        `).all(search, search, limit, offset);

        res.json({
            users,
            total,
            page,
            totalPages: Math.ceil(total / limit)
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// GET /api/admin/users/:id
exports.getUserDetails = (req, res) => {
    try {
        const userId = req.params.id;
        const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
        if (!user) return res.status(404).json({ error: 'User not found' });

        // Get Role
        const role = db.prepare(`
            SELECT r.id, r.name 
            FROM roles r 
            JOIN user_roles ur ON ur.role_id = r.id 
            WHERE ur.user_id = ?
        `).get(userId);

        // Get Effective Context (What they see)
        const context = ContextBuilder.build(userId);

        // Get Raw Overrides (What we edited)
        const overrides = db.prepare(`
            SELECT c.slug, uc.action 
            FROM user_capabilities uc
            JOIN capabilities c ON c.id = uc.capability_id
            WHERE uc.user_id = ?
        `).all(userId);

        // Get Raw Scopes
        const scopes = db.prepare(`
            SELECT s.id, d.name as dimension, s.value, s.valid_until
            FROM access_scopes s
            JOIN dimensions d ON d.id = s.dimension_id
            WHERE s.entity_type = 'USER' AND s.entity_id = ?
        `).all(userId);

        res.json({
            user,
            role,
            overrides,
            scopes,
            computed_context: context
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
};

// GET /api/admin/capabilities
exports.getCapabilities = (req, res) => {
    try {
        const caps = db.prepare('SELECT * FROM capabilities').all();
        res.json(caps);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// POST /api/admin/users/:id/capabilities
exports.updateUserCapability = (req, res) => {
    try {
        const userId = req.params.id;
        const { slug, action } = req.body;
        const adminId = req.headers['x-user-id'] || 1;

        const cap = db.prepare('SELECT id FROM capabilities WHERE slug = ?').get(slug);
        if (!cap) return res.status(400).json({ error: 'Invalid capability slug' });

        db.prepare(`
            INSERT INTO user_capabilities (user_id, capability_id, action)
            VALUES (?, ?, ?)
            ON CONFLICT(user_id, capability_id) DO UPDATE SET action = excluded.action
        `).run(userId, cap.id, action);

        logAudit(adminId, userId, `CAPABILITY_${action}`, { slug });

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// DELETE /api/admin/users/:id/capabilities
exports.resetUserCapability = (req, res) => {
    try {
        const userId = req.params.id;
        const { slug } = req.body;
        const adminId = req.headers['x-user-id'] || 1;

        const cap = db.prepare('SELECT id FROM capabilities WHERE slug = ?').get(slug);
        if (!cap) return res.status(400).json({ error: 'Invalid capability slug' });

        db.prepare('DELETE FROM user_capabilities WHERE user_id = ? AND capability_id = ?').run(userId, cap.id);

        logAudit(adminId, userId, 'CAPABILITY_RESET', { slug });

        res.json({ success: true, message: 'Reset to inheritance' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
};

// POST /api/admin/users/:id/scopes
exports.addScope = (req, res) => {
    try {
        const userId = req.params.id;
        const { dimension, value } = req.body;
        const adminId = req.headers['x-user-id'] || 1;

        const dim = db.prepare('SELECT id FROM dimensions WHERE name = ?').get(dimension);
        if (!dim) return res.status(400).json({ error: 'Invalid dimension' });

        const info = db.prepare(`
            INSERT INTO access_scopes (entity_type, entity_id, dimension_id, value)
            VALUES ('USER', ?, ?, ?)
        `).run(userId, dim.id, value);

        logAudit(adminId, userId, 'SCOPE_ADD', { dimension, value, scope_id: info.lastInsertRowid });

        res.json({ success: true, id: info.lastInsertRowid });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// DELETE /api/admin/users/:id/scopes/:scopeId
exports.removeScope = (req, res) => {
    try {
        const { id, scopeId } = req.params;
        const adminId = req.headers['x-user-id'] || 1;

        db.prepare('DELETE FROM access_scopes WHERE id = ? AND entity_id = ?').run(scopeId, id);

        logAudit(adminId, id, 'SCOPE_REMOVE', { scope_id: scopeId });

        res.json({ success: true });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
};

// GET /api/admin/audit/:userId
exports.getAuditLogs = (req, res) => {
    try {
        const userId = req.params.userId;
        const logs = db.prepare(`
            SELECT * FROM audit_logs 
            WHERE target = ? 
            ORDER BY timestamp DESC LIMIT 50
        `).all(`User:${userId}`);
        res.json(logs);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// GET /api/admin/dimensions (For Dropdown)
exports.getDimensions = (req, res) => {
    try {
        const dims = db.prepare('SELECT name FROM dimensions').all();
        res.json(dims);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
