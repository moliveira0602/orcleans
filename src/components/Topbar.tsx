import { Search, Bell } from 'lucide-react';
import { useAppState } from '../store';
import { useToast } from './Toast';

type Page = 'dashboard' | 'leads' | 'pipeline' | 'insights' | 'import' | 'segments' | 'settings';

const PAGE_TITLES: Record<Page, string> = {
    dashboard: 'Painel',
    leads: 'Leads',
    pipeline: 'Funil',
    insights: 'GeoScout',
    import: 'Importar',
    segments: 'Segmentos',
    settings: 'Configurações',
};

const PAGE_SUBTITLES: Record<Page, string> = {
    dashboard: 'Visão geral da sua base',
    leads: 'Gerencie seus contatos',
    pipeline: 'Acompanhe o funil de vendas',
    insights: 'Análise geográfica de leads',
    import: 'Carregue novos leads',
    segments: 'Segmentação automática',
    settings: 'Personalize sua experiência',
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
            <div>
                <div className="topbar-title">{PAGE_TITLES[currentPage]}</div>
                <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 2 }}>{PAGE_SUBTITLES[currentPage]}</div>
            </div>
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
