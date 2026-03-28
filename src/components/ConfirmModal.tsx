import { useState, useCallback, createContext, useContext, type ReactNode } from 'react';

interface ConfirmOptions {
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'danger' | 'default';
}

interface ConfirmContextType {
    confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | null>(null);

export function useConfirm() {
    const ctx = useContext(ConfirmContext);
    if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider');
    return ctx.confirm;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<{
        open: boolean;
        options: ConfirmOptions;
        resolve: ((value: boolean) => void) | null;
    }>({
        open: false,
        options: { title: '', message: '' },
        resolve: null,
    });

    const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
        return new Promise((resolve) => {
            setState({ open: true, options, resolve });
        });
    }, []);

    const handleConfirm = () => {
        state.resolve?.(true);
        setState((s) => ({ ...s, open: false, resolve: null }));
    };

    const handleCancel = () => {
        state.resolve?.(false);
        setState((s) => ({ ...s, open: false, resolve: null }));
    };

    const { open, options } = state;

    return (
        <ConfirmContext.Provider value={{ confirm }}>
            {children}
            <div
                className={`modal-overlay${open ? ' open' : ''}`}
                onClick={(e) => { if (e.target === e.currentTarget) handleCancel(); }}
            >
                <div className="modal" style={{ maxWidth: 420 }}>
                    <div className="modal-header">
                        <div className="modal-title">{options.title}</div>
                        <button className="modal-close" onClick={handleCancel}>✕</button>
                    </div>
                    <p style={{ fontSize: 14, color: 'var(--t2)', lineHeight: 1.6, marginBottom: 24 }}>
                        {options.message}
                    </p>
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                        <button className="btn btn-ghost" onClick={handleCancel}>
                            {options.cancelLabel || 'Cancelar'}
                        </button>
                        <button
                            className={`btn ${options.variant === 'danger' ? 'btn-danger' : 'btn-primary'}`}
                            onClick={handleConfirm}
                        >
                            {options.confirmLabel || 'Confirmar'}
                        </button>
                    </div>
                </div>
            </div>
        </ConfirmContext.Provider>
    );
}
