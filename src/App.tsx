import { AppProvider } from './store';
import { ToastProvider } from './components/Toast';
import { ConfirmProvider } from './components/ConfirmModal';
import Layout from './components/Layout';

export default function App() {
    return (
        <AppProvider>
            <ToastProvider>
                <ConfirmProvider>
                    <Layout />
                </ConfirmProvider>
            </ToastProvider>
        </AppProvider>
    );
}
