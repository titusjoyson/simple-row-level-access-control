# Integration Guide: RBAC & RLS Module

This guide explains how to extract the Access Control logic from this POC and integrate it into your existing Express.js application.

## 1. Core Components
The system consists of three portable parts:
1.  **Database Schema**: The foundation for permissions.
2.  **RBAC Service**: The logic engine (`canAccessKPI`, `getRLSFilters`).
3.  **Middleware**: The enforcement point (`auth.middleware.js`).

## 2. Step-by-Step Integration

### Step 1: Apply Database Schema
Copy the schema definitions from `backend/database.js` (lines 25-110) to your database migration tool (Knex, Sequelize, TypeORM, or raw SQL).

**Key Tables:**
- `permissions`: Links Roles -> KPIs -> Access Type ('FULL'/'RESTRICTED'/'OWNER').
- `kpi_dimensions`: Links KPIs -> Dimensions (e.g., Region).
- `access_scopes`: Links Users -> Dimensions -> Values.

### Step 2: Copy the Service Layer
Copy `backend/services/rbac.service.js` to your project (e.g., `src/services/rbac.service.js`).

**Dependencies:**
- It currently uses `better-sqlite3`. You will need to replace the `db.prepare(...)` calls with your ORM or DB client (e.g., `knex('permissions').where(...)`).
- **Tip**: Keep the `permissionCache` logic! It's crucial for performance.

### Step 3: Implement Middleware
Adapt `backend/middleware/auth.middleware.js` to your authentication system.

```javascript
// Example Integration
const rbacService = require('./services/rbac.service');

const authMiddleware = async (req, res, next) => {
  // 1. Get User from your existing Auth (e.g., Passport, JWT)
  const user = req.user; 
  
  // 2. Load Roles (if not already in req.user)
  // const roles = await db.getRolesForUser(user.id);
  // req.user.roles = roles;

  next();
};
```

### Step 4: Protect Your Routes
Use the service in your controllers to enforce access.

```javascript
app.get('/api/reports/:reportId', async (req, res) => {
  const { reportId } = req.params;
  
  // 1. Check Access
  const access = await rbacService.getKPIAccess(req.user, reportId);
  
  if (!access) return res.status(403).send('Forbidden');

  // 2. Fetch Data
  let data = await reportService.getData(reportId);

  // 3. Apply RLS (if Restricted)
  if (access.type === 'RESTRICTED') {
    // access.filters = { region: ['NA'] }
    data = applyFilters(data, access.filters);
  }

  res.json(data);
});
```

## 3. Adapting to Your Stack
-   **PostgreSQL**: The SQL syntax used in this POC is largely compatible with Postgres.
-   **ORM**: If you use TypeORM or Prisma, rewrite the `rbac.service.js` queries using your ORM's syntax. The logic remains the same.
