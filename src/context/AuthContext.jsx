import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [role, setRole] = useState(null);
    const [canAccessAttendance, setCanAccessAttendance] = useState(false);
    const [canAccessPayouts, setCanAccessPayouts] = useState(false);
    const [canViewDashboard, setCanViewDashboard] = useState(false);
    const [canManageUsers, setCanManageUsers] = useState(false);
    const [loading, setLoading] = useState(true);
    const currentUserRef = useRef(null);

    const fetchUserRole = async (email) => {
        // EMERGENCY OVERRIDE: Always make uhariff@gmail.com an admin
        if (email === 'uhariff@gmail.com') {
            console.log("Emergency Admin Access Granted");
            return { role: 'admin', can_access_attendance: true, can_access_payouts: true, can_view_dashboard: true, can_manage_users: true };
        }

        try {
            console.log("Fetching role for:", email);

            // Timeout Promise (10s)
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Role fetch timeout')), 10000)
            );

            const fetchPromise = supabase
                .from('user_roles')
                .select('role, can_access_attendance, can_access_payouts, can_view_dashboard, can_manage_users')
                .ilike('email', email)
                .single();

            // Race against timeout
            const { data, error } = await Promise.race([fetchPromise, timeoutPromise]);

            if (error || !data) {
                console.warn("Role fetch warning/error:", error);
                return { role: 'viewer', can_access_attendance: false, can_access_payouts: false, can_view_dashboard: false, can_manage_users: false };
            }
            console.log("Role fetched successfully:", data.role);
            return {
                role: data.role === 'power_user' ? 'viewer' : data.role,
                can_access_attendance: data.can_access_attendance || false,
                can_access_payouts: data.can_access_payouts || false,
                can_view_dashboard: data.can_view_dashboard ?? false,
                can_manage_users: data.can_manage_users ?? false
            };
        } catch (err) {
            console.error("Role fetch error/timeout:", err);
            return { role: 'viewer', can_access_attendance: false, can_access_payouts: false, can_view_dashboard: false, can_manage_users: false }; // Safe fallback
        }
    };

    useEffect(() => {
        // Check active session


        // Safety Timeout: Force loading false after 10 seconds to prevent infinite hang
        const safetyTimeout = setTimeout(() => {
            setLoading(prev => {
                if (prev) {
                    console.warn("Auth check timed out. Forcing load completion.");
                    return false;
                }
                return prev;
            });
        }, 10000);

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log("Auth State Change:", event, session?.user?.email);
            if (session?.user) {
                // Ignore token refreshes or duplicate events for the same active user to prevent UI locking
                if (currentUserRef.current === session.user.id && event !== 'SIGNED_OUT') {
                    setUser(session.user);
                    return;
                }

                currentUserRef.current = session.user.id;
                setLoading(true); // START LOADING LOCK
                try {
                    // Only fetch role if we don't have it or it's a new user
                    const authData = await fetchUserRole(session.user.email);

                    // SET ALL STATE TOGETHER TO PREVENT ROUTER CRASH
                    setRole(authData.role);
                    setCanAccessAttendance(authData.can_access_attendance);
                    setCanAccessPayouts(authData.can_access_payouts);
                    setCanViewDashboard(authData.can_view_dashboard);
                    setCanManageUsers(authData.can_manage_users);

                    // Set user LAST so router sees populated permissions
                    setUser(session.user);
                } catch (e) {
                    console.error("Auth Error", e);
                }
            } else {
                currentUserRef.current = null;
                setUser(null);
                setRole(null);
                setCanAccessAttendance(false);
                setCanAccessPayouts(false);
                setCanViewDashboard(false);
                setCanManageUsers(false);
            }
            clearTimeout(safetyTimeout);
            setLoading(false);
        });

        return () => {
            subscription?.unsubscribe();
        };
    }, []);

    useEffect(() => {
        // Auto-logout for non-admin users after 15 minutes of inactivity
        if (!user || role === 'admin') return;

        const TIMEOUT_MS = 15 * 60 * 1000; // 15 Minutes
        let lastActivity = Date.now();

        const updateActivity = () => {
            lastActivity = Date.now();
        };

        // Listen for activity
        window.addEventListener('mousemove', updateActivity);
        window.addEventListener('keydown', updateActivity);
        window.addEventListener('click', updateActivity);
        window.addEventListener('scroll', updateActivity);

        const activityInterval = setInterval(() => {
            if (Date.now() - lastActivity > TIMEOUT_MS) {
                console.log(`Auto-logout triggered for ${user.email} due to inactivity.`);
                logout(); // Call the internal logout function
            }
        }, 60000); // Check every minute

        return () => {
            window.removeEventListener('mousemove', updateActivity);
            window.removeEventListener('keydown', updateActivity);
            window.removeEventListener('click', updateActivity);
            window.removeEventListener('scroll', updateActivity);
            clearInterval(activityInterval);
        };
    }, [user, role]); // Re-bind when user/role changes


    const login = async (email, password) => {
        setLoading(true); // START LOADING LOCK
        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });
            if (error) throw error;

            if (data?.user) {
                // Await role fetch to prevent UI race conditions on redirect
                const authData = await fetchUserRole(data.user.email);
                setRole(authData.role);
                setCanAccessAttendance(authData.can_access_attendance);
                setCanAccessPayouts(authData.can_access_payouts);
                setCanViewDashboard(authData.can_view_dashboard);
                setCanManageUsers(authData.can_manage_users);
                setUser(data.user);
            }

            return data;
        } finally {
            setLoading(false); // RELEASE LOADING LOCK
        }
    };

    const logout = async () => {
        try {
            await supabase.auth.signOut();
        } catch (error) {
            console.error("Logout error:", error);
        } finally {
            setUser(null);
            setRole(null);
            setCanAccessAttendance(false);
            setCanAccessPayouts(false);
            setCanViewDashboard(false);
            setCanManageUsers(false);
        }
    };

    return (
        <AuthContext.Provider value={{
            user,
            role,
            login,
            logout,
            loading,
            isAdmin: role === 'admin',
            canAccessAttendance: role === 'admin' || canAccessAttendance,
            canAccessPayouts: role === 'admin' || canAccessPayouts,
            canViewDashboard: role === 'admin' || canViewDashboard,
            canManageUsers: role === 'admin' || canManageUsers
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
