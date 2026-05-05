import { useState, useEffect, useCallback } from 'react';
import { X, Sparkles, MessageCircle, Mail, Phone, Clock, ArrowRight, ExternalLink, Zap, CheckCircle } from 'lucide-react';
import type { LeadWithInsight, AnalysisProgress } from '../services/aiAnalysis';
import type { Lead } from '../types';
import './ui/ImportInsights.css';

interface ImportInsightsPanelProps {
  importedLeads: Lead[];
  onClose: () => void;
  onOpenDetail: (leadId: string) => void;
  analyzeLeads: (
    leads: Lead[],
    onProgress: (progress: AnalysisProgress) => void,
  ) => Promise<LeadWithInsight[]>;
}

const CANAL_ICON = {
  whatsapp: <MessageCircle size={13} />,
  email:    <Mail size={13} />,
  telefone: <Phone size={13} />,
};

const CANAL_LABEL = {
  whatsapp: 'WhatsApp',
  email:    'Email',
  telefone: 'Telefone',
};

const URGENCIA_LABEL = {
  alta:  'Hoje',
  media: 'Esta semana',
  baixa: 'Este mês',
};

const URGENCIA_DOT = {
  alta:  '🔴',
  media: '🟡',
  baixa: '⚪',
};

function getScoreClass(score: number): string {
  if (score >= 7) return 'high';
  if (score >= 4) return 'medium';
  return 'low';
}

function buildActionHref(lead: Lead, canal: 'whatsapp' | 'email' | 'telefone'): string | null {
  if (canal === 'whatsapp' && lead.telefone) {
    const clean = lead.telefone.replace(/\D/g, '');
    return `https://wa.me/${clean}`;
  }
  if (canal === 'email' && lead.email) {
    return `mailto:${lead.email}`;
  }
  if (canal === 'telefone' && lead.telefone) {
    return `tel:${lead.telefone}`;
  }
  return null;
}

