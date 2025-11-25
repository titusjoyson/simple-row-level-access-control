# Implementation Plan: RBAC & Row-Level Security System

# Goal Description
Build a functional prototype of an Enterprise RBAC system with dynamic Row-Level Security (RLS). The system will demonstrate:
1.  **Role-Based Access**: Users see different KPIs based on their assigned roles.
2.  **Row-Level Security**: Data within those KPIs is filtered based on assigned Scopes (e.g., Region).
3.  **Delegated Approval**: A workflow for users to request access to specific scopes and for approvers to grant it.

## User Review Required
> [!IMPORTANT]
> **Database Choice**: For this prototype, we will use **SQLite** (via `better-sqlite3`) to ensure the application is self-contained and easy to run without setting up an external PostgreSQL server. The architecture will be compatible with Postgres for production.

## Proposed Changes

### Backend (Node.js/Express)
We will create a robust backend API to handle authentication (mocked), data retrieval, and permission evaluation.

#### [NEW] [server.js](file:///c:/Users/titus/Workspace/simple-row-ac/backend/server.js)
- Entry point.
- Setup Express app, middlewares (CORS, JSON).

### Database Schema (Enterprise Grade)
We will refactor the database to be fully normalized and support advanced features.

#### [MODIFY] [database.js](file:///c:/Users/titus/Workspace/simple-row-ac/backend/database.js)
- **Tables**:
    - `users` (id, username, email, status)
    - `roles` (id, name, description, parent_role_id)
    - `user_roles` (user_id, role_id)
#### [MODIFY] [database.js](file:///c:/Users/titus/Workspace/simple-row-ac/backend/database.js)
- **Tables**:
    - `users`, `roles`, `user_roles` (Unchanged)
    - `kpis` (Unchanged)
    - `dimensions` (Unchanged)
    - `permissions` (id, role_id, kpi_id, access_type ['FULL', 'RESTRICTED']) <--- CHANGED
    - `kpi_dimensions` (kpi_id, dimension_id) <--- NEW
    - `access_scopes` (Unchanged)
    - `audit_logs` (Unchanged)
    - `policies` (REMOVED - Logic is now implied by kpi_dimensions)
- **Logic**:
    - If `access_type` is 'RESTRICTED', the system looks up `kpi_dimensions` for that KPI.
    - Then it fetches the user's `access_scopes` for those dimensions.
    - It applies the intersection of those scopes.
- **Features**:
    - **Groups**: Support for `user_groups` and `group_roles`.
    - **Temporal Access**: Scopes have start/end dates.
    - **Audit**: Log every approval/rejection.

#### [NEW] [auth.middleware.js](file:///c:/Users/titus/Workspace/simple-row-ac/backend/middleware/auth.middleware.js)
- Mock authentication middleware (accepts a `x-user-id` header to simulate logged-in user).

#### [NEW] [rbac.service.js](file:///c:/Users/titus/Workspace/simple-row-ac/backend/services/rbac.service.js)
- Core logic for `canAccessKPI(user, kpi)`.
- Core logic for `getRLSFilters(user, kpi)`.

#### [NEW] [kpi.controller.js](file:///c:/Users/titus/Workspace/simple-row-ac/backend/controllers/kpi.controller.js)
- Endpoints: `GET /api/kpis` (returns list of KPIs user can see).
- Endpoints: `GET /api/kpis/:id/data` (returns data filtered by RLS).

#### [NEW] [access.controller.js](file:///c:/Users/titus/Workspace/simple-row-ac/backend/controllers/access.controller.js)
- Endpoints: `POST /api/access/request` (request new scope).
- UI for users to request access.
- UI for approvers to review requests.

## Verification Plan

### Automated Tests
- We will write a simple test script `test_rbac.js` to verify the logic:
    - User A (Role X) can see KPI 1.
    - User B (Role Y) cannot see KPI 1.
    - User A (Scope 'US') only sees 'US' rows in KPI 1.

### Manual Verification
1.  **Persona Switching**: We will use the UI to switch between "Analyst" (Restricted) and "Manager" (Approver).
2.  **Request Flow**:
    - Log in as Analyst.
    - Attempt to view "EMEA" data (should be empty/blocked).
    - Request "EMEA" access.
    - Log in as Manager.
    - Approve request.
    - Log in as Analyst.
    - Verify "EMEA" data is now visible.
