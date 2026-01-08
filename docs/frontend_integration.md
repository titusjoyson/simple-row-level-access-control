# Frontend Integration Guide: PBAC & Access Guards

This guide explains how to integrate the Permission-Based Access Control (PBAC) system into your React application using the provided context and components.

## 1. Setup

Wrap your application (or the authenticated part of it) in the `RBACProvider`. Note that it must be **inside** the `AuthProvider` because it depends on the currently logged-in user.

```jsx
// src/App.jsx
import { AuthProvider } from './context/AuthContext';
import { RBACProvider } from './context/RBACContext';

function App() {
  return (
    <AuthProvider>
      <RBACProvider>
         <Router>
           {/* Your Routes */}
         </Router>
      </RBACProvider>
    </AuthProvider>
  );
}
```

## 2. Using AccessGuard (The Swiss Army Knife)

The `<AccessGuard>` component is the primary way to control UI visibility.

### A. Hiding Elements (The "Invisible" Pattern)
If a user lacks the **Capability**, the component is not rendered at all.

```jsx
import AccessGuard from './components/AccessGuard';

// Only users with 'view:admin_settings' capability see this link
<AccessGuard capability="view:admin_settings">
  <Link to="/admin">Admin Settings</Link>
</AccessGuard>
```

### B. Disabling Elements (The "Grayed Out" Pattern)
Sometimes you want the user to see a button but know they can't use it (perhaps to prompt them to request access).

Use the **Render Props** pattern to access the `hasAccess` flag.

```jsx
// User MUST have 'view:revenue' capability to see this block.
// But 'hasAccess' depends on if they have DATA permission for 'kpi:revenue'.
<AccessGuard capability="view:revenue_dashboard" kpi="kpi:revenue">
  {({ hasAccess }) => (
    <Button 
      disabled={!hasAccess} 
      title={!hasAccess ? "You do not have permission to view data" : ""}
    >
      View Revenue Report
    </Button>
  )}
</AccessGuard>
```

### C. Fallback UI
You can provide a fallback component to render when access is denied, instead of just returning null.

```jsx
<AccessGuard 
  capability="view:confidential_tab" 
  fallback={<div className="alert">Access Denied</div>}
>
  <ConfidentialContent />
</AccessGuard>
```

## 3. Programmatic Access (Hooks)

For complex logic inside generic components or `useEffect`, use the `useRBAC` hook directly.

```javascript
import { useRBAC } from '../context/RBACContext';

const MyComponent = () => {
  const { hasCapability, getKpiAccess } = useRBAC();

  useEffect(() => {
    // Example: Redirect if user lands on a page they shouldn't see
    if (!hasCapability('view:detailed_analysis')) {
      history.push('/dashboard');
    }
  }, []);

  const access = getKpiAccess('kpi:churn');
  
  if (access?.type === 'RESTRICTED') {
    console.log("User is restricted to regions:", access.filters.region);
  }

  return <div>...</div>;
};
```

## 4. Troubleshooting
*   **Loading State**: The `RBACProvider` handles loading automatically. Using `{!loading && children}` ensures your app doesn't render until permissions are fetched.
*   **Missing Context**: Ensure `useRBAC` is called inside a component wrapped by `RBACProvider`.
