import { Search, Bell, LogOut, Menu } from 'lucide-react';
import { useAppState } from '../store';
import { useToast } from './Toast';
import { useAuth } from '../services/auth';

type Page = 'dashboard' | 'leads' | 'pipeline' | 'insights' | 'import' | 'segments' | 'settings' | 'admin';

const PAGE_TITLES: Record<Page, string> = {
    dashboard: 'CENTRO DE COMANDO',
    leads: 'ALVOS',
    pipeline: 'CORRENTE',
    insights: 'SONAR',
    import: 'CAPTURA',
    segments: 'CARDUMES',
    settings: 'NAVEGAÇÃO',
    admin: 'ADMIN',
};

const PAGE_SUBTITLES: Record<Page, string> = {
    dashboard: 'Visão geral da sua base',
    leads: 'Gerencie seus contatos',
    pipeline: 'Acompanhe o funil de vendas',
    insights: 'Análise geográfica de leads',
    import: 'Carregue novos leads',
    segments: 'Segmentação automática',
    settings: 'Personalize sua experiência',
    admin: 'Estatísticas do sistema',
};

interface TopbarProps {
    currentPage: Page;
    onNavigate: (page: Page) => void;
    onSearch: (query: string) => void;
    onMobileMenuToggle?: () => void;
}

export function Topbar({ currentPage, onNavigate, onSearch, onMobileMenuToggle }: TopbarProps) {
    const { leads, settings } = useAppState();
    const toast = useToast();
    const { logout } = useAuth();

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
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button 
                    className="btn-icon mobile-menu-btn" 
                    onClick={onMobileMenuToggle}
                    title="Menu"
                >
                    <Menu size={20} strokeWidth={1.75} />
                </button>
                <div>
                    <div className="topbar-title" style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 700, letterSpacing: '0.08em', fontSize: '16px' }}>
                        {PAGE_TITLES[currentPage]}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--orca-text-muted)', marginTop: 2 }}>{PAGE_SUBTITLES[currentPage]}</div>
                </div>
            </div>
            <div className="topbar-right">
                <div className="search-wrap">
                    <span className="search-icon"><Search size={18} strokeWidth={1.75} /></span>
                    <input
                        className="input"
                        type="text"
                        placeholder="Buscar leads..."
                        onChange={(e) => onSearch(e.target.value)}
                    />
                </div>
                <button
                    type="button"
                    className="btn-topbar-import"
                    onClick={() => onNavigate('import')}
                    title="Importar leads"
                >
                    ↑ Importar
                </button>
                <button className="btn-icon" onClick={showNotif}>
                    <Bell size={20} strokeWidth={1.75} />
                </button>
                <button className="btn-icon" onClick={() => { if (confirm('Tem certeza que deseja sair?')) logout(); }} title="Sair">
                    <LogOut size={20} strokeWidth={1.75} />
                </button>
            </div>
        </div>
    );
}

export default Topbar;
