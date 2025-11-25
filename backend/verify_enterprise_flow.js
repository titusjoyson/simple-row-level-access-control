const Database = require('better-sqlite3');
const db = new Database(':memory:');

// --- 1. Setup Schema (Same as Production) ---
try {
    db.exec(`
    CREATE TABLE users (id INTEGER PRIMARY KEY, username TEXT, email TEXT);
    CREATE TABLE roles (id INTEGER PRIMARY KEY, name TEXT);
    CREATE TABLE user_roles (user_id INTEGER, role_id INTEGER);
    CREATE TABLE kpis (id INTEGER PRIMARY KEY, name TEXT, base_data TEXT);
    CREATE TABLE dimensions (id INTEGER PRIMARY KEY, name TEXT);
    CREATE TABLE kpi_dimensions (kpi_id INTEGER, dimension_id INTEGER);
    CREATE TABLE permissions (id INTEGER PRIMARY KEY, role_id INTEGER, kpi_id INTEGER, access_type TEXT);
    CREATE TABLE access_scopes (id INTEGER PRIMARY KEY, entity_type TEXT, entity_id INTEGER, dimension_id INTEGER, value TEXT, valid_until DATETIME);
    CREATE TABLE groups (id INTEGER PRIMARY KEY, name TEXT);
    CREATE TABLE user_groups (user_id INTEGER, group_id INTEGER);
  `);
} catch (err) { console.error(err); }

// --- 2. Configuration Data ---
console.log('--- Configuring System ---');

// Dimensions
const dimRegion = db.prepare("INSERT INTO dimensions (name) VALUES ('REGION')").run().lastInsertRowid;
const dimSite = db.prepare("INSERT INTO dimensions (name) VALUES ('SITE')").run().lastInsertRowid;

// KPIs
const kpiSales = db.prepare("INSERT INTO kpis (name, base_data) VALUES ('Sales KPI', '[]')").run().lastInsertRowid;
// Sales KPI is restricted by Region AND Site
db.prepare("INSERT INTO kpi_dimensions (kpi_id, dimension_id) VALUES (?, ?)").run(kpiSales, dimRegion);
db.prepare("INSERT INTO kpi_dimensions (kpi_id, dimension_id) VALUES (?, ?)").run(kpiSales, dimSite);

// App Roles
const roleGlobalViewer = db.prepare("INSERT INTO roles (name) VALUES ('GLOBAL_VIEWER')").run().lastInsertRowid;
const roleRegionalMgr = db.prepare("INSERT INTO roles (name) VALUES ('REGIONAL_MANAGER')").run().lastInsertRowid;

// Permissions
// Global Viewer -> Full Access
db.prepare("INSERT INTO permissions (role_id, kpi_id, access_type) VALUES (?, ?, 'FULL')").run(roleGlobalViewer, kpiSales);
// Regional Mgr -> Restricted Access
db.prepare("INSERT INTO permissions (role_id, kpi_id, access_type) VALUES (?, ?, 'RESTRICTED')").run(roleRegionalMgr, kpiSales);

// AD Group Mapping (Config)
const AD_GROUP_MAPPING = {
    'sg-finance-global': 'GLOBAL_VIEWER',
    'sg-sales-managers': 'REGIONAL_MANAGER'
};

// --- 3. Workflow Simulation Functions ---

// Mock JWT Token
const mockLogin = (username, email, adGroups) => {
    console.log(`\n[Login] User: ${username}, Groups: ${adGroups.join(', ')}`);

    // 1. Find or Create User (JIT Provisioning)
    let user = db.prepare("SELECT * FROM users WHERE username = ?").get(username);
    if (!user) {
        console.log(`  -> User not found. Provisioning new user...`);
        const info = db.prepare("INSERT INTO users (username, email) VALUES (?, ?)").run(username, email);
        user = { id: info.lastInsertRowid, username, email };
    }

    // 2. Sync Roles from AD Groups
    db.prepare("DELETE FROM user_roles WHERE user_id = ?").run(user.id); // Clear old roles

    adGroups.forEach(group => {
        const roleName = AD_GROUP_MAPPING[group];
        if (roleName) {
            const role = db.prepare("SELECT id FROM roles WHERE name = ?").get(roleName);
            if (role) {
                db.prepare("INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)").run(user.id, role.id);
                console.log(`  -> Mapped Group '${group}' to Role '${roleName}'`);
            }
        }
    });

    return user;
};

