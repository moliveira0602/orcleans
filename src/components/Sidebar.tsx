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
    collapsed: boolean;
    onToggle: () => void;
}

const NAV_ITEMS: { section: string; items: { id: Page; label: string; icon: React.ReactNode }[] }[] = [
    {
        section: 'Principal',
        items: [
            { id: 'dashboard', label: 'Painel', icon: <LayoutDashboard size={16} /> },
            { id: 'leads', label: 'Leads', icon: <Users size={16} /> },
            { id: 'pipeline', label: 'Funil', icon: <Columns3 size={16} /> },
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

export default function Sidebar({ currentPage, onNavigate, collapsed, onToggle }: SidebarProps) {
    const { leads, settings } = useAppState();

    return (
        <aside className={`sidebar${collapsed ? ' collapsed' : ''}`}>
            <div className="sidebar-logo">
                <img src={collapsed ? "/images/logo/favicon-white.ico" : "/images/ORCA-white.png"} alt="ORCA" className="logo-img" style={{ height: collapsed ? '28px' : '22px' }} />
            </div>
            <nav className="sidebar-nav">
                {NAV_ITEMS.map((section) => (
                    <div key={section.section}>
                        {!collapsed && <div className="nav-section-label">{section.section}</div>}
                        {section.items.map((item) => (
                            <button
                                key={item.id}
                                className={`nav-item${currentPage === item.id ? ' active' : ''}`}
                                onClick={() => onNavigate(item.id)}
                                title={collapsed ? item.label : undefined}
                            >
                                <span className="nav-icon">{item.icon}</span>
                                {!collapsed && <span>{item.label}</span>}
                                {!collapsed && item.id === 'leads' && leads.length > 0 && (
                                    <span className="nav-badge">{leads.length}</span>
                                )}
                            </button>
                        ))}
                    </div>
                ))}
            </nav>
            <div className="sidebar-footer" onClick={() => onNavigate('settings')} title={collapsed ? settings.name || 'Usuário' : undefined}>
                <div className="avatar">{(settings.name || 'U')[0].toUpperCase()}</div>
                {!collapsed && (
                    <div>
                        <div className="user-name">{settings.name || 'Usuário'}</div>
                        <div className="user-role">Plano Profissional</div>
                    </div>
                )}
            </div>
            <button
                className="sidebar-toggle"
                onClick={onToggle}
                title={collapsed ? 'Expandir menu' : 'Recolher menu'}
            >
                {collapsed ? '→' : '←'}
            </button>
        </aside>
    );
}
