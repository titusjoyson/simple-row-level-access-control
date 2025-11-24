import React, { createContext, useState, useContext } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    // Mock Users
    const users = [
        { id: 1, username: 'alice_admin', role: 'ADMIN', label: 'Alice (Admin)' },
        { id: 2, username: 'bob_manager', role: 'MANAGER', label: 'Bob (Manager)' },
        { id: 3, username: 'charlie_analyst', role: 'ANALYST', label: 'Charlie (Analyst)' },
        { id: 4, username: 'dave_exec', role: 'EXECUTIVE', label: 'Dave (Executive)' },
    ];

    const [currentUser, setCurrentUser] = useState(users[2]); // Default to Analyst

    const login = (userId) => {
        const user = users.find(u => u.id === parseInt(userId));
        if (user) setCurrentUser(user);
    };

    return (
        <AuthContext.Provider value={{ currentUser, users, login }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
