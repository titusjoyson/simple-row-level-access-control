const db = require('./database');

try {
    console.log('Running Migration: Add group_capabilities table...');
    db.exec(`
        CREATE TABLE IF NOT EXISTS group_capabilities (
            group_id INTEGER,
            capability_id INTEGER,
            action TEXT CHECK(action IN ('GRANT', 'REVOKE')),
            PRIMARY KEY (group_id, capability_id),
            FOREIGN KEY(group_id) REFERENCES groups(id),
            FOREIGN KEY(capability_id) REFERENCES capabilities(id)
        );
    `);
    console.log('Migration successful.');
} catch (error) {
    console.error('Migration failed:', error.message);
}
