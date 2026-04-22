import { useState, useEffect } from 'react';
import { useAppState, useAppDispatch } from '../store';
import { useToast } from './Toast';
import { useConfirm } from './ConfirmModal';
import EmailTemplateModal from './EmailTemplateModal';
import { detectNameCol, detectCatCol, getLeadName, getLeadCategory } from '../utils/detect';
import { scoreClass, scoreLabel, scoreReason } from '../utils/scoring';
import { PIPELINE_COLS } from '../types';
import { generateLeadInsight } from '../utils/ai_service';
import { copyToClipboard } from '../utils/clipboard';
import * as leadApi from '../services/leads';
import type { PipelineStage } from '../types';
import type { Page } from './Layout';

interface LeadDetailProps {
    leadId: string | null;
    onClose: () => void;
    onNavigate: (page: Page) => void;
}

export default function LeadDetail({ leadId, onClose, onNavigate }: LeadDetailProps) {
    const { leads, settings } = useAppState();
    const dispatch = useAppDispatch();
    const toast = useToast();
    const confirm = useConfirm();
    const [editingField, setEditingField] = useState<string | null>(null);
    const [editValue, setEditValue] = useState('');
    const [noteText, setNoteText] = useState('');
    const [activeTab, setActiveTab] = useState<'info' | 'intel' | 'notes'>('info');
    const [emailModalOpen, setEmailModalOpen] = useState(false);
    const [contactHistory, setContactHistory] = useState<Array<{ id: string; channel: string; title: string; sub: string; icon: string; createdAt: string; userName: string }>>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    // Buscar lead - NÃO é um hook, pode ficar onde quiser
    const lead = leads.find((l) => l.id === leadId);

    // Fetch contact history - DEVE estar antes do early return
    useEffect(() => {
        if (!leadId) {
            setContactHistory([]);
            return;
        }
        // Não dependemos de lead dentro do useEffect para evitar re-renders desnecessários
        // O lead será pego dentro via leadId (assumimos que lead já está disponível)
        const currentLead = leads.find(l => l.id === leadId);
        if (!currentLead) {
            setContactHistory([]);
            return;
        }
        setLoadingHistory(true);
        leadApi.fetchLeadActivities(currentLead.id, { limit: 10 })
            .then((result) => setContactHistory(result.activities || []))
            .catch((err) => {
                console.error('Failed to fetch activities:', err);
                setContactHistory([]);
            })
            .finally(() => setLoadingHistory(false));
    }, [leadId, leads]);

    // Reset activeTab para 'info' quando o leadId muda
    useEffect(() => {
        setActiveTab('info');
    }, [leadId]); // Dependemos apenas de leadId e leads

    // Early return DEPOIS de todos os hooks
    if (!lead) {
        return <div className={`detail-panel${leadId ? ' open' : ''}`} />;
    }

    const nameCol = detectNameCol(leads);
    const catCol = detectCatCol(leads);
    const name = getLeadName(lead, nameCol);
    const cat = getLeadCategory(lead, catCol);
    const cls = scoreClass(lead._score, settings.hotThreshold, settings.warmThreshold);

    const fields = [
        ['nome', String(lead.nome || '')],
        ['segmento', String(lead.segmento || '')],
        ['avaliacao', lead.avaliacao != null ? String(lead.avaliacao) : ''],
        ['reviews', lead.reviews != null ? String(lead.reviews) : ''],
        ['preco', String(lead.preco || '')],
        ['endereco', String(lead.endereco || '')],
        ['cidade', String(lead.cidade || '')],
        ['status', String(lead.status || '')],
        ['horario', String(lead.horario || '')],
        ['telefone', String(lead.telefone || '')],
        ['website', String(lead.website || '')],
        ['email', String(lead.email || '')],
        ['observacoes', String(lead.observacoes || '')],
    ].filter(([_, v]) => v !== '');
    const fieldLabel = (k: string) => {
        const map: Record<string, string> = {
            id: 'ID',
            name: 'Nome',
            Name: 'Nome',
            company: 'Empresa',
            Company: 'Empresa',
            segmento: 'Segmento',
            categoria: 'Segmento',
            category: 'Segmento',
            Category: 'Segmento',
            segment: 'Segmento',
            Segment: 'Segmento',
            address: 'Morada',
            Address: 'Morada',
            morada: 'Morada',
            'Endereço': 'Endereço',
            phone: 'Telefone',
            Phone: 'Telefone',
            telefone: 'Telefone',
            email: 'Email',
            cidade: 'Cidade',
            Cidade: 'Cidade',
            Email: 'Email',
            website: 'Website',
            Website: 'Website',
            url: 'URL',
            URL: 'URL',
            city: 'Cidade',
            City: 'Cidade',
            country: 'País',
            Country: 'País',
            state: 'Distrito/Estado',
            State: 'Distrito/Estado',
            postcode: 'Código Postal',
            postal_code: 'Código Postal',
            zip: 'Código Postal',
            CEP: 'Código Postal',
            'Código Postal': 'Código Postal',
            latitude: 'Latitude',
            Latitude: 'Latitude',
            longitude: 'Longitude',
            Longitude: 'Longitude',
            rating: 'Avaliação',
            Rating: 'Avaliação',
            'Featured image': 'Imagem destacada',
            'Rating Info': 'Info da Avaliação',
            'Bing Maps URL': 'URL do Bing Maps',
        };
        return map[k] || k;
    };

    const movePipeline = async (stage: PipelineStage) => {
        try {
            await leadApi.moveLeadPipeline(lead.id, stage);
        } catch (err) {
            console.error('Failed to move lead on server:', err);
        }
        dispatch({ type: 'MOVE_PIPELINE', payload: { leadId: lead.id, stage } });
        const label = PIPELINE_COLS.find((c) => c.id === stage)?.label || stage;
        toast(`Lead movido para "${label}"`, 'success');
        dispatch({
            type: 'ADD_ACTIVITY',
            payload: { title: `Funil: ${name}`, sub: `Movido para ${label}`, icon: '▦', time: new Date().toISOString() },
        });
    };

    const startEdit = (key: string, value: string) => {
        setEditingField(key);
        setEditValue(value);
    };

    const saveEdit = async () => {
        if (editingField) {
            try {
                await leadApi.updateLead(lead.id, { [editingField]: editValue });
            } catch (err) {
                console.error('Failed to update lead on server:', err);
            }
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

    const addNote = async () => {
        if (!noteText.trim()) return;
        const note = { text: noteText.trim(), date: new Date().toISOString() };
        try {
            const existingNotes = lead._notes || [];
            await leadApi.updateLead(lead.id, { notes: [note, ...existingNotes] });
        } catch (err) {
            console.error('Failed to add note on server:', err);
        }
        dispatch({
            type: 'ADD_NOTE',
            payload: { leadId: lead.id, note },
        });
        toast('Nota adicionada.', 'success');
        setNoteText('');
    };

    const handleContact = async (channel: 'telefone' | 'email' | 'whatsapp') => {
        // Validate lead has required contact info
        if (!lead) {
            toast('Lead não encontrado.', 'error');
            return;
        }

        const phone = lead.telefone?.replace(/\D/g, '') || '';
        
        // Open the appropriate URL immediately
        if (channel === 'telefone') {
            if (!phone) {
                toast('Telefone não disponível para este lead.', 'info');
                return;
            }
            window.open(`tel:${lead.telefone}`);
        } else if (channel === 'whatsapp') {
            if (!phone) {
                toast('Telefone não disponível para este lead.', 'info');
                return;
            }
            window.open('https://wa.me/' + phone, '_blank');
        } else if (channel === 'email') {
            if (!lead.email) {
                toast('Email não disponível para este lead.', 'info');
                return;
            }
            setEmailModalOpen(true);
            return; // Don't log yet — will log after template modal confirms
        }

        // Log the activity
        try {
            await leadApi.logLeadActivity(lead.id, channel);
            dispatch({
                type: 'UPDATE_LEAD',
                payload: { id: lead.id, fields: { _lastContact: new Date().toISOString() } },
            });
            const labels = { telefone: 'Telefonei', email: 'Email enviado', whatsapp: 'WhatsApp enviado' };
            toast(`${labels[channel]} · Registo guardado.`, 'success');
            // O useEffect já atualiza o histórico automaticamente
        } catch (err) {
            console.error('Failed to log contact:', err);
            toast('Erro ao registar contato.', 'error');
        }
    };

    const handleEmailSent = async () => {
        // Called from EmailTemplateModal after user confirms
        try {
            await leadApi.logLeadActivity(lead.id, 'email');
            dispatch({
                type: 'UPDATE_LEAD',
                payload: { id: lead.id, fields: { _lastContact: new Date().toISOString() } },
            });
            toast('Email registrado.', 'success');
            // O useEffect já atualiza o histórico automaticamente
        } catch (err) {
            console.error('Failed to log email:', err);
        }
    };

    const handleDelete = async () => {
        const ok = await confirm({
            title: 'Remover lead',
            message: `Tem certeza que deseja remover "${name}" permanentemente? Esta ação não pode ser desfeita.`,
            confirmLabel: 'Remover',
            variant: 'danger',
        });
        if (!ok) return;
        try {
            await leadApi.deleteLead(lead.id);
            dispatch({ type: 'DELETE_LEAD', payload: lead.id });
            toast('Lead removido.', 'info');
            onClose();
        } catch (err) {
            console.error('Failed to delete lead on server:', err);
            toast('Falha ao eliminar lead. Tente novamente.', 'error');
        }
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

                <div className="detail-tabs" style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: 'transparent' }}>
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
                            {t === 'info' ? 'Dados' : t === 'intel' ? 'Inteligência ⚝' : 'Notas'}
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
                                <div className="detail-section-title">Funil</div>
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
                                            <span className="detail-field-label">{fieldLabel(k)}</span>
                                            {isEditing ? (
                                                <span style={{ display: 'flex', gap: 4, alignItems: 'center', flex: 1 }}>
                                                    <input className="input" style={{ flex: 1, padding: '4px 8px', fontSize: 12 }} value={editValue} onChange={(e) => setEditValue(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit(); }} autoFocus />
                                                    <button className="btn btn-primary btn-sm" onClick={saveEdit}>✓</button>
                                                </span>
                                            ) : (
                                                <span className="detail-field-value" onClick={() => startEdit(k, vs)} style={{ flex: 1, textAlign: 'right' }}>
                                                    {vs.startsWith('http') ? <a href={vs} target="_blank" rel="noreferrer" style={{ color: 'var(--blue3)' }}>↗ abrir</a> : vs.slice(0, 50) || '—'}
                                                </span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Cadence indicator */}
                            {(() => {
                                const lc = lead._lastContact;
                                if (!lc) {
                                    const isHot = lead._score >= settings.hotThreshold;
                                    return (
                                        <div className="detail-section" style={{ marginTop: 12 }}>
                                            <div style={{
                                                background: isHot ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)',
                                                border: `1px solid ${isHot ? 'rgba(239,68,68,0.25)' : 'rgba(245,158,11,0.25)'}`,
                                                borderRadius: 8, padding: '10px 12px', fontSize: 12,
                                                color: isHot ? 'var(--red)' : 'var(--amber)',
                                            }}>
                                                ⚠ {isHot ? 'Lead quente' : 'Lead'} nunca contactado — inicie o contato agora.
                                            </div>
                                        </div>
                                    );
                                }
                                const days = Math.floor((Date.now() - new Date(lc).getTime()) / (86400000));
                                const isHot = lead._score >= settings.hotThreshold;
                                if ((isHot && days > 3) || days > 7) {
                                    return (
                                        <div className="detail-section" style={{ marginTop: 12 }}>
                                            <div style={{
                                                background: 'rgba(245,158,11,0.1)',
                                                border: '1px solid rgba(245,158,11,0.25)',
                                                borderRadius: 8, padding: '10px 12px', fontSize: 12,
                                                color: 'var(--amber)',
                                            }}>
                                                ⚠ Último contato há {days} dias — pode ser necessário follow-up.
                                            </div>
                                        </div>
                                    );
                                }
                                return (
                                    <div className="detail-section" style={{ marginTop: 12 }}>
                                        <div style={{ fontSize: 11, color: 'var(--green)' }}>
                                            ✓ Último contato há {days} dia(s)
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Contact History */}
                            <div className="detail-section" style={{ marginTop: 12 }}>
                                <div className="detail-section-title">Histórico de Contatos</div>
                                {loadingHistory ? (
                                    <div style={{ fontSize: 11, color: 'var(--t3)' }}>A carregar...</div>
                                ) : contactHistory.length === 0 ? (
                                    <div style={{ fontSize: 11, color: 'var(--t3)' }}>Nenhum contato registrado.</div>
                                ) : (
                                    contactHistory.map((a) => (
                                        <div key={a.id} style={{
                                            display: 'flex', gap: 8, padding: '8px 0',
                                            borderBottom: '1px solid var(--border)',
                                            fontSize: 12, alignItems: 'center',
                                        }}>
                                            <span style={{ fontSize: 14 }}>{a.icon}</span>
                                            <span style={{ flex: 1, color: 'var(--t2)' }}>{a.title}</span>
                                            <span style={{ fontSize: 10, color: 'var(--t3)' }}>
                                                {new Date(a.createdAt).toLocaleDateString('pt-BR')}
                                            </span>
                                        </div>
                                    ))
                                )}
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
                    <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={() => handleContact('telefone')}>📞 Telefonei</button>
                    <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={() => handleContact('email')}>✉ Email</button>
                    <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={() => handleContact('whatsapp')}>💬 WhatsApp</button>
                    <button className="btn btn-danger btn-sm" onClick={handleDelete}>🗑</button>
                </div>

                {/* Email Template Modal */}
                {emailModalOpen && (
                    <EmailTemplateModal
                        lead={lead}
                        onClose={() => setEmailModalOpen(false)}
                        onSend={handleEmailSent}
                    />
                )}
            </div>
        </>
    );
}

function IntelligenceView({ lead, settings }: { lead: any, settings: any }) {
    const [insight, setInsight] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const toast = useToast();
    
    useEffect(() => {
        let mounted = true;
        
        generateLeadInsight(lead, settings).then(result => {
            if (mounted) {
                setInsight(result);
                setLoading(false);
            }
        }).catch(() => {
            if (mounted) setLoading(false);
        });
        
        return () => { mounted = false; };
    }, [lead.id]);
    
    const handleRegenerate = () => {
        const cacheKey = `insight_${lead.id}`;
        localStorage.removeItem(cacheKey);
        setLoading(true);
        generateLeadInsight(lead, settings).then(result => {
            setInsight(result);
            setLoading(false);
            toast('Análise regenerada!', 'success');
        });
    };
    
    const copy = (text: string) => { copyToClipboard(text); toast('Copiado!', 'success'); };
    
    if (loading) {
        return (
            <div style={{ padding: 20, textAlign: 'center' }}>
                <div style={{ fontSize: 12, color: 'var(--t3)' }}>🤖 Analisando lead com IA...</div>
                <div style={{ marginTop: 8 }}>
                    <div className="skeleton" style={{ height: 4, width: '100%', background: 'var(--card2)', borderRadius: 2 }}>
                        <div className="skeleton-loading" style={{ height: '100%', background: 'var(--blue)', borderRadius: 2, animationDuration: '1.5s' }} />
                    </div>
                </div>
            </div>
        );
    }
    
    if (!insight) {
        return (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--t3)' }}>
                Não foi possível gerar análise. Configure a API da OpenRouter.
            </div>
        );
    }
    
    return (
        <div style={{ padding: 0 }}>
            <div style={{ padding: '8px 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
                <button 
                    className="btn btn-ghost btn-sm" 
                    onClick={handleRegenerate}
                    disabled={loading}
                    style={{ fontSize: 10 }}
                >
                    🔄 Regenerar
                </button>
            </div>
            <div className="detail-section" style={{ background: 'var(--blue-dim)', borderRadius: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                    <div>
                        <div style={{ fontSize: 10, color: 'var(--blue)', fontWeight: 700 }}>ESTRATÉGIA B2B</div>
                        <div style={{ fontSize: 14, fontWeight: 700 }}>Especialista em {getLeadCategory(lead, 'segmento') || 'Mercado'}</div>
                        <div style={{ fontSize: 10, color: 'var(--t3)', marginTop: 4 }}>{lead.nome || lead.Name || 'Cliente'}</div>
                    </div>
                    <div className={`badge badge-${insight.strategy?.qualification === 'quente' ? 'green' : insight.strategy?.qualification === 'morno' ? 'amber' : 'gray'}`}>{insight.strategy?.qualification?.toUpperCase() || 'N/A'}</div>
                </div>
            </div>
            <div className="detail-section">
                <div className="detail-section-title">Análise de Dores</div>
                {insight.analysis?.pains?.length ? insight.analysis.pains.map((p: string, i: number) => <div key={i} style={{ fontSize: 12, marginBottom: 4 }}>• {p}</div>) : <div style={{ fontSize: 12, color: 'var(--t3)' }}>Sem dores identificadas</div>}
            </div>
            <div className="detail-section">
                <div className="detail-section-title">Oportunidades</div>
                {insight.analysis?.opportunities?.length ? insight.analysis.opportunities.map((o: string, i: number) => <div key={i} style={{ fontSize: 12, marginBottom: 4 }}>• {o}</div>) : <div style={{ fontSize: 12, color: 'var(--t3)' }}>Sem oportunidades identificadas</div>}
            </div>
            <div className="detail-section">
                <div className="detail-section-title">Modelos Prontos</div>
                <div style={{ marginBottom: 12 }}>
                    <div className="flex space-between items-center mb-4">
                        <span style={{ fontSize: 11, fontWeight: 600 }}>Email de Abordagem</span>
                        <button className="btn btn-ghost btn-sm" onClick={() => copy(insight.templates?.email?.[0] || '')}>Copiar</button>
                    </div>
                    <pre style={{ fontSize: 11, background: 'var(--card2)', padding: 8, whiteSpace: 'pre-wrap' }}>{insight.templates?.email?.[0] || 'N/A'}</pre>
                </div>
            </div>
            <div className="detail-section">
                <div className="detail-section-title">Plano de Ação</div>
                {insight.actionPlan?.sequence?.length ? insight.actionPlan.sequence.map((s: string, i: number) => <div key={i} style={{ fontSize: 12, marginBottom: 4 }}>{i + 1}. {s}</div>) : <div style={{ fontSize: 12, color: 'var(--t3)' }}>Sem plano definido</div>}
            </div>
        </div>
    );
}
