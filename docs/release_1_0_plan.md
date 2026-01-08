# Admin Dashboard Release 1.0 Plan

To consider this "First Release" ready, we need to close the loop on Data Access (RLS) and Auditability.

## 1. RLS Scope Management (The "Missing Tab")
Currently, the "Data Scopes" tab is a placeholder.
**Requirement**: Admin can assign a specific Region (or other dimension) to a user.
- **Backend**:
    - `POST /api/admin/users/:id/scopes`: Add `{ dimension: 'REGION', value: 'EMEA' }`.
    - `DELETE /api/admin/users/:id/scopes/:scopeId`: Remove it.
- **Frontend**:
    - `ScopeManager` component.
    - Dropdown to select Dimension (fetch from DB).
    - Text input (or dropdown) for Value.
    - List of current scopes with "Delete" button.

## 2. Audit Logging (Enterprise Requirement)
We cannot launch without tracking *who* gave "Bob" access to "Revenue".
- **Backend**:
    - Auto-insert into `audit_logs` whenever `updateUserCapability` or `addScope` is called.
    - `GET /api/admin/audit/:userId`: Fetch history for a user.
- **Frontend**:
    - New Tab: "Audit Log".
    - Simple table: `Time | Admin | Action | Details`.

## 3. UI Polish
- **Toast Notifications**: "Capability Granted Successfully".
- **Loading Skeletons**: smoother transitions.

## Execution Order
1.  **Backend**: Add Scope Management endpoints & Audit Logging hooks.
2.  **Frontend**: Build `ScopeManager` component.
3.  **Frontend**: Build `AuditLogViewer` component.
4.  **Integration**: Add these to `AdminUserDetail.jsx`.
