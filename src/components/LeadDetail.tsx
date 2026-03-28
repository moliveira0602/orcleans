import { useState } from 'react';
import { useAppState, useAppDispatch } from '../store';
import { useToast } from './Toast';
import { useConfirm } from './ConfirmModal';
import { detectNameCol, detectCatCol, getLeadName, getLeadCategory } from '../utils/detect';
import { scoreClass, scoreLabel, scoreReason } from '../utils/scoring';
import { PIPELINE_COLS } from '../types';
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

    void pipeline;
    void onNavigate;

    const notes = lead._notes || [];

    return (
        <div className={`detail-panel${leadId ? ' open' : ''}`}>
            <div className="detail-header">
                <div>
                    <div style={{ fontFamily: 'var(--font-d)', fontSize: 16, fontWeight: 700 }}>{name}</div>
                    <div style={{ fontSize: 12, color: 'var(--t3)', marginTop: 2 }}>{cat || 'Sem categoria'}</div>
                </div>
                <button className="btn-icon" onClick={onClose}>✕</button>
            </div>
            <div className="detail-body">
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
                            className="progress-fill"
                            style={{
                                width: `${lead._score * 10}%`,
                                background: cls === 'hot' ? 'var(--green)' : cls === 'warm' ? 'var(--amber)' : 'var(--t3)',
                            }}
                        />
                    </div>
                </div>

                {/* Pipeline */}
                <div className="detail-section">
                    <div className="detail-section-title">Pipeline</div>
                    <select
                        className="input"
                        value={lead._pipeline || 'novo'}
                        onChange={(e) => movePipeline(e.target.value as PipelineStage)}
                    >
                        <option value="novo">Novo</option>
                        <option value="qualificado">Qualificado</option>
                        <option value="proposta">Proposta</option>
                        <option value="negociacao">Negociação</option>
                        <option value="ganho">Ganho ✓</option>
                        <option value="perdido">Perdido ✕</option>
                    </select>
                </div>

                {/* Editable Fields */}
                <div className="detail-section">
                    <div className="detail-section-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        Informações
                        <span style={{ fontSize: 10, color: 'var(--t3)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>
                            clique para editar
                        </span>
                    </div>
                    {fields.map(([k, v]) => {
                        const vs = String(v || '');
                        const isEditing = editingField === k;
                        return (
                            <div className="detail-field" key={k} style={{ cursor: isEditing ? 'default' : 'pointer' }}>
                                <span className="detail-field-label">{k}</span>
                                {isEditing ? (
                                    <span style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                                        <input
                                            className="input"
                                            style={{ width: 160, padding: '4px 8px', fontSize: 12 }}
                                            value={editValue}
                                            onChange={(e) => setEditValue(e.target.value)}
                                            onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit(); }}
                                            autoFocus
                                        />
                                        <button className="btn btn-primary btn-sm" style={{ padding: '3px 8px', fontSize: 11 }} onClick={saveEdit}>✓</button>
                                        <button className="btn btn-ghost btn-sm" style={{ padding: '3px 8px', fontSize: 11 }} onClick={cancelEdit}>✕</button>
                                    </span>
                                ) : (
                                    <span
                                        className="detail-field-value"
                                        onClick={() => startEdit(k, vs)}
                                        title="Clique para editar"
                                    >
                                        {vs.startsWith('http') ? (
                                            <a href={vs} target="_blank" rel="noreferrer" style={{ color: 'var(--blue3)', textDecoration: 'none' }}
                                                onClick={(e) => e.stopPropagation()}>
                                                ↗ link
                                            </a>
                                        ) : (
                                            vs.slice(0, 50) || '—'
                                        )}
                                    </span>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Notes */}
                <div className="detail-section">
                    <div className="detail-section-title">Notas</div>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                        <textarea
                            className="input"
                            rows={2}
                            placeholder="Adicionar uma nota..."
                            value={noteText}
                            onChange={(e) => setNoteText(e.target.value)}
                            style={{ resize: 'vertical', flex: 1 }}
                        />
                        <button className="btn btn-primary btn-sm" style={{ alignSelf: 'flex-end' }} onClick={addNote}>
                            Salvar
                        </button>
                    </div>
                    {notes.length ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            {notes.map((n, i) => (
                                <div key={i} style={{
                                    background: 'var(--card2)', borderRadius: 8, padding: '10px 12px',
                                    border: '1px solid var(--border)',
                                }}>
                                    <div style={{ fontSize: 13, color: 'var(--t1)', lineHeight: 1.5 }}>{n.text}</div>
                                    <div style={{ fontSize: 10, color: 'var(--t3)', marginTop: 4 }}>
                                        {new Date(n.date).toLocaleString('pt-BR')}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div style={{ fontSize: 12, color: 'var(--t3)', textAlign: 'center', padding: 8 }}>
                            Nenhuma nota ainda.
                        </div>
                    )}
                </div>

                {/* Quick Actions */}
                <div className="detail-section">
                    <div className="detail-section-title">Ações rápidas</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => handleAction('whatsapp')}>📱 WhatsApp</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => handleAction('email')}>✉ Email</button>
                        <button className="btn btn-danger btn-sm" onClick={handleDelete}>🗑 Remover</button>
                    </div>
                </div>
            </div>
        </div>
    );
}
