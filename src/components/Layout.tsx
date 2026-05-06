import { useState, useCallback, useEffect } from 'react';
import Sidebar from './Sidebar';
import { Topbar } from './Topbar';
import Dashboard from '../pages/Dashboard';
import Leads from '../pages/Leads';
import Pipeline from '../pages/Pipeline';
import Insights from '../pages/Insights';
import ImportPage from '../pages/Import';
import Segments from '../pages/Segments';
import SettingsPage from '../pages/Settings';
import AdminPage from '../pages/Admin';
import LeadDetail from './LeadDetail';
import ImportInsightsPanel from './ImportInsightsPanel';
import CommandBar from './CommandBar';
import { analyzeLeadsWithAI, type LeadWithInsight, type AnalysisProgress } from '../services/aiAnalysis';
import { updateLead } from '../services/leads';
import { useAppState, useApp } from '../store';
import { useAuth } from '../services/auth';
import { EmptyState } from './ErrorBoundary';
import { Onboarding, useOnboarding } from './Onboarding';
import { FolderPlus, LayoutDashboard, Users, Columns3, Sparkles, Upload, Grid3X3, Settings, Crown } from 'lucide-react';

export type Page = 'dashboard' | 'leads' | 'pipeline' | 'insights' | 'import' | 'segments' | 'settings' | 'admin';

const MOBILE_NAV_ITEMS: { id: Page; icon: React.ReactNode; label: string }[] = [
    { id: 'dashboard', icon: <LayoutDashboard size={18} />, label: 'Início' },
    { id: 'leads', icon: <Users size={18} />, label: 'Alvos' },
    { id: 'pipeline', icon: <Columns3 size={18} />, label: 'Pipeline' },
    { id: 'insights', icon: <Sparkles size={18} />, label: 'Sonar' },
    { id: 'import', icon: <Upload size={18} />, label: 'Importar' },
    { id: 'segments', icon: <Grid3X3 size={18} />, label: 'Segmentos' },
    { id: 'settings', icon: <Settings size={18} />, label: 'Config' },
];

