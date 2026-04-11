import { useState, useEffect } from 'react';
import { api } from '../services/api';

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

export default function AdminPage() {
    const [stats, setStats] = useState<Stats | null>(null);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'stats' | 'users'>('stats');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [statsRes, usersRes] = await Promise.all([
                    api.get<Stats>('/admin/stats'),
                    api.get<User[]>('/admin/users'),
                ]);
                setStats(statsRes);
                setUsers(usersRes);
            } catch (err) {
                console.error('Admin fetch error:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    if (loading) {
        return <div style={{ padding: 40, textAlign: 'center' }}>Carregando...</div>;
    }

    return (
        <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
            <h1 style={{ fontFamily: 'var(--font-d)', fontSize: 24, marginBottom: 24 }}>Painel Admin</h1>
            
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
                                    <th>Criado em</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stats.organizations.map((org) => (
                                    <tr key={org.id}>
                                        <td>{org.name}</td>
                                        <td><span className="badge badge-blue">{org.plan}</span></td>
                                        <td>{org._count.users}</td>
                                        <td>{org._count.leads} / {org.maxLeads}</td>
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
                                <th>Ativo</th>
                                <th>Último Login</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((user) => (
                                <tr key={user.id}>
                                    <td>{user.name}</td>
                                    <td>{user.email}</td>
                                    <td>{user.organization.name}</td>
                                    <td><span className="badge badge-blue">{user.organization.plan}</span></td>
                                    <td>
                                        <span className={`badge badge-${user.isActive ? 'green' : 'red'}`}>
                                            {user.isActive ? 'Sim' : 'Não'}
                                        </span>
                                    </td>
                                    <td>{user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString('pt-BR') : 'Nunca'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}