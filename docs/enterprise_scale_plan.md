# Enterprise Scale Upgrade Plan (16k Users)

To support 16,000 users, we must abandon "Show All" lists and "Individual Assignment" workflows.

## 1. Scalability Core (Pagination & Search)
**Problem**: Loading 16k users into the browser will crash it.
**Solution**: Server-Side Pagination.
- **Backend**: Update `getUsers` to accept `?page=1&limit=50&q=searchterm`.
- **Frontend**: Implement a `PaginatedDataTable` component.

## 2. Group Management (The Hierarchy Strategy)
**Problem**: Assigning "Region: EMEA" to 500 new employees individually is impossible.
**Solution**: Assign Scopes to **GROUPS**.
- **Data Model**: Already exists (`groups`, `user_groups`, `access_scopes(entity_type='GROUP')`).
- **UI**:
    - **Group List**: Manage teams (e.g., "Sales East", "Engineering").
    - **Group Detail**:
        - **Members Tab**: Bulk add/remove users.
        - **Scopes Tab**: Assign permissions once, apply to all members.

## 3. Role Management ("The Template")
**Problem**: changing what a "Manager" can do requires SQL access currently.
**Solution**: Visual Role Editor.
- **UI**:
    - List Roles.
    - Matrix View: Checkbox grid of `Role x Capability`.

## 4. Generic "Table Manager"
For less frequent items (KPIs, Dimensions), a generic CRUD interface is sufficient.

## Execution Phase 1: Scalable User List
1.  Modify `GET /api/admin/users` to support pagination.
2.  Update `AdminUsers.jsx` to use a paginated table.

## Execution Phase 2: Groups
1.  `groups.controller.js`: CRUD + Member Management.
2.  `GroupList.jsx` and `GroupDetail.jsx`.

## Execution Phase 3: Roles
1.  `roles.controller.js`.
2.  `RoleManager.jsx`.
