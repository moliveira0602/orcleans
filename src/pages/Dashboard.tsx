import { useAppState } from '../store';
import { detectNameCol, detectCatCol, getLeadName, getLeadCategory } from '../utils/detect';
import ScoreRing from '../components/ScoreRing';
import BarChart from '../components/BarChart';
import FunnelChart from '../components/FunnelChart';
import { formatTime } from '../utils/time';
import type { Page } from '../components/Layout';
import { PIPELINE_COLS } from '../types';

interface DashboardProps {
    onNavigate: (page: Page) => void;
    onOpenDetail: (id: string) => void;
}

export default function Dashboard({ onNavigate, onOpenDetail }: DashboardProps) {
    const { leads, settings, activities } = useAppState();

    if (!leads.length) {
        return (
            <div className="onboarding">
                <div style={{ fontSize: 64, marginBottom: 20 }}>🎯</div>
                <h1>Bem-vindo à <em>OrcaLens</em></h1>
                <p>Importe sua primeira lista de leads para começar a ver inteligência comercial em ação. Suporta Excel, CSV e qualquer formato tabular.</p>
                <button
                    className="btn btn-primary"
                    style={{ fontSize: 15, padding: '12px 32px' }}
                    onClick={() => onNavigate('import')}
                >
                    ↑ Importar minha primeira lista
                </button>
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
        </>
    );
}
