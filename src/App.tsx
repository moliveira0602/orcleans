import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './store';
import { ToastProvider } from './components/Toast';
import { ConfirmProvider } from './components/ConfirmModal';
import Layout from './components/Layout';
import LandingPage from './pages/LandingPage';

export default function App() {
    return (
        <BrowserRouter>
            <AppProvider>
                <ToastProvider>
                    <ConfirmProvider>
                        <Routes>
                            <Route path="/" element={<LandingPage />} />
                            <Route path="/app/*" element={<Layout />} />
                            <Route path="*" element={<Navigate to="/" replace />} />
                        </Routes>
                    </ConfirmProvider>
                </ToastProvider>
            </AppProvider>
        </BrowserRouter>
    );
}
