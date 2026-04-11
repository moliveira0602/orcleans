import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { useToast } from '../components/Toast';

interface Stats {
    totalOrganizations: number;
    totalUsers: number;
    totalLeads: number;
    activeUsers: number;
    organizations: Array<{
        id: string;
        name: string;
        plan: string;
        maxLeads: number;
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

export default function AdminPage() {
    const [stats, setStats] = useState<Stats | null>(null);
    const [users, setUsers] = useState<User[]>([]);
    const [orgs, setOrgs] = useState<Org[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'stats' | 'users'>('users');
    const [showAddModal, setShowAddModal] = useState(false);
    const [newName, setNewName] = useState('');
    const [newEmail, setNewEmail] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [newOrg, setNewOrg] = useState('');
    const [newRole, setNewRole] = useState('member');
    const [saving, setSaving] = useState(false);
    const toast = useToast();

    const fetchData = async () => {
        try {
            const [statsRes, usersRes, orgsRes] = await Promise.all([
                api.get<Stats>('/admin/stats'),
                api.get<User[]>('/admin/users'),
                api.get<Org[]>('/admin/organizations'),
            ]);
            setStats(statsRes);
            setUsers(usersRes);
            setOrgs(orgsRes);
        } catch (err) {
            console.error('Admin fetch error:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
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
            setShowAddModal(false);
            setNewName('');
            setNewEmail('');
            setNewPassword('');
            setNewOrg('');
            setNewRole('member');
            fetchData();
        } catch (err: any) {
            toast(err.response?.data?.error || 'Erro ao criar utilizador', 'error');
        } finally {
            setSaving(false);
        }
    };

    const handleToggleUser = async (id: string) => {
        try {
            await api.patch(`/admin/users/${id}/toggle`);
            toast('Estado atualizado.', 'success');
            fetchData();
        } catch (err: any) {
            toast(err.response?.data?.error || 'Erro ao atualizar', 'error');
        }
    };

    const handleDeleteUser = async (id: string, name: string) => {
        if (!confirm(`Tem certeza que deseja remover "${name}"?`)) return;
        try {
            await api.delete(`/admin/users/${id}`);
            toast('Utilizador removido.', 'success');
            fetchData();
        } catch (err: any) {
            toast(err.response?.data?.error || 'Erro ao remover', 'error');
        }
    };

    if (loading) {
        return <div style={{ padding: 40, textAlign: 'center' }}>Carregando...</div>;
    }

    return (
        <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <h1 style={{ fontFamily: 'var(--font-d)', fontSize: 24, margin: 0 }}>Painel Admin</h1>
            </div>
            
            <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
                <button 
                    className={`btn ${activeTab === 'stats' ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setActiveTab('stats')}
                >
                    Estatísticas
                </button>
                <button 
                    className={`btn ${activeTab === 'users' ? 'btn-primary' : 'btn-ghost'}`}
                    onClick={() => setActiveTab('users')}
                >
                    Utilizadores
                </button>
                {activeTab === 'users' && (
                    <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
                        + Novo Utilizador
                    </button>
                )}
            </div>

            {activeTab === 'stats' && stats && (
                <>
                    <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 32 }}>
                        <div className="kpi">
                            <div className="kpi-label">Organizações</div>
                            <div className="kpi-val">{stats.totalOrganizations}</div>
                        </div>
                        <div className="kpi">
                            <div className="kpi-label">Utilizadores</div>
                            <div className="kpi-val">{stats.totalUsers}</div>
                        </div>
                        <div className="kpi">
                            <div className="kpi-label">Leads</div>
                            <div className="kpi-val">{stats.totalLeads}</div>
                        </div>
                        <div className="kpi">
                            <div className="kpi-label">Ativos</div>
                            <div className="kpi-val green">{stats.activeUsers}</div>
                        </div>
                    </div>

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
                </>
            )}

            {activeTab === 'users' && (
                <div className="card">
                    <table>
                        <thead>
                            <tr>
                                <th>Nome</th>
                                <th>Email</th>
                                <th>Organização</th>
                                <th>Plano</th>
                                <th>Role</th>
                                <th>Ativo</th>
                                <th>Último Login</th>
                                <th>Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((user) => (
                                <tr key={user.id}>
                                    <td>{user.name}</td>
                                    <td>{user.email}</td>
                                    <td>{user.organization.name}</td>
                                    <td><span className="badge badge-blue">{user.organization.plan}</span></td>
                                    <td><span className="badge badge-gray">{user.role}</span></td>
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
                                                onClick={() => handleToggleUser(user.id)}
                                                title={user.isActive ? 'Desativar' : 'Ativar'}
                                            >
                                                {user.isActive ? '⏸' : '▶'}
                                            </button>
                                            <button 
                                                className="btn btn-ghost btn-sm" 
                                                onClick={() => handleDeleteUser(user.id, user.name)}
                                                title="Remover"
                                                style={{ color: 'var(--red)' }}
                                            >
                                                🗑
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {showAddModal && (
                <div className="modal-overlay open" onClick={() => setShowAddModal(false)}>
                    <div className="modal" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <div className="modal-title">Novo Utilizador</div>
                            <button className="modal-close" onClick={() => setShowAddModal(false)}>✕</button>
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
                                <input className="input" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Mínimo 6 caracteres" />
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
                            <button className="btn btn-ghost" onClick={() => setShowAddModal(false)} disabled={saving}>
                                Cancelar
                            </button>
                            <button className="btn btn-primary" onClick={handleAddUser} disabled={saving}>
                                {saving ? 'Criando...' : 'Criar Utilizador'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}