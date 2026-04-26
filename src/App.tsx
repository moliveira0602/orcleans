import { type ReactNode, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useSearchParams } from 'react-router-dom';
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
import { billingApi } from './services/billing';
import { useToast } from './components/Toast';

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

export function CheckoutSuccess() {
    const [searchParams] = useSearchParams();
    const { refreshProfile } = useAuth();
    const toast = useToast();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

    useEffect(() => {
        const sessionId = searchParams.get('session_id');
        if (!sessionId) {
            setStatus('error');
            return;
        }
        (async () => {
            try {
                const result = await billingApi.verifyCheckoutSession(sessionId);
                if (result.payment_status === 'paid') {
                    toast(`Pagamento confirmado! Plano ${result.plan} ativado.`, 'success');
                } else {
                    toast('Pagamento em processamento. Atualizaremos seu plano em breve.', 'info');
                }
                await refreshProfile();
                setStatus('success');
            } catch (err: any) {
                toast('Erro ao verificar pagamento: ' + (err.message || ''), 'error');
                setStatus('error');
            }
        })();
        // Clean URL after a moment
        setTimeout(() => {
            window.history.replaceState({}, document.title, '/app/settings');
        }, 3000);
    }, []);

    if (status === 'loading') {
        return (
            <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
                <div style={{ width: 32, height: 32, border: '3px solid rgba(255,255,255,0.2)', borderTopColor: '#FFF', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                <span style={{ color: 'rgba(230,230,230,0.5)', fontSize: 14 }}>Verificando pagamento...</span>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 20 }}>
            {status === 'success' ? (
                <>
                    <div style={{ fontSize: 48 }}>✅</div>
                    <h2 style={{ color: '#FFF', fontSize: 20 }}>Pagamento Confirmado!</h2>
                    <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>Seu plano foi atualizado com sucesso.</p>
                </>
            ) : (
                <>
                    <div style={{ fontSize: 48 }}>❌</div>
                    <h2 style={{ color: '#FFF', fontSize: 20 }}>Erro na Verificação</h2>
                    <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14 }}>Não foi possível verificar o pagamento.</p>
                </>
            )}
            <a href="/app/settings" style={{ color: 'var(--blue)', fontSize: 14, marginTop: 12 }}>Voltar para Configurações</a>
        </div>
    );
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
                                        path="/checkout/success"
                                        element={
                                            <ProtectedRoute>
                                                <CheckoutSuccess />
                                            </ProtectedRoute>
                                        }
                                    />
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
