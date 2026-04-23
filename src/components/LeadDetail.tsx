import { useState, useEffect } from 'react';
import { 
    X, 
    Database, 
    Zap, 
    FileText, 
    Phone, 
    Mail, 
    MessageCircle, 
    Trash2, 
    Check, 
    ExternalLink, 
    AlertCircle, 
    RotateCw,
    Layout,
    Flame,
    Thermometer,
    Snowflake,
    Target,
    ShieldCheck,
    Globe,
    Instagram,
    Facebook,
    Code
} from 'lucide-react';
import { useAppState, useAppDispatch } from '../store';
import { useToast } from './Toast';
import { useConfirm } from './ConfirmModal';
import EmailTemplateModal from './EmailTemplateModal';
import OutcomeModal from './OutcomeModal';
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
    const [outcomeModalOpen, setOutcomeModalOpen] = useState(false);
    const [contactHistory, setContactHistory] = useState<Array<{ id: string; channel: string; title: string; sub: string; icon: string; createdAt: string; userName: string }>>([]);
    const [loadingHistory, setLoadingHistory] = useState(false);

    const [enriching, setEnriching] = useState(false);

    // Buscar lead
    const lead = leads.find((l) => l.id === leadId);

    // Fetch contact history
    const refreshHistory = async () => {
        if (!leadId) return;
        setLoadingHistory(true);
        try {
            const result = await leadApi.fetchLeadActivities(leadId, { limit: 10 });
            setContactHistory(result.activities || []);
        } catch (err) {
            console.error('Failed to fetch activities:', err);
        } finally {
            setLoadingHistory(false);
        }
    };

    useEffect(() => {
        if (leadId) refreshHistory();
    }, [leadId]);

    // Reset activeTab
    useEffect(() => {
        setActiveTab('info');
    }, [leadId]);

    if (!lead) {
        return <div className={`detail-panel${leadId ? ' open' : ''}`} />;
    }

    const nameCol = detectNameCol(leads);
    const catCol = detectCatCol(leads);
    const name = getLeadName(lead, nameCol);
    const cat = getLeadCategory(lead, catCol);
    const cls = scoreClass(lead._score, settings.hotThreshold, settings.warmThreshold);

    const handleSaveOutcome = async (data: { type: string; outcome: string; notes: string }) => {
        try {
            await leadApi.logLeadInteraction(lead.id, data);
            toast('Resultado registado com sucesso.', 'success');
            
            // Refresh lead data in store
            const updatedLead = await leadApi.fetchLeadById(lead.id);
            dispatch({ type: 'UPDATE_LEAD', payload: { id: lead.id, fields: { 
                _pipeline: updatedLead.pipelineStage,
                _lastContact: new Date().toISOString(),
                outcomeScore: updatedLead.outcomeScore,
                lastOutcome: updatedLead.lastOutcome
            } } });
            
            refreshHistory();
        } catch (err) {
            console.error('Failed to log interaction:', err);
            toast('Erro ao registar resultado.', 'error');
        }
    };

    const handleEnrich = async () => {
        setEnriching(true);
        try {
            const updatedLead = await leadApi.enrichLead(lead.id);
            dispatch({ type: 'UPDATE_LEAD', payload: { id: lead.id, fields: { insight: updatedLead.insight } } });
            toast('Lead enriquecido com sucesso.', 'success');
        } catch (err) {
            console.error('Failed to enrich lead:', err);
            toast('Erro ao enriquecer lead.', 'error');
        } finally {
            setEnriching(false);
        }
    };

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
            nome: 'Nome',
            segmento: 'Segmento',
            endereco: 'Morada',
            telefone: 'Telefone',
            email: 'Email',
            cidade: 'Cidade',
            website: 'Website',
            status: 'Status',
            horario: 'Horário',
            avaliacao: 'Avaliação',
            reviews: 'Reviews',
            preco: 'Preço',
            observacoes: 'Obs',
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
            payload: { title: `Funil: ${name}`, sub: `Movido para ${label}`, icon: <Layout size={14} />, time: new Date().toISOString() },
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
        if (!lead) return;
        const phone = lead.telefone?.replace(/\D/g, '') || '';
        
        if (channel === 'telefone') {
            if (!phone) { toast('Telefone não disponível.', 'info'); return; }
            window.open(`tel:${lead.telefone}`);
        } else if (channel === 'whatsapp') {
            if (!phone) { toast('Telefone não disponível.', 'info'); return; }
            window.open('https://wa.me/' + phone, '_blank');
        } else if (channel === 'email') {
            if (!lead.email) { toast('Email não disponível.', 'info'); return; }
            setEmailModalOpen(true);
            return;
        }

        try {
            await leadApi.logLeadActivity(lead.id, channel);
            dispatch({ type: 'UPDATE_LEAD', payload: { id: lead.id, fields: { _lastContact: new Date().toISOString() } } });
            const labels = { telefone: 'Telefonei', email: 'Email enviado', whatsapp: 'WhatsApp enviado' };
            toast(`${labels[channel]} · Registo guardado.`, 'success');
            refreshHistory();
        } catch (err) {
            console.error('Failed to log contact:', err);
        }
    };

    const handleEmailSent = async () => {
        try {
            await leadApi.logLeadActivity(lead.id, 'email');
            dispatch({ type: 'UPDATE_LEAD', payload: { id: lead.id, fields: { _lastContact: new Date().toISOString() } } });
            toast('Email registrado.', 'success');
            refreshHistory();
        } catch (err) {
            console.error('Failed to log email:', err);
        }
    };

    const handleDelete = async () => {
        const ok = await confirm({
            title: 'Remover lead',
            message: `Remover "${name}" permanentemente?`,
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
            toast('Falha ao eliminar lead.', 'error');
        }
    };

    const notes = lead._notes || [];
    const enrichment = (lead.insight as any)?.enrichment;

    return (
        <>
            <div className={`detail-overlay ${leadId ? 'open' : ''}`} onClick={onClose} />
            <div className={`detail-panel${leadId ? ' open' : ''}`}>
                <div className="detail-header">
                    <div>
                        <div style={{ fontFamily: 'var(--font-d)', fontSize: 16, fontWeight: 700 }}>{name}</div>
                        <div style={{ fontSize: 12, color: 'var(--t3)', marginTop: 2 }}>{cat || 'Sem categoria'}</div>
                    </div>
                    <button className="btn-icon" onClick={onClose}><X size={20} /></button>
                </div>

                <div className="detail-tabs">
                    {(['info', 'intel', 'notes'] as const).map((t) => (
                        <button key={t} className={`detail-tab ${activeTab === t ? 'active' : ''}`} onClick={() => setActiveTab(t)}>
                            {t === 'info' && <Database size={12} />}
                            {t === 'intel' && <Zap size={12} />}
                            {t === 'notes' && <FileText size={12} />}
                            {t === 'info' ? 'Dados' : t === 'intel' ? 'Intel' : 'Notas'}
                        </button>
                    ))}
                </div>

                <div className="detail-body">
                    {activeTab === 'info' && (
                        <>
                            {/* Score & Adaptive IQ */}
                            <div className="detail-section">
                                <div className="detail-section-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span>Análise de Performance</span>
                                    <button 
                                        className={`btn btn-ghost btn-sm ${enriching ? 'loading' : ''}`}
                                        onClick={handleEnrich}
                                        disabled={enriching}
                                        style={{ fontSize: 10, padding: '2px 8px', gap: 4 }}
                                    >
                                        <RotateCw size={10} className={enriching ? 'loading-spinner-fast' : ''} />
                                        {enriching ? 'Scouting...' : 'Enriquecer'}
                                    </button>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
                                    <div className={`score-ring score-${cls}`} style={{ width: 56, height: 56, fontSize: 20 }}>
                                        {lead._score.toFixed(1)}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                                            {cls === 'hot' ? <Flame size={14} color="var(--green)" /> : cls === 'warm' ? <Thermometer size={14} color="var(--amber)" /> : <Snowflake size={14} color="var(--t3)" />}
                                            {scoreLabel(lead._score, settings.hotThreshold, settings.warmThreshold)}
                                        </div>
                                        <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 2 }}>{scoreReason(lead)}</div>
                                    </div>
                                    {lead.outcomeScore !== 0 && (
                                        <div style={{ padding: '4px 8px', background: 'var(--blue-dim)', border: '1px solid var(--blue)', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <Target size={12} color="var(--blue)" />
                                            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--blue)' }}>IQ {lead.outcomeScore > 0 ? '+' : ''}{lead.outcomeScore}</span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Digital Presence (Enrichment) */}
                            {enrichment && (
                                <div className="detail-section" style={{ background: 'var(--card2)', padding: 12, borderRadius: 12, border: '1px solid var(--border)', marginBottom: 20 }}>
                                    <div className="detail-section-title" style={{ fontSize: 10, opacity: 0.6 }}>Presença Digital Detetada</div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: enrichment.presence.hasWebsite ? 'var(--green)' : 'var(--t3)' }}>
                                            <Globe size={12} /> Website {enrichment.presence.hasWebsite ? <ShieldCheck size={10} /> : ''}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: enrichment.presence.hasInstagram ? 'var(--blue)' : 'var(--t3)' }}>
                                            <Instagram size={12} /> Instagram {enrichment.presence.hasInstagram ? <ShieldCheck size={10} /> : ''}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: enrichment.presence.hasFacebook ? 'var(--blue)' : 'var(--t3)' }}>
                                            <Facebook size={12} /> Facebook {enrichment.presence.hasFacebook ? <ShieldCheck size={10} /> : ''}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, color: enrichment.presence.hasPixel ? 'var(--amber)' : 'var(--t3)' }}>
                                            <Code size={12} /> Pixel Ads {enrichment.presence.hasPixel ? <ShieldCheck size={10} /> : ''}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Funil & Desfecho */}
                            <div className="detail-section" style={{ background: 'var(--card2)', padding: 12, borderRadius: 12, border: '1px solid var(--border)' }}>
                                <div className="detail-section-title">Estado no Funil</div>
                                <div style={{ display: 'flex', gap: 8 }}>
                                    <select className="input" style={{ flex: 1 }} value={lead._pipeline || 'novo'} onChange={(e) => movePipeline(e.target.value as PipelineStage)}>
                                        <option value="novo">Novo</option>
                                        <option value="qualificado">Qualificado</option>
                                        <option value="proposta">Proposta</option>
                                        <option value="negociacao">Negociação</option>
                                        <option value="ganho">Ganho</option>
                                        <option value="perdido">Perdido</option>
                                    </select>
                                    <button 
                                        className="btn btn-primary btn-sm" 
                                        style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                                        onClick={() => setOutcomeModalOpen(true)}
                                    >
                                        <Target size={14} /> Desfecho
                                    </button>
                                </div>
                            </div>

                            <div className="detail-section" style={{ marginTop: 20 }}>
                                <div className="detail-section-title">Dados Gerais</div>
                                {fields.map(([k, v]) => {
                                    const vs = String(v || '');
                                    const isEditing = editingField === k;
                                    return (
                                        <div className="detail-field" key={k}>
                                            <span className="detail-field-label">{fieldLabel(k)}</span>
                                            {isEditing ? (
                                                <div style={{ display: 'flex', gap: 4, alignItems: 'center', flex: 1 }}>
                                                    <input className="input" style={{ flex: 1, padding: '4px 8px', fontSize: 12 }} value={editValue} onChange={(e) => setEditValue(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit(); }} autoFocus />
                                                    <button className="btn btn-primary btn-sm" onClick={saveEdit}><Check size={14} /></button>
                                                </div>
                                            ) : (
                                                <span className="detail-field-value" onClick={() => startEdit(k, vs)} style={{ flex: 1, textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                                    {vs.startsWith('http') ? <a href={vs} target="_blank" rel="noreferrer" style={{ color: 'var(--blue3)' }}><ExternalLink size={12} /> abrir</a> : vs || '—'}
                                                </span>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            {/* History Section */}
                            <div className="detail-section">
                                <div className="detail-section-title">Histórico Recente</div>
                                {loadingHistory ? <div style={{ fontSize: 11, color: 'var(--t3)' }}>A carregar...</div> : 
                                 contactHistory.length === 0 ? <div style={{ fontSize: 11, color: 'var(--t3)' }}>Sem registos.</div> : 
                                 contactHistory.map(a => (
                                    <div key={a.id} style={{ display: 'flex', gap: 8, padding: '8px 0', borderBottom: '1px solid var(--border)', fontSize: 12, alignItems: 'center' }}>
                                        <span style={{ color: 'var(--blue)' }}>{a.icon}</span>
                                        <span style={{ flex: 1 }}>{a.title} · <small style={{ color: 'var(--t3)' }}>{a.sub}</small></span>
                                        <span style={{ fontSize: 10, color: 'var(--t3)' }}>{new Date(a.createdAt).toLocaleDateString()}</span>
                                    </div>
                                 ))}
                            </div>
                        </>
                    )}

                    {activeTab === 'intel' && <IntelligenceView lead={lead} settings={settings} />}

                    {activeTab === 'notes' && (
                        <div className="detail-section">
                            <div className="detail-section-title">Notas</div>
                            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                                <textarea className="input" rows={2} placeholder="Adicionar nota..." value={noteText} onChange={(e) => setNoteText(e.target.value)} style={{ resize: 'none', flex: 1 }} />
                                <button className="btn btn-primary btn-sm" onClick={addNote}>Salvar</button>
                            </div>
                            {notes.map((n, i) => (
                                <div key={i} style={{ background: 'var(--card2)', borderRadius: 8, padding: '10px 12px', border: '1px solid var(--border)', marginBottom: 8 }}>
                                    <div style={{ fontSize: 13, color: 'var(--t1)' }}>{n.text}</div>
                                    <div style={{ fontSize: 10, color: 'var(--t3)', marginTop: 4 }}>{new Date(n.date).toLocaleString()}</div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="detail-footer">
                    <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={() => handleContact('telefone')}><Phone size={14} /> Telefone</button>
                    <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={() => handleContact('email')}><Mail size={14} /> Email</button>
                    <button className="btn btn-ghost btn-sm" style={{ flex: 1 }} onClick={() => handleContact('whatsapp')}><MessageCircle size={14} /> WhatsApp</button>
                    <button className="btn btn-danger btn-sm" onClick={handleDelete}><Trash2 size={14} /></button>
                </div>

                {emailModalOpen && <EmailTemplateModal lead={lead} onClose={() => setEmailModalOpen(false)} onSend={handleEmailSent} />}
                {outcomeModalOpen && <OutcomeModal isOpen={outcomeModalOpen} onClose={() => setOutcomeModalOpen(false)} onSave={handleSaveOutcome} leadName={name} />}
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
        generateLeadInsight(lead, settings).then(res => { if (mounted) { setInsight(res); setLoading(false); } }).catch(() => { if (mounted) setLoading(false); });
        return () => { mounted = false; };
    }, [lead.id]);
    
    const handleRegenerate = () => {
        localStorage.removeItem(`insight_${lead.id}`);
        setLoading(true);
        generateLeadInsight(lead, settings).then(res => { setInsight(res); setLoading(false); toast('Análise regenerada!', 'success'); });
    };
    
    const copy = (text: string) => { copyToClipboard(text); toast('Copiado!', 'success'); };
    
    if (loading) return <div style={{ padding: 20, textAlign: 'center', fontSize: 12, color: 'var(--t3)' }}><RotateCw size={14} className="loading-spinner-fast" style={{ marginRight: 8 }} /> Analisando lead...</div>;
    if (!insight) return <div style={{ padding: 20, textAlign: 'center', color: 'var(--t3)' }}>Sem análise disponível.</div>;
    
    return (
        <div>
            <div style={{ padding: '8px 16px', display: 'flex', justifyContent: 'flex-end' }}>
                <button className="btn btn-ghost btn-sm" onClick={handleRegenerate} style={{ fontSize: 10 }}><RotateCw size={10} /> Regenerar</button>
            </div>
            <div className="detail-section" style={{ background: 'var(--blue-dim)' }}>
                <div className="flex space-between">
                    <div>
                        <div style={{ fontSize: 10, color: 'var(--blue)', fontWeight: 700 }}>IA STRATEGY</div>
                        <div style={{ fontSize: 14, fontWeight: 700 }}>{getLeadCategory(lead, 'segmento') || 'Mercado'}</div>
                    </div>
                    <div className={`badge badge-${insight.strategy?.qualification === 'quente' ? 'green' : 'gray'}`}>{insight.strategy?.qualification?.toUpperCase()}</div>
                </div>
            </div>
            <div className="detail-section">
                <div className="detail-section-title">Dores & Oportunidades</div>
                {insight.analysis?.pains?.map((p: string, i: number) => <div key={i} style={{ fontSize: 12 }}>• {p}</div>)}
            </div>
            <div className="detail-section">
                <div className="detail-section-title">Modelos</div>
                <pre style={{ fontSize: 11, background: 'var(--card2)', padding: 8, whiteSpace: 'pre-wrap' }}>{insight.templates?.email?.[0]}</pre>
                <button className="btn btn-ghost btn-sm mt-4" onClick={() => copy(insight.templates?.email?.[0] || '')}>Copiar</button>
            </div>
        </div>
    );
}
