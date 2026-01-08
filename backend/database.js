const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'rbac_system.db');
const db = new Database(dbPath);

// Initialize Schema
const initSchema = () => {
  // Drop existing tables for clean slate (Prototype only)
  db.exec(`
    DROP TABLE IF EXISTS audit_logs;
    DROP TABLE IF EXISTS access_requests;
    DROP TABLE IF EXISTS access_scopes;
    DROP TABLE IF EXISTS permissions;
    DROP TABLE IF EXISTS kpi_dimensions;
    DROP TABLE IF EXISTS user_groups;
    DROP TABLE IF EXISTS groups;
    DROP TABLE IF EXISTS user_roles;
    DROP TABLE IF EXISTS user_capabilities;
    DROP TABLE IF EXISTS role_capabilities;
    DROP TABLE IF EXISTS capabilities;     
    DROP TABLE IF EXISTS policies;
    DROP TABLE IF EXISTS dimensions;
    DROP TABLE IF EXISTS kpis;
    DROP TABLE IF EXISTS roles;
    DROP TABLE IF EXISTS users;
  `);

  db.exec(`
    -- Core Identity
    CREATE TABLE users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT,
      status TEXT DEFAULT 'ACTIVE'
    );

    CREATE TABLE roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      description TEXT,
      parent_role_id INTEGER, 
      FOREIGN KEY(parent_role_id) REFERENCES roles(id)
    );

    CREATE TABLE user_roles (
      user_id INTEGER,
      role_id INTEGER,
      PRIMARY KEY (user_id, role_id),
      FOREIGN KEY(user_id) REFERENCES users(id),
      FOREIGN KEY(role_id) REFERENCES roles(id)
    );

    -- Functional Access (PBAC) -- NEW
    CREATE TABLE capabilities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT UNIQUE NOT NULL,   -- e.g., 'view:revenue_dashboard'
      description TEXT
    );

    CREATE TABLE role_capabilities (
      role_id INTEGER,
      capability_id INTEGER,
      PRIMARY KEY (role_id, capability_id),
      FOREIGN KEY(role_id) REFERENCES roles(id),
      FOREIGN KEY(capability_id) REFERENCES capabilities(id)
    );

    CREATE TABLE user_capabilities (
      user_id INTEGER,
      capability_id INTEGER,
      action TEXT CHECK(action IN ('GRANT', 'REVOKE')), -- Explicit override
      PRIMARY KEY (user_id, capability_id),
      FOREIGN KEY(user_id) REFERENCES users(id),
      FOREIGN KEY(capability_id) REFERENCES capabilities(id)
    );

    -- Grouping
    CREATE TABLE groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      description TEXT
    );

    CREATE TABLE user_groups (
      user_id INTEGER,
      group_id INTEGER,
      PRIMARY KEY (user_id, group_id),
      FOREIGN KEY(user_id) REFERENCES users(id),
      FOREIGN KEY(group_id) REFERENCES groups(id)
    );

    -- Resources & Metadata
    CREATE TABLE kpis (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      resource_key TEXT UNIQUE, -- e.g., 'kpi:revenue'
      base_data TEXT -- JSON
    );

    CREATE TABLE dimensions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL, -- e.g., 'REGION'
      description TEXT
    );

    -- KPI Configuration
    CREATE TABLE kpi_dimensions (
      kpi_id INTEGER,
      dimension_id INTEGER,
      PRIMARY KEY (kpi_id, dimension_id),
      FOREIGN KEY(kpi_id) REFERENCES kpis(id),
      FOREIGN KEY(dimension_id) REFERENCES dimensions(id)
    );

    -- Access Control (RBAC + ABAC/RLS)
    CREATE TABLE permissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      role_id INTEGER,
      kpi_id INTEGER,
      access_type TEXT CHECK(access_type IN ('FULL', 'RESTRICTED', 'OWNER')),
      FOREIGN KEY(role_id) REFERENCES roles(id),
      FOREIGN KEY(kpi_id) REFERENCES kpis(id)
    );

    CREATE TABLE access_scopes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entity_type TEXT CHECK(entity_type IN ('USER', 'GROUP')),
      entity_id INTEGER,
      dimension_id INTEGER,
      value TEXT NOT NULL, 
      valid_from DATETIME DEFAULT CURRENT_TIMESTAMP,
      valid_until DATETIME, 
      FOREIGN KEY(dimension_id) REFERENCES dimensions(id)
    );

    -- Workflow & Audit
    CREATE TABLE access_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      requester_id INTEGER,
      dimension_id INTEGER,
      value TEXT,
      status TEXT DEFAULT 'PENDING',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(requester_id) REFERENCES users(id),
      FOREIGN KEY(dimension_id) REFERENCES dimensions(id)
    );

    CREATE TABLE audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      action TEXT NOT NULL,
      target TEXT, 
      details TEXT, 
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- PERFOMANCE INDEXES
    -- 1. Critical for ContextBuilder (Scope Lookup)
    -- Without this, finding a user's scopes is a full table scan.
    CREATE INDEX idx_access_scopes_entity ON access_scopes(entity_type, entity_id);
    
    -- 2. Critical for ContextBuilder (Permission Lookup)
    -- Foreign keys are not indexed by default in SQLite.
    CREATE INDEX idx_permissions_role ON permissions(role_id);
    CREATE INDEX idx_permissions_kpi ON permissions(kpi_id); 

    -- 3. Optimization for Hierarchies
    CREATE INDEX idx_roles_parent ON roles(parent_role_id);
  `);
};

