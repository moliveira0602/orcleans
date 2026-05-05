import { useState, useEffect, useRef } from 'react';
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
    Code,
    Share2,
    Sparkles,
    Clock,
    Eye,
    EyeOff
} from 'lucide-react';
import ResponsiveDetailPanel from './ResponsiveDetailPanel';
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
    const [focusMode, setFocusMode] = useState(false);

    const [enriching, setEnriching] = useState(false);
    const abortControllerRef = useRef<AbortController | null>(null);

    // Buscar lead
    const lead = leads.find((l) => l.id === leadId);

    // Fetch contact history with AbortController
    const refreshHistory = async () => {
        if (!leadId) return;

        // Cancel previous request
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        const controller = new AbortController();
        abortControllerRef.current = controller;
        setLoadingHistory(true);
        try {
            const result = await leadApi.fetchLeadActivities(leadId, { limit: 10 });
            if (!controller.signal.aborted) {
                setContactHistory(result.activities || []);
            }
        } catch (err: any) {
            if (err.name !== 'AbortError' && !controller.signal.aborted) {
                console.error('Failed to fetch activities:', err);
            }
        } finally {
            if (abortControllerRef.current === controller) {
                setLoadingHistory(false);
            }
        }
    };

    useEffect(() => {
        if (leadId) refreshHistory();
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, [leadId]);

    // Reset activeTab
    useEffect(() => {
        setActiveTab('info');
    }, [leadId]);

    if (!lead) {
        return <ResponsiveDetailPanel leadId={leadId} onClose={onClose}>{null}</ResponsiveDetailPanel>;
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
                outcomeScore: updatedLead.outcomeScore || 0,
                lastOutcome: updatedLead.lastOutcome || ''
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
            payload: { title: `Pipeline: ${name}`, sub: `Movido para ${label}`, icon: 'pipeline', time: new Date().toISOString() },
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
        <ResponsiveDetailPanel leadId={leadId} onClose={onClose}>
                <div className="detail-header" style={{ 
                    padding: '24px 20px', 
                    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                    background: 'linear-gradient(to bottom, rgba(255,255,255,0.02), transparent)' 
                }}>
                    <div style={{ flex: 1 }}>
                        <h2 style={{ 
                            fontFamily: 'var(--font-d)', 
                            fontSize: '20px', 
                            fontWeight: 800, 
                            color: '#FFF', 
                            letterSpacing: '-0.02em',
                            margin: 0
                        }}>
                            {name}
                        </h2>
                        <div style={{ 
                            fontSize: '12px', 
                            fontWeight: 600,
                            color: 'var(--blue)', 
                            marginTop: 4,
                            textTransform: 'uppercase',
                            letterSpacing: '0.05em',
                            opacity: 0.8
                        }}>
                            {cat || 'Sem categoria'}
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <button 
                            className={`btn btn-sm ${focusMode ? 'btn-primary' : 'btn-ghost'}`} 
                            style={{ 
                                gap: 8, 
                                height: 36, 
                                borderRadius: 12,
                                background: focusMode ? '#FFF' : 'rgba(255,255,255,0.05)',
                                borderColor: focusMode ? '#FFF' : 'rgba(255,255,255,0.1)'
                            }}
                            onClick={() => setFocusMode(!focusMode)}
                        >
                            {focusMode ? <EyeOff size={14} /> : <Eye size={14} />}
                            <span style={{ fontSize: 11, fontWeight: 700 }}>{focusMode ? 'Sair' : 'Modo Foco'}</span>
                        </button>
                        <button className="btn-icon" onClick={onClose} style={{ 
                            background: 'rgba(255,255,255,0.05)', 
                            borderRadius: '12px',
                            padding: '8px',
                            transition: 'all 0.2s ease'
                        }}>
                            <X size={20} color="rgba(255,255,255,0.6)" />
                        </button>
                    </div>
                </div>

                <div className="detail-tabs" style={{ 
                    padding: '12px 20px', 
                    background: 'rgba(0,0,0,0.2)',
                    display: 'flex',
                    gap: '8px'
                }}>
                    {(['info', 'intel', 'notes'] as const).map((t) => (
                        <button 
                            key={t} 
                            className={`detail-tab ${activeTab === t ? 'active' : ''}`} 
                            onClick={() => setActiveTab(t)}
                            style={{
                                flex: 1,
                                padding: '10px 0',
                                borderRadius: '10px',
                                fontSize: '11px',
                                fontWeight: 700,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                background: activeTab === t ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                                border: activeTab === t ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid transparent',
                                color: activeTab === t ? '#FFF' : 'rgba(255,255,255,0.4)',
                                boxShadow: activeTab === t ? '0 4px 12px rgba(0,0,0,0.2)' : 'none'
                            }}
                        >
                            {t === 'info' && <Database size={14} />}
                            {t === 'intel' && <Zap size={14} />}
                            {t === 'notes' && <FileText size={14} />}
                            {t === 'info' ? 'DADOS' : t === 'intel' ? 'INTEL' : 'NOTAS'}
                        </button>
                    ))}
                </div>

                <div className="detail-body" style={{ padding: '20px', flex: 1, overflowY: 'auto' }}>
                    {focusMode ? (
                        <div className="animate-in" style={{ padding: '20px 0' }}>
                            <div style={{ textAlign: 'center', marginBottom: 40 }}>
                                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--blue)', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: 8 }}>Em Atendimento</div>
                                <h1 style={{ fontSize: 32, fontWeight: 800, color: '#FFF', marginBottom: 4 }}>{name}</h1>
                                <div style={{ fontSize: 16, color: 'rgba(255,255,255,0.5)' }}>{cat} · {lead.telefone}</div>
                            </div>

                            {lead.insight ? (
                                <div className="glass" style={{ padding: 40, borderRadius: 32, border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 32px 64px rgba(0,0,0,0.4)' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
                                        <Sparkles size={20} color="var(--blue)" />
                                        <div style={{ fontSize: 14, fontWeight: 700, color: '#FFF' }}>Guião de Abordagem Personalizado</div>
                                    </div>
                                    <div style={{ 
                                        fontSize: 22, 
                                        lineHeight: 1.6, 
                                        color: '#EEE', 
                                        whiteSpace: 'pre-wrap',
                                        fontFamily: 'serif',
                                        fontStyle: 'italic',
                                        padding: '0 24px',
                                        borderLeft: '4px solid var(--blue)'
                                    }}>
                                        "{(lead.insight as any).abordagem}"
                                    </div>
                                    <div style={{ marginTop: 40, display: 'flex', gap: 16 }}>
                                        <button className="btn btn-primary" style={{ flex: 1, height: 56, fontSize: 16 }} onClick={() => handleContact((lead.insight as any).canal)}>
                                            Iniciar {(lead.insight as any).canal}
                                        </button>
                                        <button className="btn btn-ghost" style={{ flex: 1, height: 56, fontSize: 16 }} onClick={() => setOutcomeModalOpen(true)}>
                                            Registar Desfecho
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div style={{ textAlign: 'center', padding: 60, color: 'rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.02)', borderRadius: 24 }}>
                                    <Sparkles size={32} style={{ marginBottom: 16, opacity: 0.5 }} />
                                    <div>Gere insights inteligentes na aba "Intel" para usar o modo foco.</div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <>
                            {activeTab === 'info' && (
                                <>
                            {/* Performance Card */}
                            <div className="detail-section" style={{ 
                                background: 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.01) 100%)',
                                padding: '20px',
                                borderRadius: '16px',
                                border: '1px solid rgba(255,255,255,0.05)',
                                marginBottom: '20px'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                                    <span style={{ fontSize: '10px', fontWeight: 800, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Análise de Performance</span>
                                    <button 
                                        className={`btn btn-ghost btn-sm ${enriching ? 'loading' : ''}`}
                                        onClick={handleEnrich}
                                        disabled={enriching}
                                        style={{ 
                                            fontSize: '10px', 
                                            background: 'rgba(255,255,255,0.05)', 
                                            borderRadius: '8px',
                                            height: '24px',
                                            border: '1px solid rgba(255,255,255,0.1)'
                                        }}
                                    >
                                        <RotateCw size={12} className={enriching ? 'loading-spinner-fast' : ''} />
                                        {enriching ? 'Scouting...' : 'Enriquecer'}
                                    </button>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                                    <div className={`score-ring score-${cls}`} style={{ 
                                        width: 64, 
                                        height: 64, 
                                        fontSize: 22,
                                        fontWeight: 800,
                                        background: 'rgba(0,0,0,0.3)',
                                        boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.5)'
                                    }}>
                                        {lead._score.toFixed(1)}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontSize: 14, fontWeight: 700, color: '#FFF', display: 'flex', alignItems: 'center', gap: 8 }}>
                                            {cls === 'hot' ? <Flame size={16} color="#4ADE80" /> : cls === 'warm' ? <Thermometer size={16} color="#FBBF24" /> : <Snowflake size={16} color="rgba(255,255,255,0.4)" />}
                                            {scoreLabel(lead._score, settings.hotThreshold, settings.warmThreshold)}
                                        </div>
                                        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginTop: 4, lineHeight: 1.4 }}>{scoreReason(lead)}</div>
                                    </div>
                                </div>
                            </div>

                            {/* AI Quick Insight (from Import) */}
                            {lead.insight && (lead.insight as any).canal && (
                                <div className="detail-section" style={{ 
                                    background: 'linear-gradient(135deg, rgba(167, 139, 250, 0.1) 0%, rgba(167, 139, 250, 0.05) 100%)',
                                    padding: '20px',
                                    borderRadius: '16px',
                                    border: '1px solid rgba(167, 139, 250, 0.2)',
                                    marginBottom: '20px'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                            <Sparkles size={14} color="#A78BFA" />
                                            <span style={{ fontSize: '10px', fontWeight: 800, color: '#A78BFA', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                                                Estratégia Recomendada
                                            </span>
                                        </div>
                                        <div style={{ 
                                            fontSize: '10px', 
                                            fontWeight: 700, 
                                            color: '#A78BFA', 
                                            background: 'rgba(167, 139, 250, 0.1)', 
                                            padding: '2px 8px', 
                                            borderRadius: '100px' 
                                        }}>
                                            Score IA: {(lead.insight as any).score_oportunidade}/10
                                        </div>
                                    </div>
                                    
                                    <div style={{ marginBottom: 16 }}>
                                        <div style={{ fontSize: 13, color: '#FFF', fontWeight: 700, marginBottom: 4 }}>
                                            💡 {(lead.insight as any).motivo}
                                        </div>
                                        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5, fontStyle: 'italic' }}>
                                            "{(lead.insight as any).abordagem}"
                                        </div>
                                    </div>

                                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                                        <button 
                                            className="btn btn-sm" 
                                            style={{ 
                                                flex: 1, 
                                                background: 'rgba(167, 139, 250, 0.2)', 
                                                color: '#DDD', 
                                                border: '1px solid rgba(167, 139, 250, 0.3)',
                                                fontSize: '11px',
                                                height: '32px',
                                                minWidth: '140px'
                                            }}
                                            onClick={() => handleContact((lead.insight as any).canal)}
                                        >
                                            {(lead.insight as any).canal === 'whatsapp' ? <MessageCircle size={14} /> : (lead.insight as any).canal === 'email' ? <Mail size={14} /> : <Phone size={14} />}
                                            Contactar via {(lead.insight as any).canal}
                                        </button>
                                        <div style={{ 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            gap: 6, 
                                            fontSize: '11px', 
                                            color: 'rgba(255,255,255,0.4)',
                                            background: 'rgba(0,0,0,0.2)',
                                            padding: '0 12px',
                                            borderRadius: '8px',
                                            height: '32px'
                                        }}>
                                            <Clock size={12} />
                                            {(lead.insight as any).melhor_horario}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Pipeline & Desfecho */}
                            <div className="detail-section" style={{ 
                                background: 'rgba(255,255,255,0.02)',
                                padding: '16px',
                                borderRadius: '16px',
                                border: '1px dashed rgba(255,255,255,0.1)',
                                marginBottom: '24px'
                            }}>
                                <div style={{ fontSize: '10px', fontWeight: 800, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Status no Pipeline</div>
                                <div style={{ display: 'flex', gap: 10 }}>
                                    <select className="input" style={{ 
                                        flex: 1, 
                                        background: 'rgba(0,0,0,0.3)', 
                                        borderColor: 'rgba(255,255,255,0.1)',
                                        height: '36px',
                                        fontSize: '13px'
                                    }} value={lead._pipeline || 'novo'} onChange={(e) => movePipeline(e.target.value as PipelineStage)}>
                                        <option value="novo">Novo</option>
                                        <option value="qualificado">Qualificado</option>
                                        <option value="proposta">Proposta</option>
                                        <option value="negociacao">Negociação</option>
                                        <option value="ganho">Ganho</option>
                                        <option value="perdido">Perdido</option>
                                    </select>
                                    <button 
                                        className="btn btn-primary btn-sm" 
                                        style={{ height: '36px', padding: '0 16px' }}
                                        onClick={() => setOutcomeModalOpen(true)}
                                    >
                                        <Target size={14} /> Desfecho
                                    </button>
                                </div>
                            </div>

                            {/* Info Table */}
                            <div className="detail-section">
                                <div style={{ fontSize: '10px', fontWeight: 800, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>Dados Gerais</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                    {fields.map(([k, v]) => {
                                        const vs = String(v || '');
                                        const isEditing = editingField === k;
                                        return (
                                            <div key={k} style={{ 
                                                display: 'flex', 
                                                justifyContent: 'space-between', 
                                                padding: '10px 0',
                                                borderBottom: '1px solid rgba(255,255,255,0.03)'
                                            }}>
                                                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>{fieldLabel(k)}</span>
                                                {isEditing ? (
                                                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                                                        <input className="input" style={{ width: '150px', height: '28px', fontSize: '12px' }} value={editValue} onChange={(e) => setEditValue(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit(); }} autoFocus />
                                                        <button className="btn btn-primary btn-sm" style={{ height: '28px', width: '28px', padding: 0 }} onClick={saveEdit}><Check size={14} /></button>
                                                    </div>
                                                ) : (
                                                    <span 
                                                        onClick={() => startEdit(k, vs)} 
                                                        style={{ 
                                                            fontSize: '13px', 
                                                            color: '#FFF', 
                                                            fontWeight: 600,
                                                            cursor: 'pointer',
                                                            maxWidth: '200px',
                                                            textAlign: 'right',
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis'
                                                        }}
                                                    >
                                                        {vs.startsWith('http') ? <a href={vs} target="_blank" rel="noreferrer" style={{ color: 'var(--blue)' }}><ExternalLink size={12} /> abrir</a> : vs || '—'}
                                                    </span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* History Section */}
                            <div className="detail-section" style={{ marginTop: 32 }}>
                                <div style={{ fontSize: '10px', fontWeight: 800, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Histórico de Atividade</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                    {loadingHistory ? <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>A carregar...</div> : 
                                    contactHistory.length === 0 ? <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>Nenhum contacto registado.</div> : 
                                    contactHistory.map(a => (
                                        <div key={a.id} style={{ 
                                            display: 'flex', 
                                            gap: 12, 
                                            padding: '12px', 
                                            background: 'rgba(255,255,255,0.02)', 
                                            borderRadius: '12px',
                                            alignItems: 'center' 
                                        }}>
                                            <div style={{ 
                                                width: 32, 
                                                height: 32, 
                                                borderRadius: '8px', 
                                                background: 'rgba(255,255,255,0.05)', 
                                                display: 'flex', 
                                                alignItems: 'center', 
                                                justifyContent: 'center',
                                                color: 'var(--blue)'
                                            }}>{a.icon}</div>
                                            <div style={{ flex: 1 }}>
                                                <div style={{ fontSize: 12, fontWeight: 700, color: '#FFF' }}>{a.title}</div>
                                                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>{new Date(a.createdAt).toLocaleDateString()} · {a.userName}</div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}

                    {activeTab === 'intel' && <IntelligenceView lead={lead} settings={settings} />}

                    {activeTab === 'notes' && (
                        <div className="detail-section">
                            <div style={{ fontSize: '10px', fontWeight: 800, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 16 }}>Notas Privadas</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
                                <textarea className="input" rows={3} placeholder="Escreva uma observação importante sobre este lead..." value={noteText} onChange={(e) => setNoteText(e.target.value)} style={{ resize: 'none', background: 'rgba(0,0,0,0.3)', fontSize: '13px' }} />
                                <button className="btn btn-primary" style={{ width: '100%', height: '40px' }} onClick={addNote}>Adicionar Nota</button>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                                {notes.map((n, i) => (
                                    <div key={i} style={{ 
                                        background: 'rgba(255,255,255,0.03)', 
                                        borderRadius: '12px', 
                                        padding: '14px', 
                                        border: '1px solid rgba(255,255,255,0.05)' 
                                    }}>
                                        <div style={{ fontSize: 13, color: '#FFF', lineHeight: 1.5 }}>{n.text}</div>
                                        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', marginTop: 8, fontWeight: 700 }}>{new Date(n.date).toLocaleString()}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                        </>
                    )}
                </div>

                <div className="detail-footer" style={{ 
                    padding: '16px 20px', 
                    background: 'rgba(0,0,0,0.3)',
                    borderTop: '1px solid rgba(255,255,255,0.05)',
                    display: 'flex',
                    gap: 8
                }}>
                    <button className="btn btn-ghost" style={{ flex: 1, height: '40px', fontSize: '12px', background: 'rgba(255,255,255,0.03)' }} onClick={() => handleContact('telefone')}><Phone size={14} /> Telefone</button>
                    <button className="btn btn-ghost" style={{ flex: 1, height: '40px', fontSize: '12px', background: 'rgba(255,255,255,0.03)' }} onClick={() => handleContact('email')}><Mail size={14} /> Email</button>
                    <button className="btn btn-ghost" style={{ flex: 1, height: '40px', fontSize: '12px', background: 'rgba(255,255,255,0.03)' }} onClick={() => handleContact('whatsapp')}><MessageCircle size={14} /> WhatsApp</button>
                    <button 
                        className="btn btn-ghost" 
                        style={{ 
                            height: '40px', 
                            width: '40px', 
                            minWidth: '40px', 
                            padding: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'rgba(239, 68, 68, 0.7)',
                            borderColor: 'rgba(239, 68, 68, 0.2)',
                            background: 'rgba(239, 68, 68, 0.05)',
                            transition: 'all 0.2s ease'
                        }} 
                        onClick={handleDelete}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
                            e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.5)';
                            e.currentTarget.style.color = '#FFFFFF';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'rgba(239, 68, 68, 0.05)';
                            e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.2)';
                            e.currentTarget.style.color = 'rgba(239, 68, 68, 0.7)';
                        }}
                    >
                        <Trash2 size={18} />
                    </button>
                </div>

                {emailModalOpen && <EmailTemplateModal lead={lead} onClose={() => setEmailModalOpen(false)} onSend={handleEmailSent} />}
                {outcomeModalOpen && <OutcomeModal isOpen={outcomeModalOpen} onClose={() => setOutcomeModalOpen(false)} onSave={handleSaveOutcome} leadName={name} />}
        </ResponsiveDetailPanel>
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
    
    if (loading) return <div style={{ padding: '60px 20px', textAlign: 'center', fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}><RotateCw size={18} className="loading-spinner-fast" style={{ marginBottom: 12, display: 'block', margin: '0 auto' }} /> Gerando inteligência artificial...</div>;
    if (!insight) return <div style={{ padding: 40, textAlign: 'center', color: 'rgba(255,255,255,0.3)' }}>Sem análise disponível para este lead.</div>;
    
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div style={{ 
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(59, 130, 246, 0.02) 100%)',
                padding: '20px',
                borderRadius: '16px',
                border: '1px solid rgba(59, 130, 246, 0.2)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
                    <div>
                        <div style={{ fontSize: 10, color: 'var(--blue)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em' }}>IA STRATEGY SCAN</div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: '#FFF', marginTop: 4 }}>{getLeadCategory(lead, 'segmento') || 'Mercado Geral'}</div>
                    </div>
                    <div className={`badge badge-${insight.strategy?.qualification === 'quente' ? 'green' : 'gray'}`} style={{ height: '24px', padding: '0 10px' }}>
                        {insight.strategy?.qualification?.toUpperCase()}
                    </div>
                </div>
                <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 }}>{insight.analysis?.overview}</div>
            </div>

            <div className="detail-section">
                <div style={{ fontSize: '10px', fontWeight: 800, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>Dores & Oportunidades</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {insight.analysis?.pains?.map((p: string, i: number) => (
                        <div key={i} style={{ 
                            fontSize: 12, 
                            color: '#FFF', 
                            background: 'rgba(255,255,255,0.03)', 
                            padding: '10px 12px', 
                            borderRadius: '8px',
                            borderLeft: '3px solid var(--blue)' 
                        }}>{p}</div>
                    ))}
                </div>
            </div>

            <div className="detail-section">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div style={{ fontSize: '10px', fontWeight: 800, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Script Sugerido</div>
                    <button className="btn btn-ghost btn-sm" onClick={() => copy(insight.templates?.email?.[0] || '')} style={{ height: '24px', fontSize: '10px' }}>Copiar</button>
                </div>
                <div style={{ 
                    fontSize: 12, 
                    background: 'rgba(0,0,0,0.3)', 
                    padding: '16px', 
                    borderRadius: '12px',
                    border: '1px solid rgba(255,255,255,0.05)',
                    color: 'rgba(255,255,255,0.8)',
                    lineHeight: 1.6,
                    fontFamily: 'monospace'
                }}>
                    {insight.templates?.email?.[0]}
                </div>
            </div>

            <div style={{ textAlign: 'center', paddingBottom: 20 }}>
                <button className="btn btn-ghost btn-sm" onClick={handleRegenerate} style={{ color: 'rgba(255,255,255,0.2)', fontSize: '10px' }}>
                    <RotateCw size={10} style={{ marginRight: 6 }} /> Atualizar análise de IA
                </button>
            </div>
        </div>
    );
}
