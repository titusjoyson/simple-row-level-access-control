# Proposal: Hybrid PBAC Strategy for Component Visibility

> [!WARNING]
> **Status: PROPOSED / NOT IMPLEMENTED**
> This document outlines a planned architecture for handling granular UI component access. The database schema and logic described below are **not yet implemented** in the current system.

## 1. Problem Statement
The current RBAC system handles **Data Access** well (e.g., "Manager can see Revenue data for EMEA"). However, requirements have evolved to need granular control over the **User Interface**:

1.  **Grant Granularity**: We need to control access to specific Screens (e.g., "Revenue Dashboard"), Tabs, and Buttons.
2.  **Hide vs. Disable**:
    *   **Disable**: User sees the link/button but it is grayed out (e.g., "I see the 'Export' button, but I don't have data permissions to use it").
    *   **Hide**: User naturally does not know the feature exists (e.g., A special "Admin Settings" tab should be invisible to Analysts).
3.  **User Exceptions**: We need to hide specific components for *specific users*, even if their Role allows it (e.g., "All Managers can see the Dashboard, except Bob").

## 2. Solution: Permission-Based Access Control (PBAC) with Overrides

We propose separating **Functional Capabilities** (Can I see the screen?) from **Data Permissions** (Can I read the rows?).

### 2.1 Database Schema Additions

We introduce three new concepts to the schema:

#### `capabilities`
Stores abstract application features. It does not know about React components or API routes.
*   **Columns**: `id`, `slug` (Unique), `description`
*   **Examples**:
    *   `view:revenue_dashboard`
    *   `view:kpi_links`
    *   `click:export_button`

#### `role_capabilities`
Maps standard Roles to Capabilities (The "Happy Path").
*   **Columns**: `role_id`, `capability_id`
*   **Example**: `Manager` Role -> `view:revenue_dashboard`

#### `user_capabilities` (The Override Mechanism)
Allows exceptions to the rule for specific users.
*   **Columns**: `user_id`, `capability_id`, `is_revoked` (Boolean)
*   **Logic**:
    *   **Explicit Grant**: If a user needs extra access (e.g., a "Super Analyst"), add a record with `is_revoked=false`.
    *   **Explicit Deny**: If a user must be blocked (e.g., "Bob the Manager"), add a record with `is_revoked=true`.

### 2.2 Access Evaluation Logic

The logic to determine if a user has a capability is:

```javascript
function userHasCapability(user, capabilitySlug) {
  // 1. Check User-Specific "Revoke" (Explicit Deny)
  if (user.policies.some(p => p.slug === capabilitySlug && p.is_revoked)) {
    return false; // BLOCKED
  }

  // 2. Check User-Specific "Grant" (Explicit Allow)
  if (user.policies.some(p => p.slug === capabilitySlug && !p.is_revoked)) {
    return true; // ALLOWED
  }

  // 3. Fallback to Role (Implicit Allow)
  return user.roles.some(role => role.capabilities.includes(capabilitySlug));
}
```

## 3. The "Hide vs. Disable" Strategy

We use the combination of **Capabilities** (Functional) and **Permissions** (Data) to achieve the UI requirement.

| Scenario | Capability Check (`view:link`) | Data Permission Check (`kpi:revenue`) | UI Result | User Experience |
| :--- | :--- | :--- | :--- | :--- |
| **No Access** | ❌ False | (Irrelevant) | **HIDDEN** | The link/tab is not rendered. User doesn't know it exists. |
| **View Only** | ✅ True | ❌ False | **DISABLED** | Link is visible but grayed out. Tooltip: "Request Access". |
| **Full Access** | ✅ True | ✅ True | **ENABLED** | Link is clickable and works. |

### 3.1 Use Case: Hiding a KPI for a Specific User
**Goal**: Hide the "Revenue" link for User Bob (Manager), but keep it visible for all other Managers.

1.  **Standard State**: `Manager` Role has `view:revenue_link` capability.
2.  **Action**: Admin inserts a record into `user_capabilities`:
    *   `user_id`: Bob
    *   `capability_id`: `view:revenue_link`
    *   `is_revoked`: **TRUE**
3.  **Result**: Bob fails the Qualification Check (Explicit Deny). The link is **HIDDEN** for him.

## 4. Industry Alignment
This design follows the **"Hybrid RBAC"** or **"RBAC with Exception Lists"** pattern used by:
*   **AWS IAM**: Supporting strict "Deny" overrides.
*   **Salesforce**: "Muting Permission Sets" to block specific features for users.
*   **Microsoft ACLs**: "Deny User" takes precedence over "Allow Group".

## 5. Implementation Roadmap
1.  **Schema Migration**: Create the tables defined in Section 2.1.
2.  **Service Layer**: Implement `rbac.service.getCapabilities(userId)`.
3.  **Frontend Guard**: Create `<CapabilityGuard capability="slug" fallback="hide|disable">`.
4.  **Admin UI**: Build a screen to manage User Exceptions.
