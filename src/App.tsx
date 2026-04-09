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

function LoadingScreen() {
    return (
        <div style={{
            minHeight: '100vh',
            background: '#05070A',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            gap: '16px',
        }}>
            <div style={{
                width: '32px',
                height: '32px',
                border: '3px solid rgba(0, 194, 255, 0.2)',
                borderTopColor: '#00C2FF',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
            }} />
            <span style={{ color: 'rgba(234, 246, 255, 0.5)', fontSize: '14px', fontFamily: 'Inter, sans-serif' }}>
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
                <AuthProvider>
                    <AppProvider>
                        <ToastProvider>
                            <ConfirmProvider>
                                <Routes>
                                    <Route path="/" element={<LandingPage />} />
                                    <Route path="/privacidade" element={<PrivacyPage />} />
                                    <Route path="/termos" element={<TermsPage />} />
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
                    </AppProvider>
                </AuthProvider>
            </BrowserRouter>
        </ErrorBoundary>
    );
}
