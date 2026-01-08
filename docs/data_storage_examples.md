# Data Storage Cheat Sheet: How to seed the tables

You asked: *"Should I store `capex` or `capex/tab1`?"*

The answer is: **It depends on whether you are securing the UI (Capability) or the Data (Permission).**

We use **Flat Slugs** for Capacities (UI), not paths.

## Scenario: The "CAPEX" Module

Imagine you have:
1.  **Screen**: Capex Dashboard
2.  **Tab 1**: Overview (Contains High-Level Graphs)
3.  **Tab 2**: Project Details (Contains a detailed Table with RLS)

### 1. `capabilities` Table (UI Access)
Store "actions" or "views" here. Use a naming convention like `verb:object`.

| id | slug | description |
| :--- | :--- | :--- |
| 100 | `view:capex_dashboard` | Can see the main screen link |
| 101 | `view:capex_tab_overview` | Can click the first tab |
| 102 | `view:capex_tab_projects` | Can click the second tab |
| 103 | `click:capex_export` | Can see/click the export button |

*   **Do NOT store**: `capex/tab1` (Don't mimic URLs).
*   **Do store**: `view:capex_tab_overview`.

### 2. `kpis` Table (Data Resources)
Store the actual *data sources* here. This is what you apply Row-Level Security to.

| id | resource_key | name |
| :--- | :--- | :--- |
| 50 | `kpi:capex_spend` | Global Spend Data (Used in Overview Tab) |
| 51 | `kpi:capex_projects` | Project Line Items (Used in Details Tab) |

### 3. `permissions` Table (Data Depth)
Link Roles to the Data Resources.

| role_id | kpi_id | access_type | Notes |
| :--- | :--- | :--- | :--- |
| Manager | 50 (Spend) | `FULL` | Sees total spend for company |
| Manager | 51 (Projects) | `RESTRICTED` | Only sees projects in their Region |

---

## How it comes together in the App

### A. The Sidebar (Screen Access)
```jsx
// Check CAPABILITY: "Can I enter the room?"
<AccessGuard capability="view:capex_dashboard">
   <Link to="/capex">Capex Dashboard</Link>
</AccessGuard>
```

### B. The Tabs (Tab Access)
```jsx
// Check CAPABILITY: "Can I see this specific tab?"
<AccessGuard capability="view:capex_tab_projects">
   <Tab>Project Details</Tab>
</AccessGuard>
```

### C. The Data Inside the Tab (Data Access)
```jsx
// Check PERMISSION: "I'm in the tab. Now, what rows can I read?"
const { access } = useKpiAccess('kpi:capex_projects');

// If access.type is RESTRICTED, the API will likely return:
// WHERE region IN ('EMEA')
```

## Summary
1.  **UI Components (Screens/Tabs/Buttons)** -> Go into `capabilities` table (e.g., `view:tab_name`).
2.  **Data Feeds (Tables/Charts)** -> Go into `kpis` table (e.g., `kpi:finance_data`).
