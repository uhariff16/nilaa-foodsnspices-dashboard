import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';

const AuthContext = createContext();

const defaultPermissions = {
    dashboard: {
        overview: true,
        sales: false,
        expenses: false,
        procurement: false,
        stock: false,
        production: false,
        insights: false,
        simulator: false,
        ytd: false,
        profitHub: false,
        investments: false
    },
    attendance: {
        tracking: { read: false, write: false, delete: false, bulk: false },
        payouts: { read: false, write: false, delete: false },
        salaries: { read: false, write: false, delete: false },
        salaryCalculator: false
    },
    payouts: false
};

const mergePermissions = (fetched) => {
    if (!fetched || typeof fetched !== 'object') return JSON.parse(JSON.stringify(defaultPermissions));

    // Helper to safely expand boolean-true to a full object of that section's structure
    const expandSection = (val, defaultObj) => {
        if (val === true) {
            const fullAccess = {};
            Object.keys(defaultObj).forEach(k => fullAccess[k] = true);
            return fullAccess;
        }
        return val || {};
    };

    return {
        ...defaultPermissions,
        ...fetched,
        dashboard: { ...defaultPermissions.dashboard, ...(fetched.dashboard || {}) },
        attendance: {
            ...defaultPermissions.attendance,
            ...(fetched.attendance || {}),
            tracking: { ...defaultPermissions.attendance.tracking, ...expandSection(fetched.attendance?.tracking, defaultPermissions.attendance.tracking) },
            payouts: { ...defaultPermissions.attendance.payouts, ...expandSection(fetched.attendance?.payouts, defaultPermissions.attendance.payouts) },
            salaries: { ...defaultPermissions.attendance.salaries, ...expandSection(fetched.attendance?.salaries, defaultPermissions.attendance.salaries) }
        }
    };
};

export const hasPermission = (permissions, path) => {
    if (!permissions) return false;
    const parts = path.split('.');
    let current = permissions;
    for (const part of parts) {
        if (current === true) return true; // If parent is true, all children are implicitly true
        if (!current || typeof current !== 'object') return false;
        current = current[part];
    }
    
    if (typeof current === 'object' && current !== null) {
        return Object.values(current).some(v => v === true);
    }
    return !!current;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [role, setRole] = useState(null);
    const [canAccessAttendance, setCanAccessAttendance] = useState(false);
    const [canAccessPayouts, setCanAccessPayouts] = useState(false);
    const [canViewDashboard, setCanViewDashboard] = useState(false);
    const [canManageUsers, setCanManageUsers] = useState(false);
    const [permissions, setPermissions] = useState(defaultPermissions);
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

            // Timeout Promise (30s for safety)
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Role fetch timeout')), 30000)
            );

            const fetchPromise = supabase
                .from('user_roles')
                .select('role, can_access_attendance, can_access_payouts, can_view_dashboard, can_manage_users, permissions')
                .ilike('email', email)
                .single();

            // Race against timeout
            console.log("Starting Auth Race for:", email);
            const { data, error } = await Promise.race([fetchPromise, timeoutPromise]);

            if (error || !data) {
                console.warn("Role fetch warning/error:", error);
                return { role: 'viewer', can_access_attendance: false, can_access_payouts: false, can_view_dashboard: false, can_manage_users: false, permissions: JSON.parse(JSON.stringify(defaultPermissions)) };
            }
            console.log("Role fetched successfully:", data.role);
            
            // Map legacy roles & handle permissions JSON
            const roleStr = data.role === 'power_user' ? 'viewer' : data.role;
            
            // Build default Permissions if JSON is missing or incomplete
            let finalPermissions = mergePermissions(data.permissions);

            if (!data.permissions) {
                // Specific legacy mapping for users without any permissions JSON yet
                finalPermissions.dashboard.overview = data.can_view_dashboard ?? false;
                finalPermissions.dashboard.sales = data.can_view_dashboard ?? false;
                finalPermissions.dashboard.expenses = data.can_view_dashboard ?? false;
                finalPermissions.dashboard.procurement = data.can_view_dashboard ?? false;
                finalPermissions.dashboard.stock = data.can_view_dashboard ?? false;
                finalPermissions.dashboard.production = data.can_view_dashboard ?? false;
                finalPermissions.dashboard.insights = data.can_view_dashboard ?? false;
                finalPermissions.dashboard.simulator = data.can_view_dashboard ?? false;
                finalPermissions.dashboard.ytd = roleStr === 'admin';
                finalPermissions.dashboard.profitHub = roleStr === 'admin';
                
                finalPermissions.attendance.tracking = data.can_access_attendance ?? false;
                finalPermissions.attendance.payouts = data.can_access_attendance ?? false;
                finalPermissions.attendance.salaries = data.can_access_attendance ?? false;
                finalPermissions.payouts = data.can_access_payouts ?? false;
            }

            return {
                role: roleStr,
                can_access_attendance: data.can_access_attendance || false,
                can_access_payouts: data.can_access_payouts || false,
                can_view_dashboard: data.can_view_dashboard ?? false,
                can_manage_users: data.can_manage_users ?? false,
                permissions: finalPermissions
            };
        } catch (err) {
            console.error("Role fetch error/timeout:", err);
            return { role: 'viewer', can_access_attendance: false, can_access_payouts: false, can_view_dashboard: false, can_manage_users: false, permissions: JSON.parse(JSON.stringify(defaultPermissions)) }; // Safe fallback
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
                    setPermissions(authData.permissions);

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
                setPermissions(null);
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
                setPermissions(authData.permissions);
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
            permissions,
            isAdmin: role === 'admin',
            hasPermission: (path) => {
                if (role === 'admin') return true;
                if (!permissions) return false;
                const parts = path.split('.');
                let current = permissions;
                for (const part of parts) {
                    if (current === true) return true; // If parent is true, all sub-paths are granted
                    if (!current || typeof current !== 'object') return false;
                    current = current[part];
                }
                
                // If it's an object (multi-perm section), return true if it has at least one active flag
                if (typeof current === 'object' && current !== null) {
                    return Object.values(current).some(v => v === true);
                }
                return !!current;
            },
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
