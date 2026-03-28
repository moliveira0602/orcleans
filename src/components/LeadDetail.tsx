import { useState } from 'react';
import { useAppState, useAppDispatch } from '../store';
import { useToast } from './Toast';
import { useConfirm } from './ConfirmModal';
import { detectNameCol, detectCatCol, getLeadName, getLeadCategory } from '../utils/detect';
import { scoreClass, scoreLabel, scoreReason } from '../utils/scoring';
import { PIPELINE_COLS } from '../types';
import { generateLeadInsight } from '../utils/ai_expert';
import { copyToClipboard } from '../utils/clipboard';
import type { PipelineStage } from '../types';
import type { Page } from './Layout';

interface LeadDetailProps {
    leadId: string | null;
    onClose: () => void;
    onNavigate: (page: Page) => void;
}

export default function LeadDetail({ leadId, onClose, onNavigate }: LeadDetailProps) {
    const { leads, settings, pipeline } = useAppState();
    const dispatch = useAppDispatch();
    const toast = useToast();
    const confirm = useConfirm();
    const [editingField, setEditingField] = useState<string | null>(null);
    const [editValue, setEditValue] = useState('');
    const [noteText, setNoteText] = useState('');
    const [activeTab, setActiveTab] = useState<'info' | 'intel' | 'notes'>('info');

    const lead = leads.find((l) => l.id === leadId);
    if (!lead) {
        return <div className={`detail-panel${leadId ? ' open' : ''}`} />;
    }

    const nameCol = detectNameCol(leads);
    const catCol = detectCatCol(leads);
    const name = getLeadName(lead, nameCol);
    const cat = getLeadCategory(lead, catCol);
    const cls = scoreClass(lead._score, settings.hotThreshold, settings.warmThreshold);

    const skipCols = ['id', '_score', '_pipeline', '_importFile', '_importDate', '_notes'];
    const fields = Object.entries(lead).filter(([k]) => !skipCols.includes(k) && !k.startsWith('_'));

    const movePipeline = (stage: PipelineStage) => {
        dispatch({ type: 'MOVE_PIPELINE', payload: { leadId: lead.id, stage } });
        const label = PIPELINE_COLS.find((c) => c.id === stage)?.label || stage;
        toast(`Lead movido para "${label}"`, 'success');
        dispatch({
            type: 'ADD_ACTIVITY',
            payload: { title: `Pipeline: ${name}`, sub: `Movido para ${label}`, icon: '▦', time: new Date().toISOString() },
        });
    };

    const startEdit = (key: string, value: string) => {
        setEditingField(key);
        setEditValue(value);
    };

    const saveEdit = () => {
        if (editingField) {
            dispatch({ type: 'UPDATE_LEAD', payload: { id: lead.id, fields: { [editingField]: editValue } } });
            toast(`Campo "${editingField}" atualizado.`, 'success');
            setEditingField(null);
            setEditValue('');
        }
    };

    const cancelEdit = () => {
        setEditingField(null);
        setEditValue('');
    };

    const addNote = () => {
        if (!noteText.trim()) return;
        dispatch({
            type: 'ADD_NOTE',
            payload: { leadId: lead.id, note: { text: noteText.trim(), date: new Date().toISOString() } },
        });
        toast('Nota adicionada.', 'success');
        setNoteText('');
    };

    const handleAction = (type: string) => {
        if (type === 'whatsapp') {
            const phone = Object.values(lead).find((v) => String(v).match(/^\+?\d{8,}/));
            if (phone) window.open('https://wa.me/' + String(phone).replace(/\D/g, ''), '_blank');
            else toast('Telefone não encontrado neste lead.', 'info');
        } else if (type === 'email') {
            const email = Object.values(lead).find((v) => String(v).match(/@/));
            if (email) window.open('mailto:' + email);
            else toast('Email não encontrado neste lead.', 'info');
        }
    };

    const handleDelete = async () => {
        const ok = await confirm({
            title: 'Remover Lead',
            message: `Tem certeza que deseja remover "${name}" permanentemente? Esta ação não pode ser desfeita.`,
            confirmLabel: 'Remover',
            variant: 'danger',
        });
        if (!ok) return;
        dispatch({ type: 'DELETE_LEAD', payload: lead.id });
        toast('Lead removido.', 'info');
        onClose();
    };

    const notes = lead._notes || [];

    return (
        <>
            <div className={`detail-overlay ${leadId ? 'open' : ''}`} onClick={onClose} />
            <div className={`detail-panel${leadId ? ' open' : ''}`}>
                <div className="detail-header">
                    <div>
                        <div style={{ fontFamily: 'var(--font-d)', fontSize: 16, fontWeight: 700 }}>{name}</div>
                        <div style={{ fontSize: 12, color: 'var(--t3)', marginTop: 2 }}>{cat || 'Sem categoria'}</div>
                    </div>
                    <button className="btn-icon" onClick={onClose}>✕</button>
                </div>

                <div className="detail-tabs" style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'var(--card)' }}>
                    {(['info', 'intel', 'notes'] as const).map((t) => (
                        <button
                            key={t}
                            className={`detail-tab ${activeTab === t ? 'active' : ''}`}
                            onClick={() => setActiveTab(t)}
                            style={{
                                flex: 1, padding: '12px 0', fontSize: 11, fontWeight: 700,
                                color: activeTab === t ? 'var(--blue)' : 'var(--t3)',
                                borderBottom: activeTab === t ? '2px solid var(--blue)' : 'none',
                                background: 'none', borderTop: 'none', borderLeft: 'none', borderRight: 'none',
                                cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.05em'
                            }}
                        >
                            {t === 'info' ? 'Info' : t === 'intel' ? 'Intel ⚝' : 'Notas'}
                        </button>
                    ))}
                </div>

                <div className="detail-body" style={{ flex: 1, overflowY: 'auto' }}>
                    {activeTab === 'info' && (
                        <>
                            {/* Score */}
                            <div className="detail-section">
                                <div className="detail-section-title">Score OrcaLens</div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 8 }}>
                                    <div className={`score-ring score-${cls}`} style={{ width: 56, height: 56, fontSize: 20 }}>
                                        {lead._score.toFixed(1)}
                                    </div>
                                    <div>
                                        <div style={{ fontSize: 13, fontWeight: 600 }}>{scoreLabel(lead._score, settings.hotThreshold, settings.warmThreshold)}</div>
                                        <div style={{ fontSize: 12, color: 'var(--t3)' }}>{scoreReason(lead)}</div>
                                    </div>
                                </div>
                                <div className="progress">
                                    <div
                                        className="progress-fill" style={{
                                            width: `${lead._score * 10}%`,
                                            background: cls === 'hot' ? 'var(--green)' : cls === 'warm' ? 'var(--amber)' : 'var(--t3)',
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Pipeline */}
                            <div className="detail-section">
                                <div className="detail-section-title">Pipeline</div>
                                <select className="input" value={lead._pipeline || 'novo'} onChange={(e) => movePipeline(e.target.value as PipelineStage)}>
                                    <option value="novo">Novo</option>
                                    <option value="qualificado">Qualificado</option>
                                    <option value="proposta">Proposta</option>
                                    <option value="negociacao">Negociação</option>
                                    <option value="ganho">Ganho ✓</option>
                                    <option value="perdido">Perdido ✕</option>
                                </select>
                            </div>

                            <div className="detail-section">
                                <div className="detail-section-title">Informações</div>
                                {fields.map(([k, v]) => {
                                    const vs = String(v || '');
                                    const isEditing = editingField === k;
                                    return (
                                        <div className="detail-field" key={k} style={{ cursor: isEditing ? 'default' : 'pointer' }}>
                                            <span className="detail-field-label">{k}</span>
                                            {isEditing ? (
                                                <span style={{ display: 'flex', gap: 4, alignItems: 'center', flex: 1 }}>
                                                    <input className="input" style={{ flex: 1, padding: '4px 8px', fontSize: 12 }} value={editValue} onChange={(e) => setEditValue(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit(); }} autoFocus />
                                                    <button className="btn btn-primary btn-sm" onClick={saveEdit}>✓</button>
                                                </span>
                                            ) : (
                                                <span className="detail-field-value" onClick={() => startEdit(k, vs)} style={{ flex: 1, textAlign: 'right' }}>
                                                    {vs.startsWith('http') ? <a href={vs} target="_blank" rel="noreferrer" style={{ color: 'var(--blue3)' }}>↗ link</a> : vs.slice(0, 50) || '—'}
                                                </span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}

                    {activeTab === 'intel' && <IntelligenceView lead={lead} settings={settings} />}

                    {activeTab === 'notes' && (
                        <div className="detail-section">
                            <div className="detail-section-title">Notas</div>
                            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                                <textarea className="input" rows={2} placeholder="Adicionar nota..." value={noteText} onChange={(e) => setNoteText(e.target.value)} style={{ resize: 'vertical', flex: 1 }} />
                                <button className="btn btn-primary btn-sm" style={{ alignSelf: 'flex-end' }} onClick={addNote}>Salvar</button>
                            </div>
                            {notes.map((n, i) => (
                                <div key={i} style={{ background: 'var(--card2)', borderRadius: 8, padding: '10px 12px', border: '1px solid var(--border)', marginBottom: 8 }}>
                                    <div style={{ fontSize: 13, color: 'var(--t1)' }}>{n.text}</div>
                                    <div style={{ fontSize: 10, color: 'var(--t3)', marginTop: 4 }}>{new Date(n.date).toLocaleString('pt-BR')}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="detail-footer" style={{ padding: 16, borderTop: '1px solid var(--border)', display: 'flex', gap: 8 }}>
                    <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={() => handleAction('whatsapp')}>📱 WhatsApp</button>
                    <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={() => handleAction('email')}>✉ Email</button>
                    <button className="btn btn-danger btn-sm" onClick={handleDelete}>🗑</button>
                </div>
            </div>
        </>
    );
}

function IntelligenceView({ lead, settings }: { lead: any, settings: any }) {
    const insight = generateLeadInsight(lead, settings);
    const toast = useToast();
    const copy = (text: string) => { copyToClipboard(text); toast('Copiado!', 'success'); };

    return (
        <div style={{ padding: 0 }}>
            <div className="detail-section" style={{ background: 'var(--blue-dim)', borderRadius: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div>
                        <div style={{ fontSize: 10, color: 'var(--blue)', fontWeight: 700 }}>B2B STRATEGY</div>
                        <div style={{ fontSize: 14, fontWeight: 700 }}>Especialista em {getLeadCategory(lead, 'segmento') || 'Mercado'}</div>
                    </div>
                    <div className={`badge badge-${insight.strategy.qualification === 'quente' ? 'green' : 'amber'}`}>{insight.strategy.qualification.toUpperCase()}</div>
                </div>
            </div>
            <div className="detail-section">
                <div className="detail-section-title">Análise de Dores</div>
                {insight.analysis.pains.map((p, i) => <div key={i} style={{ fontSize: 12, marginBottom: 4 }}>• {p}</div>)}
            </div>
            <div className="detail-section">
                <div className="detail-section-title">Modelos Prontos</div>
                <div style={{ marginBottom: 12 }}>
                    <div className="flex space-between items-center mb-4">
                        <span style={{ fontSize: 11, fontWeight: 600 }}>Email de Abordagem</span>
                        <button className="btn btn-ghost btn-sm" onClick={() => copy(insight.templates.email[0])}>Copiar</button>
                    </div>
                    <pre style={{ fontSize: 11, background: 'var(--card2)', padding: 8, whiteSpace: 'pre-wrap' }}>{insight.templates.email[0]}</pre>
                </div>
            </div>
            <div className="detail-section">
                <div className="detail-section-title">Plano de Ação</div>
                {insight.actionPlan.sequence.map((s, i) => <div key={i} style={{ fontSize: 12, marginBottom: 4 }}>{i + 1}. {s}</div>)}
            </div>
        </div>
    );
}

