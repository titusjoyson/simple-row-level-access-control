const ContextBuilder = require('../services/context_builder');

// Get the current user's full context
const getMyContext = (req, res) => {
    try {
        // In a real app, req.user would be populated by the Auth Middleware
        // For this POC, we'll accept a User ID from the header
        const userId = req.headers['x-user-id'] || 1;

        const context = ContextBuilder.build(userId);
        res.json(context);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    getMyContext
};
