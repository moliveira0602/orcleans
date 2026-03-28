import { Search, Bell } from 'lucide-react';
import { useAppState } from '../store';
import { useToast } from './Toast';

type Page = 'dashboard' | 'leads' | 'pipeline' | 'insights' | 'import' | 'segments' | 'settings';

const PAGE_TITLES: Record<Page, string> = {
    dashboard: 'Dashboard',
    leads: 'Leads',
    pipeline: 'Pipeline',
    insights: 'Insights IA',
    import: 'Importar',
    segments: 'Segmentos',
    settings: 'Configurações',
};

interface TopbarProps {
    currentPage: Page;
    onNavigate: (page: Page) => void;
    onSearch: (query: string) => void;
}

export default function Topbar({ currentPage, onNavigate, onSearch }: TopbarProps) {
    const { leads, settings } = useAppState();
    const toast = useToast();

    const showNotif = () => {
        const hot = leads.filter((l) => l._score >= settings.hotThreshold).length;
        toast(
            hot
                ? `🔥 ${hot} lead${hot !== 1 ? 's' : ''} quente${hot !== 1 ? 's' : ''} aguardando contato.`
                : 'Nenhuma notificação nova.',
            'info'
        );
    };

    return (
        <div className="topbar">
            <div className="topbar-title">{PAGE_TITLES[currentPage]}</div>
            <div className="topbar-right">
                <div className="search-wrap">
                    <span className="search-icon"><Search size={14} /></span>
                    <input
                        className="input"
                        type="text"
                        placeholder="Buscar leads..."
                        onChange={(e) => onSearch(e.target.value)}
                    />
                </div>
                <button
                    className="btn btn-primary btn-sm"
                    onClick={() => onNavigate('import')}
                >
                    ↑ Importar
                </button>
                <button className="btn-icon" onClick={showNotif}>
                    <Bell size={16} />
                </button>
            </div>
        </div>
    );
}
