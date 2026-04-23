import { createContext, useContext, useCallback, useState, type ReactNode } from 'react';
import { Check, AlertCircle, Info } from 'lucide-react';

interface ToastItem {
    id: number;
    msg: string;
    type: 'success' | 'error' | 'info';
}

interface ToastContextType {
    toasts: ToastItem[];
    toast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

let toastId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<ToastItem[]>([]);

    const toast = useCallback((msg: string, type: 'success' | 'error' | 'info' = 'info') => {
        const id = ++toastId;
        setToasts((prev) => [...prev, { id, msg, type }]);
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 3500);
    }, []);

    return (
        <ToastContext.Provider value={{ toasts, toast }}>
            {children}
            <div className="toast-wrap">
                {toasts.map((t) => (
                    <div key={t.id} className={`toast ${t.type}`}>
                        <span style={{ display: 'flex', alignItems: 'center' }}>
                            {t.type === 'success' ? <Check size={16} /> : t.type === 'error' ? <AlertCircle size={16} /> : <Info size={16} />}
                        </span>
                        <span>{t.msg}</span>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export function useToast() {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error('useToast must be used within ToastProvider');
    return ctx.toast;
}
