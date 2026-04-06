import { useAppState } from '../store';
import { detectCatCol } from '../utils/detect';
import type { Page } from '../components/Layout';

interface SegmentsProps {
    onNavigate: (page: Page) => void;
}

// Monocolor SVG icons
const FireIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
    </svg>
);

const ThermometerIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/>
    </svg>
);

const SnowflakeIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="2" y1="12" x2="22" y2="12"/><line x1="12" y1="2" x2="12" y2="22"/>
        <path d="m20 16-4-4 4-4"/><path d="m4 8 4 4-4 4"/>
        <path d="m16 4-4 4-4-4"/><path d="m8 20 4-4 4 4"/>
    </svg>
);

const PhoneIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
    </svg>
);

const FunnelIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/>
    </svg>
);

const CheckCircleIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
        <polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
);

const TagIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
    </svg>
);

export default function Segments({ onNavigate }: SegmentsProps) {
    const { leads, settings } = useAppState();

    if (!leads.length) {
        return (
            <>
                <div className="empty">
                    <span className="empty-icon">⊞</span>
                    <div className="empty-title">Nenhum cardume ainda</div>
                    <div className="empty-sub">Importe leads para ver segmentos automáticos.</div>
                </div>
            </>
        );
    }

    const catCol = detectCatCol(leads);

    const segments: { name: string; desc: string; count: number; color: string; icon: React.ReactNode; auto: boolean }[] = [
        { name: 'Leads Quentes', desc: 'Score ≥ ' + settings.hotThreshold, count: leads.filter((l) => l._score >= settings.hotThreshold).length, color: 'var(--green)', icon: <FireIcon />, auto: true },
        { name: 'Leads Mornos', desc: `Score ${settings.warmThreshold}–${settings.hotThreshold - 1}`, count: leads.filter((l) => l._score >= settings.warmThreshold && l._score < settings.hotThreshold).length, color: 'var(--amber)', icon: <ThermometerIcon />, auto: true },
        { name: 'Leads Frios', desc: 'Score < ' + settings.warmThreshold, count: leads.filter((l) => l._score < settings.warmThreshold).length, color: 'var(--t3)', icon: <SnowflakeIcon />, auto: true },
        { name: 'Com Contato', desc: 'Têm tel. ou email', count: leads.filter((l) => Object.values(l).some((v) => String(v).match(/\d{8,}|@/))).length, color: 'var(--blue3)', icon: <PhoneIcon />, auto: true },
        { name: 'No Funil', desc: 'Em fase ativa', count: leads.filter((l) => ['qualificado', 'proposta', 'negociacao'].includes(l._pipeline)).length, color: 'var(--purple)', icon: <FunnelIcon />, auto: true },
        { name: 'Ganhos', desc: 'Funil: Ganho', count: leads.filter((l) => l._pipeline === 'ganho').length, color: 'var(--green)', icon: <CheckCircleIcon />, auto: true },
    ];

    if (catCol) {
        const cats: Record<string, number> = {};
        leads.forEach((l) => { const v = String(l[catCol] || ''); if (v) cats[v] = (cats[v] || 0) + 1; });
        Object.entries(cats).sort((a, b) => b[1] - a[1]).slice(0, 6).forEach(([name, count]) => {
            segments.push({ name, desc: 'Categoria', count, color: 'var(--blue)', icon: <TagIcon />, auto: false });
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