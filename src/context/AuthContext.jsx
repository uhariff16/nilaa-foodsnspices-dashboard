import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [role, setRole] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchUserRole = async (email) => {
        // EMERGENCY OVERRIDE: Always make uhariff@gmail.com an admin
        if (email === 'uhariff@gmail.com') {
            console.log("Emergency Admin Access Granted");
            return 'admin';
        }

        try {
            console.log("Fetching role for:", email);

            // Timeout Promise (3s)
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Role fetch timeout')), 3000)
            );

            const fetchPromise = supabase
                .from('user_roles')
                .select('role')
                .eq('email', email)
                .single();

            // Race against timeout
            const { data, error } = await Promise.race([fetchPromise, timeoutPromise]);

            if (error || !data) {
                console.warn("Role fetch warning/error:", error);
                return 'viewer';
            }
            console.log("Role fetched successfully:", data.role);
            return data.role;
        } catch (err) {
            console.error("Role fetch error/timeout:", err);
            return 'viewer'; // Safe fallback
        }
    };

    useEffect(() => {
        // Check active session
        const checkSession = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (session?.user) {
                    setUser(session.user);
                    const userRole = await fetchUserRole(session.user.email);
                    setRole(userRole);
                } else {
                    setUser(null);
                    setRole(null);
                }
            } catch (error) {
                console.error("Session check error:", error);
            } finally {
                setLoading(false);
            }
        };

        checkSession();

        // Safety Timeout: Force loading false after 5 seconds to prevent infinite hang
        const timeout = setTimeout(() => {
            setLoading(prev => {
                if (prev) {
                    console.warn("Auth check timed out. Forcing load completion.");
                    return false;
                }
                return prev;
            });
        }, 5000);

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log("Auth State Change:", event, session?.user?.email);
            if (session?.user) {
                setUser(session.user);
                // Only fetch role if we don't have it or it's a new user
                const userRole = await fetchUserRole(session.user.email);
                setRole(userRole);
            } else {
                setUser(null);
                setRole(null);
            }
            clearTimeout(timeout);
            setLoading(false);
        });

        return () => {
            subscription?.unsubscribe();
        };
    }, []);

    const login = async (email, password) => {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        if (error) throw error;
        return data;
    };

    const logout = async () => {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        setUser(null);
        setRole(null);
    };

    return (
        <AuthContext.Provider value={{ user, role, login, logout, loading, isAdmin: role === 'admin' }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
