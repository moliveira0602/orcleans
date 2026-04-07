import { type ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './store';
import { AuthProvider, useAuth } from './auth';
import { ToastProvider } from './components/Toast';
import { ConfirmProvider } from './components/ConfirmModal';
import Layout from './components/Layout';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import PrivacyPage from './pages/PrivacyPage';
import TermsPage from './pages/TermsPage';

function ProtectedRoute({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    if (!user) return <Navigate to="/login" replace />;
    return children;
}

function PublicRoute({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    if (user) return <Navigate to="/app" replace />;
    return children;
}

export default function App() {
    return (
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
    );
}
