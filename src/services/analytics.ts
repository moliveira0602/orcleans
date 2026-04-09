import { useEffect } from 'react';

const GA_ID = import.meta.env.VITE_GA_ID;

export function usePageView(path: string) {
    useEffect(() => {
        if (GA_ID && typeof window !== 'undefined' && window.gtag) {
            window.gtag('config', GA_ID, {
                page_path: path,
            });
        }
    }, [path]);
}

export function trackEvent(name: string, params?: Record<string, unknown>) {
    if (GA_ID && typeof window !== 'undefined' && window.gtag) {
        window.gtag('event', name, params);
    }
}

declare global {
    interface Window {
        gtag: (...args: any[]) => void;
    }
}
