import { useAppState, useAppDispatch } from '../store';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmModal';
import { exportLeadsCsv } from '../utils/export';
import { api } from '../services/api';
import { useState, useEffect } from 'react';
import { useAuth } from '../services/auth';
import { Code, RefreshCw, Zap } from 'lucide-react';
import { billingApi } from '../services/billing';

export default function SettingsPage() {
    const { settings, leads, imports } = useAppState();
    const dispatch = useAppDispatch();
    const toast = useToast();
    const confirm = useConfirm();
    const { refreshProfile } = useAuth();
    const [isExporting, setIsExporting] = useState(false);
    const [isClearing, setIsClearing] = useState(false);
    const [savingProfile, setSavingProfile] = useState(false);
    const [org, setOrg] = useState<any>(null);
    const [loadingOrg, setLoadingOrg] = useState(false);

    useEffect(() => {
        fetchOrg();
    }, []);

    const fetchOrg = async () => {
        setLoadingOrg(true);
        try {
            const res = await api.get('/organizations/me');
            setOrg(res);
        } catch (err) {
            console.error('Failed to fetch org:', err);
        } finally {
            setLoadingOrg(false);
        }
    };

    const handleRotateKey = async () => {
        const ok = await confirm({
            title: 'Rodar Chave de API',
            message: 'A chave antiga deixará de funcionar imediatamente. Deseja continuar?',
            confirmLabel: 'Rodar Chave',
            variant: 'danger',
        });
        if (!ok) return;

        setLoadingOrg(true);
        try {
            const res = await api.post<any>('/organizations/rotate-key', {});
            setOrg((prev: any) => ({ ...prev, apiKey: res.apiKey }));
            toast('Nova chave gerada!', 'success');
        } catch (err) {
            toast('Erro ao rodar chave.', 'error');
        } finally {
            setLoadingOrg(false);
        }
    };

    const updateSetting = (key: string, value: any) => {
        dispatch({ type: 'UPDATE_SETTINGS', payload: { [key]: value } });
        // Persist local settings (thresholds and notifications)
        if (['hotThreshold', 'warmThreshold', 'notifHot', 'notifDaily'].includes(key)) {
            const current = JSON.parse(localStorage.getItem('orca_settings') || '{}');
            localStorage.setItem('orca_settings', JSON.stringify({ ...current, [key]: value }));
        }
    };

    const handleSaveProfile = async () => {
        setSavingProfile(true);
        try {
            // Persist locally first — always works regardless of server
            const current = JSON.parse(localStorage.getItem('orca_settings') || '{}');
            localStorage.setItem('orca_settings', JSON.stringify({
                ...current,
                name: settings.name,
                email: settings.email,
                company: settings.company,
            }));

            // Best-effort API call — update on server if available
            try {
                await api.patch<any>('/auth/me', {
                    name: settings.name,
                    email: settings.email,
                    company: settings.company,
                });
                await refreshProfile();
            } catch {
                // Server update failed — local save still succeeded
            }

            toast('Perfil guardado com sucesso.', 'success');
        } catch (err: any) {
            toast('Erro ao guardar perfil.', 'error');
        } finally {
            setSavingProfile(false);
        }
    };

    const clearAll = async () => {
        const ok = await confirm({
            title: 'Limpar Todos os Dados',
            message: 'Tem certeza? Todos os leads, importações e atividades serão removidos permanentemente. Esta ação não pode ser desfeita.',
            confirmLabel: 'Limpar tudo',
            variant: 'danger',
        });
        if (!ok) return;
        
        setIsClearing(true);
        try {
            await api.delete('/leads');
            dispatch({ type: 'CLEAR_ALL' });
            toast('Todos os dados foram removidos.', 'info');
        } catch (err) {
            toast('Erro ao limpar base.', 'error');
        } finally {
            setIsClearing(false);
        }
    };

    const handleExport = async () => {
        if (!leads.length) { toast('Nenhum lead para exportar.', 'info'); return; }
        setIsExporting(true);
        try {
            await new Promise(resolve => setTimeout(resolve, 800)); // Visual feedback
            exportLeadsCsv(leads);
            toast('CSV exportado com sucesso.', 'success');
        } finally {
            setIsExporting(false);
        }
    };

    const handleUpgrade = async (planName: string) => {
        if (planName.toLowerCase() === 'enterprise') {
            toast('Para o plano Enterprise, por favor contacte o nosso suporte.', 'info');
            return;
        }

        try {
            toast(`A preparar checkout para o plano ${planName}...`, 'info');
            const { url } = await billingApi.createCheckoutSession(planName.toLowerCase());
            window.location.href = url; // Redirect to Stripe
        } catch (err: any) {
            toast(err.message || 'Erro ao iniciar checkout', 'error');
        }
    };

    return (
        <>
            <div className="grid-2">
                <div>
                    <div className="card settings-section">
                        <div className="settings-title">Perfil</div>
                        <div className="form-group">
                            <label className="form-label">Nome</label>
                            <input className="input" type="text" placeholder="Seu nome" value={settings.name} onChange={(e) => updateSetting('name', e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Email</label>
                            <input className="input" type="email" placeholder="email@empresa.com" value={settings.email} onChange={(e) => updateSetting('email', e.target.value)} />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Empresa</label>
                            <input className="input" type="text" placeholder="Nome da empresa" value={settings.company} onChange={(e) => updateSetting('company', e.target.value)} />
                        </div>
                        <button className="btn btn-primary" style={{ marginTop: 12, width: '100%' }} onClick={handleSaveProfile} disabled={savingProfile}>
                            {savingProfile ? 'A guardar...' : 'Guardar perfil'}
                        </button>
                    </div>

                    <div className="card settings-section" style={{ marginTop: 16 }}>
                        <div className="settings-title">Scoring</div>
                        <div className="settings-row">
                            <div>
                                <div className="settings-label">Threshold lead quente</div>
                                <div className="settings-sub">Score mínimo para classificar como quente (0-10)</div>
                            </div>
                            <input className="input" type="number" min={1} max={10} value={settings.hotThreshold} style={{ width: 70, textAlign: 'center' }} onChange={(e) => updateSetting('hotThreshold', +e.target.value)} />
                        </div>
                        <div className="settings-row">
                            <div>
                                <div className="settings-label">Threshold lead morno</div>
                                <div className="settings-sub">Score mínimo para classificar como morno (0-10)</div>
                            </div>
                            <input className="input" type="number" min={1} max={10} value={settings.warmThreshold} style={{ width: 70, textAlign: 'center' }} onChange={(e) => updateSetting('warmThreshold', +e.target.value)} />
                        </div>
                    </div>
                </div>

                <div>
                    <div className="card settings-section">
                        <div className="settings-title">Notificações</div>
                        <div className="settings-row">
                            <div>
                                <div className="settings-label">Leads quentes detectados</div>
                                <div className="settings-sub">Alertar quando score ≥ threshold</div>
                            </div>
                            <label className="toggle">
                                <input 
                                    type="checkbox" 
                                    checked={!!settings.notifHot} 
                                    onChange={(e) => updateSetting('notifHot', e.target.checked)} 
                                />
                                <div className="toggle-track" />
                                <div className="toggle-thumb" />
                            </label>
                        </div>
                        <div className="settings-row">
                            <div>
                                <div className="settings-label">Resumo diário</div>
                                <div className="settings-sub">Email com métricas do dia</div>
                            </div>
                            <label className="toggle">
                                <input 
                                    type="checkbox" 
                                    checked={!!settings.notifDaily} 
                                    onChange={(e) => updateSetting('notifDaily', e.target.checked)} 
                                />
                                <div className="toggle-track" />
                                <div className="toggle-thumb" />
                            </label>
                        </div>
                    </div>

                    <div className="card" style={{ marginTop: 16 }}>
                        <div className="settings-title">Assinatura & Plano</div>
                        
                        <div style={{ marginBottom: 20, padding: 16, background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px solid rgba(255,255,255,0.05)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                <div>
                                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase' }}>Plano Atual</div>
                                    <div style={{ fontSize: 18, fontWeight: 800, color: '#FFF', textTransform: 'capitalize' }}>
                                        {loadingOrg ? '...' : (org?.plan === 'trial' ? 'Teste Grátis (7 dias)' : org?.plan || 'Free')}
                                    </div>
                                </div>
                                {org?.plan === 'trial' && org?.trialExpiresAt && (
                                    <div style={{ textAlign: 'right' }}>
                                        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase' }}>Expira em</div>
                                        <div style={{ fontSize: 12, fontWeight: 600, color: '#FFF' }}>
                                            {Math.max(0, Math.ceil((new Date(org.trialExpiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))} dias
                                        </div>
                                    </div>
                                )}
                            </div>

                            {(() => {
                                const PLAN_LIMITS: Record<string, number> = {
                                    'trial': 50,
                                    'starter': 500,
                                    'pro': 2000,
                                    'enterprise': 10000
                                };
                                const effectiveMax = org?.maxLeads > 0 ? org.maxLeads : (PLAN_LIMITS[org?.plan?.toLowerCase()] || 50);
                                const consumption = org?.leadsConsumed || 0;
                                
                                return (
                                    <>
                                        <div style={{ marginBottom: 6, display: 'flex', justifyContent: 'space-between', fontSize: 11, fontWeight: 600 }}>
                                            <span style={{ color: 'var(--t2)' }}>Consumo de Leads</span>
                                            <span style={{ color: '#FFF' }}>{consumption} / {effectiveMax}</span>
                                        </div>
                                        <div style={{ height: 6, background: 'rgba(255,255,255,0.05)', borderRadius: 3, overflow: 'hidden' }}>
                                            <div style={{ 
                                                height: '100%', 
                                                background: '#FFF', 
                                                width: `${Math.min(100, (consumption / effectiveMax) * 100)}%`,
                                                transition: 'width 0.5s ease'
                                            }} />
                                        </div>
                                    </>
                                );
                            })()}
                        </div>

                        <div className="settings-row" style={{ border: 'none', padding: 0 }}>
                            <div style={{ width: '100%' }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', marginBottom: 12 }}>Próximos Níveis</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                    {[
                                        { id: 'starter', name: 'Starter', price: '49', leads: '500' },
                                        { id: 'pro', name: 'Pro', price: '99', leads: '2.000', hot: true },
                                        { id: 'enterprise', name: 'Enterprise', price: '249', leads: '10.000' },
                                    ].map(p => (
                                        <div key={p.name} style={{ 
                                            display: 'flex', 
                                            justifyContent: 'space-between', 
                                            alignItems: 'center',
                                            padding: '10px 12px',
                                            borderRadius: 8,
                                            background: p.hot ? 'rgba(255,255,255,0.05)' : 'transparent',
                                            border: p.hot ? '1px solid rgba(255,255,255,0.1)' : '1px solid transparent'
                                        }}>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontSize: 12, fontWeight: 700, color: '#FFF' }}>{p.name}</div>
                                                <div style={{ fontSize: 10, color: 'var(--t3)' }}>{p.leads} leads / mês</div>
                                            </div>
                                            <div style={{ textAlign: 'right', marginRight: 12 }}>
                                                <div style={{ fontSize: 12, fontWeight: 800, color: '#FFF' }}>€ {p.price}</div>
                                                <div style={{ fontSize: 9, color: 'var(--t3)', textTransform: 'uppercase' }}>/ mês</div>
                                            </div>
                                            <button 
                                                className={`btn ${p.hot ? 'btn-primary' : 'btn-ghost'} btn-sm`} 
                                                style={{ padding: '4px 10px', height: 'auto', minHeight: 'unset', fontSize: 10 }}
                                                onClick={() => handleUpgrade(p.id)}
                                            >
                                                {org?.plan === p.id ? 'Atual' : 'Assinar'}
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                <div style={{ marginTop: 12, fontSize: 10, color: 'var(--t3)', textAlign: 'center' }}>
                                    <Zap size={10} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                                    Pagamento seguro processado pelo Stripe
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="card" style={{ marginTop: 16 }}>
                        <div className="settings-title">Dados e Exportação</div>
                        <div style={{ display: 'flex', gap: 8 }}>
                            <button 
                                className="btn btn-ghost btn-sm" 
                                style={{ flex: 1 }} 
                                onClick={handleExport} 
                                disabled={isExporting}
                            >
                                {isExporting ? 'A exportar...' : '↓ Exportar CSV'}
                            </button>
                            <button 
                                className="btn btn-danger btn-sm" 
                                style={{ flex: 1 }} 
                                onClick={clearAll} 
                                disabled={isClearing}
                            >
                                {isClearing ? 'A limpar...' : '⚠ Limpar base'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="card settings-section" style={{ marginTop: 24 }}>
                <div className="settings-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Code size={18} /> API & Integrações
                </div>
                <div className="settings-row" style={{ border: 'none', paddingBottom: 0 }}>
                    <div style={{ flex: 1 }}>
                        <div className="settings-label">Chave de API</div>
                        <div className="settings-sub">Use esta chave para integrar a ORCA com outros sistemas (Scrapers, CRM, etc.)</div>
                        
                        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                            <div className="input" style={{ flex: 1, fontFamily: 'monospace', fontSize: 12, display: 'flex', alignItems: 'center', background: 'rgba(0,0,0,0.2)' }}>
                                {loadingOrg ? 'Carregando...' : org?.apiKey || 'Sem chave gerada'}
                            </div>
                            <button className="btn btn-ghost btn-sm" onClick={handleRotateKey} disabled={loadingOrg}>
                                <RefreshCw size={14} style={{ marginRight: 6 }} /> Rodar Chave
                            </button>
                        </div>
                    </div>
                </div>

                <div style={{ marginTop: 20, padding: 16, background: 'rgba(0,0,0,0.1)', borderRadius: 12, border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', marginBottom: 8 }}>Guia Rápido de Ingestão</div>
                    <pre style={{ fontSize: 11, color: 'var(--t2)', overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
{`curl -X POST ${import.meta.env.VITE_API_BASE_URL}/leads/ingest \\
  -H "X-API-KEY: YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "nome": "Novo Lead",
    "cidade": "Lisboa",
    "telefone": "912345678"
  }'`}
                    </pre>
                </div>
            </div>
        </>
    );
}
