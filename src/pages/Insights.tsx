import { useAppState, useAppDispatch } from '../store';
import { detectCatCol } from '../utils/detect';
import { buildInsights, computeScore } from '../utils/scoring';
import { useToast } from '../components/Toast';

export default function Insights() {
    const { leads, settings } = useAppState();
    const dispatch = useAppDispatch();
    const toast = useToast();

    if (!leads.length) {
        return (
            <div className="empty">
                <span className="empty-icon">🧠</span>
                <div className="empty-title">Nenhum dado ainda</div>
                <div className="empty-sub">Importe uma lista de leads para ver os insights gerados automaticamente.</div>
            </div>
        );
    }

    const hot = leads.filter((l) => l._score >= settings.hotThreshold);
    const catCol = detectCatCol(leads);
    const avg = leads.reduce((s, l) => s + l._score, 0) / leads.length;
    const withContact = leads.filter((l) => Object.values(l).some((v) => String(v).match(/\d{8,}|@|https?:\/\//))).length;

    const insights = buildInsights(leads, hot, catCol, avg, settings.hotThreshold);

    const regenerate = () => {
        const updatedLeads = leads.map((l) => ({
            ...l,
            _score: computeScore(l as unknown as Record<string, unknown>, null, leads as unknown as Record<string, unknown>[]),
        }));
        dispatch({ type: 'UPDATE_LEAD_SCORES', payload: updatedLeads });
        toast('Insights regenerados com base na configuração atual.', 'success');
    };

    return (
        <>
            <div className="sec-header mb-20">
                <div>
                    <div className="sec-title">Insights de IA</div>
                    <div className="sec-sub">Análise automática da sua base de leads</div>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={regenerate}>↻ Regenerar</button>
            </div>

            <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)', marginBottom: 24 }}>
                <div className="kpi green">
                    <div className="kpi-label">Taxa de leads quentes</div>
                    <div className="kpi-val green">{Math.round((hot.length / leads.length) * 100)}%</div>
                    <div className="kpi-sub">{hot.length} de {leads.length}</div>
                </div>
                <div className="kpi">
                    <div className="kpi-label">Score médio</div>
                    <div className="kpi-val">{avg.toFixed(1)}</div>
                    <div className="kpi-sub">de 10 pontos</div>
                </div>
                <div className="kpi amber">
                    <div className="kpi-label">Com contato ativo</div>
                    <div className="kpi-val amber">{withContact}</div>
                    <div className="kpi-sub">têm tel, email ou site</div>
                </div>
            </div>

            <div className="insight-grid">
                {insights.map((ins, i) => (
                    <div key={i} className={`insight-card ${ins.cls}`}>
                        <span className="insight-icon">{ins.icon}</span>
                        <div className="insight-title">{ins.title}</div>
                        <div className="insight-text">{ins.text}</div>
                    </div>
                ))}
            </div>
        </>
    );
}
