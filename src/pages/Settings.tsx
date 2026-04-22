import { useAppState, useAppDispatch } from '../store';
import { useToast } from '../components/Toast';
import { useConfirm } from '../components/ConfirmModal';
import { exportLeadsCsv } from '../utils/export';
import { api } from '../services/api';
import { useState } from 'react';
import { useAuth } from '../services/auth';

export default function SettingsPage() {
    const { settings, leads, imports } = useAppState();
    const dispatch = useAppDispatch();
    const toast = useToast();
    const confirm = useConfirm();
    const [savingProfile, setSavingProfile] = useState(false);
    const { refreshProfile } = useAuth();

    const updateSetting = (key: string, value: string | number) => {
        dispatch({ type: 'UPDATE_SETTINGS', payload: { [key]: value } });
    };

    const handleSaveProfile = async () => {
        setSavingProfile(true);
        try {
            const result = await api.patch<{ name: string; email: string; company: string }>('/auth/me', {
                name: settings.name,
                email: settings.email,
                company: settings.company,
            });
            dispatch({ type: 'UPDATE_SETTINGS', payload: { name: result.name, email: result.email, company: result.company } });
            await refreshProfile();
            toast('Perfil atualizado com sucesso.', 'success');
        } catch (err: any) {
            toast(err.response?.data?.error || 'Erro ao atualizar perfil', 'error');
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
        dispatch({ type: 'CLEAR_ALL' });
        toast('Todos os dados foram removidos.', 'info');
    };

    const handleExport = () => {
        if (!leads.length) { toast('Nenhum lead para exportar.', 'info'); return; }
        exportLeadsCsv(leads);
        toast('CSV exportado com sucesso.', 'success');
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
                        <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={handleSaveProfile} disabled={savingProfile}>
                            {savingProfile ? 'A guardar...' : 'Guardar alterações'}
                        </button>
                    </div>

                    <div className="card settings-section" style={{ marginTop: 16 }}>
                        <div className="settings-title">Scoring</div>
                        <div className="settings-row">
                            <div>
                                <div className="settings-label">Threshold lead quente</div>
                                <div className="settings-sub">Score mínimo para classificar como quente</div>
                            </div>
                            <input className="input" type="number" min={1} max={10} value={settings.hotThreshold} style={{ width: 70 }} onChange={(e) => updateSetting('hotThreshold', +e.target.value)} />
                        </div>
                        <div className="settings-row">
                            <div>
                                <div className="settings-label">Threshold lead morno</div>
                                <div className="settings-sub">Score mínimo para classificar como morno</div>
                            </div>
                            <input className="input" type="number" min={1} max={10} value={settings.warmThreshold} style={{ width: 70 }} onChange={(e) => updateSetting('warmThreshold', +e.target.value)} />
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
                                <input type="checkbox" defaultChecked />
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
                                <input type="checkbox" />
                                <div className="toggle-track" />
                                <div className="toggle-thumb" />
                            </label>
                        </div>
                    </div>

                    <div className="card" style={{ marginTop: 16 }}>
                        <div className="settings-title">Dados</div>
                        <div className="settings-row">
                            <div>
                                <div className="settings-label">Total de leads</div>
                                <div className="settings-sub">Na base atual</div>
                            </div>
                            <span style={{ fontFamily: 'var(--font-d)', fontSize: 18, fontWeight: 700 }}>{leads.length}</span>
                        </div>
                        <div className="settings-row">
                            <div><div className="settings-label">Importações</div></div>
                            <span style={{ fontFamily: 'var(--font-d)', fontSize: 18, fontWeight: 700 }}>{imports.length}</span>
                        </div>
                        <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
                            <button className="btn btn-ghost btn-sm" onClick={handleExport}>↓ Exportar tudo</button>
                            <button className="btn btn-danger btn-sm" onClick={clearAll}>⚠ Limpar dados</button>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
