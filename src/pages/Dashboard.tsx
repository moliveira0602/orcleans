import { useState } from 'react';
import { Radar, Upload, Columns3, Activity, Trash2, Search, MapPin, Globe, Phone, Mail, Share2, Info, Star, X, AlertTriangle, ArrowUpRight, Check, MessageCircle, Terminal } from 'lucide-react';
import { useAppState, useAppDispatch } from '../store';
import { detectNameCol, detectCatCol, getLeadName, getLeadCategory } from '../utils/detect';
import ScoreRing from '../components/ScoreRing';
import BarChart from '../components/BarChart';
import FunnelChart from '../components/FunnelChart';
import PieChart from '../components/PieChart';
import DottedSurface from '../components/ui/DottedSurface';
import SonarButton from '../components/SonarButton';
import { formatTime } from '../utils/time';
import { runScan, getScanStatus, SCAN_PRESETS, type ScanPresetKey } from '../utils/scanService';
import { useToast } from '../components/Toast';
import type { Page } from '../components/Layout';
import { PIPELINE_COLS } from '../types';
import { createLeadsBulk } from '../services/leads';
import { useAuth } from '../services/auth';

const PLAN_LIMITS: Record<string, number> = {
    trial: 25,
    starter: 500,
    pro: 2000,
    enterprise: 10000,
};

interface DashboardProps {
    onNavigate: (page: Page) => void;
    onOpenDetail: (id: string) => void;
}

