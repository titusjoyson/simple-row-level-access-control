const db = require('./database');

function printTable(tableName) {
    try {
        const rows = db.prepare(`SELECT * FROM ${tableName}`).all();
        console.log(`\n### Table: ${tableName}`);
        if (rows.length === 0) {
            console.log("(Empty)");
            return;
        }
        console.log(JSON.stringify(rows, null, 2));
    } catch (e) {
        console.log(`Error reading ${tableName}: ${e.message}`);
    }
}

const tables = [
    'users',
    'roles',
    'user_roles',
    'kpis',
    'dimensions',
    'kpi_dimensions',
    'permissions',
    'access_scopes'
];

console.log("=== CURRENT DATABASE STATE ===");
tables.forEach(printTable);
