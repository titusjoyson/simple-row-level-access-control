const Database = require('better-sqlite3');
const db = new Database(':memory:'); // In-memory DB for testing

// 1. Setup Schema
try {
    db.exec(`
    CREATE TABLE users (id INTEGER PRIMARY KEY, username TEXT);
    CREATE TABLE roles (id INTEGER PRIMARY KEY, name TEXT);
    CREATE TABLE user_roles (user_id INTEGER, role_id INTEGER);
    CREATE TABLE kpis (id INTEGER PRIMARY KEY, name TEXT, base_data TEXT);
    CREATE TABLE dimensions (id INTEGER PRIMARY KEY, name TEXT);
    CREATE TABLE kpi_dimensions (kpi_id INTEGER, dimension_id INTEGER);
    CREATE TABLE permissions (id INTEGER PRIMARY KEY, role_id INTEGER, kpi_id INTEGER, access_type TEXT);
    CREATE TABLE access_scopes (id INTEGER PRIMARY KEY, entity_type TEXT, entity_id INTEGER, dimension_id INTEGER, value TEXT, valid_until DATETIME);
  `);
} catch (err) {
    console.error('Schema Error:', err);
    process.exit(1);
}

// 2. Mock Data Setup
console.log('--- Setting up Test Data ---');

// Dimensions
const dimRegion = 1;
const dimProduct = 2;
db.prepare('INSERT INTO dimensions (id, name) VALUES (?, ?)').run(dimRegion, 'REGION');
db.prepare('INSERT INTO dimensions (id, name) VALUES (?, ?)').run(dimProduct, 'PRODUCT');

// KPIs
const data = JSON.stringify([
    { region: 'NA', product: 'A', val: 10 },
    { region: 'NA', product: 'B', val: 20 },
    { region: 'EU', product: 'A', val: 30 },
    { region: 'EU', product: 'B', val: 40 },
]);
const kpiId = 1;
db.prepare('INSERT INTO kpis (id, name, base_data) VALUES (?, ?, ?)').run(kpiId, 'Test KPI', data);

// KPI Config: Requires Region AND Product
db.prepare('INSERT INTO kpi_dimensions (kpi_id, dimension_id) VALUES (?, ?)').run(kpiId, dimRegion);
db.prepare('INSERT INTO kpi_dimensions (kpi_id, dimension_id) VALUES (?, ?)').run(kpiId, dimProduct);

// Roles
const rFull = 1; // Admin
const rRestricted = 2; // Analyst
db.prepare('INSERT INTO roles (id, name) VALUES (?, ?)').run(rFull, 'ADMIN');
db.prepare('INSERT INTO roles (id, name) VALUES (?, ?)').run(rRestricted, 'ANALYST');

// Permissions
db.prepare('INSERT INTO permissions (role_id, kpi_id, access_type) VALUES (?, ?, ?)').run(rFull, kpiId, 'FULL');
db.prepare('INSERT INTO permissions (role_id, kpi_id, access_type) VALUES (?, ?, ?)').run(rRestricted, kpiId, 'RESTRICTED');

// 3. Helper Functions (Mimicking Service Logic)
const checkAccess = (userId) => {
    // Get Roles
    const roles = db.prepare('SELECT role_id FROM user_roles WHERE user_id = ?').all(userId).map(r => r.role_id);

    // Get Permissions
    const perms = db.prepare(`SELECT access_type FROM permissions WHERE kpi_id = ? AND role_id IN (${roles.join(',')})`).all(kpiId);

    if (perms.some(p => p.access_type === 'FULL')) return { type: 'FULL' };
    if (perms.length > 0) return { type: 'RESTRICTED' };
    return null;
};

const getFilters = (userId) => {
    const dims = db.prepare('SELECT dimension_id, name FROM dimensions d JOIN kpi_dimensions kd ON d.id = kd.dimension_id WHERE kd.kpi_id = ?').all(kpiId);
    const filters = {};

    dims.forEach(d => {
        const scopes = db.prepare(`
      SELECT value FROM access_scopes 
      WHERE entity_id = ? AND dimension_id = ? 
      AND (valid_until IS NULL OR valid_until > datetime('now'))
    `).all(userId, d.dimension_id);
        filters[d.name.toLowerCase()] = scopes.map(s => s.value);
    });
    return filters;
};

