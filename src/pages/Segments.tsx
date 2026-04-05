import { useAppState } from '../store';
import { detectCatCol } from '../utils/detect';
import type { Page } from '../components/Layout';

interface SegmentsProps {
    onNavigate: (page: Page) => void;
}

export default function Segments({ onNavigate }: SegmentsProps) {
    const { leads, settings } = useAppState();

    if (!leads.length) {
        return (
            <>
                <div className="empty">
                    <span className="empty-icon">⊞</span>
                    <div className="empty-title">Nenhum lead ainda</div>
                    <div className="empty-sub">Importe leads para ver segmentos automáticos.</div>
                </div>
            </>
        );
    }

    const catCol = detectCatCol(leads);

    const segments: { name: string; desc: string; count: number; color: string; icon: string; auto: boolean }[] = [
        { name: 'Leads Quentes', desc: 'Score ≥ ' + settings.hotThreshold, count: leads.filter((l) => l._score >= settings.hotThreshold).length, color: 'var(--green)', icon: '🔥', auto: true },
        { name: 'Leads Mornos', desc: `Score ${settings.warmThreshold}–${settings.hotThreshold - 1}`, count: leads.filter((l) => l._score >= settings.warmThreshold && l._score < settings.hotThreshold).length, color: 'var(--amber)', icon: '🌡', auto: true },
        { name: 'Leads Frios', desc: 'Score < ' + settings.warmThreshold, count: leads.filter((l) => l._score < settings.warmThreshold).length, color: 'var(--t3)', icon: '❄', auto: true },
        { name: 'Com Contato', desc: 'Têm tel. ou email', count: leads.filter((l) => Object.values(l).some((v) => String(v).match(/\d{8,}|@/))).length, color: 'var(--blue3)', icon: '📞', auto: true },
        { name: 'No Funil', desc: 'Em fase ativa', count: leads.filter((l) => ['qualificado', 'proposta', 'negociacao'].includes(l._pipeline)).length, color: 'var(--purple)', icon: '▦', auto: true },
        { name: 'Ganhos', desc: 'Funil: Ganho', count: leads.filter((l) => l._pipeline === 'ganho').length, color: 'var(--green)', icon: '✅', auto: true },
    ];

    if (catCol) {
        const cats: Record<string, number> = {};
        leads.forEach((l) => { const v = String(l[catCol] || ''); if (v) cats[v] = (cats[v] || 0) + 1; });
        Object.entries(cats).sort((a, b) => b[1] - a[1]).slice(0, 6).forEach(([name, count]) => {
            segments.push({ name, desc: 'Categoria', count, color: 'var(--blue)', icon: '◉', auto: false });
        });
    }

    return (
        <>
            <div className="grid-3">
                {segments.map((s, i) => (
                    <div
                        key={i}
                        className="card-sm"
                        style={{ borderLeft: `3px solid ${s.color}`, cursor: 'pointer', transition: 'all var(--transition)' }}
                        onClick={() => onNavigate('leads')}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                            <span style={{ fontSize: 20 }}>{s.icon}</span>
                            <span className={`badge ${s.auto ? 'badge-gray' : 'badge-blue'}`} style={{ fontSize: 10 }}>
                                {s.auto ? 'Auto' : 'Cat.'}
                            </span>
                        </div>
                        <div style={{ fontFamily: 'var(--font-d)', fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{s.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--t3)', marginBottom: 12 }}>{s.desc}</div>
                        <div style={{ fontFamily: 'var(--font-d)', fontSize: 28, fontWeight: 800, color: s.color }}>{s.count}</div>
                        <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 4 }}>
                            {leads.length ? Math.round((s.count / leads.length) * 100) : 0}% da base
                        </div>
                    </div>
                ))}
            </div>
        </>
    );
}
