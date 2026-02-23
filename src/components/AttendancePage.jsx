import React from 'react';
import { useNavigate } from 'react-router-dom';
import TimeAttendance from './TimeAttendance';
import { useAuth } from '../context/AuthContext';

const AttendancePage = () => {
    const navigate = useNavigate();
    const { canAccessAttendance, logout } = useAuth();

    // Secondary safety check (ProtectedRoute handles it primarily)
    if (!canAccessAttendance) {
        return (
            <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a', color: 'white' }}>
                <div style={{ textAlign: 'center' }}>
                    <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Access Denied</h2>
                    <p style={{ color: '#94a3b8', marginBottom: '2rem' }}>You do not have permission to access the Time & Attendance module.</p>
                    <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                        <button
                            onClick={() => navigate('/')}
                            className="btn-primary"
                            style={{ padding: '0.75rem 1.5rem', background: 'transparent', border: '1px solid var(--glass-border)' }}
                        >
                            Back to Dashboard
                        </button>
                        <button
                            onClick={logout}
                            className="btn-primary"
                            style={{ padding: '0.75rem 1.5rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)' }}
                        >
                            Logout & Change User
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', padding: '2rem' }}>
            <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
                <TimeAttendance onBack={() => navigate('/')} />
            </div>
        </div>
    );
};

export default AttendancePage;
