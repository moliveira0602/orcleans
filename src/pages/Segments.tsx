import { Flame, Thermometer, Snowflake, Phone, Filter, CheckCircle, Tag, LayoutGrid } from 'lucide-react';
import { useAppState } from '../store';
import { detectCatCol } from '../utils/detect';
import type { Page } from '../components/Layout';

interface SegmentsProps {
    onNavigate: (page: Page) => void;
}

// Use Lucide icons instead of custom SVGs

export default function Segments({ onNavigate }: SegmentsProps) {
    const { leads, settings } = useAppState();

    if (!leads.length) {
        return (
            <>
            <div className="empty" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 20px', gap: 16 }}>
                <div style={{ background: '#111', padding: 24, borderRadius: '50%', border: '1px solid #222' }}>
                    <LayoutGrid size={48} color="#444" />
                </div>
                <div className="empty-title" style={{ fontSize: 18, fontWeight: 700, color: '#FFF' }}>Nenhum cardume disponível</div>
                <div className="empty-sub" style={{ fontSize: 13, color: '#888' }}>Importe leads para ver segmentos automáticos baseados em score e categoria.</div>
            </div>
            </>
        );
    }

    const catCol = detectCatCol(leads);

    const segments: { name: string; desc: string; count: number; color: string; icon: React.ReactNode; auto: boolean }[] = [
        { name: 'Leads Quentes', desc: 'Score ≥ ' + settings.hotThreshold, count: leads.filter((l) => l._score >= settings.hotThreshold).length, color: 'var(--green)', icon: <Flame size={20} />, auto: true },
        { name: 'Leads Mornos', desc: `Score ${settings.warmThreshold}–${settings.hotThreshold - 1}`, count: leads.filter((l) => l._score >= settings.warmThreshold && l._score < settings.hotThreshold).length, color: 'var(--amber)', icon: <Thermometer size={20} />, auto: true },
        { name: 'Leads Frios', desc: 'Score < ' + settings.warmThreshold, count: leads.filter((l) => l._score < settings.warmThreshold).length, color: 'var(--t3)', icon: <Snowflake size={20} />, auto: true },
        { name: 'Com Contato', desc: 'Têm tel. ou email', count: leads.filter((l) => Object.values(l).some((v) => String(v).match(/\d{8,}|@/))).length, color: 'var(--blue3)', icon: <Phone size={20} />, auto: true },
        { name: 'No Pipeline', desc: 'Em fase ativa', count: leads.filter((l) => ['qualificado', 'proposta', 'negociacao'].includes(l._pipeline)).length, color: 'var(--purple)', icon: <Filter size={20} />, auto: true },
        { name: 'Ganhos', desc: 'Pipeline: Ganho', count: leads.filter((l) => l._pipeline === 'ganho').length, color: 'var(--green)', icon: <CheckCircle size={20} />, auto: true },
    ];

    if (catCol) {
        const cats: Record<string, number> = {};
        leads.forEach((l) => { const v = String(l[catCol] || ''); if (v) cats[v] = (cats[v] || 0) + 1; });
        Object.entries(cats).sort((a, b) => b[1] - a[1]).slice(0, 6).forEach(([name, count]) => {
            segments.push({ name, desc: 'Categoria', count, color: 'var(--blue)', icon: <Tag size={20} />, auto: false });
        });
    }

    return (
        <>
            <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 4 }}>Cardumes</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--t1)', letterSpacing: '0.05em' }}>Segmentação de Leads</div>
            </div>
            <div className="grid-3">
                {segments.map((s, i) => (
                    <div
                        key={i}
                        className="card-sm"
                        style={{ 
                            borderLeft: `3px solid ${s.color}`, 
                            cursor: 'pointer', 
                            transition: 'all var(--transition)',
                            borderTop: '1px solid var(--border)',
                            borderRight: '1px solid var(--border)',
                            borderBottom: '1px solid var(--border)',
                        }}
                        onClick={() => onNavigate('leads')}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                            <span style={{ color: s.color, display: 'flex' }}>{s.icon}</span>
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