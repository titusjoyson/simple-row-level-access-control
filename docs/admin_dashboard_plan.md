# Admin Dashboard Implementation Plan

## Goal
Build a premium, enterprise-grade Admin Dashboard to manage the RBAC/PBAC/RLS system.
It must be **Visual**, **Intuitive**, and **Responsive**.

## 1. UX/UI Strategy
Managing Permissions is boring and error-prone. We will make it better by:
*   **Visual Toggles**: Instead of dropdowns, use Green/Red toggles for Grant/Revoke.
*   **Effective Access View**: Always show the *result* of the permission (Computed), not just the configuration.
*   **Modern Cards**: Use Card-based layouts for users instead of just dense tables.
*   **Search Everything**: Instant search for users and capabilities.

## 2. Screens
### A. **User Management (Main)**
*   List of Users with Avatar, Role Badge, and Status.
*   Quick Actions: "Edit Access", "View As".

### B. **User Access Detail (The "Brain")**
*   **Header**: User Profile + Role Summary.
*   **Tab 1: Capabilities (PBAC)**
    *   List of ALL system capabilities.
    *   Columns: `Capability Name`, `Source` (Role/Override), `Action` (Toggle).
    *   *Interaction*: Clicking the toggle creates a `user_capabilities` record (Grant/Revoke).
*   **Tab 2: Data Scopes (RLS)**
    *   List of assigned Scopes (Region: EMEA).
    *   *Interaction*: "Add Scope" modal.

### C. **Simulator (Enterprise Feature)**
*   "View System As..." button.
*   Uses the existing `/api/me/context` but allows passing a `?simulate_user_id=` param (Admin only).
*   Display the raw JSON output for debugging.

## 3. API Requirements (New Endpoints)
*   `GET /api/admin/users` - List all users.
*   `GET /api/admin/users/:id` - Get details.
*   `GET /api/admin/capabilities` - List all available definitions.
*   `POST /api/admin/users/:id/capabilities` - Grant/Revoke (Upsert).
*   `DELETE /api/admin/users/:id/capabilities` - Reset to Default.
*   `POST /api/admin/users/:id/scopes` - Add Scope.

## 4. Components Structure
*   `AdminLayout`: Sidebar + Header.
*   `UserGrid`: Responsive grid of specific user cards.
*   `CapabilityToggle`: Smart component handling the tri-state logic (Inherited/Granted/Revoked).
*   `JsonViewer`: For the simulator.

## 5. Execution Steps
1.  **Backend**: create `admin.controller.js` and routes.
2.  **Frontend**: Setup basic Admin Layout.
3.  **Frontend**: Build User List.
4.  **Frontend**: Build User Detail + Capability Toggles.
5.  **Refine**: Add "Simulate" feature.
