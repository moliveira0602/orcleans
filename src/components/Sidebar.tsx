import { useState } from 'react';
import { useAppState } from '../store';
import {
    LayoutDashboard,
    Users,
    Columns3,
    Radar,
    Upload,
    Grid3X3,
    Settings,
    LogOut,
    Crown,
    Shield,
    X,
    ChevronLeft,
    ChevronRight,
    Check,
    AlertTriangle
} from 'lucide-react';
import SonarButton from './SonarButton';
import { getScanStatus, SCAN_PRESETS } from '../utils/scanService';
import { useAuth } from '../services/auth';

type Page = 'dashboard' | 'leads' | 'pipeline' | 'insights' | 'import' | 'segments' | 'settings' | 'admin';

interface SidebarProps {
    currentPage: Page;
    onNavigate: (page: Page) => void;
    collapsed: boolean;
    onToggle: () => void;
    mobileOpen?: boolean;
}

function buildNavItems(isSuperAdmin: boolean): { section: string; items: { id: Page; label: string; icon: React.ReactNode }[] }[] {
    const items: { section: string; items: { id: Page; label: string; icon: React.ReactNode }[] }[] = [
        {
            section: 'PRINCIPAL',
            items: [
                { id: 'dashboard', label: 'Centro de Comando', icon: <LayoutDashboard size={20} strokeWidth={1.75} /> },
                { id: 'leads', label: 'Alvos', icon: <Users size={20} strokeWidth={1.75} /> },
                { id: 'pipeline', label: 'Corrente', icon: <Columns3 size={20} strokeWidth={1.75} /> },
                { id: 'insights', label: 'Sonar', icon: <Radar size={20} strokeWidth={1.75} /> },
            ],
        },
        {
            section: 'DADOS',
            items: [
                { id: 'import', label: 'Captura', icon: <Upload size={20} strokeWidth={1.75} /> },
                { id: 'segments', label: 'Cardumes', icon: <Grid3X3 size={20} strokeWidth={1.75} /> },
            ],
        },
        {
            section: 'CONTA',
            items: [
                { id: 'settings', label: 'Navegação', icon: <Settings size={20} strokeWidth={1.75} /> },
            ],
        },
    ];

    if (isSuperAdmin) {
        items[2].items.push({ id: 'admin', label: 'Admin', icon: <Shield size={20} strokeWidth={1.75} /> });
    }

        return items;
}

import { api } from '../services/api';
import { useEffect } from 'react';

