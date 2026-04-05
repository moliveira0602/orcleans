import { useState } from 'react';
import { useAppState, useAppDispatch } from '../store';
import { detectNameCol, detectCatCol, getLeadName, getLeadCategory } from '../utils/detect';
import ScoreRing from '../components/ScoreRing';
import BarChart from '../components/BarChart';
import FunnelChart from '../components/FunnelChart';
import DottedSurface from '../components/ui/DottedSurface';
import { formatTime } from '../utils/time';
import { runScan, getScanStatus, SCAN_PRESETS, type ScanPresetKey } from '../utils/scanService';
import { useToast } from '../components/Toast';
import type { Page } from '../components/Layout';
import { PIPELINE_COLS } from '../types';

interface DashboardProps {
    onNavigate: (page: Page) => void;
    onOpenDetail: (id: string) => void;
}

export default function Dashboard({ onNavigate, onOpenDetail }: DashboardProps) {
    const { leads, settings, activities } = useAppState();
    const dispatch = useAppDispatch();
    const toast = useToast();
    const [scanModalOpen, setScanModalOpen] = useState(false);
    const [scanLoading, setScanLoading] = useState(false);
    const [scanProgress, setScanProgress] = useState('');
    const [selectedPreset, setSelectedPreset] = useState<ScanPresetKey>('clinicasOlhao');
    const [apiKey, setApiKey] = useState(() => localStorage.getItem('orca_google_api_key') || 'demo');

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
                    apiKey,
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

                // Add activity
                dispatch({
                    type: 'ADD_ACTIVITY',
                    payload: {
                        title: `Scan GeoScout: ${preset.label}`,
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
                    <h1>Bem-vindo à <em>ORCA</em></h1>
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
    const conversionRate = leads.length > 0 ? Math.round((won / leads.length) * 100) : 0;

    const scanStatus = refreshScanStatus();

    return (
        <>
            <div className="kpi-grid">
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
                <div 
                    className="kpi" 
                    style={{ border: '1px solid var(--blue)', cursor: 'pointer', background: 'var(--blue-dim)' }} 
                    onClick={() => setScanModalOpen(true)}
                >
                    <div className="kpi-label" style={{ color: 'var(--blue)' }}>GeoScout</div>
                    <div className="kpi-val" style={{ fontSize: 18, color: 'var(--blue)' }}>
                        {scanStatus?.hasCache ? '🔄 Scan Recente' : '🗺️ Novo Scan'}
                    </div>
                    <div className="kpi-sub" style={{ color: 'var(--blue)' }}>
                        {scanStatus?.hasCache 
                            ? `${scanStatus.cachedCount} estabelecimentos (${scanStatus.ageDays} dias)`
                            : 'Clique para escanear'}
                    </div>
                </div>
            </div>

            <div className="grid-2 mb-24">
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

            <div className="grid-2">
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

                <div className="card">
                    <div className="sec-header">
                        <div><div className="sec-title">Atividade Recente</div></div>
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
                            <div className="modal-title">🗺️ GeoScout - Scan de Estabelecimentos</div>
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
                                <option value="nominatim">🗺️ OpenStreetMap (dados reais - grátis)</option>
                                <option value="google">🔍 Google Places API (dados reais - pago)</option>
                            </select>
                            {apiKey === 'google' && (
                                <div>
                                    <input
                                        type="password"
                                        className="input"
                                        placeholder="AIzaSy..."
                                        value={apiKey}
                                        onChange={(e) => setApiKey(e.target.value)}
                                        style={{ marginTop: 8 }}
                                    />
                                    <div style={{ fontSize: 11, color: 'var(--t2)', marginTop: 4 }}>
                                        ~$35/1000 buscas. Necessário API Key com Places API.
                                    </div>
                                </div>
                            )}
                            {apiKey === 'demo' && (
                                <div style={{ fontSize: 11, color: 'var(--green)', marginTop: 4 }}>
                                    ✓ Modo demonstração - ideal para testes
                                </div>
                            )}
                            {apiKey === 'nominatim' && (
                                <div style={{ fontSize: 11, color: 'var(--green)', marginTop: 4 }}>
                                    ✓ OpenStreetMap - dados reais gratuitos
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