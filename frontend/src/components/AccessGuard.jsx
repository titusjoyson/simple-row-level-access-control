import React from 'react';
import { useRBAC } from '../context/RBACContext';

/**
 * AccessGuard
 * 
 * A wrapper component to Hide or Disable UI elements based on permissions.
 * 
 * Props:
 * - capability (string): The capability slug required to SEE this component. (e.g. 'view:revenue')
 * - kpi (string): The KPI key required to INTERACT with this component. (e.g. 'kpi:revenue')
 * - fallback (node): What to render if permission is denied. Default is null (Hidden).
 * - children (node): The component to render if allowed.
 */
const AccessGuard = ({ capability, kpi, fallback = null, children }) => {
    const { hasCapability, getKpiAccess } = useRBAC();

    // 1. Visibility Check (Capability)
    // If user doesn't have the capability, the component is completely HIDDEN.
    if (capability && !hasCapability(capability)) {
        return fallback;
    }

    // 2. Data Accessibility Check (KPI)
    // If User sees it but has no data permission, we might want to Disable it.
    // This part is a bit tricky: usually we pass a 'disabled' prop to the child.

    // Pattern: Render props for advanced control
    if (typeof children === 'function') {
        const kpiAccess = kpi ? getKpiAccess(kpi) : null;
        const isDataDenied = kpi && !kpiAccess;

        return children({
            isRestricted: kpiAccess?.type === 'RESTRICTED',
            hasAccess: !isDataDenied,
            access: kpiAccess
        });
    }

    return children;
};

export default AccessGuard;
