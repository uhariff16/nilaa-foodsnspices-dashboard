import React, { createContext, useContext } from 'react';

// MOCKED AUTH CONTEXT (No Real Auth)
const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    // Hardcode "Logged In" state
    const user = { id: 'mock-admin', email: 'admin@nilaafoods.com' };
    const role = 'admin';
    const loading = false;

    const login = async () => true;
    const logout = async () => window.location.reload();

    return (
        <AuthContext.Provider value={{ user, role, login, logout, loading, isAdmin: true }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
