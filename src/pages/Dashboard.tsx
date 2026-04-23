import { useState } from 'react';
import { useAppState, useAppDispatch } from '../store';
import { detectNameCol, detectCatCol, getLeadName, getLeadCategory } from '../utils/detect';
import ScoreRing from '../components/ScoreRing';
import BarChart from '../components/BarChart';
import FunnelChart from '../components/FunnelChart';
import DottedSurface from '../components/ui/DottedSurface';
import SonarButton from '../components/SonarButton';
import { formatTime } from '../utils/time';
import { runScan, getScanStatus, SCAN_PRESETS, type ScanPresetKey, GOOGLE_KEY } from '../utils/scanService';
import { useToast } from '../components/Toast';
import type { Page } from '../components/Layout';
import { PIPELINE_COLS } from '../types';
import { createLeadsBulk } from '../services/leads';
import { useAuth } from '../services/auth';

interface DashboardProps {
    onNavigate: (page: Page) => void;
    onOpenDetail: (id: string) => void;
}

export default function Dashboard({ onNavigate, onOpenDetail }: DashboardProps) {
    const { leads, settings, activities } = useAppState();
    const dispatch = useAppDispatch();
    const toast = useToast();
    const { user } = useAuth();
    const [scanModalOpen, setScanModalOpen] = useState(false);
    const [scanLoading, setScanLoading] = useState(false);
    const [scanProgress, setScanProgress] = useState('');
    const [selectedPreset, setSelectedPreset] = useState<ScanPresetKey>('clinicasOlhao');
    const [apiKey, setApiKey] = useState(() => localStorage.getItem('orca_google_api_key') || 'demo');
    const [customApiKey, setCustomApiKey] = useState('');

    // Update scan status when preset changes or modal opens
    const refreshScanStatus = () => {
        const preset = SCAN_PRESETS[selectedPreset];
        return getScanStatus(preset.segment, preset.city);
    };

    // Handle scan execution
    const handleScan = async () => {
        if (!apiKey || apiKey.trim() === '') {
            toast('Digite uma API Key (ou "demo" para teste).', 'error');
            return;
        }

        setScanLoading(true);
        setScanProgress('');

        const preset = SCAN_PRESETS[selectedPreset];
        
        try {
            const result = await runScan(
                {
                    segment: preset.segment,
                    city: preset.city,
                    apiKey: apiKey === 'google' ? customApiKey || GOOGLE_KEY : apiKey,
                },
                leads,
                (msg) => setScanProgress(msg)
            );

            if (result.success && result.leads.length > 0) {
                // Import leads using existing action
                dispatch({
                    type: 'IMPORT_LEADS',
                    payload: {
                        leads: result.leads,
                        record: {
                            id: result.leads[0]._importId || 'scan_' + Date.now(),
                            name: `Scan: ${preset.label}`,
                            file: 'Google Places API',
                            rows: result.totalFound,
                            cols: 0,
                            date: new Date().toISOString(),
                            count: result.imported,
                        },
                    },
                });

                // Sync to backend
                try {
                    await createLeadsBulk(result.leads);
                } catch (err) {
                    console.error('[Dashboard] Failed to sync leads to backend:', err);
                }

                // Add activity
                dispatch({
                    type: 'ADD_ACTIVITY',
                    payload: {
                        title: `Scan Sonar: ${preset.label}`,
                        sub: `${result.imported} novos leads`,
                        icon: '🗺️',
                        time: new Date().toISOString(),
                    },
                });

                // Save API key
                localStorage.setItem('orca_google_api_key', apiKey);

                toast(`✓ ${result.imported} leads importados do scan!`, 'success');
                setScanModalOpen(false);
            } else if (result.cached) {
                toast('Scan recente já existe. Aguarde 7 dias ou limpe o cache.', 'info');
            } else if (result.success) {
                toast('Nenhum lead novo encontrado.', 'info');
            } else {
                toast('Erro no scan: ' + result.message, 'error');
            }
        } catch (err) {
            toast('Erro no scan: ' + (err as Error).message, 'error');
        } finally {
            setScanLoading(false);
        }
    };

    if (!leads.length) {
        return (
            <div className="onboarding" style={{ position: 'relative', height: '100vh', overflow: 'hidden' }}>
                <DottedSurface />
                <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', padding: '80px 20px 20px', height: '100vh', overflow: 'hidden' }}>
                    <img src="/images/favicon.ico" alt="ORCA" style={{ width: 64, height: 64, marginBottom: 16, objectFit: 'contain', filter: 'brightness(0) invert(1)' }} />
                    <h1 style={{ fontFamily: "var(--font-d)", fontSize: "clamp(1.2rem, 4vw, 1.5rem)", fontWeight: 600, textAlign: "center", width: "100%", maxWidth: "100%" }}>Bem-vindo à <span style={{ color: "var(--blue)", textTransform: "uppercase", fontWeight: 700 }}>ORCA</span></h1>
                    <p>Importe sua primeira lista de leads para começar a ver inteligência comercial em ação. Suporta Excel, CSV e qualquer formato tabular.</p>
                    <button
                        className="btn btn-primary"
                        style={{ fontSize: 15, padding: '12px 32px' }}
                        onClick={() => onNavigate('import')}
                    >
                        ↑ Importar minha primeira lista
                    </button>
                    <div style={{ marginTop: 20, fontSize: 12, color: 'var(--t3)', maxWidth: 400 }}>
                        A ORCA utilizará <strong>Inteligência B2B Especializada</strong> para analisar cada lead, identificar dores e sugerir a melhor abordagem comercial automaticamente.
                    </div>
                </div>
            </div>
        );
    }

    const hot = leads.filter((l) => l._score >= settings.hotThreshold);
    const warm = leads.filter((l) => l._score >= settings.warmThreshold && l._score < settings.hotThreshold);
    const cold = leads.filter((l) => l._score < settings.warmThreshold);
    const avg = leads.reduce((s, l) => s + l._score, 0) / leads.length;
    const nameCol = detectNameCol(leads);
    const catCol = detectCatCol(leads);

    // Funnel data
    const funnelData = PIPELINE_COLS.map((col) => {
        const count = leads.filter((l) => l._pipeline === col.id).length;
        return { label: col.label, value: count, color: col.color };
    });

    // Category distribution
    let catData: { label: string; value: number; color: string }[] = [];
    if (catCol) {
        const counts: Record<string, number> = {};
        leads.forEach((l) => { const v = String(l[catCol] || '—'); counts[v] = (counts[v] || 0) + 1; });
        catData = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 7).map(([k, v]) => ({ label: k, value: v, color: 'var(--blue)' }));
    }

    // Top 5 leads
    const top5 = [...leads].sort((a, b) => b._score - a._score).slice(0, 5);
    const won = leads.filter((l) => l._pipeline === 'ganho').length;
    const lost = leads.filter((l) => l._pipeline === 'perdido').length;
    const conversionRate = leads.length > 0 ? Math.round((won / leads.length) * 100) : 0;
    const lossRate = leads.length > 0 ? Math.round((lost / leads.length) * 100) : 0;

    // Engagement metrics
    const contacted = leads.filter((l) => l._lastContact).length;
    const pending = leads.filter((l) => !l._lastContact && l._pipeline === 'novo').length;
    const followUpNeeded = leads.filter((l) => l._pipeline === 'negociacao' || l._pipeline === 'proposta').length;

    // Revenue potential (estimated from pipeline)
    const pipelineValue = leads.reduce((sum, l) => {
        const multipliers: Record<string, number> = { 'ganho': 1.0, 'proposta': 0.7, 'negociacao': 0.5, 'contato': 0.3, 'novo': 0.1, 'perdido': 0 };
        return sum + (multipliers[l._pipeline] || 0.1) * 5000; // Estimated R$5k per lead
    }, 0);
    const wonValue = won * 5000;

    // Activity velocity
    const recentActivities = activities.filter((a) => {
        const days = (Date.now() - new Date(a.time).getTime()) / (1000 * 60 * 60 * 24);
        return days <= 7;
    }).length;

    // Lead sources
    const sources: Record<string, number> = {};
    leads.forEach((l) => {
        const source = (l._source as string) || 'Importado';
        sources[source] = (sources[source] || 0) + 1;
    });
    const sourceData = Object.entries(sources).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, v]) => ({
        label: k,
        value: v,
        color: 'var(--blue)'
    }));

    // Health score distribution
    const healthScores = {
        excellent: leads.filter((l) => l._score >= 9).length,
        good: leads.filter((l) => l._score >= 7 && l._score < 9).length,
        fair: leads.filter((l) => l._score >= 5 && l._score < 7).length,
        poor: leads.filter((l) => l._score < 5).length
    };

    const scanStatus = refreshScanStatus();

    return (
        <>
            {/* ===== ROW 1: Core Metrics (5 cols) ===== */}
            <div className="kpi-grid" style={{ marginBottom: 24 }}>
                <div className="kpi">
                    <div className="kpi-label">Total de Leads</div>
                    <div className="kpi-val">{leads.length}</div>
                    <div className="kpi-sub">base atual</div>
                </div>
                <div className="kpi green">
                    <div className="kpi-label">Leads Quentes</div>
                    <div className="kpi-val green">{hot.length}</div>
                    <div className="kpi-sub">
                        <span className="kpi-delta up">↑ {Math.round((hot.length / leads.length) * 100)}%</span> da base
                    </div>
                </div>
                <div className="kpi amber">
                    <div className="kpi-label">Leads Mornos</div>
                    <div className="kpi-val amber">{warm.length}</div>
                    <div className="kpi-sub">{Math.round((warm.length / leads.length) * 100)}% da base</div>
                </div>
                <div className="kpi purple">
                    <div className="kpi-label">Score Médio</div>
                    <div className="kpi-val purple">{avg.toFixed(1)}</div>
                    <div className="kpi-sub">de 10 pontos</div>
                </div>
                <div className="kpi blue">
                    <div className="kpi-label">Conversão Final</div>
                    <div className="kpi-val blue">{conversionRate}%</div>
                    <div className="kpi-sub">{won} leads ganhos</div>
                </div>
            </div>

            {/* ===== ROW 2: Engagement & Performance ===== */}
            <div className="kpi-grid" style={{ marginBottom: 24 }}>
                <div className="kpi">
                    <div className="kpi-label">Em Negociação</div>
                    <div className="kpi-val" style={{ fontSize: 28, color: 'var(--orca-accent)' }}>{followUpNeeded}</div>
                    <div className="kpi-sub">requer atenção</div>
                </div>
                <div className="kpi">
                    <div className="kpi-label">Pendentes</div>
                    <div className="kpi-val" style={{ fontSize: 28, color: 'var(--amber)' }}>{pending}</div>
                    <div className="kpi-sub">sem contato</div>
                </div>
                <div className="kpi">
                    <div className="kpi-label">Contatados</div>
                    <div className="kpi-val" style={{ fontSize: 28, color: 'var(--green)' }}>{contacted}</div>
                    <div className="kpi-sub">{Math.round((contacted / leads.length) * 100)}% da base</div>
                </div>
                <div className="kpi">
                    <div className="kpi-label">Taxa de Perda</div>
                    <div className="kpi-val" style={{ fontSize: 28, color: 'var(--red)' }}>{lossRate}%</div>
                    <div className="kpi-sub">{lost} leads perdidos</div>
                </div>
                <div className="kpi">
                    <div className="kpi-label">Potencial Pipeline</div>
                    <div className="kpi-val" style={{ fontSize: 24, color: 'var(--orca-accent)' }}>R$ {Math.round(pipelineValue / 1000)}k</div>
                    <div className="kpi-sub">estimado</div>
                </div>
                <div className="kpi">
                    <div className="kpi-label">Valor Fechado</div>
                    <div className="kpi-val" style={{ fontSize: 24, color: 'var(--green)' }}>R$ {Math.round(wonValue / 1000)}k</div>
                    <div className="kpi-sub">confirmado</div>
                </div>
            </div>

            {/* ===== ROW 5: Produtividade do Usuário Logado ===== */}
            {user && (
                <div className="card mb-24">
                    <div className="sec-header">
                        <div>
                            <div className="sec-title">📊 Sua Produtividade</div>
                            <div className="sec-sub">Leads que você criou esta semana</div>
                        </div>
                    </div>
                    <div className="kpi-grid">
                        {(() => {
                            const weekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
                            const myLeadsThisWeek = leads.filter(l => 
                                l._importedAt && l._importedAt >= weekAgo
                            );
                            const myContacts = activities.filter(a => 
                                a.icon === '✉' || a.icon === '📞' || a.icon === '💬'
                            ).filter(a => {
                                const days = (Date.now() - new Date(a.time).getTime()) / (1000 * 60 * 60 * 24);
                                return days <= 7;
                            }).length;
                            
                            return (
                                <>
                                    <div className="kpi">
                                        <div className="kpi-label">Leads Criados</div>
                                        <div className="kpi-val" style={{ fontSize: 28, color: 'var(--orca-accent)' }}>{myLeadsThisWeek.length}</div>
                                        <div className="kpi-sub">últimos 7 dias</div>
                                    </div>
                                    <div className="kpi">
                                        <div className="kpi-label">Contatos Realizados</div>
                                        <div className="kpi-val" style={{ fontSize: 28, color: 'var(--green)' }}>{myContacts}</div>
                                        <div className="kpi-sub">esta semana</div>
                                    </div>
                                    <div className="kpi">
                                        <div className="kpi-label">Leads em Negociação</div>
                                        <div className="kpi-val" style={{ fontSize: 28, color: 'var(--amber)' }}>{leads.filter(l => l._pipeline === 'negociacao' || l._pipeline === 'proposta').length}</div>
                                        <div className="kpi-sub">requerem atenção</div>
                                    </div>
                                    <div className="kpi">
                                        <div className="kpi-label">Leads Ganhos</div>
                                        <div className="kpi-val" style={{ fontSize: 28, color: 'var(--green)' }}>{won}</div>
                                        <div className="kpi-sub">total convertido</div>
                                    </div>
                                </>
                            );
                        })()}
                    </div>
                </div>
            )}

            {/* ===== ROW 5 (Original): Pipeline por Etapa + Atividade Recente ===== */}
            <div className="grid-2">
                <div className="card">
                    <div className="sec-header">
                        <div>
                            <div className="sec-title">Funil de Vendas</div>
                            <div className="sec-sub">Conversão por etapa do pipeline</div>
                        </div>
                    </div>
                    <FunnelChart data={funnelData} />
                </div>
                <div className="card">
                    <div className="sec-header">
                        <div>
                            <div className="sec-title">Top Segmentos</div>
                            <div className="sec-sub">Por volume total de leads</div>
                        </div>
                    </div>
                    {catData.length ? <BarChart data={catData} /> : <div className="text-muted text-sm">Nenhuma coluna categórica detectada.</div>}
                </div>
            </div>

            {/* ===== ROW 3: Priority Leads + Health Distribution ===== */}
            <div className="grid-2 mb-24">
                <div className="card">
                    <div className="sec-header">
                        <div>
                            <div className="sec-title">Leads Prioritários</div>
                            <div className="sec-sub">Top 5 para contato hoje</div>
                        </div>
                        <button className="btn btn-ghost btn-sm" onClick={() => onNavigate('leads')}>Ver todos</button>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        {top5.map((l) => (
                            <div
                                key={l.id}
                                style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    padding: '10px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer',
                                }}
                                onClick={() => onOpenDetail(l.id)}
                            >
                                <div>
                                    <div style={{ fontSize: 13, fontWeight: 500 }}>{getLeadName(l, nameCol)}</div>
                                    <div className="text-sm text-muted">{getLeadCategory(l, catCol) || '—'}</div>
                                </div>
                                <ScoreRing score={l._score} hot={settings.hotThreshold} warm={settings.warmThreshold} />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Health Score Distribution */}
                <div className="card">
                    <div className="sec-header">
                        <div>
                            <div className="sec-title">Qualidade da Base</div>
                            <div className="sec-sub">Distribuição por score</div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ width: 8, height: 8, borderRadius: 4, background: 'var(--green)' }} />
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 13, fontWeight: 500 }}>Excelente (9-10)</div>
                                <div style={{ fontSize: 11, color: 'var(--t3)' }}>{healthScores.excellent} leads</div>
                            </div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--green)' }}>{Math.round((healthScores.excellent / leads.length) * 100)}%</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ width: 8, height: 8, borderRadius: 4, background: 'var(--amber)' }} />
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 13, fontWeight: 500 }}>Bom (7-8)</div>
                                <div style={{ fontSize: 11, color: 'var(--t3)' }}>{healthScores.good} leads</div>
                            </div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--amber)' }}>{Math.round((healthScores.good / leads.length) * 100)}%</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ width: 8, height: 8, borderRadius: 4, background: '#F59E0B' }} />
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 13, fontWeight: 500 }}>Regular (5-6)</div>
                                <div style={{ fontSize: 11, color: 'var(--t3)' }}>{healthScores.fair} leads</div>
                            </div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: '#F59E0B' }}>{Math.round((healthScores.fair / leads.length) * 100)}%</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ width: 8, height: 8, borderRadius: 4, background: 'var(--red)' }} />
                            <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 13, fontWeight: 500 }}>Ruim ({"<"}5)</div>
                                <div style={{ fontSize: 11, color: 'var(--t3)' }}>{healthScores.poor} leads</div>
                            </div>
                            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--red)' }}>{Math.round((healthScores.poor / leads.length) * 100)}%</div>
                        </div>
                        {/* Progress bar */}
                        <div style={{ display: 'flex', height: 6, borderRadius: 3, overflow: 'hidden', marginTop: 8 }}>
                            <div style={{ width: `${(healthScores.excellent / leads.length) * 100}%`, background: 'var(--green)' }} />
                            <div style={{ width: `${(healthScores.good / leads.length) * 100}%`, background: 'var(--amber)' }} />
                            <div style={{ width: `${(healthScores.fair / leads.length) * 100}%`, background: '#F59E0B' }} />
                            <div style={{ width: `${(healthScores.poor / leads.length) * 100}%`, background: 'var(--red)' }} />
                        </div>
                    </div>
                </div>
            </div>

            {/* ===== ROW 4: Sources + Activity Velocity ===== */}
            <div className="grid-2 mb-24">
                {/* Lead Sources */}
                <div className="card">
                    <div className="sec-header">
                        <div>
                            <div className="sec-title">Fontes de Leads</div>
                            <div className="sec-sub">Por origem de captação</div>
                        </div>
                    </div>
                    {sourceData.length > 0 ? (
                        <BarChart data={sourceData} />
                    ) : (
                        <div className="text-muted text-sm">Nenhuma fonte detectada.</div>
                    )}
                </div>

                {/* Activity Velocity */}
                <div className="card">
                    <div className="sec-header">
                        <div>
                            <div className="sec-title">Velocidade de Atividade</div>
                            <div className="sec-sub">Últimos 7 dias</div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, padding: '8px 0' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px', background: 'rgba(255, 255, 255, 0.05)', borderRadius: 10, border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                            <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--orca-accent)' }}>{recentActivities}</div>
                            <div>
                                <div style={{ fontSize: 13, fontWeight: 600 }}>Ações Realizadas</div>
                                <div style={{ fontSize: 11, color: 'var(--t3)' }}>importações, scans, atualizações</div>
                            </div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ fontSize: 13, fontWeight: 500 }}>Média Diária</div>
                                <div style={{ fontSize: 11, color: 'var(--t3)' }}>ações por dia</div>
                            </div>
                            <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--green)' }}>{Math.max(1, Math.round(recentActivities / 7))}</div>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div>
                                <div style={{ fontSize: 13, fontWeight: 500 }}>Taxa de Engajamento</div>
                                <div style={{ fontSize: 11, color: 'var(--t3)' }}>leads ativos / total</div>
                            </div>
                            <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--amber)' }}>{Math.round((contacted / leads.length) * 100)}%</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ===== ROW 5: Original sections ===== */}
            <div className="grid-2">
                <div className="card">
                    <div className="sec-header">
                        <div>
                            <div className="sec-title">Pipeline por Etapa</div>
                            <div className="sec-sub">Distribuição detalhada</div>
                        </div>
                    </div>
                    <div className="activity-list">
                        {PIPELINE_COLS.map((col) => {
                            const count = leads.filter((l) => l._pipeline === col.id).length;
                            const pct = Math.round((count / leads.length) * 100);
                            return (
                                <div className="activity-item" key={col.id}>
                                    <div className="activity-dot" style={{ background: col.color + '33', border: `2px solid ${col.color}` }} />
                                    <div className="activity-content">
                                        <div className="activity-title">{col.label}</div>
                                        <div className="activity-sub">{count} leads · {pct}%</div>
                                    </div>
                                    <div style={{ width: 80, height: 4, background: 'var(--bg5)', borderRadius: 2, overflow: 'hidden' }}>
                                        <div style={{ width: `${pct}%`, height: '100%', background: col.color, borderRadius: 2 }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="card">
                    <div className="sec-header">
                        <div><div className="sec-title">Atividade Recente</div></div>
                        <button className="btn btn-ghost btn-sm" onClick={() => onNavigate('import')}>Ver histórico</button>
                    </div>
                    <div className="activity-list">
                        {activities.length ? activities.slice(0, 6).map((a, i) => {
                            const colors: Record<string, string> = { '📂': 'var(--blue-dim)', '◉': 'var(--green-dim)', '▦': 'var(--amber-dim)' };
                            return (
                                <div className="activity-item" key={i}>
                                    <div className="activity-dot" style={{ background: colors[a.icon] || 'var(--card2)' }}>{a.icon}</div>
                                    <div className="activity-content">
                                        <div className="activity-title">{a.title}</div>
                                        <div className="activity-sub">{a.sub} · {formatTime(a.time)}</div>
                                    </div>
                                </div>
                            );
                        }) : (
                            <div className="empty" style={{ padding: 24 }}>
                                <div className="empty-sub">Nenhuma atividade ainda.</div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Scan Modal */}
            {scanModalOpen && (
                <div className="modal-overlay open" onClick={() => setScanModalOpen(false)}>
                    <div className="modal" style={{ maxWidth: 500 }} onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <div className="modal-title">🗺️ Sonar - Scan de Estabelecimentos</div>
                            <button className="modal-close" onClick={() => setScanModalOpen(false)}>✕</button>
                        </div>

                        <div style={{ marginBottom: 20 }}>
                            <label className="input-label mb-8">Fonte de Dados</label>
                            <select
                                className="input"
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                style={{ marginBottom: 4 }}
                            >
                                <option value="demo">🧪 Demo (dados fictícios - grátis)</option>
                                <option value="google">🔍 Google Places API (dados reais - pago)</option>
                            </select>
                            {apiKey === 'google' && (
                                <div>
                                    <input
                                        type="password"
                                        className="input"
                                        placeholder="Cole a tua Google API Key aqui"
                                        value={customApiKey}
                                        onChange={(e) => setCustomApiKey(e.target.value)}
                                        style={{ marginTop: 8 }}
                                    />
                                    <div style={{ fontSize: 11, color: 'var(--t2)', marginTop: 4 }}>
                                        ~$17/1000 buscas. Necessário API Key com Places API ativada.
                                    </div>
                                </div>
                            )}
                            {apiKey === 'demo' && (
                                <div style={{ fontSize: 11, color: 'var(--green)', marginTop: 4 }}>
                                    ✓ Modo demonstração - ideal para testes
                                </div>
                            )}
                        </div>

                        <div style={{ marginBottom: 20 }}>
                            <label className="input-label mb-8">Configuração do Scan</label>
                            <select
                                className="input"
                                value={selectedPreset}
                                onChange={(e) => setSelectedPreset(e.target.value as ScanPresetKey)}
                            >
                                {Object.entries(SCAN_PRESETS).map(([key, preset]) => (
                                    <option key={key} value={key}>{preset.label}</option>
                                ))}
                            </select>
                        </div>

                        {scanStatus?.hasCache && (
                            <div style={{
                                background: 'var(--amber-dim)', border: '1px solid rgba(245,158,11,.25)',
                                borderRadius: 8, padding: 12, marginBottom: 16,
                                fontSize: 12, color: 'var(--amber)',
                            }}>
                                ⚠ Scan recente disponível ({scanStatus.cachedCount} estabelecimentos, {scanStatus.ageDays} dias). 
                                Novo scan só será realizado após {CACHE_TTL_DAYS} dias.
                            </div>
                        )}

                        {scanProgress && (
                            <div style={{
                                background: 'var(--blue-dim)', border: '1px solid rgba(59,130,246,.25)',
                                borderRadius: 8, padding: 12, marginBottom: 16,
                                fontSize: 12, color: 'var(--blue)',
                            }}>
                                {scanProgress}
                            </div>
                        )}

                        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                            <button className="btn btn-ghost" onClick={() => setScanModalOpen(false)}>
                                Cancelar
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={handleScan}
                                disabled={scanLoading || !apiKey}
                            >
                                {scanLoading ? '🔍 Escaneando...' : '🗺️ Iniciar Scan'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

const CACHE_TTL_DAYS = 7;