export default function Dashboard({ onNavigate, onOpenDetail }: DashboardProps) {
    const { leads, settings, activities } = useAppState();
    const dispatch = useAppDispatch();
    const toast = useToast();
    const { user, organization, refreshProfile } = useAuth();
    const maxLeads = organization?.maxLeads || PLAN_LIMITS[organization?.plan || 'trial'] || 50;
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
                    apiKey: apiKey === 'google' ? 'google' : apiKey,
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
                    // Refresh profile to update lead consumption counter
                    await refreshProfile();
                } catch (err: any) {
                    console.error('[Dashboard] Failed to sync leads to backend:', err);
                    toast('Erro ao sincronizar com servidor: ' + (err.message || 'Limite atingido'), 'error');
                }

                // Add activity
                dispatch({
                    type: 'ADD_ACTIVITY',
                    payload: {
                        title: `Scan Sonar: ${preset.label}`,
                        sub: `${result.imported} novos leads`,
                        icon: 'radar',
                        time: new Date().toISOString(),
                    },
                });

                // Save API key
                localStorage.setItem('orca_google_api_key', apiKey);

                toast(`${result.imported} leads importados do scan!`, 'success');
                setScanModalOpen(false);
                onNavigate('leads'); // Redirect user to the Leads tab after importing
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
                        <Upload size={16} /> Importar minha primeira lista
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
            {/* ===== COMMAND CENTER HEADER ===== */}
            <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                marginBottom: 16,
                padding: '12px 20px',
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                borderRadius: 12,
                backdropFilter: 'blur(10px)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div style={{ position: 'relative' }}>
                        <div className="pulse-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ADE80' }} />
                        <style>{`
                            @keyframes subtle-pulse {
                                0%, 100% { opacity: 0.7; box-shadow: 0 0 4px #4ADE80; }
                                50% { opacity: 1; box-shadow: 0 0 8px #4ADE80; }
                            }
                            .pulse-dot {
                                animation: subtle-pulse 2s ease-in-out infinite;
                            }
                        `}</style>
                    </div>
                    <div>
                        <div style={{ fontSize: 10, fontWeight: 800, color: '#4ADE80', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Sistema Operacional</div>
                        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>Sonar Scan Ativo · {new Date().toLocaleDateString('pt-PT')}</div>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 24 }}>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 10, fontWeight: 800, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Data-Stream</div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#FFF', fontFamily: 'monospace' }}>{new Date().toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                    <button className="btn btn-primary btn-sm" onClick={() => setScanModalOpen(true)}>
                        <Radar size={14} /> Novo Scan
                    </button>
                </div>
            </div>

            {/* ===== ROW 1: Core Metrics (5 cols) ===== */}
            <div className="kpi-grid" style={{ marginBottom: 24 }}>
                <div className="kpi">
                    <div className="kpi-label">Uso do Plano</div>
                    <div className="kpi-val" style={{ fontSize: 24 }}>
                        {leads.length}
                        <span style={{ fontSize: 14, color: 'var(--t3)', marginLeft: 4 }}>
                            / {maxLeads}
                        </span>
                    </div>
                    <div className="kpi-sub">leads capturados</div>
                </div>
                <div className="kpi">
                    <div className="kpi-label">Total de Leads</div>
                    <div className="kpi-val">{leads.length}</div>
                    <div className="kpi-sub">base atual</div>
                </div>
                <div className="kpi green">
                    <div className="kpi-label">Leads Quentes</div>
                    <div className="kpi-val green">{hot.length}</div>
                    <div className="kpi-sub">
                        <span className="kpi-delta up"><ArrowUpRight size={14} /> {leads.length > 0 ? Math.round((hot.length / leads.length) * 100) : 0}%</span> da base
                    </div>
                </div>
                <div className="kpi amber">
                    <div className="kpi-label">Leads Mornos</div>
                    <div className="kpi-val amber">{warm.length}</div>
                    <div className="kpi-sub">{leads.length > 0 ? Math.round((warm.length / leads.length) * 100) : 0}% da base</div>
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

            {/* ===== ROW 2: Command Charts (Pie/Donut) ===== */}
            <div className="grid-2 mb-16">
                <div className="card">
                    <div className="sec-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ padding: 8, background: 'var(--green-dim)', borderRadius: 8, color: 'var(--green)' }}>
                                <Activity size={20} />
                            </div>
                            <div>
                                <div className="sec-title">Qualidade da Base</div>
                                <div className="sec-sub">Análise térmica de conversão</div>
                            </div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 32, padding: '20px 0' }}>
                        <PieChart 
                            size={180} 
                            innerRadius={65}
                            data={[
                                { label: 'Quentes', value: hot.length, color: 'var(--green)' },
                                { label: 'Mornos', value: warm.length, color: 'var(--amber)' },
                                { label: 'Frios', value: cold.length, color: 'var(--red)' },
                            ]} 
                        />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--green)' }} />
                                <div style={{ fontSize: 12, color: 'var(--t2)' }}>Quentes ({hot.length})</div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--amber)' }} />
                                <div style={{ fontSize: 12, color: 'var(--t2)' }}>Mornos ({warm.length})</div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--red)' }} />
                                <div style={{ fontSize: 12, color: 'var(--t2)' }}>Frios ({cold.length})</div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="card">
                    <div className="sec-header">
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ padding: 8, background: 'var(--blue-dim)', borderRadius: 8, color: 'var(--blue)' }}>
                                <Columns3 size={20} />
                            </div>
                            <div>
                                <div className="sec-title">Status do Pipeline</div>
                                <div className="sec-sub">Volume por etapa operacional</div>
                            </div>
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 32, padding: '20px 0' }}>
                        <PieChart 
                            size={180} 
                            innerRadius={0}
                            data={funnelData.slice(0, 5).map(d => ({ label: d.label, value: d.value, color: d.color }))} 
                        />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {funnelData.slice(0, 5).map((d, i) => (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <div style={{ width: 8, height: 8, borderRadius: 2, background: d.color }} />
                                    <div style={{ fontSize: 11, color: 'var(--t2)', whiteSpace: 'nowrap' }}>{d.label}: {d.value}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* ===== ROW 3: Terminal & Activity Feed ===== */}
            <div className="grid-2 mb-16">
                <div className="card" style={{ padding: 0, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.05)', background: '#000' }}>
                    <div style={{ 
                        padding: '10px 16px', 
                        background: 'rgba(255,255,255,0.02)', 
                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
                    }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.1em', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Terminal size={12} /> Activity Console [v2.4]
                        </div>
                        <div className="pulse-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ADE80' }} />
                    </div>
                    <div style={{ 
                        height: 200, 
                        padding: 16, 
                        fontFamily: 'monospace', 
                        fontSize: 12, 
                        color: '#4ADE80', 
                        overflowY: 'auto',
                        background: 'radial-gradient(circle at center, rgba(0,255,0,0.02) 0%, transparent 100%)'
                    }}>
                        {activities.length > 0 ? activities.slice(0, 10).map((a, i) => (
                            <div key={i} style={{ marginBottom: 6, opacity: 1 - (i * 0.1) }}>
                                <span style={{ color: 'rgba(255,255,255,0.2)' }}>[{new Date(a.time).toLocaleTimeString()}]</span>
                                <span style={{ color: 'var(--blue)', marginLeft: 8 }}>{a.icon?.toUpperCase() || 'EVENT'}</span>
                                <span style={{ color: '#FFF', marginLeft: 8 }}>{a.title} {a.sub ? `· ${a.sub}` : ''}</span>
                            </div>
                        )) : (
                            <div style={{ color: 'rgba(255,255,255,0.2)', textAlign: 'center', marginTop: 80 }}>Aguardando atividades do sistema...</div>
                        )}
                        <div style={{ color: '#4ADE80', opacity: 0.5 }}>_ sys: monitoring_leads_stream...</div>
                    </div>
                </div>
                <div className="card">
                    <div className="sec-header">
                        <div className="sec-title">Performance</div>
                    </div>
                    <div style={{ marginTop: 12 }}>
                        <div style={{ marginBottom: 16 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
                                <span style={{ color: 'var(--t3)' }}>Taxa de Conversão</span>
                                <span style={{ color: 'var(--green)' }}>{conversionRate}%</span>
                            </div>
                            <div style={{ height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 2 }}>
                                <div style={{ height: '100%', width: `${conversionRate}%`, background: 'var(--green)', borderRadius: 2 }} />
                            </div>
                        </div>
                        <div style={{ marginBottom: 16 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
                                <span style={{ color: 'var(--t3)' }}>Taxa de Perda</span>
                                <span style={{ color: 'var(--red)' }}>{lossRate}%</span>
                            </div>
                            <div style={{ height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 2 }}>
                                <div style={{ height: '100%', width: `${lossRate}%`, background: 'var(--red)', borderRadius: 2 }} />
                            </div>
                        </div>
                        <div style={{ marginBottom: 16 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
                                <span style={{ color: 'var(--t3)' }}>Eficiência de Resposta</span>
                                <span style={{ color: 'var(--blue)' }}>84%</span>
                            </div>
                            <div style={{ height: 4, background: 'rgba(255,255,255,0.05)', borderRadius: 2 }}>
                                <div style={{ height: '100%', width: '84%', background: 'var(--blue)', borderRadius: 2 }} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ===== ROW 4: Engagement & Performance ===== */}
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
                    <div className="kpi-sub">{leads.length > 0 ? Math.round((contacted / leads.length) * 100) : 0}% da base</div>
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
                <div className="card mb-16">
                    <div className="sec-header">
                        <div>
                            <div className="sec-title">Sua Produtividade</div>
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
                                a.icon === '✉' || a.icon === '📞' || a.icon === '💬' || a.icon === 'mail' || a.icon === 'phone' || a.icon === 'whatsapp'
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
                            <div className="sec-title">Pipeline de Vendas</div>
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
            <div className="grid-2 mb-16">
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
            <div className="grid-2 mb-16">
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
                        <div><div className="sec-title">Stream de Atividade</div></div>
                        <div style={{ fontSize: 10, color: '#4ADE80', fontWeight: 800 }}>LIVE FEED</div>
                    </div>
                    <div className="activity-list" style={{ 
                        background: 'rgba(0,0,0,0.3)', 
                        padding: '16px', 
                        borderRadius: '12px', 
                        border: '1px solid rgba(255,255,255,0.05)',
                        maxHeight: '300px',
                        overflowY: 'auto',
                        fontFamily: 'monospace'
                    }}>
                        {activities.length ? activities.slice(0, 10).map((a, i) => {
                            const iconMap: Record<string, string> = { 
                                'folder': 'USR_IMP', 
                                'radar': 'SNR_SCN', 
                                'pipeline': 'PPL_MOV',
                                'edit': 'SYS_UPD',
                                'trash': 'SYS_DEL',
                                '✉': 'COM_EML', 
                                '📞': 'COM_PHN', 
                                '💬': 'COM_WTP',
                                'mail': 'COM_EML', 
                                'phone': 'COM_PHN', 
                                'whatsapp': 'COM_WTP'
                            };
                            return (
                                <div key={i} style={{ 
                                    display: 'flex', 
                                    gap: 12, 
                                    marginBottom: 12, 
                                    fontSize: 11,
                                    color: 'rgba(255,255,255,0.6)',
                                    borderLeft: '2px solid rgba(255,255,255,0.1)',
                                    paddingLeft: 12
                                }}>
                                    <span style={{ color: '#4ADE80', fontWeight: 800 }}>[{iconMap[a.icon] || 'SYS_LOG'}]</span>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ color: '#FFF' }}>{a.title}</div>
                                        <div style={{ fontSize: 10, opacity: 0.5 }}>{a.sub} · {formatTime(a.time)}</div>
                                    </div>
                                </div>
                            );
                        }) : (
                            <div className="text-muted text-sm">Nenhuma atividade detectada.</div>
                        )}
                    </div>
                </div>
            </div>

            {/* Scan Modal */}
            {scanModalOpen && (
                <div className="modal-overlay open" onClick={() => setScanModalOpen(false)}>
                    <div className="modal" style={{ maxWidth: 500 }} onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <Radar size={18} />
                                <div className="modal-title">Scan Rápido</div>
                            </div>
                            <button className="modal-close" onClick={() => setScanModalOpen(false)}><X size={18} /></button>
                        </div>

                        <div style={{ marginBottom: 20 }}>
                            <label className="input-label mb-8">Modo de Scan</label>
                            <div style={{ display: 'flex', gap: 10 }}>
                                <button 
                                    className={`btn ${apiKey === 'demo' ? 'btn-primary' : 'btn-ghost'} btn-sm`} 
                                    style={{ flex: 1 }}
                                    onClick={() => setApiKey('demo')}
                                >
                                    Modo Demo
                                </button>
                                <button 
                                    className={`btn ${apiKey !== 'demo' ? 'btn-primary' : 'btn-ghost'} btn-sm`} 
                                    style={{ flex: 1 }}
                                    onClick={() => setApiKey('google')}
                                >
                                    Modo Real (Sonar)
                                </button>
                            </div>
                            {apiKey === 'google' && (
                                <div style={{ 
                                    marginTop: 12, padding: 12, background: 'rgba(59, 130, 246, 0.05)', 
                                    borderRadius: 8, border: '1px solid rgba(59, 130, 246, 0.1)',
                                    fontSize: 12, color: 'var(--t2)'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, color: 'var(--blue)', fontWeight: 600 }}>
                                        <Check size={14} /> Conexão Segura Ativa
                                    </div>
                                    Utilizando a infraestrutura global da ORCA para busca de dados em tempo real.
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
                                <AlertTriangle size={14} style={{ marginRight: 6 }} />
                                Scan recente disponível ({scanStatus.cachedCount} estabelecimentos, {scanStatus.ageDays} dias). 
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
                                Fechar
                            </button>
                            <button
                                className="btn btn-primary"
                                onClick={handleScan}
                                disabled={scanLoading || !apiKey}
                                style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                            >
                                {scanLoading ? (
                                    <>
                                        <Search size={16} className="spin" />
                                        <span>Processando...</span>
                                    </>
                                ) : (
                                    <>
                                        <Radar size={16} />
                                        <span>Iniciar Scan</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

const CACHE_TTL_DAYS = 7;