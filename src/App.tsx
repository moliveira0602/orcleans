import { type ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './store';
import { AuthProvider, useAuth } from './services/auth';
import { ToastProvider } from './components/Toast';
import { ConfirmProvider } from './components/ConfirmModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import Layout from './components/Layout';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import PrivacyPage from './pages/PrivacyPage';
import TermsPage from './pages/TermsPage';
import MaintenancePage from './pages/MaintenancePage';

function LoadingScreen() {
    return (
        <div style={{
            minHeight: '100vh',
            background: '#0A0A0A',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: '16px',
        }}>
            <div style={{
                width: '32px',
                height: '32px',
                border: '3px solid rgba(255, 255, 255, 0.2)',
                borderTopColor: '#FFFFFF',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
            }} />
            <span style={{ color: 'rgba(230, 230, 230, 0.5)', fontSize: '14px', fontFamily: "'Satoshi', sans-serif" }}>
                A carregar...
            </span>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    );
}

function ProtectedRoute({ children }: { children: ReactNode }) {
    const { user, isLoading } = useAuth();
    if (isLoading) return <LoadingScreen />;
    if (!user) return <Navigate to="/login" replace />;
    return children;
}

function PublicRoute({ children }: { children: ReactNode }) {
    const { user, isLoading } = useAuth();
    if (isLoading) return <LoadingScreen />;
    if (user) return <Navigate to="/app" replace />;
    return children;
}

export default function App() {
    return (
        <ErrorBoundary>
            <BrowserRouter>
                <AppProvider>
                    <AuthProvider>
                        <ToastProvider>
                            <ConfirmProvider>
                                <Routes>
                                    <Route path="/" element={<LandingPage />} />
                                    <Route path="/privacidade" element={<PrivacyPage />} />
                                    <Route path="/termos" element={<TermsPage />} />
                                    <Route path="/maintenance" element={<MaintenancePage />} />
                                    <Route
                                        path="/login"
                                        element={
                                            <PublicRoute>
                                                <LoginPage />
                                            </PublicRoute>
                                        }
                                    />
                                    <Route
                                        path="/app/*"
                                        element={
                                            <ProtectedRoute>
                                                <Layout />
                                            </ProtectedRoute>
                                        }
                                    />
                                    <Route path="*" element={<Navigate to="/" replace />} />
                                </Routes>
                            </ConfirmProvider>
                        </ToastProvider>
                    </AuthProvider>
                </AppProvider>
            </BrowserRouter>
        </ErrorBoundary>
    );
}
