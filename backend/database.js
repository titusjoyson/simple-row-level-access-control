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
    DROP TABLE IF EXISTS user_roles;
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
      parent_role_id INTEGER, -- For hierarchy (e.g., Senior Manager > Manager)
      FOREIGN KEY(parent_role_id) REFERENCES roles(id)
    );

    CREATE TABLE user_roles (
      user_id INTEGER,
      role_id INTEGER,
      PRIMARY KEY (user_id, role_id),
      FOREIGN KEY(user_id) REFERENCES users(id),
      FOREIGN KEY(role_id) REFERENCES roles(id)
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

    CREATE TABLE policies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL, -- e.g., 'REGION_MATCH'
      logic_json TEXT -- e.g., { "operator": "IN", "dimension_id": 1 }
    );

    -- Access Control (RBAC + ABAC/RLS)
    CREATE TABLE permissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      role_id INTEGER,
      kpi_id INTEGER,
      policy_id INTEGER, -- Nullable. If NULL, full access.
      FOREIGN KEY(role_id) REFERENCES roles(id),
      FOREIGN KEY(kpi_id) REFERENCES kpis(id),
      FOREIGN KEY(policy_id) REFERENCES policies(id)
    );

    CREATE TABLE access_scopes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entity_type TEXT CHECK(entity_type IN ('USER', 'GROUP')),
      entity_id INTEGER,
      dimension_id INTEGER,
      value TEXT NOT NULL, -- e.g., 'APAC'
      valid_from DATETIME DEFAULT CURRENT_TIMESTAMP,
      valid_until DATETIME, -- Nullable for permanent
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
      action TEXT NOT NULL, -- e.g., 'LOGIN', 'VIEW_KPI', 'APPROVE_ACCESS'
      target TEXT, -- e.g., 'kpi:revenue'
      details TEXT, -- JSON
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
};

// Seed Data
const seedData = () => {
  const userCount = db.prepare('SELECT count(*) as count FROM users').get();
  if (userCount.count > 0) return;

  console.log('Seeding Enterprise Data...');

  // 1. Dimensions
  const insertDim = db.prepare('INSERT INTO dimensions (name, description) VALUES (?, ?)');
  const dimRegion = insertDim.run('REGION', 'Geographic Region').lastInsertRowid;

  // 2. Policies
  const insertPolicy = db.prepare('INSERT INTO policies (name, logic_json) VALUES (?, ?)');
  const policyRegion = insertPolicy.run('REGION_MATCH', JSON.stringify({ operator: 'IN', dimension_id: dimRegion })).lastInsertRowid;

  // 3. Roles
  const insertRole = db.prepare('INSERT INTO roles (name, description) VALUES (?, ?)');
  const roleAdmin = insertRole.run('ADMIN', 'System Administrator').lastInsertRowid;
  const roleExec = insertRole.run('EXECUTIVE', 'C-Level Executive').lastInsertRowid;
  const roleMgr = insertRole.run('MANAGER', 'Regional Manager').lastInsertRowid;
  const roleAnalyst = insertRole.run('ANALYST', 'Data Analyst').lastInsertRowid;

  // 4. Users
  const insertUser = db.prepare('INSERT INTO users (username, email) VALUES (?, ?)');
  const uAlice = insertUser.run('alice_admin', 'alice@corp.com').lastInsertRowid;
  const uBob = insertUser.run('bob_manager', 'bob@corp.com').lastInsertRowid;
  const uCharlie = insertUser.run('charlie_analyst', 'charlie@corp.com').lastInsertRowid;
  const uDave = insertUser.run('dave_exec', 'dave@corp.com').lastInsertRowid;

  // 5. User Roles
  const assignRole = db.prepare('INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)');
  assignRole.run(uAlice, roleAdmin);
  assignRole.run(uBob, roleMgr);
  assignRole.run(uCharlie, roleAnalyst);
  assignRole.run(uDave, roleExec);

  // 6. KPIs
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

  // 7. Permissions
  const grant = db.prepare('INSERT INTO permissions (role_id, kpi_id, policy_id) VALUES (?, ?, ?)');
  // Admin & Exec: Full Access (policy_id = NULL)
  grant.run(roleAdmin, kpiRev, null);
  grant.run(roleAdmin, kpiChurn, null);
  grant.run(roleExec, kpiRev, null);
  grant.run(roleExec, kpiChurn, null);

  // Manager: Revenue (Full), Churn (Filtered)
  grant.run(roleMgr, kpiRev, null);
  grant.run(roleMgr, kpiChurn, policyRegion);

  // Analyst: Revenue (Filtered)
  grant.run(roleAnalyst, kpiRev, policyRegion);

  // 8. Access Scopes
  const addScope = db.prepare('INSERT INTO access_scopes (entity_type, entity_id, dimension_id, value) VALUES (?, ?, ?, ?)');
  // Bob (Manager) -> EMEA
  addScope.run('USER', uBob, dimRegion, 'EMEA');
  // Charlie (Analyst) -> NA
  addScope.run('USER', uCharlie, dimRegion, 'NA');
};

initSchema();
seedData();

module.exports = db;