export default function Sidebar({ currentPage, onNavigate, collapsed, onToggle, mobileOpen }: SidebarProps) {
    const { leads, settings } = useAppState();
    const [scanModalOpen, setScanModalOpen] = useState(false);
    const [org, setOrg] = useState<any>(null);
    
    useEffect(() => {
        api.get('/organizations/me').then(setOrg).catch(console.error);
    }, []);
    
    // Get scan status for Sonar button
    const preset = SCAN_PRESETS['clinicasOlhao'];
    const scanStatus = getScanStatus(preset.segment, preset.city);
    const { logout, isSuperAdmin } = useAuth();

    const navItems = buildNavItems(isSuperAdmin);

    const formatPlan = (plan: string) => {
        if (!plan) return 'Plano Free';
        if (plan === 'trial') return 'Teste Grátis';
        return `Plano ${plan.charAt(0).toUpperCase() + plan.slice(1)}`;
    };

    return (
        <aside className={`sidebar${collapsed ? ' collapsed' : ''}${mobileOpen ? ' mobile-open' : ''}`}>
            <div className="sidebar-logo">
                <img src="/images/ORCA-white.png" alt="ORCA" className="logo-img" style={{ height: collapsed ? '24px' : '22px' }} />
            </div>
            
            <nav className="sidebar-nav">
                {navItems.map((section) => (
                    <div key={section.section}>
                        {!collapsed && <div className="nav-section-label">{section.section}</div>}
                        {section.items.map((item) => (
                            <div key={item.id}>
                                <button
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
                                {/* Sonar Quick Access - Right after Navegação */}
                                {!collapsed && item.id === 'settings' && (
                                    <div className="sonar-quick-access" style={{ 
                                        padding: '4px 12px 0 12px',
                                    }}>
                                        <SonarButton
                                            onClick={() => setScanModalOpen(true)}
                                            hasCache={!!scanStatus?.hasCache}
                                            cachedCount={scanStatus?.cachedCount || 0}
                                            ageDays={scanStatus?.ageDays || 0}
                                            compact={true}
                                        />
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                ))}
            </nav>
            <div className="sidebar-footer" onClick={() => onNavigate('settings')} title={collapsed ? settings.name || 'Usuário' : undefined}>
                {!collapsed && (
                    <div>
                        <div className="user-name">{settings.name || 'Usuário'}</div>
                        <div className="user-role" style={{ textTransform: 'capitalize' }}>
                            {org ? formatPlan(org.plan) : '...'}
                        </div>
                    </div>
                )}
            </div>
            <button 
                className="sidebar-logout-btn" 
                onClick={logout}
                title="Sair"
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    padding: '10px 12px',
                    margin: '8px 12px 12px',
                    background: 'rgba(239, 68, 68, 0.1)',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                    borderRadius: 8,
                    color: '#EF4444',
                    cursor: 'pointer',
                    fontSize: 12,
                    fontWeight: 600,
                }}
            >
                <LogOut size={14} />
                <span>Sair</span>
            </button>

            <button
                className="sidebar-toggle"
                onClick={onToggle}
                title={collapsed ? 'Expandir menu' : 'Recolher menu'}
            >
                {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>

            {/* Quick Scan Modal - Simplified */}
            {scanModalOpen && (
                <div className="modal-overlay open" onClick={() => setScanModalOpen(false)}>
                    <div className="modal" style={{ maxWidth: 400 }} onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <Radar size={18} />
                                <div className="modal-title">Scan Rápido</div>
                            </div>
                            <button className="modal-close" onClick={() => setScanModalOpen(false)}><X size={18} /></button>
                        </div>
                        
                        <div style={{ marginBottom: 16 }}>
                            <div style={{ fontSize: 12, color: 'var(--t3)', marginBottom: 8 }}>
                                Segmento: <strong style={{ color: 'var(--t1)' }}>{preset.label}</strong>
                            </div>
                            <div style={{ fontSize: 12, color: 'var(--t3)', marginBottom: 4 }}>
                                Local: <strong style={{ color: 'var(--t1)' }}>{preset.city}</strong>
                            </div>
                        </div>

                        {scanStatus?.hasCache ? (
                            <div style={{
                                background: 'rgba(255, 255, 255, 0.08)', 
                                border: '1px solid rgba(255, 255, 255, 0.2)',
                                borderRadius: 8, 
                                padding: 12, 
                                marginBottom: 16,
                                fontSize: 12, 
                                color: 'var(--orca-accent)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8
                            }}>
                                <Check size={14} /> <span>Scan recente disponível<br/>
                                {scanStatus.cachedCount} estabelecimentos · {scanStatus.ageDays} dias atrás</span>
                            </div>
                        ) : (
                            <div style={{
                                background: 'var(--amber-dim)', 
                                border: '1px solid rgba(245,158,11,.25)',
                                borderRadius: 8, 
                                padding: 12, 
                                marginBottom: 16,
                                fontSize: 12, 
                                color: 'var(--amber)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8
                            }}>
                                <AlertTriangle size={14} /> <span>Nenhum scan recente. Execute um novo scan.</span>
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                            <button className="btn btn-ghost" onClick={() => setScanModalOpen(false)}>
                                Fechar
                            </button>
                            <button 
                                className="btn btn-primary" 
                                onClick={() => {
                                    onNavigate('insights');
                                    setScanModalOpen(false);
                                }}
                                style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                            >
                                <Radar size={16} />
                                <span>Abrir Sonar</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </aside>
    );
}
