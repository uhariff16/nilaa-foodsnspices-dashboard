import fs from 'fs';

const filePath = 'c:/AntiGravity/src/context/AuthContext.jsx';
let content = fs.readFileSync(filePath, 'utf8');

const regex = /\/\/\s*Safety Timeout: Force loading false after 5 seconds[\s\S]*?clearTimeout\(timeout\);\s*setLoading\(false\);\s*\}\);/m;

const replacement = `// Safety Timeout: Force loading false after 10 seconds to prevent infinite hang
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
                setUser(null);
                setRole(null);
                setCanAccessAttendance(false);
                setCanAccessPayouts(false);
                setCanViewDashboard(false);
                setCanManageUsers(false);
            }
            clearTimeout(safetyTimeout);
            setLoading(false);
        });`;

content = content.replace(regex, replacement);

fs.writeFileSync(filePath, content, 'utf8');
console.log("Patched AuthContext.jsx Part 2");
