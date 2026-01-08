# Design Document: Enterprise RBAC with Dynamic Row-Level Security

## 1. Executive Summary
This document outlines the architecture for a scalable, enterprise-grade Access Control System designed for 16k+ users. The system manages access to KPIs (Key Performance Indicators) using a hybrid of Role-Based Access Control (RBAC) and dynamic Row-Level Security (RLS). Key features include hierarchical app-groups, policy-based data filtering, and a delegated approval workflow.

## 2. Core Concepts

### 2.1 The "Hybrid" Access Model
Standard RBAC is binary (Access/No Access). RLS adds a dimension of "Which data?".
We propose a model where **Roles** define *what* KPIs you can see, and **Policies** define *how much* of it you see.

- **Global Roles**: Have unrestricted access to mapped KPIs (e.g., `CxO`, `Admin`).
- **Scoped Roles**: Have access to mapped KPIs but subject to specific **Policies** (e.g., `Regional Manager` sees `Revenue` but filtered by `Region`).

### 2.2 Dynamic Row-Level Access
Row-level access is not static code; it is data-driven.
- **Dimensions**: The criteria for filtering (e.g., `Region`, `BusinessUnit`, `ProductLine`).
- **Scopes**: The specific values a user/group holds (e.g., `Region: [NA, EMEA]`).
- **Assignment**: Scopes are assigned to **App Groups** or **Users**.
- **Group Inheritance**: Users inherit all scopes assigned to the Groups they belong to.

### 2.3 The "Owner" Role (SME)
Beyond standard read access, we introduce the **Owner** concept:
- **Definition**: A user with `access_type='OWNER'` for a specific KPI.
- **Privileges**: 
    1.  Implicit `FULL` read access.
    2.  Delegated Administration rights (can assign scopes to others for that KPI).

### 2.4 Component-Level Access (PBAC)
To manage granular UI access (Screens, Tabs, Buttons), we introduce **Permission-Based Access Control (PBAC)**:
- **Capabilities**: Discrete flags (e.g., `view:revenue_dashboard`) that control UI visibility.
- **User Overrides**: The ability to explicity **Grant** or **Revoke** a capability for a specific user, overriding their Role.
- **Separation**: Capabilities control *Visibility* (Hide/Show), while Permissions control *Data Access* (Disable/Enable and Filtering).

### 2.5 Delegated Administration (The Approval Flow)
To manage 16k users without a bottleneck:
- **Elevated Roles**: Specific roles (e.g., `Data Steward`, `Unit Lead`) have the permission to `APPROVE_ACCESS` for specific Dimensions.
- **Workflow**: Users request access to a Scope (e.g., "I need APAC data"). The system routes this to the nearest Approver for that Dimension.

## 3. Data Model (Conceptual ERD)

### Identity & Structure
- **Users**: Standard identity.
- **AppGroups**: Grouping mechanism (e.g., "Finance Team A", "Sales East"). Can be nested.
- **Roles**: Functional roles (e.g., `Analyst`, `Manager`, `Executive`).

### Access Definitions
- **KPIs**: The resources (e.g., `Revenue`, `ChurnRate`, `EmployeeCount`).
- **RoleKPIAccess**: Mapping `Role` -> `KPI`.
    - *Attribute*: `PolicyID` (Nullable). If NULL, full access. If set, restricts data.

### Row-Level Security (RLS) Configuration
- **RLSPolicies**: Definitions of filters (e.g., "Filter by Region column").
- **Dimensions**: The actual data attributes (e.g., `Region`, `Department`).
- **AccessScopes**: Assignments of allowed values.
    - Linked to `User` OR `AppGroup`.
    - Linked to `Dimension`.
    - Values: `['US', 'CA']`.

### Approval System
- **AccessRequests**:
    - `Requester`: User
    - `TargetDimension`: Region
    - `RequestedValues`: ['APAC']
    - `Status`: Pending/Approved/Rejected
    - `ApproverRole`: The role required to approve this (dynamic routing).

## 4. Workflows

### 4.1 Access Evaluation Logic
1. **Capability Check (PBAC)**: Does user have `view:revenue_dashboard`?
    - If user is explicitly revoked -> DENY.
    - If user has capability (Role or Direct) -> ALLOW.
2. **Permission Check (RBAC)**: Does Role map to `Revenue`?
    - No -> Data is inaccessible (Disable UI).
    - Yes -> Check Access Type.
3. **Scope Resolution (RLS)**:
    - If `FULL` -> Return all data.
    - If `RESTRICTED` -> Apply `WHERE region IN (user_scopes)`.

### 4.2 Approval Workflow
1. **Request**: User requests access to "Region: EMEA".
2. **Routing**: System identifies that "Region" access is managed by `RegionalDirector` role.
3. **Notification**: Users with `RegionalDirector` role (and perhaps matching scope "EMEA" themselves) are notified.
4. **Action**: Approver clicks "Approve".
5. **Effect**: A new `AccessScope` record is created for the requester.

## 5. Technology Stack Recommendation
- **Frontend**: React (Vite) + Tailwind CSS (for a premium, responsive UI).
- **Backend**: Node.js (NestJS or Express) or Python (FastAPI).
- **Database**: PostgreSQL.
    - Use **Postgres RLS** features for maximum security and performance, OR
    - Use **Application-level Query Injection** (Knex/TypeORM) for flexibility.
    - *Recommendation for POC*: Application-level logic to demonstrate the complexity clearly.

## 6. Scalability & Security Considerations
- **Caching**: User permissions and scopes should be cached (Redis) to avoid DB hits on every KPI read.
- **Audit Logs**: Every `AccessRequest` and `Grant` must be logged immutably.
- **Time-Bound Access**: `AccessScopes` should have `ValidFrom` and `ValidUntil` columns for temporary access.

## 7. Proposed Improvements (Agent Ideas)
1. **"Break-Glass" Access**: Allow temporary full access for emergency ops, with high-alert auditing.
2. **Negative Scopes**: Explicit DENY scopes (e.g., "All Regions EXCEPT Russia").
3. **Peer Approval**: For low-risk scopes, allow peer approval instead of manager approval to reduce bottlenecks.
4. **Usage-Based Expiry**: If a user hasn't accessed the "APAC" region data in 90 days, auto-revoke the scope.