export default function ImportInsightsPanel({
  importedLeads,
  onClose,
  onOpenDetail,
  analyzeLeads,
}: ImportInsightsPanelProps) {
  const [progress, setProgress] = useState<AnalysisProgress>({
    completed: 0,
    total: Math.min(importedLeads.length, 50),
    results: [],
  });
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        const results = await analyzeLeads(importedLeads, (p) => {
          if (!cancelled) setProgress(p);
        });
        if (!cancelled) {
          setProgress((prev) => ({ ...prev, results, completed: results.length }));
          setIsComplete(true);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err.message || 'Erro na análise com IA');
        }
      }
    };

    run();
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  }, [onClose]);

  const pct = progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0;

  const highCount  = progress.results.filter(r => r.insight.urgencia === 'alta').length;
  const medCount   = progress.results.filter(r => r.insight.urgencia === 'media').length;
  const avgScore   = progress.results.length
    ? (progress.results.reduce((s, r) => s + r.insight.score_oportunidade, 0) / progress.results.length).toFixed(1)
    : '—';

  return (
    <div className="insights-overlay" onClick={handleBackdropClick}>
      <div className="insights-panel" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="insights-header">
          <div className="insights-header-left">
            <div className="insights-badge">
              <Sparkles size={11} />
              Análise de IA
            </div>
            <div className="insights-title">
              {isComplete
                ? `${progress.results.length} oportunidades identificadas`
                : 'A analisar leads…'}
            </div>
            <div className="insights-subtitle">
              {isComplete
                ? `Score médio de oportunidade: ${avgScore}/10 · ${highCount} para contactar hoje`
                : `Processados ${progress.completed} de ${progress.total} leads`}
            </div>
          </div>
          <button className="insights-close-btn" onClick={onClose} title="Fechar">
            <X size={16} />
          </button>
        </div>

        {/* Progress bar (shown while loading) */}
        {!isComplete && !error && (
          <div className="insights-progress-bar-wrap">
            <div className="insights-progress-label">
              <span>A identificar melhores oportunidades…</span>
              <span>{pct}%</span>
            </div>
            <div className="insights-progress-track">
              <div className="insights-progress-fill" style={{ width: `${pct}%` }} />
            </div>
          </div>
        )}

        {/* Content */}
        <div className="insights-content">
          {error && (
            <div style={{
              padding: '20px', textAlign: 'center', color: '#f87171',
              background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
              borderRadius: 12,
            }}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>Erro na análise IA</div>
              <div style={{ fontSize: 12, opacity: 0.8 }}>{error}</div>
            </div>
          )}

          {/* Skeleton while loading first batch */}
          {!error && progress.results.length === 0 && (
            <>
              {[1, 2, 3].map((i) => (
                <div key={i} className="insights-skeleton">
                  <div className="insights-skeleton-line" style={{ height: 14, width: `${40 + i * 15}%` }} />
                  <div className="insights-skeleton-line" style={{ height: 10, width: '55%' }} />
                  <div className="insights-skeleton-line" style={{ height: 32, width: '100%' }} />
                  <div className="insights-skeleton-line" style={{ height: 10, width: '70%' }} />
                </div>
              ))}
            </>
          )}

          {/* Results */}
          {progress.results.map(({ lead, insight }, idx) => {
            const actionHref = buildActionHref(lead, insight.canal);
            return (
              <div
                key={lead.id ?? idx}
                className={`insight-card urgencia-${insight.urgencia}`}
              >
                {/* Card header row */}
                <div className="insight-card-header">
                  <div className="insight-lead-info">
                    <div className="insight-lead-name">{lead.nome || 'Lead sem nome'}</div>
                    <div className="insight-lead-segment">{lead.segmento || lead.cidade || '—'}</div>
                  </div>
                  <div className="insight-badges">
                    <div className={`canal-badge ${insight.canal}`}>
                      {CANAL_ICON[insight.canal]}
                      {CANAL_LABEL[insight.canal]}
                    </div>
                    <div className={`urgencia-badge ${insight.urgencia}`}>
                      {URGENCIA_DOT[insight.urgencia]} {URGENCIA_LABEL[insight.urgencia]}
                    </div>
                    <div className={`insight-score-ring ${getScoreClass(insight.score_oportunidade)}`}>
                      {insight.score_oportunidade}
                    </div>
                  </div>
                </div>

                {/* Reason */}
                {insight.motivo && (
                  <div className="insight-motivo">💡 {insight.motivo}</div>
                )}

                {/* Approach script */}
                {insight.abordagem && (
                  <div className="insight-abordagem">"{insight.abordagem}"</div>
                )}

                {/* Meta row */}
                <div className="insight-meta-row">
                  <div className="insight-meta-item">
                    <Clock size={11} />
                    {insight.melhor_horario}
                  </div>

                  {actionHref && (
                    <a
                      href={actionHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`insight-action-btn ${insight.canal}`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {CANAL_ICON[insight.canal]}
                      Contactar via {CANAL_LABEL[insight.canal]}
                      <ExternalLink size={11} />
                    </a>
                  )}

                  <button
                    className="insight-action-btn detail"
                    onClick={() => { onOpenDetail(lead.id); onClose(); }}
                  >
                    Ver lead
                    <ArrowRight size={11} />
                  </button>
                </div>
              </div>
            );
          })}

          {/* Loading more indicator */}
          {!isComplete && !error && progress.results.length > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '12px 0', color: 'var(--t3)', fontSize: 12,
            }}>
              <Sparkles size={14} style={{ animation: 'skel-pulse 1.2s infinite' }} />
              A analisar mais {progress.total - progress.completed} leads…
            </div>
          )}
        </div>

        {/* Bottom summary bar */}
        <div className="insights-summary">
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
            <div className="insights-summary-stat">
              <strong style={{ color: '#f87171' }}>{highCount}</strong>
              <span>🔴 contactar hoje</span>
            </div>
            <div className="insights-summary-stat">
              <strong style={{ color: '#fbbf24' }}>{medCount}</strong>
              <span>🟡 esta semana</span>
            </div>
            {isComplete && (
              <div className="insights-summary-stat">
                <CheckCircle size={13} style={{ color: '#10b981' }} />
                <strong style={{ color: '#10b981' }}>Análise completa</strong>
              </div>
            )}
          </div>

          <button className="insights-cta-btn" onClick={onClose}>
            <Zap size={14} />
            Ver todos os leads
          </button>
        </div>
      </div>
    </div>
  );
}