const runScenario = (name, userId, expectedCount) => {
    console.log(`\nRunning Scenario: ${name}`);
    const access = checkAccess(userId);

    if (!access) {
        console.log(`Result: Access Denied (Expected: ${expectedCount === 0 ? '0 rows' : 'Error'})`);
        return;
    }

    let resultData = JSON.parse(data);
    if (access.type === 'RESTRICTED') {
        const filters = getFilters(userId);
        console.log('Applied Filters:', JSON.stringify(filters));

        resultData = resultData.filter(row => {
            return Object.keys(filters).every(dim => {
                return filters[dim].includes(row[dim]);
            });
        });
    } else {
        console.log('Access: FULL');
    }

    console.log(`Rows Returned: ${resultData.length}`);
    console.log(`Data: ${JSON.stringify(resultData)}`);

    if (resultData.length === expectedCount) console.log('✅ PASS');
    else console.log(`❌ FAIL (Expected ${expectedCount})`);
};

// 4. Define Scenarios

// Scenario A: The "Power User" (Full + Restricted)
// User 1 has both ADMIN and ANALYST. Should see ALL 4 rows.
db.prepare("INSERT INTO users (id, username) VALUES (1, 'PowerUser')").run();
db.prepare('INSERT INTO user_roles (user_id, role_id) VALUES (1, 1)').run(); // Admin
db.prepare('INSERT INTO user_roles (user_id, role_id) VALUES (1, 2)').run(); // Analyst
runScenario('Power User (Full + Restricted)', 1, 4);

// Scenario B: The "Expired Scope"
// User 2 is ANALYST. Has 'NA' (Expired) and 'EU' (Valid). Should see EU rows only.
db.prepare("INSERT INTO users (id, username) VALUES (2, 'ExpiredUser')").run();
db.prepare('INSERT INTO user_roles (user_id, role_id) VALUES (2, 2)').run(); // Analyst
// Scopes
db.prepare("INSERT INTO access_scopes (entity_id, dimension_id, value, valid_until) VALUES (2, 1, 'NA', datetime('now', '-1 day'))").run(); // Expired
db.prepare("INSERT INTO access_scopes (entity_id, dimension_id, value, valid_until) VALUES (2, 1, 'EU', NULL)").run(); // Valid
// Need Product scope too (since KPI needs both)
db.prepare("INSERT INTO access_scopes (entity_id, dimension_id, value) VALUES (2, 2, 'A')").run();
db.prepare("INSERT INTO access_scopes (entity_id, dimension_id, value) VALUES (2, 2, 'B')").run();
runScenario('Expired Scope (NA expired, EU valid)', 2, 2); // Should see EU-A, EU-B

// Scenario C: The "Intersection" (Missing one dimension)
// User 3 has Region 'NA' but NO Product scopes. Should see 0 rows.
db.prepare("INSERT INTO users (id, username) VALUES (3, 'MissingDim')").run();
db.prepare('INSERT INTO user_roles (user_id, role_id) VALUES (3, 2)').run();
db.prepare("INSERT INTO access_scopes (entity_id, dimension_id, value) VALUES (3, 1, 'NA')").run();
runScenario('Missing Dimension (Has Region, No Product)', 3, 0);

// Scenario D: The "Specific Intersection"
// User 4 has Region 'NA' and Product 'A'. Should see 1 row (NA-A).
db.prepare("INSERT INTO users (id, username) VALUES (4, 'Specific')").run();
db.prepare('INSERT INTO user_roles (user_id, role_id) VALUES (4, 2)').run();
db.prepare("INSERT INTO access_scopes (entity_id, dimension_id, value) VALUES (4, 1, 'NA')").run();
db.prepare("INSERT INTO access_scopes (entity_id, dimension_id, value) VALUES (4, 2, 'A')").run();
runScenario('Specific Intersection (NA + A)', 4, 1);
