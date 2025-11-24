const db = require('../database');

const authMiddleware = (req, res, next) => {
    const userId = req.headers['x-user-id'];

    if (!userId) {
        return res.status(401).json({ error: 'Unauthorized: Missing x-user-id header' });
    }

    // Fetch User
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    if (!user) {
        return res.status(401).json({ error: 'Unauthorized: User not found' });
    }

    // Fetch Roles
    const roles = db.prepare(`
    SELECT r.name 
    FROM roles r
    JOIN user_roles ur ON r.id = ur.role_id
    WHERE ur.user_id = ?
  `).all(userId);

    req.user = {
        ...user,
        roles: roles.map(r => r.name) // Array of role names
    };

    next();
};

module.exports = authMiddleware;
