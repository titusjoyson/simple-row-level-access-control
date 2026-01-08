# Architectural Comparison: Hybrid PBAC vs. Traditional Models

This document justifies the architectural decision to use a **Hybrid PBAC + RLS** model over traditional RBAC or pure ABAC systems.

## 1. The "Role Explosion" Problem (Pure RBAC)

In a traditional **Role-Based Access Control (RBAC)** system, every variation in permission requires a new role.

### Scenario
An enterprise has "Managers" and "Analysts".
1.  **Requirement A**: Some US Managers need to see "Export Button".
2.  **Requirement B**: Some EU Managers must *not* see "Settings".
3.  **Requirement C**: Senior Analysts need "Manager-like" access for 1 week.

### Comparison
| Traditional RBAC (Bad) | Hybrid PBAC (Good) |
| :--- | :--- |
| **New Roles Created**: | **No New Roles**: |
| 1. `Manager_US_Export` | 1. `Manager` Role stays the same. |
| 2. `Manager_EU_NoSettings` | 2. **Capability Override**: Grant `click:export` to specific US users. |
| 3. `Analyst_Senior_Temp` | 3. **Capability Override**: Revoke `view:settings` for specific EU users. |
| **Result**: Exponential growth of roles. | **Result**: Flat Role hierarchy + Granular Exceptions. |

---

## 2. The "Performance Black Hole" (Pure ABAC)

In **Attribute-Based Access Control (ABAC)**, permissions are calculated dynamically based on complex policies at runtime.

### Scenario
A dashboard loads 50 distinct components (Charts, Buttons, Tabs). Each has a permission rule.

### Comparison
| Pure ABAC (Bad) | Hybrid PBAC (Good) |
| :--- | :--- |
| **Runtime Calculation**: | **Pre-Computed Context**: |
| For *each* of the 50 components, the system runs a logic engine: | On Login, the system builds a **Capability List** (Array of Strings). |
| `if (User.Dept == 'Sales' AND User.Level >= 5 AND Time < 5PM)...` | `['view:chart', 'click:button', ...]` |
| **Cost**: High CPU usage, Latency. | **Cost**: O(1) Lookup (`includes('str')`). Instant. |
| **Result**: Dashboard loads slowly. | **Result**: Instant rendering. |

---

## 3. The "Frontend Coupling" (Resource-Based)

In some systems, the database stores the structure of the UI (e.g., `Menus` table, `Screens` table).

### Scenario
The UX team decides to move the "Project Details" table from *Tab A* to a new *Tab B*.

### Comparison
| Resource-Based DB (Bad) | Capability-Based DB (Good) |
| :--- | :--- |
| **Database Migration**: | **Code Change Only**: |
| You must update the `screens` table and `tabs` table in the DB to reflect the move. | The Database only knows `view:project_details`. |
| Permissions are linked to `Tab_ID_5`. | You move the `<AccessGuard capability="view:project_details">` to the new file. |
| **Result**: DB Refactoring required for UI changes. | **Result**: Zero DB changes for UI redesigns. |

---

## 4. Decision Matrix

| Feature | Pure RBAC | Pure ABAC | Hybrid (Selected) |
| :--- | :--- | :--- | :--- |
| **Granularity** | Low | High | **High** |
| **Performance** | High | Low | **High** |
| **Maintainability** | Starts High, degrades fast | Low (Complex Policies) | **High** (Decoupled) |
| **Auditability** | Difficult (Which role did what?) | Difficult (Why did policy pass?) | **Excellent** (Explicit Overrides) |

## Conclusion
The Hybrid model—using **Permissions** for Data Depth (RLS) and **Capabilities** for Functional Width (PBAC)—provides the specific sweet spot required for a 16k+ user enterprise system.
