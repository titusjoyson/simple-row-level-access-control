const db = require('../database');

const requestAccess = (req, res) => {
    const user = req.user;
    const { dimensionName, value } = req.body; // Expect dimension name like 'REGION'

    // Resolve Dimension ID
    const dim = db.prepare('SELECT id FROM dimensions WHERE name = ?').get(dimensionName);
    if (!dim) return res.status(400).json({ error: 'Invalid Dimension' });

    // Check if already exists
    const existing = db.prepare('SELECT * FROM access_requests WHERE requester_id = ? AND dimension_id = ? AND value = ? AND status = ?')
        .get(user.id, dim.id, value, 'PENDING');

    if (existing) {
        return res.status(400).json({ error: 'Request already pending' });
    }

    const result = db.prepare('INSERT INTO access_requests (requester_id, dimension_id, value) VALUES (?, ?, ?)')
        .run(user.id, dim.id, value);

    res.json({ id: result.lastInsertRowid, status: 'PENDING' });
};

const getPendingRequests = (req, res) => {
    const user = req.user;

    // Check if user has MANAGER or ADMIN role
    const isApprover = user.roles.includes('MANAGER') || user.roles.includes('ADMIN');
    if (!isApprover) {
        return res.status(403).json({ error: 'Not authorized to approve' });
    }

    const requests = db.prepare(`
    SELECT ar.id, ar.value, ar.status, u.username, d.name as dimension
    FROM access_requests ar
    JOIN users u ON ar.requester_id = u.id
    JOIN dimensions d ON ar.dimension_id = d.id
    WHERE ar.status = 'PENDING'
  `).all();

    res.json(requests);
};

const approveRequest = (req, res) => {
    const user = req.user;
    const { requestId, action } = req.body; // action: 'APPROVED' or 'REJECTED'

    const isApprover = user.roles.includes('MANAGER') || user.roles.includes('ADMIN');
    if (!isApprover) {
        return res.status(403).json({ error: 'Not authorized to approve' });
    }

    const request = db.prepare('SELECT * FROM access_requests WHERE id = ?').get(requestId);
    if (!request) return res.status(404).json({ error: 'Request not found' });

    db.transaction(() => {
        db.prepare('UPDATE access_requests SET status = ? WHERE id = ?').run(action, requestId);

        if (action === 'APPROVED') {
            db.prepare('INSERT INTO access_scopes (entity_type, entity_id, dimension_id, value) VALUES (?, ?, ?, ?)')
                .run('USER', request.requester_id, request.dimension_id, request.value);
        }

        // Audit
        db.prepare('INSERT INTO audit_logs (user_id, action, target, details) VALUES (?, ?, ?, ?)')
            .run(user.id, 'APPROVE_ACCESS', `request:${requestId}`, JSON.stringify({ action, request }));
    })();

    res.json({ status: action });
};

module.exports = {
    requestAccess,
    getPendingRequests,
    approveRequest
};
