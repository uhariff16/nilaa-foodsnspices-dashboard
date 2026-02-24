import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { Lock, Mail, Loader2, Play } from 'lucide-react';
import logo from '../assets/logo.png';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const from = location.state?.from?.pathname || "/";

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            await login(email, password);
            navigate(from, { replace: true });
        } catch (err) {
            console.error("Login failed:", err);
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'var(--bg-primary)',
            position: 'relative',
            overflow: 'hidden'
        }}>
            {/* Background Effects */}
            <div style={{
                position: 'absolute',
                top: '-50%', left: '-50%',
                width: '200%', height: '200%',
                background: 'radial-gradient(circle at 50% 50%, rgba(37, 99, 235, 0.05), transparent 60%)',
                animation: 'spin 20s linear infinite',
                pointerEvents: 'none'
            }} />

            <div className="glass-panel" style={{
                width: '100%',
                maxWidth: '420px',
                padding: '2.5rem',
                margin: '1rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '2rem',
                position: 'relative',
                zIndex: 10,
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
            }}>
                {/* Header */}
                <div style={{ textAlign: 'center' }}>
                    <div style={{
                        width: '90px', height: '90px',
                        background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(255,255,255,0.05))',
                        borderRadius: '1.5rem',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto 1.5rem auto',
                        border: '1px solid rgba(59, 130, 246, 0.2)',
                        boxShadow: '0 0 20px rgba(59, 130, 246, 0.1)',
                        padding: '12px'
                    }}>
                        <img src={logo} alt="Nilaa Foods Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    </div>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#3b82f6', marginBottom: '0.25rem', letterSpacing: '-0.5px' }}>
                        Nilaa Foods & Spices
                    </h2>
                    <h1 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.5rem', opacity: 0.8 }}>
                        Welcome Back
                    </h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem' }}>
                        Sign in to access your dashboard
                    </p>
                </div>

                {error && (
                    <div style={{
                        background: 'rgba(239, 68, 68, 0.1)',
                        border: '1px solid rgba(239, 68, 68, 0.2)',
                        color: '#fca5a5',
                        padding: '1rem',
                        borderRadius: '0.75rem',
                        fontSize: '0.875rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem'
                    }}>
                        <span style={{ fontWeight: 600 }}>Error:</span> {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {/* Email Input */}
                    <div style={{ position: 'relative' }}>
                        <label style={{
                            display: 'block',
                            color: 'var(--text-secondary)',
                            fontSize: '0.875rem',
                            fontWeight: 500,
                            marginBottom: '0.5rem',
                            paddingLeft: '0.25rem'
                        }}>Email Address</label>
                        <div style={{ position: 'relative' }}>
                            <Mail size={20} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="name@company.com"
                                style={{
                                    width: '100%',
                                    background: 'rgba(15, 23, 42, 0.6)',
                                    border: '1px solid var(--glass-border)',
                                    borderRadius: '0.75rem',
                                    padding: '0.875rem 1rem 0.875rem 3rem',
                                    color: 'white',
                                    fontSize: '1rem',
                                    outline: 'none',
                                    transition: 'all 0.2s',
                                    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)'
                                }}
                                onFocus={(e) => {
                                    e.target.style.borderColor = '#3b82f6';
                                    e.target.style.background = 'rgba(15, 23, 42, 0.8)';
                                }}
                                onBlur={(e) => {
                                    e.target.style.borderColor = 'var(--glass-border)';
                                    e.target.style.background = 'rgba(15, 23, 42, 0.6)';
                                }}
                            />
                        </div>
                    </div>

                    {/* Password Input */}
                    <div style={{ position: 'relative' }}>
                        <label style={{
                            display: 'block',
                            color: 'var(--text-secondary)',
                            fontSize: '0.875rem',
                            fontWeight: 500,
                            marginBottom: '0.5rem',
                            paddingLeft: '0.25rem'
                        }}>Password</label>
                        <div style={{ position: 'relative' }}>
                            <Lock size={20} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                style={{
                                    width: '100%',
                                    background: 'rgba(15, 23, 42, 0.6)',
                                    border: '1px solid var(--glass-border)',
                                    borderRadius: '0.75rem',
                                    padding: '0.875rem 1rem 0.875rem 3rem',
                                    color: 'white',
                                    fontSize: '1rem',
                                    outline: 'none',
                                    transition: 'all 0.2s',
                                    boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)'
                                }}
                                onFocus={(e) => {
                                    e.target.style.borderColor = '#3b82f6';
                                    e.target.style.background = 'rgba(15, 23, 42, 0.8)';
                                }}
                                onBlur={(e) => {
                                    e.target.style.borderColor = 'var(--glass-border)';
                                    e.target.style.background = 'rgba(15, 23, 42, 0.6)';
                                }}
                            />
                        </div>
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={isLoading}
                        style={{
                            marginTop: '0.5rem',
                            width: '100%',
                            background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '0.75rem',
                            padding: '1rem',
                            fontSize: '1rem',
                            fontWeight: 600,
                            cursor: isLoading ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.75rem',
                            transition: 'all 0.2s',
                            boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
                            opacity: isLoading ? 0.7 : 1
                        }}
                        onMouseOver={(e) => {
                            if (!isLoading) {
                                e.currentTarget.style.transform = 'translateY(-1px)';
                                e.currentTarget.style.boxShadow = '0 6px 16px rgba(59, 130, 246, 0.4)';
                            }
                        }}
                        onMouseOut={(e) => {
                            if (!isLoading) {
                                e.currentTarget.style.transform = 'none';
                                e.currentTarget.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.3)';
                            }
                        }}
                    >
                        {isLoading ? <Loader2 className="animate-spin" size={20} /> : "Sign In"}
                        {!isLoading && <Play size={16} fill="currentColor" />}
                    </button>

                </form>

                <div style={{ textAlign: 'center', marginTop: '1rem', opacity: 0.6 }}>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        Protected System • Authorized Personnel Only
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;
