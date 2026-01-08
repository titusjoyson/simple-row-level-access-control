# Data Flow Guide: Permissions & RLS

This guide explains the end-to-end flow of how permission data is constructed, enforced on the Backend, and consumed by the Frontend.

## 1. The "User Context" Object
When a user logs in (or hits `/api/me`), the backend constructs a comprehensive **User Context Object**. This is the "Source of Truth" for the session.

```json
{
  "user": {
    "id": 101,
    "username": "bob_manager"
  },
  "roles": ["MANAGER"],
  
  // 1. Functional Access (Capabilities)
  // Used for: Showing/Hiding Screens, Tabs, Buttons
  // Derived from: role_capabilities + user_capabilities
  "capabilities": [
    "view:revenue_dashboard",
    "view:churn_report",
    "click:export_button"
    // Note: 'view:admin_settings' is missing, so it's hidden.
  ],

  // 2. Data Access (Permissions + Scopes)
  // Used for: Enabling/Disabling Links & RLS Filtering
  // Derived from: permissions + access_scopes
  "data_access": {
    "kpi:revenue": {
      "type": "FULL",       // Manager sees ALL Revenue data
      "filters": null
    },
    "kpi:churn": {
      "type": "RESTRICTED", // Manager only sees Churn for their Region
      "filters": {
        "region": ["EMEA"], // <--- The Scope
        "site": ["London", "Paris"]
      }
    }
  }
}
```

---

## 2. API Access & Enforcement (Backend)

When the Frontend calls an API (e.g., `GET /api/kpis/churn/data`), two checks happen:

### Step A: Functional Guard (Middleware)
*   **Check**: Does the user have the *capability* to even hit this endpoint?
*   **Code**: `requireCapability('view:churn_report')`
*   **Action**: If missing, return `403 Forbidden` immediately. The database isn't even queried for data.

### Step B: RLS Data Retrieval (Controller)
*   **Check**: The user is allowed in. Now, *what data* can they see?
*   **Code**:
    ```javascript
    // Controller
    const access = req.userContext.data_access['kpi:churn'];

    let query = db('churn_data');
    
    if (access.type === 'RESTRICTED') {
       // Apply the Scopes from the Context Object
       // "filters" = { region: ['EMEA'], site: ['London', 'Paris'] }
       query.whereIn('region', access.filters.region);
       query.whereIn('site', access.filters.site);
    }
    
    return query;
    ```
*   **Result**: The user generally receives a JSON array containing **only** the rows matching their scopes.

---

## 3. Frontend Consumption & UI Logic

The Frontend stores the **User Context Object** in a global React Context (`AuthContext`).

### Scenario A: Screen/Component Visibility (Hiding)
We use the `capabilities` array to decide whether to render a component.

```jsx
// SidebarItem.jsx
const { capabilities } = useAuth();

// If 'view:admin_settings' is NOT in the array, return null.
if (!capabilities.includes('view:admin_settings')) return null;

return <Link to="/admin">Admin Settings</Link>;
```

### Scenario B: KPI Access (Disabling/Graying Out)
We use the `data_access` map to decide if a link is active.

```jsx
// KpiCard.jsx
const { data_access } = useAuth();
const kpiAccess = data_access['kpi:churn']; 

// If access is missing/null, Disable the link
if (!kpiAccess) {
  return <div className="text-gray-400">Churn Rate (Request Access)</div>;
}

return <Link to="/churn">Churn Rate</Link>;
```

### Scenario C: Global vs. Regional Views (The Dashboard)
When the user opens the "Churn Dashboard", the UI adapts based on `access.type` and `access.filters`.

```jsx
// ChurnDashboard.jsx
const { access } = useKpiAccess('kpi:churn');

if (access.type === 'FULL') {
  // Option 1: Show "Global" aggregation
  return <GlobalMap data={allData} />; 
} 
else if (access.type === 'RESTRICTED') {
  // Option 2: Show context-aware view
  const userRegions = access.filters.region; // ['EMEA']
  
  return (
    <div>
      <h1>Regional View: {userRegions.join(', ')}</h1>
      <RegionalTable regions={userRegions} />
    </div>
  );
}
```

This ensures the user enters the dashboards seeing exactly the slice of the world they own, defined strictly by their RLS scopes.