export default function Layout() {
    const { isLoading, leads, settings } = useAppState();
    const { refreshLeads } = useApp();
    const { isDone: onboardingDone } = useOnboarding();
    const { user, isSuperAdmin } = useAuth();
    const [showOnboarding, setShowOnboarding] = useState(!onboardingDone);
    const [currentPage, setCurrentPage] = useState<Page>('dashboard');
    const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
    const [mapLeadId, setMapLeadId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [insightLeads, setInsightLeads] = useState<any[] | null>(null);
    const [commandBarOpen, setCommandBarOpen] = useState(false);

    // Refresh leads on mount (Layout only renders when user is authenticated)
    useEffect(() => {
        refreshLeads();

        // Check URL for direct page access (e.g., returning from Stripe)
        const path = window.location.pathname;
        if (path.endsWith('/settings')) {
            setCurrentPage('settings');
        } else if (path.endsWith('/leads')) {
            setCurrentPage('leads');
        } else if (path.endsWith('/pipeline')) {
            setCurrentPage('pipeline');
        } else if (path.endsWith('/insights')) {
            setCurrentPage('insights');
        } else if (path.endsWith('/import')) {
            setCurrentPage('import');
        } else if (path.endsWith('/segments')) {
            setCurrentPage('segments');
        } else if (path.endsWith('/admin')) {
            setCurrentPage('admin');
        }

        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setCommandBarOpen(prev => !prev);
            }
            if (e.key === 'Escape') {
                setCommandBarOpen(false);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [refreshLeads]);



    const navigate = useCallback((page: Page) => {
        setCurrentPage(page);
        setSearchQuery('');
        setSelectedLeadId(null);
        setMapLeadId(null);
        setMobileMenuOpen(false);
    }, []);

    const openMapForLead = useCallback((leadId: string) => {
        setMapLeadId(leadId);
        setCurrentPage('insights');
    }, []);

    const handleSearch = useCallback((query: string) => {
        setSearchQuery(query);
        if (query && currentPage !== 'leads') {
            setCurrentPage('leads');
        }
    }, [currentPage]);

    const openDetail = useCallback((id: string) => {
        setSelectedLeadId(id);
    }, []);

    const closeDetail = useCallback(() => {
        setSelectedLeadId(null);
    }, []);

    const handleOnboardingComplete = useCallback(() => {
        setShowOnboarding(false);
        localStorage.setItem('orca_onboarding_done', 'true');
    }, []);

    const handleAnalyzeLeads = useCallback(async (
        leads: any[],
        onProgress: (progress: AnalysisProgress) => void,
    ) => {
        const results = await analyzeLeadsWithAI(leads, onProgress, 50, settings);

        // Save insights back to backend for each lead (fire-and-forget)
        for (const { lead, insight } of results) {
            if (lead.id && !lead.id.startsWith('lead_')) {
                updateLead(lead.id, { insight: insight as any }).catch(() => {
                    // Ignore errors — insights are nice-to-have
                });
            }
        }

        return results;
    }, []);

    const showEmptyState = !isLoading && leads.length === 0 && currentPage !== 'admin' && currentPage !== 'leads' && currentPage !== 'import' && currentPage !== 'segments' && currentPage !== 'settings' && currentPage !== 'insights' && currentPage !== 'pipeline' && currentPage !== 'dashboard';

    return (
        <div className="app">
            {showOnboarding && <Onboarding onComplete={handleOnboardingComplete} />}
            <div 
                className={`sidebar-overlay${mobileMenuOpen ? ' open' : ''}`} 
                onClick={() => setMobileMenuOpen(false)}
            />
            <Sidebar 
                currentPage={currentPage} 
                onNavigate={navigate} 
                collapsed={sidebarCollapsed} 
                onToggle={() => setSidebarCollapsed((c) => !c)}
                mobileOpen={mobileMenuOpen}
            />
            <div className="main">
                <Topbar 
                    currentPage={currentPage} 
                    onNavigate={navigate} 
                    onSearch={handleSearch}
                    onMobileMenuToggle={() => setMobileMenuOpen((o) => !o)}
                />
                <div className="content">
                    {isLoading ? (
                        <div className="skeleton-page">
                            <div className="skeleton-header" style={{ height: '32px', width: '200px', marginBottom: '24px' }} />
                            <div className="skeleton-grid">
                                {[1, 2, 3, 4].map((i) => (
                                    <div key={i} className="card skeleton-card" style={{ height: '120px' }} />
                                ))}
                            </div>
                        </div>
                    ) : showEmptyState ? (
                        <EmptyState
                            icon={<FolderPlus size={32} />}
                            title="Sem leads ainda"
                            description="Comece importando os seus leads ou use o Sonar para descobrir novos negócios na sua área."
                            action={{ label: 'Importar leads', onClick: () => navigate('import') }}
                        />
                    ) : (
                        <>
                            {currentPage === 'dashboard' && (
                                <Dashboard onNavigate={navigate} onOpenDetail={openDetail} />
                            )}
                            {currentPage === 'leads' && (
                                <Leads searchQuery={searchQuery} onSearch={setSearchQuery} onOpenDetail={openDetail} onOpenMap={openMapForLead} />
                            )}
                            {currentPage === 'pipeline' && (
                                <Pipeline onOpenDetail={openDetail} />
                            )}
                            {currentPage === 'insights' && <Insights onOpenDetail={openDetail} highlightedLeadId={mapLeadId} onShowInsights={setInsightLeads} />}
                            {currentPage === 'import' && <ImportPage onNavigate={navigate} onOpenDetail={openDetail} onShowInsights={setInsightLeads} />}
                            {currentPage === 'segments' && <Segments onNavigate={navigate} />}
                            {currentPage === 'settings' && <SettingsPage />}
                            {currentPage === 'admin' && isSuperAdmin && <AdminPage />}
                            {currentPage === 'admin' && !isSuperAdmin && (
                                <div style={{ padding: 40, textAlign: 'center', color: 'var(--t3)' }}>
                                    <h3>Acesso Restrito</h3>
                                    <p>Esta página é apenas para administradores.</p>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
            <LeadDetail
                leadId={selectedLeadId}
                onClose={closeDetail}
                onNavigate={setCurrentPage}
            />
            {insightLeads && (
                <ImportInsightsPanel
                    importedLeads={insightLeads}
                    onClose={() => setInsightLeads(null)}
                    onOpenDetail={openDetail}
                    analyzeLeads={handleAnalyzeLeads}
                />
            )}

            <CommandBar 
                isOpen={commandBarOpen} 
                onClose={() => setCommandBarOpen(false)}
                onNavigate={navigate}
                onOpenLead={openDetail}
            />
            <div className="mobile-bottom-nav">
                {MOBILE_NAV_ITEMS.slice(0, 6).map((item) => (
                    <button
                        key={item.id}
                        className={`mobile-nav-item${currentPage === item.id ? ' active' : ''}`}
                        onClick={() => navigate(item.id)}
                    >
                        {item.icon}
                        <span>{item.label}</span>
                    </button>
                ))}
            </div>
        </div>
    );
}
