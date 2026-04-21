import { useState, useEffect } from 'react';
import { useToast } from './Toast';
import { copyToClipboard } from '../utils/clipboard';
import { getTemplates, renderTemplate, type EmailTemplate } from '../utils/emailTemplates';

interface EmailTemplateModalProps {
    lead: Record<string, any>;
    onClose: () => void;
    onSend: () => void;
}

export default function EmailTemplateModal({ lead, onClose, onSend }: EmailTemplateModalProps) {
    const [templates] = useState<EmailTemplate[]>(getTemplates());
    const [selectedId, setSelectedId] = useState(templates[0]?.id || '');
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const toast = useToast();

    // Update preview when template or lead changes
    useEffect(() => {
        const tpl = templates.find(t => t.id === selectedId);
        if (tpl) {
            const rendered = renderTemplate(tpl, lead);
            setSubject(rendered.subject);
            setBody(rendered.body);
        }
    }, [selectedId, lead, templates]);

    const handleSend = () => {
        const mailtoUrl = `mailto:${lead.email || ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        window.open(mailtoUrl, '_blank');
        onSend();
        onClose();
    };

    const handleCopy = async () => {
        await copyToClipboard(`${subject}\n\n${body}`);
        toast('Copiado para clipboard!', 'success');
    };

    return (
        <div className="modal-overlay open" onClick={onClose}>
            <div className="modal" style={{ maxWidth: 560 }} onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <div className="modal-title">✉ Enviar Email</div>
                    <button className="modal-close" onClick={onClose}>✕</button>
                </div>

                <div style={{ marginBottom: 16 }}>
                    <label className="input-label" style={{ marginBottom: 6 }}>Template</label>
                    <select
                        className="input"
                        value={selectedId}
                        onChange={(e) => setSelectedId(e.target.value)}
                    >
                        {templates.map(t => (
                            <option key={t.id} value={t.id}>{t.name}</option>
                        ))}
                    </select>
                </div>

                <div style={{ marginBottom: 16 }}>
                    <label className="input-label" style={{ marginBottom: 6 }}>Assunto</label>
                    <input
                        className="input"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                    />
                </div>

                <div style={{ marginBottom: 16 }}>
                    <label className="input-label" style={{ marginBottom: 6 }}>Corpo do email</label>
                    <textarea
                        className="input"
                        rows={8}
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        style={{ resize: 'vertical', fontFamily: 'var(--font-b)', fontSize: 12, lineHeight: 1.6 }}
                    />
                </div>

                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
                    <button className="btn btn-ghost" onClick={handleCopy}>📋 Copiar</button>
                    <button className="btn btn-primary" onClick={handleSend} disabled={!lead.email}>
                        {lead.email ? 'Abrir Email' : 'Sem email no lead'}
                    </button>
                </div>
            </div>
        </div>
    );
}