const smeAssignScope = (adminUser, targetUser, dimensionName, value) => {
    console.log(`\n[SME Action] Admin ${adminUser.username} assigning ${dimensionName}=${value} to ${targetUser.username}`);
    const dim = db.prepare("SELECT id FROM dimensions WHERE name = ?").get(dimensionName);
    db.prepare(`
    INSERT INTO access_scopes (entity_type, entity_id, dimension_id, value) 
    VALUES ('USER', ?, ?, ?)
  `).run(targetUser.id, dim.id, value);
};

const checkAccess = (user, kpiId) => {
    // Simplified Single Query Logic (Updated for Groups)
    const rows = db.prepare(`
    SELECT p.access_type, d.name as dim, s.value
    FROM permissions p
    JOIN user_roles ur ON p.role_id = ur.role_id
    LEFT JOIN kpi_dimensions kd ON p.kpi_id = kd.kpi_id
    LEFT JOIN dimensions d ON kd.dimension_id = d.id
    LEFT JOIN access_scopes s ON s.dimension_id = d.id 
      AND (
        (s.entity_type = 'USER' AND s.entity_id = ur.user_id)
        OR 
        (s.entity_type = 'GROUP' AND s.entity_id IN (
           SELECT group_id FROM user_groups WHERE user_id = ur.user_id
        ))
      )
    WHERE ur.user_id = ? AND p.kpi_id = ?
  `).all(user.id, kpiId);

    if (rows.length === 0) return 'NO ACCESS';
    if (rows.some(r => r.access_type === 'FULL')) return 'FULL ACCESS';

    // Aggregate Filters
    const filters = {};
    rows.forEach(r => {
        if (r.dim && r.value) {
            if (!filters[r.dim]) filters[r.dim] = [];
            if (!filters[r.dim].includes(r.value)) {
                filters[r.dim].push(r.value);
            }
        }
    });
    return { type: 'RESTRICTED', filters };
};

// --- 4. Run Use Cases ---

// Use Case 1: Single User Onboarding (Restricted)
const user1 = mockLogin('john_doe', 'john@corp.com', ['sg-sales-managers']);
// John is now a REGIONAL_MANAGER (Restricted).
// Initially, he has NO scopes.
console.log('Access (Pre-Scope):', JSON.stringify(checkAccess(user1, kpiSales)));

// SME assigns scopes
const admin = { id: 999, username: 'SuperAdmin' };
smeAssignScope(admin, user1, 'REGION', 'NA');
smeAssignScope(admin, user1, 'SITE', 'NY-HQ');

console.log('Access (Post-Scope):', JSON.stringify(checkAccess(user1, kpiSales)));


// Use Case 2: Multi-User Onboarding (Bulk)
console.log('\n[Bulk Onboarding] Importing 3 users...');
const newUsers = [
    { name: 'alice', groups: ['sg-finance-global'] }, // Full Access
    { name: 'bob', groups: ['sg-sales-managers'] },   // Restricted
    { name: 'charlie', groups: ['sg-sales-managers'] } // Restricted
];

newUsers.forEach(u => {
    const user = mockLogin(u.name, `${u.name}@corp.com`, u.groups);
    if (u.groups.includes('sg-sales-managers')) {
        // Auto-assign default scope for sales managers? Or wait for SME?
        // Let's say we auto-assign 'Region: TBD'
        smeAssignScope(admin, user, 'REGION', 'TBD');
    }
    console.log(`User ${u.name} Access:`, JSON.stringify(checkAccess(user, kpiSales)));
});

// Use Case 3: Group-Based Scope Assignment
console.log('\n[Group Scope] Testing Group-Based Scope Assignment...');
// Create a group 'Sales-NA'
const grpSalesNA = db.prepare("INSERT INTO groups (name) VALUES ('Sales-NA')").run().lastInsertRowid;
// Assign 'Region: NA' to this group
const dimRegionID = db.prepare("SELECT id FROM dimensions WHERE name = 'REGION'").get().id;
db.prepare("INSERT INTO access_scopes (entity_type, entity_id, dimension_id, value) VALUES ('GROUP', ?, ?, 'NA')").run(grpSalesNA, dimRegionID);

// Create user 'dave' and add to 'Sales-NA' group
const userDave = mockLogin('dave', 'dave@corp.com', ['sg-sales-managers']); // Restricted Role
db.prepare("INSERT INTO user_groups (user_id, group_id) VALUES (?, ?)").run(userDave.id, grpSalesNA);

console.log('Dave Access (via Group):', JSON.stringify(checkAccess(userDave, kpiSales)));
