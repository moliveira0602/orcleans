import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useToast } from '../components/Toast';
import { 
    Users, 
    Activity, 
    Server, 
    Wrench, 
    Search,
    Plus,
    Edit,
    Trash2,
    Key,
    RefreshCw,
    AlertTriangle,
    CheckCircle,
    XCircle,
    LogOut,
    Play,
    Pause,
    Check,
    X
} from 'lucide-react';

interface PlatformHealth {
    status: string;
    timestamp: string;
    uptime: number;
    database: {
        status: string;
        latency: number;
    };
    memory: {
        rss: number;
        heapUsed: number;
        heapTotal: number;
        external: number;
    };
    nodeVersion: string;
}

interface Stats {
    totalOrganizations: number;
    totalUsers: number;
    totalLeads: number;
    activeUsers: number;
    recentLogs: number;
    organizations: Array<{
        id: string;
        name: string;
        plan: string;
        maxLeads: number;
        maxImportBatch: number;
        maxUsers: number;
        _count: { users: number; leads: number };
        createdAt: string;
    }>;
}

interface User {
    id: string;
    name: string;
    email: string;
    role: string;
    isActive: boolean;
    lastLoginAt: string | null;
    lastSeenAt: string | null;
    leadCount: number;
    createdAt: string;
    organization: { id: string; name: string; plan: string };
}

interface Org {
    id: string;
    name: string;
    plan: string;
    maxUsers: number;
    _count: { users: number; leads: number };
}

interface Tenant {
    id: string;
    name: string;
    plan: string;
    maxLeads: number;
    maxImportBatch: number;
    maxUsers: number;
    createdAt: string;
    lastLoginAt: string | null;
    lastLeadAt: string | null;
    _count: { users: number; leads: number };
}

interface AuditLog {
    id: string;
    userId: string | null;
    userEmail: string | null;
    action: string;
    entityType: string;
    entityId: string | null;
    details: Record<string, unknown>;
    createdAt: string;
}

interface Diagnostics {
    database: {
        users: number;
        organizations: number;
        leads: number;
        activities: number;
        auditLogs: number;
    };
    recentErrors: AuditLog[];
    system: {
        nodeVersion: string;
        uptime: number;
        memory: {
            rss: number;
            heapUsed: number;
            heapTotal: number;
            external: number;
        };
    };
}

interface ViewAsUserData {
    user: {
        id: string;
        name: string;
        email: string;
        organization: string;
    };
    leads: any[];
    totalLeads: number;
}

interface ViewAsUserDashboard {
    user: {
        id: string;
        name: string;
        email: string;
        organization: string;
    };
    stats: {
        totalLeads: number;
        leadsByStage: { pipelineStage: string; _count: number }[];
    };
    recentLeads: any[];
    activities: any[];
}

interface PipelineData {
    user: {
        id: string;
        name: string;
        email: string;
    };
    pipeline: Record<string, { id: string; nome: string; score: number }[]>;
}

interface SystemConfig {
    maintenanceMode: boolean;
    maintenanceMsg: string;
}

interface OrcaLead {
    id: string;
    name: string;
    email: string;
    company: string | null;
    phone: string | null;
    message: string | null;
    type: string;
    status: string;
    createdAt: string;
}

type Tab = 'overview' | 'tenants' | 'users' | 'orcaLeads' | 'viewAs' | 'health' | 'logs' | 'support' | 'config';

const TAB_CONFIG = [
    { id: 'overview', label: 'Visão Geral', icon: Activity },
    { id: 'orcaLeads', label: 'Leads Orca', icon: Search },
    { id: 'tenants', label: 'Tenants', icon: Users },
    { id: 'users', label: 'Utilizadores', icon: Users },
    { id: 'viewAs', label: 'Ver como Utilizador', icon: Activity },
    { id: 'health', label: 'Estado do Sistema', icon: Server },
    { id: 'logs', label: 'Logs de Auditoria', icon: Search },
    { id: 'support', label: 'Suporte', icon: Wrench },
    { id: 'config', label: 'Configurações', icon: Wrench },
] as const;

