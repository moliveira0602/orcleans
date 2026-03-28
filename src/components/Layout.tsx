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

export type Page = 'dashboard' | 'leads' | 'pipeline' | 'insights' | 'import' | 'segments' | 'settings';

export default function Layout() {
    const [currentPage, setCurrentPage] = useState<Page>('dashboard');
    const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const navigate = useCallback((page: Page) => {
        setCurrentPage(page);
        setSearchQuery('');
    }, []);

    const handleSearch = useCallback((query: string) => {
        if (query) {
            setCurrentPage('leads');
            setSearchQuery(query);
        }
    }, []);

    const openDetail = useCallback((id: string) => {
        setSelectedLeadId(id);
    }, []);

    const closeDetail = useCallback(() => {
        setSelectedLeadId(null);
    }, []);

    return (
        <div className="app">
            <Sidebar currentPage={currentPage} onNavigate={navigate} />
            <div className="main">
                <Topbar currentPage={currentPage} onNavigate={navigate} onSearch={handleSearch} />
                <div className="content">
                    {currentPage === 'dashboard' && (
                        <Dashboard onNavigate={navigate} onOpenDetail={openDetail} />
                    )}
                    {currentPage === 'leads' && (
                        <Leads searchQuery={searchQuery} onOpenDetail={openDetail} />
                    )}
                    {currentPage === 'pipeline' && (
                        <Pipeline onOpenDetail={openDetail} />
                    )}
                    {currentPage === 'insights' && <Insights />}
                    {currentPage === 'import' && <ImportPage />}
                    {currentPage === 'segments' && <Segments onNavigate={navigate} />}
                    {currentPage === 'settings' && <SettingsPage />}
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
