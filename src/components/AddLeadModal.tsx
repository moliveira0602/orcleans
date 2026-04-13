import { useState } from 'react';
import { useAppDispatch, useAppState } from '../store';
import { useToast } from './Toast';
import { computeScore } from '../utils/scoring';
import * as leadApi from '../services/leads';

interface AddLeadModalProps {
    open: boolean;
    onClose: () => void;
}

export default function AddLeadModal({ open, onClose }: AddLeadModalProps) {
    const dispatch = useAppDispatch();
    const { leads } = useAppState();
    const toast = useToast();
    const [form, setForm] = useState({
        Name: '', Phone: '', Email: '', Category: '', Website: '', City: '', Notes: '',
    });

    const update = (field: string, value: string) => {
        setForm((f) => ({ ...f, [field]: value }));
    };

    const handleSubmit = async () => {
        if (!form.Name.trim()) {
            toast('Nome é obrigatório.', 'error');
            return;
        }
        const row = { ...form };
        const score = computeScore(row, null, [row, ...leads.map((l) => l as unknown as Record<string, unknown>)]);
        try {
            const serverLead = await leadApi.createLead({
                nome: form.Name,
                segmento: form.Category,
                telefone: form.Phone,
                email: form.Email,
                website: form.Website,
                endereco: form.City,
                observacoes: form.Notes,
                score: Math.round(score),
                pipelineStage: 'novo',
            });
            const lead = {
                ...serverLead,
                id: serverLead.id,
                _score: serverLead.score,
                _pipeline: serverLead.pipelineStage as 'novo' | 'qualificado' | 'proposta' | 'negociacao' | 'ganho' | 'perdido',
                _importedAt: Date.now(),
                _importFile: 'Manual',
                _importDate: new Date().toISOString(),
                _notes: [],
                _raw: row,
            };
            dispatch({ type: 'ADD_LEAD', payload: lead });
        } catch (err) {
            console.error('Failed to create lead on server:', err);
            toast('Erro ao criar lead no servidor.', 'error');
            return;
        }
        toast(`Lead "${form.Name}" adicionado com score ${score.toFixed(1)}.`, 'success');
        dispatch({
            type: 'ADD_ACTIVITY',
            payload: { title: `Lead adicionado: ${form.Name}`, sub: `Score ${score.toFixed(1)}`, icon: '◉', time: new Date().toISOString() },
        });
        setForm({ Name: '', Phone: '', Email: '', Category: '', Website: '', City: '', Notes: '' });
        onClose();
    };

    return (
        <div className={`modal-overlay${open ? ' open' : ''}`} onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="modal">
                <div className="modal-header">
                    <div className="modal-title">Adicionar Lead Manualmente</div>
                    <button className="modal-close" onClick={onClose}>✕</button>
                </div>
                <div className="form-row">
                    <div className="form-group">
                        <label className="form-label">Nome / Empresa</label>
                        <input className="input" placeholder="Ex: Clínica Beleza Total" value={form.Name} onChange={(e) => update('Name', e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Telefone</label>
                        <input className="input" placeholder="+55 11 9xxxx-xxxx" value={form.Phone} onChange={(e) => update('Phone', e.target.value)} />
                    </div>
                </div>
                <div className="form-row">
                    <div className="form-group">
                        <label className="form-label">Email</label>
                        <input className="input" type="email" placeholder="contato@empresa.com" value={form.Email} onChange={(e) => update('Email', e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Categoria</label>
                        <input className="input" placeholder="Ex: Estética, Saúde…" value={form.Category} onChange={(e) => update('Category', e.target.value)} />
                    </div>
                </div>
                <div className="form-row">
                    <div className="form-group">
                        <label className="form-label">Website</label>
                        <input className="input" placeholder="https://…" value={form.Website} onChange={(e) => update('Website', e.target.value)} />
                    </div>
                    <div className="form-group">
                        <label className="form-label">Cidade</label>
                        <input className="input" placeholder="Ex: São Paulo" value={form.City} onChange={(e) => update('City', e.target.value)} />
                    </div>
                </div>
                <div className="form-group">
                    <label className="form-label">Observações</label>
                    <textarea className="input" rows={3} placeholder="Informações adicionais…" style={{ resize: 'vertical' }} value={form.Notes} onChange={(e) => update('Notes', e.target.value)} />
                </div>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
                    <button className="btn btn-ghost" onClick={onClose}>Cancelar</button>
                    <button className="btn btn-primary" onClick={handleSubmit}>Adicionar lead</button>
                </div>
            </div>
        </div>
    );
}
