import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';

const RBACContext = createContext(null);

export const RBACProvider = ({ children }) => {
    const { currentUser } = useAuth();
    const [rbacData, setRbacData] = useState({
        capabilities: [],
        data_access: {}
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!currentUser) return;

        // Fetch the Real Context from the Backend
        // For POC, we assume the backend is running on port 3001
        fetch('http://localhost:3001/api/me/context', {
            headers: {
                'x-user-id': currentUser.id
            }
        })
            .then(res => res.json())
            .then(data => {
                setRbacData({
                    capabilities: data.capabilities || [],
                    data_access: data.data_access || {}
                });
                setLoading(false);
            })
            .catch(err => console.error("Failed to load RBAC context", err));
    }, [currentUser]);

    // Helper: Check Capability (Functional Access)
    const hasCapability = (slug) => {
        return rbacData.capabilities.includes(slug);
    };

    // Helper: Check Data Access (RLS)
    const getKpiAccess = (kpiKey) => {
        return rbacData.data_access[kpiKey] || null;
    };

    return (
        <RBACContext.Provider value={{ ...rbacData, hasCapability, getKpiAccess, loading }}>
            {!loading && children}
        </RBACContext.Provider>
    );
};

export const useRBAC = () => useContext(RBACContext);
