import { useAppState } from '../store';
import {
    LayoutDashboard,
    Users,
    Columns3,
    Sparkles,
    Upload,
    Grid3X3,
    Settings,
} from 'lucide-react';

type Page = 'dashboard' | 'leads' | 'pipeline' | 'insights' | 'import' | 'segments' | 'settings';

interface SidebarProps {
    currentPage: Page;
    onNavigate: (page: Page) => void;
}

const NAV_ITEMS: { section: string; items: { id: Page; label: string; icon: React.ReactNode }[] }[] = [
    {
        section: 'Principal',
        items: [
            { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={16} /> },
            { id: 'leads', label: 'Leads', icon: <Users size={16} /> },
            { id: 'pipeline', label: 'Pipeline', icon: <Columns3 size={16} /> },
            { id: 'insights', label: 'GeoScout', icon: <Sparkles size={16} /> },
        ],
    },
    {
        section: 'Dados',
        items: [
            { id: 'import', label: 'Importar', icon: <Upload size={16} /> },
            { id: 'segments', label: 'Segmentos', icon: <Grid3X3 size={16} /> },
        ],
    },
    {
        section: 'Conta',
        items: [
            { id: 'settings', label: 'Configurações', icon: <Settings size={16} /> },
        ],
    },
];

export default function Sidebar({ currentPage, onNavigate }: SidebarProps) {
    const { leads, settings } = useAppState();

    return (
        <aside className="sidebar">
            <div className="sidebar-logo">
                <span className="logo-mark">OrcaLens</span>
                <div className="logo-sub">Inteligência Comercial</div>
            </div>
            <nav className="sidebar-nav">
                {NAV_ITEMS.map((section) => (
                    <div key={section.section}>
                        <div className="nav-section-label">{section.section}</div>
                        {section.items.map((item) => (
                            <button
                                key={item.id}
                                className={`nav-item${currentPage === item.id ? ' active' : ''}`}
                                onClick={() => onNavigate(item.id)}
                            >
                                <span className="nav-icon">{item.icon}</span>
                                <span>{item.label}</span>
                                {item.id === 'leads' && leads.length > 0 && (
                                    <span className="nav-badge">{leads.length}</span>
                                )}
                            </button>
                        ))}
                    </div>
                ))}
            </nav>
            <div className="sidebar-footer" onClick={() => onNavigate('settings')}>
                <div className="avatar">{(settings.name || 'U')[0].toUpperCase()}</div>
                <div>
                    <div className="user-name">{settings.name || 'Usuário'}</div>
                    <div className="user-role">Plano Profissional</div>
                </div>
            </div>
        </aside>
    );
}