// Seed Data
const seedData = () => {
  const userCount = db.prepare('SELECT count(*) as count FROM users').get();
  if (userCount.count > 0) return;

  console.log('Seeding Enterprise Data (Refactored with Indexes)...');

  // 1. Dimensions
  const insertDim = db.prepare('INSERT INTO dimensions (name, description) VALUES (?, ?)');
  const dimRegion = insertDim.run('REGION', 'Geographic Region').lastInsertRowid;

  // 2. Roles
  const insertRole = db.prepare('INSERT INTO roles (name, description) VALUES (?, ?)');
  const roleAdmin = insertRole.run('ADMIN', 'System Administrator').lastInsertRowid;
  const roleExec = insertRole.run('EXECUTIVE', 'C-Level Executive').lastInsertRowid;
  const roleMgr = insertRole.run('MANAGER', 'Regional Manager').lastInsertRowid;
  const roleAnalyst = insertRole.run('ANALYST', 'Data Analyst').lastInsertRowid;

  // 3. Users
  const insertUser = db.prepare('INSERT INTO users (username, email) VALUES (?, ?)');
  const uAlice = insertUser.run('alice_admin', 'alice@corp.com').lastInsertRowid;
  const uBob = insertUser.run('bob_manager', 'bob@corp.com').lastInsertRowid;
  const uCharlie = insertUser.run('charlie_analyst', 'charlie@corp.com').lastInsertRowid;
  const uDave = insertUser.run('dave_exec', 'dave@corp.com').lastInsertRowid;

  // 4. User Roles
  const assignRole = db.prepare('INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)');
  assignRole.run(uAlice, roleAdmin);
  assignRole.run(uBob, roleMgr);
  assignRole.run(uCharlie, roleAnalyst);
  assignRole.run(uDave, roleExec);

  // 5. Capabilities -- NEW
  const insertCap = db.prepare('INSERT INTO capabilities (slug, description) VALUES (?, ?)');
  const capViewRev = insertCap.run('view:revenue_dashboard', 'View Revenue Dashboard').lastInsertRowid;
  const capViewChurn = insertCap.run('view:churn_dashboard', 'View Churn Dashboard').lastInsertRowid;
  const capExport = insertCap.run('click:export_btn', 'Export Data Button').lastInsertRowid;
  const capAdmin = insertCap.run('view:admin_settings', 'Admin Settings').lastInsertRowid;

  // 6. Role Capabilities -- NEW
  const assignRoleCap = db.prepare('INSERT INTO role_capabilities (role_id, capability_id) VALUES (?, ?)');

  // Admin: Everything
  assignRoleCap.run(roleAdmin, capViewRev);
  assignRoleCap.run(roleAdmin, capViewChurn);
  assignRoleCap.run(roleAdmin, capExport);
  assignRoleCap.run(roleAdmin, capAdmin);

  // Manager: Everything except Admin
  assignRoleCap.run(roleMgr, capViewRev);
  assignRoleCap.run(roleMgr, capViewChurn);
  assignRoleCap.run(roleMgr, capExport);

  // Analyst: Only Revenue
  assignRoleCap.run(roleAnalyst, capViewRev);

  // 7. KPIs
  const insertKPI = db.prepare('INSERT INTO kpis (name, description, resource_key, base_data) VALUES (?, ?, ?, ?)');
  const revenueData = JSON.stringify([
    { region: 'NA', amount: 1000 },
    { region: 'EMEA', amount: 800 },
    { region: 'APAC', amount: 1200 }
  ]);
  const kpiRev = insertKPI.run('Global Revenue', 'Total revenue', 'kpi:revenue', revenueData).lastInsertRowid;

  const churnData = JSON.stringify([
    { region: 'NA', rate: 0.05 },
    { region: 'EMEA', rate: 0.07 },
    { region: 'APAC', rate: 0.04 }
  ]);
  const kpiChurn = insertKPI.run('Churn Rate', 'Customer churn', 'kpi:churn', churnData).lastInsertRowid;

  // 8. KPI Dimensions (Configuration)
  const configKpiDim = db.prepare('INSERT INTO kpi_dimensions (kpi_id, dimension_id) VALUES (?, ?)');
  // Both KPIs support Region filtering
  configKpiDim.run(kpiRev, dimRegion);
  configKpiDim.run(kpiChurn, dimRegion);

  // 9. Permissions
  const grant = db.prepare('INSERT INTO permissions (role_id, kpi_id, access_type) VALUES (?, ?, ?)');
  // Admin & Exec: Full Access
  grant.run(roleAdmin, kpiRev, 'FULL');
  grant.run(roleAdmin, kpiChurn, 'FULL');
  grant.run(roleExec, kpiRev, 'FULL');
  grant.run(roleExec, kpiChurn, 'FULL');

  // Manager: Revenue (Full), Churn (Restricted)
  grant.run(roleMgr, kpiRev, 'FULL');
  grant.run(roleMgr, kpiChurn, 'RESTRICTED');

  // Analyst: Revenue (Restricted)
  grant.run(roleAnalyst, kpiRev, 'RESTRICTED');

  // 10. Access Scopes
  const addScope = db.prepare('INSERT INTO access_scopes (entity_type, entity_id, dimension_id, value) VALUES (?, ?, ?, ?)');
  // Bob (Manager) -> EMEA
  addScope.run('USER', uBob, dimRegion, 'EMEA');
  // Charlie (Analyst) -> NA
  addScope.run('USER', uCharlie, dimRegion, 'NA');
};

initSchema();
seedData();

module.exports = db;
