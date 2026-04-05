import { useState, useCallback } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import Dashboard from '../pages/Dashboard';
import Leads from '../pages/Leads';
import Pipeline from '../pages/Pipeline';
import Insights from '../pages/Insights';
import ImportPage from '../pages/Import';
import Segments from '../pages/Segments';
import SettingsPage from '../pages/Settings';
import LeadDetail from './LeadDetail';
import { useAppState } from '../store';

export type Page = 'dashboard' | 'leads' | 'pipeline' | 'insights' | 'import' | 'segments' | 'settings';

export default function Layout() {
    const { isLoading } = useAppState();
    const [currentPage, setCurrentPage] = useState<Page>('dashboard');
    const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
    const [mapLeadId, setMapLeadId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    const navigate = useCallback((page: Page) => {
        setCurrentPage(page);
        setSearchQuery('');
        setSelectedLeadId(null);
        setMapLeadId(null);
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

    return (
        <div className="app">
            <Sidebar currentPage={currentPage} onNavigate={navigate} collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed((c) => !c)} />
            <div className="main">
                <Topbar currentPage={currentPage} onNavigate={navigate} onSearch={handleSearch} />
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
                            {currentPage === 'insights' && <Insights onOpenDetail={openDetail} highlightedLeadId={mapLeadId} />}
                            {currentPage === 'import' && <ImportPage onNavigate={navigate} />}
                            {currentPage === 'segments' && <Segments onNavigate={navigate} />}
                            {currentPage === 'settings' && <SettingsPage />}
                        </>
                    )}
                </div>
            </div>
            <LeadDetail
                leadId={selectedLeadId}
                onClose={closeDetail}
                onNavigate={setCurrentPage}
            />
        </div>
    );
}
