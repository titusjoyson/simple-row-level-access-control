const ContextBuilder = require('./services/context_builder');
const db = require('./database');

// Ensure DB is initialized
require('./database');

console.log("\n=== VERIFYING USER CONTEXT GENERATION ===\n");

function printContext(username) {
    const user = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
    if (!user) return console.log(`User ${username} not found!`);

    console.log(`--- Context for ${username} ---`);
    const context = ContextBuilder.build(user.id);
    console.log(JSON.stringify(context, null, 2));
    console.log("\n");
}

// 1. Check Analyst (Should see Revenue Link, but Restricted Data)
printContext('charlie_analyst');

// 2. Check Manager (Should see Churn Dashboard Data)
printContext('bob_manager');

console.log("=== VERIFICATION COMPLETE ===");