export default function AdminPage() {
    const [activeTab, setActiveTab] = useState<Tab>('overview');
    const [stats, setStats] = useState<Stats | null>(null);
    const [health, setHealth] = useState<PlatformHealth | null>(null);
    const [users, setUsers] = useState<User[]>([]);
    const [orgs, setOrgs] = useState<Org[]>([]);
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [orcaLeads, setOrcaLeads] = useState<OrcaLead[]>([]);
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [selectedOrcaLead, setSelectedOrcaLead] = useState<OrcaLead | null>(null);
    const [showMessageModal, setShowMessageModal] = useState(false);
    const [logTotal, setLogTotal] = useState(0);
    const [diagnostics, setDiagnostics] = useState<Diagnostics | null>(null);
    const [systemConfig, setSystemConfig] = useState<SystemConfig | null>(null);
    
    const [selectedUserToView, setSelectedUserToView] = useState<string | null>(null);
    const [viewAsDashboard, setViewAsDashboard] = useState<ViewAsUserDashboard | null>(null);
    const [viewAsLeads, setViewAsLeads] = useState<ViewAsUserData | null>(null);
    const [viewAsPipeline, setViewAsPipeline] = useState<PipelineData | null>(null);
    const [viewAsLoading, setViewAsLoading] = useState(false);
    const [viewAsActiveView, setViewAsActiveView] = useState<'dashboard' | 'leads' | 'pipeline'>('dashboard');
    
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
    const [showEditUserModal, setShowEditUserModal] = useState(false);
    const [showAddTenantModal, setShowAddTenantModal] = useState(false);
    const [showEditTenantModal, setShowEditTenantModal] = useState(false);
    const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [logPage, setLogPage] = useState(1);
    const [logFilter, setLogFilter] = useState('');
    const [saving, setSaving] = useState(false);
    const toast = useToast();

    const [newName, setNewName] = useState('');
    const [newEmail, setNewEmail] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [newOrg, setNewOrg] = useState('');
    const [newRole, setNewRole] = useState('member');
    const [resetPassword, setResetPassword] = useState('');
    const [newTenantName, setNewTenantName] = useState('');
    const [newTenantPlan, setNewTenantPlan] = useState('starter');
    const [newTenantMaxLeads, setNewTenantMaxLeads] = useState(500);
    const [newTenantMaxImportBatch, setNewTenantMaxImportBatch] = useState(50);
    const [newTenantMaxUsers, setNewTenantMaxUsers] = useState(1);

    const fetchOverview = async () => {
        try {
            const [statsRes, healthRes] = await Promise.all([
                api.get<Stats>('/admin/stats'),
                api.get<PlatformHealth>('/admin/health').catch(() => null),
            ]);
            setStats(statsRes);
            setHealth(healthRes as PlatformHealth | null);
        } catch (err: any) {
            console.error('Overview fetch error:', err);
            setError(err.message || 'Erro ao carregar dados do admin');
        }
    };

    const fetchTenants = async () => {
        try {
            const tenantsRes = await api.get<Tenant[]>('/admin/tenants');
            setTenants(tenantsRes);
        } catch (err: any) {
            console.error('Tenants fetch error:', err);
        }
    };

    const fetchUsers = async () => {
        try {
            const [usersRes, orgsRes] = await Promise.all([
                api.get<User[]>('/admin/users'),
                api.get<Org[]>('/admin/organizations'),
            ]);
            setUsers(usersRes);
            setOrgs(orgsRes);
        } catch (err: any) {
            console.error('Users fetch error:', err);
        }
    };

    const sendHeartbeat = async (userId: string) => {
        try {
            await api.post(`/admin/users/${userId}/heartbeat`);
        } catch {
            // ignore - session may have expired
        }
    };

    const isUserOnline = (lastSeenAt: string | null): boolean => {
        if (!lastSeenAt) return false;
        const lastSeen = new Date(lastSeenAt).getTime();
        const now = Date.now();
        return (now - lastSeen) < 120000;
    };

    const fetchLogs = async (page = 1) => {
        try {
            const result = await api.get<{ logs: AuditLog[]; total: number }>(`/admin/logs?page=${page}&limit=20`);
            setLogs(result.logs);
            setLogTotal(result.total);
            setLogPage(page);
        } catch (err: any) {
            console.error('Logs fetch error:', err);
        }
    };

    const fetchDiagnostics = async () => {
        try {
            const result = await api.get<Diagnostics>('/admin/support/diagnostics');
            setDiagnostics(result);
        } catch (err: any) {
            console.error('Diagnostics fetch error:', err);
        }
    };

    const fetchConfig = async () => {
        try {
            const result = await api.get<SystemConfig>('/admin/config');
            if (!result || Object.keys(result).length === 0) {
                setSystemConfig({
                    maintenanceMode: false,
                    maintenanceMsg: 'Estamos em manutenção para melhorar a sua experiência. Voltamos em breve!'
                });
            } else {
                setSystemConfig(result);
            }
        } catch (err: any) {
            console.error('Config fetch error:', err);
            // Fallback for UI visibility even if fetch fails
            setSystemConfig({
                maintenanceMode: false,
                maintenanceMsg: 'Estamos em manutenção para melhorar a sua experiência. Voltamos em breve!'
            });
        }
    };

    const fetchViewAsDashboard = async (userId: string) => {
        setViewAsLoading(true);
        try {
            const result = await api.get<ViewAsUserDashboard>(`/admin/users/${userId}/dashboard`);
            setViewAsDashboard(result);
        } catch (err: any) {
            toast(err.response?.data?.error || 'Erro ao carregar dashboard', 'error');
        } finally {
            setViewAsLoading(false);
        }
    };

    const fetchViewAsLeads = async (userId: string) => {
        setViewAsLoading(true);
        try {
            const result = await api.get<ViewAsUserData>(`/admin/users/${userId}/leads`);
            setViewAsLeads(result);
        } catch (err: any) {
            toast(err.response?.data?.error || 'Erro ao carregar leads', 'error');
        } finally {
            setViewAsLoading(false);
        }
    };

    const fetchViewAsPipeline = async (userId: string) => {
        setViewAsLoading(true);
        try {
            const result = await api.get<PipelineData>(`/admin/users/${userId}/pipeline`);
            setViewAsPipeline(result);
        } catch (err: any) {
            toast(err.response?.data?.error || 'Erro ao carregar pipeline', 'error');
        } finally {
            setViewAsLoading(false);
        }
    };

    const handleSelectUserToView = (userId: string) => {
        setSelectedUserToView(userId);
        setViewAsActiveView('dashboard');
        fetchViewAsDashboard(userId);
    };

    const fetchOrcaLeads = async () => {
        try {
            const result = await api.get<OrcaLead[]>('/admin/orca-leads');
            setOrcaLeads(result);
        } catch (err: any) {
            console.error('Orca leads fetch error:', err);
        }
    };

    const handleUpdateOrcaLeadStatus = async (id: string, status: string) => {
        try {
            await api.patch(`/admin/orca-leads/${id}/status`, { status });
            toast('Status atualizado.', 'success');
            fetchOrcaLeads();
        } catch (err: any) {
            toast('Erro ao atualizar status', 'error');
        }
    };

    const handleDeleteOrcaLead = async (id: string) => {
        if (!confirm('Tem certeza que deseja remover este lead?')) return;
        try {
            await api.delete(`/admin/orca-leads/${id}`);
            toast('Lead removido.', 'success');
            fetchOrcaLeads();
        } catch (err: any) {
            toast('Erro ao remover lead', 'error');
        }
    };

    const handleViewAsTabChange = (view: 'dashboard' | 'leads' | 'pipeline') => {
        setViewAsActiveView(view);
        if (!selectedUserToView) return;
        
        if (view === 'dashboard') fetchViewAsDashboard(selectedUserToView);
        else if (view === 'leads') fetchViewAsLeads(selectedUserToView);
        else if (view === 'pipeline') fetchViewAsPipeline(selectedUserToView);
    };

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            const results = await Promise.allSettled([
                fetchOverview(),
                fetchTenants(),
                fetchUsers(),
                fetchOrcaLeads(),
                fetchLogs(),
                fetchDiagnostics(),
                fetchConfig(),
            ]);

            // Check if auth failed - redirect to login
            const hasAuthError = results.some(r => r.status === 'rejected' && (r as PromiseRejectedResult).reason?.message === 'Sessão expirada');
            if (hasAuthError) {
                return; // auth.tsx already redirects
            }
        } catch (err: any) {
            console.error('Admin fetch error:', err);
            setError(err.message || 'Erro ao carregar painel admin');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        const interval = setInterval(() => {
            fetchUsers().catch(() => {});
        }, 30000);
        return () => clearInterval(interval);
    }, []);

    const handleAddUser = async () => {
        if (!newName || !newEmail || !newPassword || !newOrg) {
            toast('Preencha todos os campos.', 'error');
            return;
        }
        setSaving(true);
        try {
            await api.post('/admin/users', {
                name: newName,
                email: newEmail,
                password: newPassword,
                organizationId: newOrg,
                role: newRole,
            });
            toast('Utilizador criado com sucesso!', 'success');
            closeAddModal();
            fetchUsers();
            fetchOverview();
        } catch (err: any) {
            toast(err.response?.data?.error || 'Erro ao criar utilizador', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleResetPassword = async () => {
        if (!resetPassword || resetPassword.length < 8) {
            toast('Password deve ter pelo menos 8 caracteres.', 'error');
            return;
        }
        setSaving(true);
        try {
            await api.patch(`/admin/users/${selectedUser?.id}/reset-password`, {
                newPassword: resetPassword,
            });
            toast('Password redefinida com sucesso!', 'success');
            closeResetPasswordModal();
        } catch (err: any) {
            toast(err.response?.data?.error || 'Erro ao redefinir password', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleToggleUser = async (id: string) => {
        try {
            await api.patch(`/admin/users/${id}/toggle`);
            toast('Estado atualizado.', 'success');
            fetchUsers();
            fetchOverview();
        } catch (err: any) {
            toast(err.response?.data?.error || 'Erro ao atualizar', 'error');
        }
    };

    const handleDeleteUser = async (id: string, name: string) => {
        if (!confirm(`Tem certeza que deseja remover "${name}"?`)) return;
        try {
            await api.delete(`/admin/users/${id}`);
            toast('Utilizador removido.', 'success');
            fetchUsers();
            fetchOverview();
        } catch (err: any) {
            toast(err.response?.data?.error || 'Erro ao remover', 'error');
        }
    };

    const openEditUser = (user: User) => {
        setSelectedUser(user);
        setNewName(user.name);
        setNewRole(user.role);
        setShowEditUserModal(true);
    };

    const handleEditUser = async () => {
        if (!selectedUser) return;
        setSaving(true);
        try {
            await api.patch(`/admin/users/${selectedUser.id}`, {
                name: newName,
                role: newRole,
            });
            toast('Utilizador atualizado.', 'success');
            closeEditUserModal();
            fetchUsers();
        } catch (err: any) {
            toast(err.response?.data?.error || 'Erro ao atualizar', 'error');
        } finally {
            setSaving(false);
        }
    };

    const closeAddModal = () => {
        setShowAddModal(false);
        setNewName('');
        setNewEmail('');
        setNewPassword('');
        setNewOrg('');
        setNewRole('member');
    };

    const closeResetPasswordModal = () => {
        setShowResetPasswordModal(false);
        setSelectedUser(null);
        setResetPassword('');
    };

    const closeEditUserModal = () => {
        setShowEditUserModal(false);
        setSelectedUser(null);
        setNewName('');
        setNewRole('member');
    };

    const handleAddTenant = async () => {
        if (!newTenantName) {
            toast('Preencha o nome do tenant.', 'error');
            return;
        }
        setSaving(true);
        try {
            await api.post('/admin/tenants', {
                name: newTenantName,
                plan: newTenantPlan,
                maxLeads: newTenantMaxLeads,
                maxImportBatch: newTenantMaxImportBatch,
                maxUsers: newTenantMaxUsers,
            });
            toast('Tenant criado com sucesso!', 'success');
            setShowAddTenantModal(false);
            setNewTenantName('');
            setNewTenantPlan('starter');
            setNewTenantMaxLeads(500);
            setNewTenantMaxImportBatch(50);
            setNewTenantMaxUsers(1);
            fetchTenants();
            fetchOverview();
        } catch (err: any) {
            toast(err.response?.data?.error || 'Erro ao criar tenant', 'error');
        } finally {
            setSaving(false);
        }
    };

    const openEditTenant = (tenant: Tenant) => {
        setSelectedTenant(tenant);
        setNewTenantName(tenant.name);
        setNewTenantPlan(tenant.plan);
        setNewTenantMaxLeads(tenant.maxLeads);
        setNewTenantMaxImportBatch(tenant.maxImportBatch ?? 50);
        setNewTenantMaxUsers(tenant.maxUsers);
        setShowEditTenantModal(true);
    };

    const handleEditTenant = async () => {
        if (!selectedTenant) return;
        setSaving(true);
        try {
            await api.patch(`/admin/tenants/${selectedTenant.id}`, {
                name: newTenantName,
                plan: newTenantPlan,
                maxLeads: newTenantMaxLeads,
                maxImportBatch: newTenantMaxImportBatch,
                maxUsers: newTenantMaxUsers,
            });
            toast('Tenant atualizado.', 'success');
            setShowEditTenantModal(false);
            setSelectedTenant(null);
            setNewTenantName('');
            setNewTenantPlan('starter');
            setNewTenantMaxLeads(500);
            setNewTenantMaxUsers(1);
            fetchTenants();
            fetchOverview();
        } catch (err: any) {
            toast(err.response?.data?.error || 'Erro ao atualizar', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteTenant = async (id: string, name: string) => {
        if (!confirm(`Tem certeza que deseja remover o tenant "${name}"? Todos os utilizadores e leads associados serão removidos.`)) return;
        try {
            await api.delete(`/admin/tenants/${id}`);
            toast('Tenant removido.', 'success');
            fetchTenants();
            fetchOverview();
        } catch (err: any) {
            toast(err.response?.data?.error || 'Erro ao remover', 'error');
        }
    };

    const closeAddTenantModal = () => {
        setShowAddTenantModal(false);
        setNewTenantName('');
        setNewTenantPlan('starter');
        setNewTenantMaxLeads(500);
        setNewTenantMaxUsers(1);
    };

    const closeEditTenantModal = () => {
        setShowEditTenantModal(false);
        setSelectedTenant(null);
        setNewTenantName('');
        setNewTenantPlan('starter');
        setNewTenantMaxLeads(500);
        setNewTenantMaxUsers(1);
    };

    const formatUptime = (seconds: number): string => {
        const days = Math.floor(seconds / 86400);
        const hours = Math.floor((seconds % 86400) / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        return `${days}d ${hours}h ${mins}m`;
    };

    const formatBytes = (bytes: number): string => {
        const mb = bytes / (1024 * 1024);
        return `${mb.toFixed(1)} MB`;
    };

    const filteredLogs = logFilter
        ? logs.filter(l => 
            l.action.toLowerCase().includes(logFilter.toLowerCase()) ||
            l.userEmail?.toLowerCase().includes(logFilter.toLowerCase()) ||
            l.entityType.toLowerCase().includes(logFilter.toLowerCase())
        )
        : logs;

    const handleUpdateConfig = async () => {
        if (!systemConfig) return;
        setSaving(true);
        try {
            const res = await api.patch<SystemConfig>('/admin/config', {
                maintenanceMode: systemConfig.maintenanceMode,
                maintenanceMsg: systemConfig.maintenanceMsg
            });
            setSystemConfig(res);
            toast('Configuração atualizada com sucesso!', 'success');
        } catch (err: any) {
            toast('Erro ao atualizar configuração', 'error');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div style={{ padding: 40, textAlign: 'center' }}>
                <div className="loading-spinner" />
                <div style={{ marginTop: 12, color: 'var(--t3)' }}>Carregando painel admin...</div>
            </div>
        );
    }

    if (error && !stats) {
        return (
            <div style={{ padding: 40, textAlign: 'center' }}>
                <AlertTriangle size={48} style={{ color: 'var(--red)', marginBottom: 16 }} />
                <div style={{ color: 'var(--red)', marginBottom: 16 }}>Erro: {error}</div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 16 }}>
                    <button className="btn btn-primary" onClick={fetchData}>
                        <RefreshCw size={16} /> Tentar novamente
                    </button>
                    <button className="btn btn-ghost" onClick={() => window.location.href = '/'}>
                        <LogOut size={16} /> Voltar ao Dashboard
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h1 style={{ fontFamily: 'var(--font-d)', fontSize: 24, margin: 0, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Wrench size={24} />
                    Painel de Admin
                </h1>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button className="btn btn-ghost btn-sm" onClick={fetchData} title="Atualizar">
                        <RefreshCw size={16} />
                    </button>
                </div>
            </div>

            <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
                {TAB_CONFIG.map((tab) => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            className={`btn ${activeTab === tab.id ? 'btn-primary' : 'btn-ghost'}`}
                            onClick={() => setActiveTab(tab.id as Tab)}
                            style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                        >
                            <Icon size={16} />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {activeTab === 'overview' && stats && (
                <div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
                        <div className="card kpi">
                            <div className="kpi-label">Organizações</div>
                            <div className="kpi-val">{stats.totalOrganizations}</div>
                        </div>
                        <div className="card kpi">
                            <div className="kpi-label">Utilizadores</div>
                            <div className="kpi-val">{stats.totalUsers}</div>
                        </div>
                        <div className="card kpi">
                            <div className="kpi-label">Leads</div>
                            <div className="kpi-val">{stats.totalLeads}</div>
                        </div>
                        <div className="card kpi">
                            <div className="kpi-label">Ativos</div>
                            <div className="kpi-val green">{stats.activeUsers}</div>
                        </div>
                    </div>

                    {health && (
                        <div className="card" style={{ marginBottom: 24 }}>
                            <div className="sec-header">
                                <div className="sec-title">Estado do Sistema</div>
                                <span className={`badge badge-${health.status === 'healthy' ? 'green' : 'red'}`}>
                                    {health.status === 'healthy' ? <CheckCircle size={12} /> : <XCircle size={12} />}
                                    {' '}{health.status}
                                </span>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16, padding: '16px 0' }}>
                                <div>
                                    <div style={{ fontSize: 12, color: 'var(--t3)' }}>Uptime</div>
                                    <div style={{ fontSize: 18, fontWeight: 600 }}>{formatUptime(health.uptime)}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: 12, color: 'var(--t3)' }}>DB Latency</div>
                                    <div style={{ fontSize: 18, fontWeight: 600 }}>{health.database.latency}ms</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: 12, color: 'var(--t3)' }}>Memory</div>
                                    <div style={{ fontSize: 18, fontWeight: 600 }}>{formatBytes(health.memory.heapUsed)}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: 12, color: 'var(--t3)' }}>Node</div>
                                    <div style={{ fontSize: 18, fontWeight: 600 }}>{health.nodeVersion}</div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="card">
                        <div className="sec-header">
                            <div className="sec-title">Organizações</div>
                        </div>
                        <table>
                            <thead>
                                <tr>
                                    <th>Nome</th>
                                    <th>Plano</th>
                                    <th>Utilizadores</th>
                                    <th>Leads</th>
                                    <th>Max Leads</th>
                                    <th>Criado em</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stats.organizations.map((org) => (
                                    <tr key={org.id}>
                                        <td>{org.name}</td>
                                        <td><span className="badge badge-blue">{org.plan}</span></td>
                                        <td>{org._count.users}</td>
                                        <td>{org._count.leads}</td>
                                        <td>{org.maxLeads}</td>
                                        <td>{new Date(org.createdAt).toLocaleDateString('pt-BR')}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'orcaLeads' && (
                <div className="card">
                    <div className="sec-header">
                        <div className="sec-title">Leads Recebidos (Site / Demo)</div>
                        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                            <div className="badge badge-blue">Total: {orcaLeads.length}</div>
                            <div className="badge badge-green">Novos: {orcaLeads.filter(l => l.status === 'new').length}</div>
                            <button className="btn btn-ghost btn-sm" onClick={fetchOrcaLeads}>
                                <RefreshCw size={16} />
                            </button>
                        </div>
                    </div>
                    <table>
                        <thead>
                            <tr>
                                <th>Data</th>
                                <th>Tipo</th>
                                <th>Nome</th>
                                <th>Contacto</th>
                                <th>Empresa</th>
                                <th>Status</th>
                                <th>Acções</th>
                            </tr>
                        </thead>
                        <tbody>
                            {orcaLeads.map((lead) => (
                                <tr key={lead.id}>
                                    <td style={{ fontSize: 12 }}>{new Date(lead.createdAt).toLocaleDateString('pt-PT')}</td>
                                    <td>
                                        <span className={`badge badge-${lead.type === 'demo' ? 'blue' : 'purple'}`}>
                                            {lead.type === 'demo' ? 'Demo' : 'Contacto'}
                                        </span>
                                    </td>
                                    <td>
                                        <div style={{ fontWeight: 600 }}>{lead.name}</div>
                                    </td>
                                    <td>
                                        <div style={{ fontSize: 13 }}>{lead.email}</div>
                                        <div style={{ fontSize: 11, color: 'var(--t3)' }}>{lead.phone || 'Sem telefone'}</div>
                                    </td>
                                    <td>{lead.company || '-'}</td>
                                    <td>
                                        <select 
                                            value={lead.status} 
                                            onChange={(e) => handleUpdateOrcaLeadStatus(lead.id, e.target.value)}
                                            style={{ 
                                                fontSize: 12, 
                                                padding: '4px 8px', 
                                                borderRadius: 6, 
                                                background: 'var(--bg-card)', 
                                                color: 'var(--t1)',
                                                border: '1px solid var(--border)'
                                            }}
                                        >
                                            <option value="new">Novo</option>
                                            <option value="contacted">Contactado</option>
                                            <option value="qualified">Qualificado</option>
                                            <option value="archived">Arquivado</option>
                                        </select>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: 8 }}>
                                            <button 
                                                className="btn btn-ghost btn-sm" 
                                                onClick={() => {
                                                    setSelectedOrcaLead(lead);
                                                    setShowMessageModal(true);
                                                }}
                                                title="Ver Detalhes"
                                            >
                                                <Search size={14} />
                                            </button>
                                            <button 
                                                className="btn btn-ghost btn-sm" 
                                                style={{ color: 'var(--red)', background: 'rgba(239, 68, 68, 0.05)' }}
                                                onClick={() => handleDeleteOrcaLead(lead.id)}
                                                title="Remover"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {orcaLeads.length === 0 && (
                                <tr>
                                    <td colSpan={7} style={{ textAlign: 'center', padding: 40, color: 'var(--t3)' }}>
                                        Nenhum lead recebido ainda.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {activeTab === 'tenants' && (
                <div className="card">
                    <div className="sec-header">
                        <div className="sec-title">Tenants (Organizações)</div>
                        <button className="btn btn-primary btn-sm" onClick={() => setShowAddTenantModal(true)}>
                            <Plus size={16} /> Novo Tenant
                        </button>
                    </div>
                    <table>
                        <thead>
                            <tr>
                                <th>Nome</th>
                                <th>Plano</th>
                                <th>Utilizadores</th>
                                <th>Leads</th>
                                <th>Limites</th>
                                <th>Criado em</th>
                                <th style={{ width: 100 }}>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tenants.map((tenant) => (
                                <tr key={tenant.id}>
                                    <td style={{ fontWeight: 600 }}>{tenant.name}</td>
                                    <td><span className="badge badge-blue">{tenant.plan}</span></td>
                                    <td>{tenant._count.users}/{tenant.maxUsers}</td>
                                    <td>{tenant._count.leads}</td>
                                    <td>
                                        <div style={{ fontSize: 11, color: 'var(--t3)' }}>
                                            Leads: {tenant.maxLeads}<br />
                                            Users: {tenant.maxUsers}
                                        </div>
                                    </td>
                                    <td>{new Date(tenant.createdAt).toLocaleDateString('pt-BR')}</td>
                                    <td>
                                        <div style={{ display: 'flex', gap: 4 }}>
                                            <button
                                                className="btn btn-ghost btn-sm"
                                                onClick={() => openEditTenant(tenant)}
                                                title="Editar"
                                            >
                                                <Edit size={14} />
                                            </button>
                                            <button
                                                className="btn btn-ghost btn-sm"
                                                onClick={() => handleDeleteTenant(tenant.id, tenant.name)}
                                                title="Remover"
                                                style={{ color: 'var(--red)' }}
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {activeTab === 'users' && (
                <div className="card">
                    <div className="sec-header">
                        <div className="sec-title">Utilizadores</div>
                        <button className="btn btn-primary btn-sm" onClick={() => setShowAddModal(true)}>
                            <Plus size={16} /> Novo Utilizador
                        </button>
                    </div>
                    <table>
                        <thead>
                            <tr>
                                <th>Live</th>
                                <th>Nome</th>
                                <th>Email</th>
                                <th>Organização</th>
                                <th>Plano</th>
                                <th>Role</th>
                                <th>Leads</th>
                                <th>Ativo</th>
                                <th>Último Login</th>
                                <th style={{ width: 140 }}>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((user) => (
                                <tr key={user.id}>
                                    <td>
                                        <span
                                            className={`badge badge-${isUserOnline(user.lastSeenAt) ? 'green' : 'red'}`}
                                            style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                        >
                                            <span
                                                style={{
                                                    width: 6,
                                                    height: 6,
                                                    borderRadius: '50%',
                                                    background: isUserOnline(user.lastSeenAt) ? 'var(--green)' : 'var(--red)',
                                                }}
                                            />
                                            {isUserOnline(user.lastSeenAt) ? 'Live' : 'Off'}
                                        </span>
                                    </td>
                                    <td>{user.name}</td>
                                    <td>{user.email}</td>
                                    <td>{user.organization.name}</td>
                                    <td><span className="badge badge-blue">{user.organization.plan}</span></td>
                                    <td>
                                        <span className={`badge ${user.role === 'super_admin' ? 'badge-red' : 'badge-gray'}`}>
                                            {user.role === 'super_admin' ? 'Super Admin' : user.role === 'admin' ? 'Admin' : 'Membro'}
                                        </span>
                                    </td>
                                    <td>
                                        <span className="badge badge-green">{user.leadCount}</span>
                                    </td>
                                    <td>
                                        <span className={`badge badge-${user.isActive ? 'green' : 'red'}`}>
                                            {user.isActive ? 'Sim' : 'Não'}
                                        </span>
                                    </td>
                                    <td>{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString('pt-BR') : 'Nunca'}</td>
                                    <td>
                                        <div style={{ display: 'flex', gap: 4 }}>
                                            <button
                                                className="btn btn-ghost btn-sm"
                                                onClick={() => {
                                                    setSelectedUser(user);
                                                    setShowResetPasswordModal(true);
                                                }}
                                                title="Redefinir Password"
                                                style={{ color: 'var(--amber)' }}
                                            >
                                                <Key size={14} />
                                            </button>
                                            <button
                                                className="btn btn-ghost btn-sm"
                                                onClick={() => openEditUser(user)}
                                                title="Editar"
                                            >
                                                <Edit size={14} />
                                            </button>
                                            <button
                                                className="btn btn-ghost btn-sm"
                                                onClick={() => handleToggleUser(user.id)}
                                                title={user.isActive ? 'Desativar' : 'Ativar'}
                                            >
                                                {user.isActive ? <Pause size={14} /> : <Play size={14} />}
                                            </button>
                                            <button
                                                className="btn btn-ghost btn-sm"
                                                onClick={() => handleDeleteUser(user.id, user.name)}
                                                title="Remover"
                                                style={{ color: 'var(--red)' }}
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {activeTab === 'viewAs' && (
                <div>
                    <div className="card" style={{ marginBottom: 24 }}>
                        <div className="sec-header">
                            <div className="sec-title">Selecionar Utilizador para Visualizar</div>
                        </div>
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            {users.filter(u => u.role !== 'super_admin').map((user) => (
                                <button
                                    key={user.id}
                                    className={`btn ${selectedUserToView === user.id ? 'btn-primary' : 'btn-ghost'}`}
                                    onClick={() => handleSelectUserToView(user.id)}
                                >
                                    {user.name} ({user.organization.name})
                                </button>
                            ))}
                        </div>
                    </div>

                    {selectedUserToView && (
                        <>
                            <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
                                <button
                                    className={`btn ${viewAsActiveView === 'dashboard' ? 'btn-primary' : 'btn-ghost'}`}
                                    onClick={() => handleViewAsTabChange('dashboard')}
                                >
                                    Dashboard
                                </button>
                                <button
                                    className={`btn ${viewAsActiveView === 'leads' ? 'btn-primary' : 'btn-ghost'}`}
                                    onClick={() => handleViewAsTabChange('leads')}
                                >
                                    Leads ({viewAsLeads?.totalLeads || viewAsDashboard?.stats.totalLeads || 0})
                                </button>
                                <button
                                    className={`btn ${viewAsActiveView === 'pipeline' ? 'btn-primary' : 'btn-ghost'}`}
                                    onClick={() => handleViewAsTabChange('pipeline')}
                                >
                                    Pipeline
                                </button>
                            </div>

                            {viewAsLoading ? (
                                <div style={{ padding: 40, textAlign: 'center' }}>
                                    <div className="loading-spinner" />
                                </div>
                            ) : (
                                <>
                                    {viewAsActiveView === 'dashboard' && viewAsDashboard && (
                                        <div>
                                            <div className="card" style={{ marginBottom: 16 }}>
                                                <div className="sec-header">
                                                    <div className="sec-title">
                                                        Visualizando como: {viewAsDashboard.user.name}
                                                    </div>
                                                    <span className="badge badge-blue">{viewAsDashboard.user.organization}</span>
                                                </div>
                                            </div>
                                            
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
                                                <div className="card kpi">
                                                    <div className="kpi-label">Total Leads</div>
                                                    <div className="kpi-val">{viewAsDashboard.stats.totalLeads}</div>
                                                </div>
                                                {viewAsDashboard.stats.leadsByStage.map((stage) => (
                                                    <div key={stage.pipelineStage} className="card kpi">
                                                        <div className="kpi-label">{stage.pipelineStage}</div>
                                                        <div className="kpi-val">{stage._count}</div>
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="card">
                                                <div className="sec-header">
                                                    <div className="sec-title">Leads Recentes</div>
                                                </div>
                                                <table>
                                                    <thead>
                                                        <tr>
                                                            <th>Nome</th>
                                                            <th>Score</th>
                                                            <th>Criado em</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {viewAsDashboard.recentLeads.slice(0, 10).map((lead: any) => (
                                                            <tr key={lead.id}>
                                                                <td>{lead.nome}</td>
                                                                <td>{lead.score}</td>
                                                                <td>{new Date(lead.createdAt).toLocaleDateString('pt-BR')}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    )}

                                    {viewAsActiveView === 'leads' && viewAsLeads && (
                                        <div className="card">
                                            <div className="sec-header">
                                                <div className="sec-title">
                                                    Leads de {viewAsLeads.user.name} ({viewAsLeads.user.organization})
                                                </div>
                                                <span className="badge badge-green">{viewAsLeads.totalLeads} leads</span>
                                            </div>
                                            <table>
                                                <thead>
                                                    <tr>
                                                        <th>Nome</th>
                                                        <th>Segmento</th>
                                                        <th>Score</th>
                                                        <th>Status</th>
                                                        <th>Criado em</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {viewAsLeads.leads.map((lead: any) => (
                                                        <tr key={lead.id}>
                                                            <td>{lead.nome}</td>
                                                            <td>{lead.segmento}</td>
                                                            <td>{lead.score}</td>
                                                            <td><span className="badge badge-gray">{lead.status}</span></td>
                                                            <td>{new Date(lead.createdAt).toLocaleDateString('pt-BR')}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}

                                    {viewAsActiveView === 'pipeline' && viewAsPipeline && (
                                        <div>
                                            <div className="card" style={{ marginBottom: 16 }}>
                                                <div className="sec-header">
                                                    <div className="sec-title">
                                                        Pipeline de {viewAsPipeline.user.name}
                                                    </div>
                                                </div>
                                            </div>
                                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 12 }}>
                                                {['novo', 'qualificado', 'proposta', 'negociacao', 'ganho', 'perdido'].map((stage) => (
                                                    <div key={stage} className="card" style={{ padding: 12 }}>
                                                        <div style={{ fontWeight: 600, marginBottom: 8, textTransform: 'capitalize' }}>
                                                            {stage} ({viewAsPipeline.pipeline[stage]?.length || 0})
                                                        </div>
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                                            {viewAsPipeline.pipeline[stage]?.slice(0, 5).map((lead) => (
                                                                <div key={lead.id} style={{ fontSize: 12, padding: '4px 8px', background: 'var(--bg-2)', borderRadius: 4 }}>
                                                                    <div style={{ fontWeight: 500 }}>{lead.nome}</div>
                                                                    <div style={{ color: 'var(--t3)' }}>Score: {lead.score}</div>
                                                                </div>
                                                            ))}
                                                            {(viewAsPipeline.pipeline[stage]?.length || 0) > 5 && (
                                                                <div style={{ fontSize: 11, color: 'var(--t3)', textAlign: 'center' }}>
                                                                    +{(viewAsPipeline.pipeline[stage]?.length || 0) - 5} mais
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </>
                    )}

                    {!selectedUserToView && (
                        <div className="card" style={{ padding: 40, textAlign: 'center' }}>
                            <p style={{ color: 'var(--t3)' }}>Selecione um utilizador acima para visualizar a sua conta</p>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'health' && health && (
                <div>
                    <div className="card">
                        <div className="sec-header">
                            <div className="sec-title">Estado do Servidor</div>
                            <span className={`badge badge-${health.status === 'healthy' ? 'green' : 'red'}`}>
                                {health.status === 'healthy' ? 'Online' : 'Offline'}
                            </span>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 24, padding: '16px 0' }}>
                            <div>
                                <div style={{ fontSize: 12, color: 'var(--t3)', marginBottom: 4 }}>Status</div>
                                <div style={{ fontSize: 24, fontWeight: 600, color: health.status === 'healthy' ? 'var(--green)' : 'var(--red)', display: 'flex', alignItems: 'center', gap: 8 }}>
                                    {health.status === 'healthy' ? <Check size={20} /> : <X size={20} />}
                                    <span>{health.status === 'healthy' ? 'Saúde OK' : 'Problema'}</span>
                                </div>
                            </div>
                            <div>
                                <div style={{ fontSize: 12, color: 'var(--t3)', marginBottom: 4 }}>Uptime</div>
                                <div style={{ fontSize: 24, fontWeight: 600 }}>{formatUptime(health.uptime)}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: 12, color: 'var(--t3)', marginBottom: 4 }}>Database Latency</div>
                                <div style={{ fontSize: 24, fontWeight: 600 }}>{health.database.latency}ms</div>
                            </div>
                            <div>
                                <div style={{ fontSize: 12, color: 'var(--t3)', marginBottom: 4 }}>Node Version</div>
                                <div style={{ fontSize: 24, fontWeight: 600 }}>{health.nodeVersion}</div>
                            </div>
                        </div>
                    </div>

                    <div className="card" style={{ marginTop: 24 }}>
                        <div className="sec-header">
                            <div className="sec-title">Uso de Memória</div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 24, padding: '16px 0' }}>
                            <div>
                                <div style={{ fontSize: 12, color: 'var(--t3)' }}>Heap Used</div>
                                <div style={{ fontSize: 18, fontWeight: 600 }}>{formatBytes(health.memory.heapUsed)}</div>
                                <div style={{ fontSize: 12, color: 'var(--t3)' }}>Heap Total: {formatBytes(health.memory.heapTotal)}</div>
                            </div>
                            <div>
                                <div style={{ fontSize: 12, color: 'var(--t3)' }}>RSS</div>
                                <div style={{ fontSize: 18, fontWeight: 600 }}>{formatBytes(health.memory.rss)}</div>
                                <div style={{ fontSize: 12, color: 'var(--t3)' }}>External: {formatBytes(health.memory.external)}</div>
                            </div>
                        </div>
                    </div>

                    <div style={{ marginTop: 8, fontSize: 12, color: 'var(--t3)' }}>
                        Última Atualização: {new Date(health.timestamp).toLocaleString('pt-BR')}
                    </div>
                </div>
            )}

            {activeTab === 'logs' && (
                <div className="card">
                    <div className="sec-header">
                        <div className="sec-title">Logs de Auditoria ({logTotal} total)</div>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                            <input
                                className="input"
                                placeholder="Filtrar logs..."
                                value={logFilter}
                                onChange={(e) => setLogFilter(e.target.value)}
                                style={{ width: 200 }}
                            />
                        </div>
                    </div>
                    <table>
                        <thead>
                            <tr>
                                <th>Data</th>
                                <th>Utilizador</th>
                                <th>Ação</th>
                                <th>Entidade</th>
                                <th>Detalhes</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredLogs.map((log) => (
                                <tr key={log.id}>
                                    <td style={{ whiteSpace: 'nowrap' }}>{new Date(log.createdAt).toLocaleString('pt-BR')}</td>
                                    <td>{log.userEmail || '-'}</td>
                                    <td>
                                        <span className={`badge ${
                                            log.action.includes('created') ? 'badge-green' :
                                            log.action.includes('deleted') ? 'badge-red' :
                                            log.action.includes('failed') ? 'badge-red' :
                                            'badge-gray'
                                        }`}>
                                            {log.action}
                                        </span>
                                    </td>
                                    <td>{log.entityType}</td>
                                    <td style={{ fontSize: 12, color: 'var(--t3)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {JSON.stringify(log.details).slice(0, 100)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {logTotal > 20 && (
                        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
                            <button
                                className="btn btn-ghost btn-sm"
                                disabled={logPage === 1}
                                onClick={() => fetchLogs(logPage - 1)}
                            >
                                Anterior
                            </button>
                            <span style={{ padding: '8px 16px' }}>Página {logPage}</span>
                            <button
                                className="btn btn-ghost btn-sm"
                                disabled={logPage * 20 >= logTotal}
                                onClick={() => fetchLogs(logPage + 1)}
                            >
                                Próxima
                            </button>
                        </div>
                    )}
                </div>
            )}

            {activeTab === 'support' && diagnostics && (
                <div>
                    <div className="card">
                        <div className="sec-header">
                            <div className="sec-title">Diagnósticos do Sistema</div>
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16, padding: '16px 0' }}>
                            <div className="kpi">
                                <div className="kpi-label">Utilizadores</div>
                                <div className="kpi-val">{diagnostics.database.users}</div>
                            </div>
                            <div className="kpi">
                                <div className="kpi-label">Organizações</div>
                                <div className="kpi-val">{diagnostics.database.organizations}</div>
                            </div>
                            <div className="kpi">
                                <div className="kpi-label">Leads</div>
                                <div className="kpi-val">{diagnostics.database.leads}</div>
                            </div>
                            <div className="kpi">
                                <div className="kpi-label">Audit Logs</div>
                                <div className="kpi-val">{diagnostics.database.auditLogs}</div>
                            </div>
                        </div>
                    </div>

                    <div className="card" style={{ marginTop: 24 }}>
                        <div className="sec-header">
                            <div className="sec-title">Informações do Servidor</div>
                        </div>
                        <div style={{ padding: '16px 0' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
                                <div>
                                    <div style={{ fontSize: 12, color: 'var(--t3)' }}>Node Version</div>
                                    <div style={{ fontWeight: 600 }}>{diagnostics.system.nodeVersion}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: 12, color: 'var(--t3)' }}>Uptime</div>
                                    <div style={{ fontWeight: 600 }}>{formatUptime(diagnostics.system.uptime)}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="card" style={{ marginTop: 24 }}>
                        <div className="sec-header">
                            <div className="sec-title">Ações Recentes</div>
                        </div>
                        <table>
                            <thead>
                                <tr>
                                    <th>Data</th>
                                    <th>Utilizador</th>
                                    <th>Ação</th>
                                </tr>
                            </thead>
                            <tbody>
                                {diagnostics.recentErrors.slice(0, 5).map((log) => (
                                    <tr key={log.id}>
                                        <td>{new Date(log.createdAt).toLocaleString('pt-BR')}</td>
                                        <td>{log.userEmail || '-'}</td>
                                        <td><span className="badge badge-gray">{log.action}</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {activeTab === 'config' && (
                !systemConfig ? (
                    <div className="card" style={{ padding: 40, textAlign: 'center' }}>
                        <div className="loading-spinner" />
                        <div style={{ marginTop: 12, color: 'var(--t3)' }}>Carregando configurações...</div>
                    </div>
                ) : (
                    <div className="card">
                        <div className="sec-header">
                            <div className="sec-title">Configurações Globais da Plataforma</div>
                        </div>
                        
                        <div style={{ padding: '24px 0', maxWidth: 600 }}>
                            <div style={{ marginBottom: 32 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                    <div>
                                        <h3 style={{ margin: 0, fontSize: 18 }}>Modo de Manutenção</h3>
                                        <p style={{ margin: '4px 0 0', color: 'var(--t3)', fontSize: 14 }}>
                                            Quando ativado, apenas Super Admins podem aceder à plataforma.
                                        </p>
                                    </div>
                                    <button 
                                        className={`btn ${systemConfig.maintenanceMode ? 'btn-red' : 'btn-ghost'}`}
                                        onClick={() => setSystemConfig({...systemConfig, maintenanceMode: !systemConfig.maintenanceMode})}
                                        style={{ minWidth: 120, display: 'flex', gap: 8, alignItems: 'center', justifyContent: 'center' }}
                                    >
                                        {systemConfig.maintenanceMode ? (
                                            <><Pause size={16} /> Ativado</>
                                        ) : (
                                            <><Play size={16} /> Desativado</>
                                        )}
                                    </button>
                                </div>
                            </div>

                            <div style={{ marginBottom: 32 }}>
                                <label className="input-label" style={{ fontSize: 16, marginBottom: 8, display: 'block' }}>
                                    Mensagem de Manutenção
                                </label>
                                <textarea 
                                    className="input" 
                                    style={{ minHeight: 120, resize: 'vertical', padding: '12px' }}
                                    value={systemConfig.maintenanceMsg}
                                    onChange={(e) => setSystemConfig({...systemConfig, maintenanceMsg: e.target.value})}
                                    placeholder="Insira uma mensagem educada para os utilizadores..."
                                />
                                <p style={{ margin: '8px 0 0', color: 'var(--t3)', fontSize: 12 }}>
                                    Esta mensagem será exibida a todos os utilizadores finais durante o período de manutenção.
                                </p>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                <button 
                                    className="btn btn-primary" 
                                    onClick={handleUpdateConfig}
                                    disabled={saving}
                                    style={{ display: 'flex', gap: 8, alignItems: 'center' }}
                                >
                                    <Check size={16} /> {saving ? 'A guardar...' : 'Guardar Configurações'}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            )}

            {showAddModal && (
                <div className="modal-overlay open" onClick={closeAddModal}>
                    <div className="modal" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <div className="modal-title">Novo Utilizador</div>
                            <button className="modal-close" onClick={closeAddModal}><X size={18} /></button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div>
                                <label className="input-label">Nome</label>
                                <input className="input" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nome completo" />
                            </div>
                            <div>
                                <label className="input-label">Email</label>
                                <input className="input" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="email@exemplo.com" />
                            </div>
                            <div>
                                <label className="input-label">Senha</label>
                                <input className="input" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Mínimo 8 caracteres" />
                            </div>
                            <div>
                                <label className="input-label">Organização</label>
                                <select className="input" value={newOrg} onChange={(e) => setNewOrg(e.target.value)}>
                                    <option value="">Selecionar...</option>
                                    {orgs.map((org) => (
                                        <option key={org.id} value={org.id}>
                                            {org.name} ({org._count.users}/{org.maxUsers} users)
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="input-label">Role</label>
                                <select className="input" value={newRole} onChange={(e) => setNewRole(e.target.value)}>
                                    <option value="member">Membro</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 24 }}>
                            <button className="btn btn-ghost" onClick={closeAddModal} disabled={saving}>Cancelar</button>
                            <button className="btn btn-primary" onClick={handleAddUser} disabled={saving}>
                                {saving ? 'Criando...' : 'Criar Utilizador'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showResetPasswordModal && selectedUser && (
                <div className="modal-overlay open" onClick={closeResetPasswordModal}>
                    <div className="modal" style={{ maxWidth: 400 }} onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <div className="modal-title">Redefinir Password</div>
                            <button className="modal-close" onClick={closeResetPasswordModal}><X size={18} /></button>
                        </div>
                        <div style={{ marginBottom: 16 }}>
                            <p>Nova password para <strong>{selectedUser.name}</strong> ({selectedUser.email})</p>
                        </div>
                        <div>
                            <label className="input-label">Nova Password</label>
                            <input
                                className="input"
                                type="password"
                                value={resetPassword}
                                onChange={(e) => setResetPassword(e.target.value)}
                                placeholder="Mínimo 8 caracteres"
                            />
                        </div>
                        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 24 }}>
                            <button className="btn btn-ghost" onClick={closeResetPasswordModal} disabled={saving}>Cancelar</button>
                            <button className="btn btn-primary" onClick={handleResetPassword} disabled={saving || resetPassword.length < 8}>
                                {saving ? 'A guardar...' : 'Guardar Nova Password'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showEditUserModal && selectedUser && (
                <div className="modal-overlay open" onClick={closeEditUserModal}>
                    <div className="modal" style={{ maxWidth: 400 }} onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <div className="modal-title">Editar Utilizador</div>
                            <button className="modal-close" onClick={closeEditUserModal}><X size={18} /></button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div>
                                <label className="input-label">Nome</label>
                                <input className="input" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nome completo" />
                            </div>
                            <div>
                                <label className="input-label">Role</label>
                                <select className="input" value={newRole} onChange={(e) => setNewRole(e.target.value)}>
                                    <option value="member">Membro</option>
                                    <option value="admin">Admin</option>
                                </select>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 24 }}>
                            <button className="btn btn-ghost" onClick={closeEditUserModal} disabled={saving}>Cancelar</button>
                            <button className="btn btn-primary" onClick={handleEditUser} disabled={saving}>
                                {saving ? 'A guardar...' : 'Guardar Alterações'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showAddTenantModal && (
                <div className="modal-overlay open" onClick={closeAddTenantModal}>
                    <div className="modal" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <div className="modal-title">Novo Tenant</div>
                            <button className="modal-close" onClick={closeAddTenantModal}><X size={18} /></button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div>
                                <label className="input-label">Nome</label>
                                <input className="input" value={newTenantName} onChange={(e) => setNewTenantName(e.target.value)} placeholder="Nome da organização" />
                            </div>
                            <div>
                                <label className="input-label">Plano</label>
                                <select className="input" value={newTenantPlan} onChange={(e) => setNewTenantPlan(e.target.value)}>
                                    <option value="starter">Starter</option>
                                    <option value="growth">Growth</option>
                                    <option value="enterprise">Enterprise</option>
                                </select>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div>
                                    <label className="input-label">Max Leads</label>
                                    <input className="input" type="number" value={newTenantMaxLeads} onChange={(e) => setNewTenantMaxLeads(parseInt(e.target.value) || 500)} />
                                </div>
                                <div>
                                    <label className="input-label">Max Import Batch</label>
                                    <input className="input" type="number" value={newTenantMaxImportBatch} onChange={(e) => setNewTenantMaxImportBatch(parseInt(e.target.value) || 50)} />
                                </div>
                            </div>
                            <div>
                                <label className="input-label">Max Users</label>
                                <input className="input" type="number" value={newTenantMaxUsers} onChange={(e) => setNewTenantMaxUsers(parseInt(e.target.value) || 1)} />
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 24 }}>
                            <button className="btn btn-ghost" onClick={closeAddTenantModal} disabled={saving}>Cancelar</button>
                            <button className="btn btn-primary" onClick={handleAddTenant} disabled={saving}>
                                {saving ? 'A criar...' : 'Criar Tenant'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showEditTenantModal && selectedTenant && (
                <div className="modal-overlay open" onClick={closeEditTenantModal}>
                    <div className="modal" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <div className="modal-title">Editar Tenant</div>
                            <button className="modal-close" onClick={closeEditTenantModal}><X size={18} /></button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            <div>
                                <label className="input-label">Nome</label>
                                <input className="input" value={newTenantName} onChange={(e) => setNewTenantName(e.target.value)} />
                            </div>
                            <div>
                                <label className="input-label">Plano</label>
                                <select className="input" value={newTenantPlan} onChange={(e) => setNewTenantPlan(e.target.value)}>
                                    <option value="starter">Starter</option>
                                    <option value="growth">Growth</option>
                                    <option value="enterprise">Enterprise</option>
                                </select>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div>
                                    <label className="input-label">Max Leads</label>
                                    <input className="input" type="number" value={newTenantMaxLeads} onChange={(e) => setNewTenantMaxLeads(parseInt(e.target.value) || 500)} />
                                </div>
                                <div>
                                    <label className="input-label">Max Import Batch</label>
                                    <input className="input" type="number" value={newTenantMaxImportBatch} onChange={(e) => setNewTenantMaxImportBatch(parseInt(e.target.value) || 50)} />
                                </div>
                            </div>
                            <div>
                                <label className="input-label">Max Users</label>
                                <input className="input" type="number" value={newTenantMaxUsers} onChange={(e) => setNewTenantMaxUsers(parseInt(e.target.value) || 1)} />
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 24 }}>
                            <button className="btn btn-ghost" onClick={closeEditTenantModal} disabled={saving}>Cancelar</button>
                            <button className="btn btn-primary" onClick={handleEditTenant} disabled={saving}>
                                {saving ? 'A guardar...' : 'Guardar Alterações'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {showMessageModal && selectedOrcaLead && (
                <div className="modal-overlay open" onClick={() => setShowMessageModal(false)}>
                    <div className="modal" style={{ maxWidth: 500 }} onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <div className="modal-title">Detalhes do Lead ORCA</div>
                            <button className="modal-close" onClick={() => setShowMessageModal(false)}><X size={18} /></button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                <div>
                                    <div style={{ fontSize: 11, color: 'var(--t3)', textTransform: 'uppercase' }}>Nome</div>
                                    <div style={{ fontWeight: 600 }}>{selectedOrcaLead.name}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: 11, color: 'var(--t3)', textTransform: 'uppercase' }}>Tipo</div>
                                    <div style={{ fontWeight: 600, color: selectedOrcaLead.type === 'demo' ? 'var(--blue)' : 'var(--purple)' }}>
                                        {selectedOrcaLead.type === 'demo' ? 'Pedido de Demo' : 'Contacto Geral'}
                                    </div>
                                </div>
                                <div>
                                    <div style={{ fontSize: 11, color: 'var(--t3)', textTransform: 'uppercase' }}>Email</div>
                                    <div>{selectedOrcaLead.email}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: 11, color: 'var(--t3)', textTransform: 'uppercase' }}>Telefone</div>
                                    <div>{selectedOrcaLead.phone || '—'}</div>
                                </div>
                            </div>
                            
                            {selectedOrcaLead.company && (
                                <div>
                                    <div style={{ fontSize: 11, color: 'var(--t3)', textTransform: 'uppercase' }}>Empresa</div>
                                    <div style={{ fontWeight: 600 }}>{selectedOrcaLead.company}</div>
                                </div>
                            )}

                            <div>
                                <div style={{ fontSize: 11, color: 'var(--t3)', textTransform: 'uppercase', marginBottom: 8 }}>Mensagem / Requisitos</div>
                                <div style={{ 
                                    padding: 16, 
                                    background: 'rgba(255,255,255,0.03)', 
                                    borderRadius: 8, 
                                    border: '1px solid var(--border)',
                                    fontSize: 14,
                                    lineHeight: 1.5,
                                    whiteSpace: 'pre-wrap'
                                }}>
                                    {selectedOrcaLead.message || 'O lead não deixou uma mensagem adicional.'}
                                </div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 24 }}>
                            <button className="btn btn-ghost" onClick={() => setShowMessageModal(false)}>Fechar</button>
                            <a 
                                href={`mailto:${selectedOrcaLead.email}`} 
                                className="btn btn-primary"
                                style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                            >
                                <Mail size={16} /> Responder via Email
                            </a>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
