const db = require('../database');

// GET /api/admin/groups
exports.getGroups = (req, res) => {
    try {
        const groups = db.prepare('SELECT * FROM groups').all();
        // Decorate with member count
        const result = groups.map(g => {
            const count = db.prepare('SELECT COUNT(*) as c FROM user_groups WHERE group_id = ?').get(g.id);
            return { ...g, memberCount: count.c };
        });
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// GET /api/admin/groups/:id
exports.getGroupDetail = (req, res) => {
    try {
        const { id } = req.params;
        const group = db.prepare('SELECT * FROM groups WHERE id = ?').get(id);
        if (!group) return res.status(404).json({ error: 'Group not found' });

        // Get Members
        const members = db.prepare(`
            SELECT u.id, u.username, u.email, u.status 
            FROM users u
            JOIN user_groups ug ON ug.user_id = u.id
            WHERE ug.group_id = ?
        `).all(id);

        // Get Scopes
        const scopes = db.prepare(`
            SELECT s.id, d.name as dimension, s.value
            FROM access_scopes s
            JOIN dimensions d ON d.id = s.dimension_id
            WHERE s.entity_type = 'GROUP' AND s.entity_id = ?
        `).all(id);

        // Get Capability Overrides (NEW)
        const overrides = db.prepare(`
            SELECT c.slug, gc.action
            FROM group_capabilities gc
            JOIN capabilities c ON c.id = gc.capability_id
            WHERE gc.group_id = ?
        `).all(id);

        res.json({ group, members, scopes, overrides });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// POST /api/admin/groups
exports.createGroup = (req, res) => {
    try {
        const { name, description } = req.body;
        const result = db.prepare('INSERT INTO groups (name, description) VALUES (?, ?)').run(name, description);
        res.json({ success: true, id: result.lastInsertRowid });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// POST /api/admin/groups/:id/members
exports.addMember = (req, res) => {
    try {
        const { id } = req.params; // Group ID
        const { userId } = req.body;

        db.prepare('INSERT INTO user_groups (user_id, group_id) VALUES (?, ?)').run(userId, id);
        res.json({ success: true });
    } catch (error) {
        if (error.message.includes('UNIQUE')) return res.json({ success: true });
        res.status(500).json({ error: error.message });
    }
};

// DELETE /api/admin/groups/:id/members/:userId
exports.removeMember = (req, res) => {
    try {
        const { id, userId } = req.params;
        db.prepare('DELETE FROM user_groups WHERE group_id = ? AND user_id = ?').run(id, userId);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// --- Scope Management ---

// POST /api/admin/groups/:id/scopes
exports.addScope = (req, res) => {
    try {
        const groupId = req.params.id;
        const { dimension, value } = req.body;

        const dim = db.prepare('SELECT id FROM dimensions WHERE name = ?').get(dimension);
        if (!dim) return res.status(400).json({ error: 'Invalid dimension' });

        const result = db.prepare(`
            INSERT INTO access_scopes (entity_type, entity_id, dimension_id, value)
            VALUES ('GROUP', ?, ?, ?)
        `).run(groupId, dim.id, value);

        res.json({ success: true, id: result.lastInsertRowid });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// DELETE /api/admin/groups/:id/scopes/:scopeId
exports.removeScope = (req, res) => {
    try {
        const { id, scopeId } = req.params;
        db.prepare('DELETE FROM access_scopes WHERE id = ? AND entity_type = "GROUP" AND entity_id = ?').run(scopeId, id);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// --- Capability Management (NEW) ---

// POST /api/admin/groups/:id/capabilities
exports.updateCapability = (req, res) => {
    try {
        const groupId = req.params.id;
        const { slug, action } = req.body;

        const cap = db.prepare('SELECT id FROM capabilities WHERE slug = ?').get(slug);
        if (!cap) return res.status(400).json({ error: 'Invalid capability slug' });

        db.prepare(`
            INSERT INTO group_capabilities (group_id, capability_id, action)
            VALUES (?, ?, ?)
            ON CONFLICT(group_id, capability_id) DO UPDATE SET action = excluded.action
        `).run(groupId, cap.id, action);

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// DELETE /api/admin/groups/:id/capabilities
exports.resetCapability = (req, res) => {
    try {
        const groupId = req.params.id;
        const { slug } = req.body;

        const cap = db.prepare('SELECT id FROM capabilities WHERE slug = ?').get(slug);
        if (!cap) return res.status(400).json({ error: 'Invalid capability slug' });

        db.prepare('DELETE FROM group_capabilities WHERE group_id = ? AND capability_id = ?').run(groupId, cap.id);

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
