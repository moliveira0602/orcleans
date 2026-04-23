import { useState } from 'react';
import { X, CheckCircle, XCircle, MessageSquare, Phone, Mail, MessageCircle, AlertCircle } from 'lucide-react';

interface OutcomeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: { type: string; outcome: string; notes: string }) => void;
    leadName: string;
}

export default function OutcomeModal({ isOpen, onClose, onSave, leadName }: OutcomeModalProps) {
    const [type, setType] = useState('call');
    const [outcome, setOutcome] = useState('answered');
    const [notes, setNotes] = useState('');
    const [loading, setLoading] = useState(false);

    if (!isOpen) return null;

    const handleSave = async () => {
        setLoading(true);
        await onSave({ type, outcome, notes });
        setLoading(false);
        onClose();
    };

    const types = [
        { id: 'call', label: 'Ligação', icon: <Phone size={16} /> },
        { id: 'whatsapp', label: 'WhatsApp', icon: <MessageCircle size={16} /> },
        { id: 'email', label: 'Email', icon: <Mail size={16} /> },
        { id: 'meeting', label: 'Reunião', icon: <MessageSquare size={16} /> },
    ];

    const outcomes = [
        { id: 'answered', label: 'Respondeu / Atendeu', icon: <CheckCircle size={16} />, color: 'var(--blue)' },
        { id: 'no_answer', label: 'Sem Resposta', icon: <AlertCircle size={16} />, color: 'var(--t3)' },
        { id: 'converted', label: 'Convertido / Ganho', icon: <CheckCircle size={16} />, color: 'var(--green)' },
        { id: 'rejected', label: 'Rejeitado / Perdido', icon: <XCircle size={16} />, color: 'var(--red)' },
    ];

    return (
        <div className="modal-overlay open" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: 450 }}>
                <div className="modal-header">
                    <div>
                        <h3 className="modal-title">Registar Desfecho</h3>
                        <p className="modal-sub">{leadName}</p>
                    </div>
                    <button className="btn-icon" onClick={onClose}><X size={20} /></button>
                </div>

                <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    <div>
                        <label className="detail-field-label" style={{ marginBottom: 8, display: 'block' }}>Tipo de Contato</label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                            {types.map(t => (
                                <button
                                    key={t.id}
                                    onClick={() => setType(t.id)}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px',
                                        background: type === t.id ? 'rgba(59,130,246,0.1)' : 'var(--card2)',
                                        border: `1px solid ${type === t.id ? 'var(--blue)' : 'var(--border)'}`,
                                        borderRadius: 8, color: type === t.id ? 'var(--blue)' : 'var(--t2)',
                                        fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s'
                                    }}
                                >
                                    {t.icon} {t.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="detail-field-label" style={{ marginBottom: 8, display: 'block' }}>Resultado</label>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                            {outcomes.map(o => (
                                <button
                                    key={o.id}
                                    onClick={() => setOutcome(o.id)}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px',
                                        background: outcome === o.id ? `${o.color}15` : 'var(--card2)',
                                        border: `1px solid ${outcome === o.id ? o.color : 'var(--border)'}`,
                                        borderRadius: 8, color: outcome === o.id ? o.color : 'var(--t2)',
                                        fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s'
                                    }}
                                >
                                    {o.icon} {o.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="detail-field-label" style={{ marginBottom: 8, display: 'block' }}>Notas (Opcional)</label>
                        <textarea
                            className="input"
                            placeholder="Ex: Marcou reunião para dia 15..."
                            rows={3}
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            style={{ width: '100%', resize: 'none' }}
                        />
                    </div>
                </div>

                <div className="modal-footer" style={{ marginTop: 24, display: 'flex', gap: 12 }}>
                    <button className="btn btn-ghost" onClick={onClose} style={{ flex: 1 }}>Cancelar</button>
                    <button 
                        className="btn btn-primary" 
                        onClick={handleSave} 
                        disabled={loading}
                        style={{ flex: 1 }}
                    >
                        {loading ? 'A guardar...' : 'Guardar Resultado'}
                    </button>
                </div>
            </div>
        </div>
    );
}
