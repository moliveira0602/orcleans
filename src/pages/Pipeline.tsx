import { useState, useCallback, useEffect } from 'react';
import { useAppState, useAppDispatch } from '../store';
import { detectNameCol, detectCatCol, getLeadName, getLeadCategory } from '../utils/detect';
import ScoreRing from '../components/ScoreRing';
import AddLeadModal from '../components/AddLeadModal';
import { PIPELINE_COLS } from '../types';
import type { PipelineStage } from '../types';
import { useToast } from '../components/Toast';
import * as leadApi from '../services/leads';

interface PipelineProps {
    onOpenDetail: (id: string) => void;
}

export default function Pipeline({ onOpenDetail }: PipelineProps) {
    const { leads, pipeline, settings } = useAppState();
    const dispatch = useAppDispatch();
    const toast = useToast();
    const [addOpen, setAddOpen] = useState(false);
    const [dragId, setDragId] = useState<string | null>(null);
    const [dragOverCol, setDragOverCol] = useState<string | null>(null);

    const nameCol = detectNameCol(leads);
    const catCol = detectCatCol(leads);

    // Sync: any lead not in any stage → novo (useEffect to avoid dispatch during render)
    useEffect(() => {
        const allInPipe = Object.values(pipeline).flat();
        const unassigned = leads.filter((l) => !allInPipe.includes(l.id));
        if (unassigned.length) {
            unassigned.forEach((l) => {
                dispatch({ type: 'MOVE_PIPELINE', payload: { leadId: l.id, stage: 'novo' } });
            });
        }
    }, [leads, pipeline, dispatch]);

    const handleDragStart = useCallback((id: string) => {
        setDragId(id);
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent, colId: string) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDragOverCol(colId);
    }, []);

    const handleDragLeave = useCallback(() => {
        setDragOverCol(null);
    }, []);

    const handleDrop = useCallback(async (e: React.DragEvent, colId: PipelineStage) => {
        e.preventDefault();
        setDragOverCol(null);
        if (!dragId) return;
        try {
            await leadApi.moveLeadPipeline(dragId, colId);
            dispatch({ type: 'MOVE_PIPELINE', payload: { leadId: dragId, stage: colId } });
            const label = PIPELINE_COLS.find((c) => c.id === colId)?.label || colId;
            toast(`Lead movido para "${label}"`, 'success');
            dispatch({
                type: 'ADD_ACTIVITY',
                payload: { title: `Lead movido para "${label}"`, sub: new Date().toLocaleString('pt-BR'), icon: 'pipeline', time: new Date().toISOString() },
            });
        } catch (err) {
            console.error('Failed to move lead on server:', err);
            toast('Erro ao mover lead no servidor.', 'error');
        }
        setDragId(null);
    }, [dragId, dispatch, toast]);

    return (
        <>
            <div className="pipeline-wrap">
                {PIPELINE_COLS.map((col) => {
                    const ids = pipeline[col.id] || [];
                    const colLeads = ids.map((id) => leads.find((l) => l.id === id)).filter(Boolean);
                    return (
                        <div
                            key={col.id}
                            className={`pipeline-col${dragOverCol === col.id ? ' drag-over' : ''}`}
                            onDragOver={(e) => handleDragOver(e, col.id)}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, col.id)}
                        >
                            <div className="pipeline-col-header">
                                <div className="pipeline-col-title">
                                    <div className="pipeline-col-dot" style={{ background: col.color }} />
                                    {col.label}
                                </div>
                                <span className="pipeline-col-count">{colLeads.length}</span>
                            </div>
                            <div className="pipeline-col-body">
                                {colLeads.length ? colLeads.map((l) => l && (
                                    <div
                                        key={l.id}
                                        className={`pipeline-card${dragId === l.id ? ' dragging' : ''}`}
                                        draggable
                                        onDragStart={() => handleDragStart(l.id)}
                                        onClick={() => onOpenDetail(l.id)}
                                    >
                                        <div className="pipeline-card-name">{getLeadName(l, nameCol).slice(0, 35)}</div>
                                        <div className="pipeline-card-cat">{getLeadCategory(l, catCol) || 'Sem categoria'}</div>
                                        <div style={{ margin: '8px 0' }}>
                                            <div className="progress">
                                                <div
                                                    className="progress-fill"
                                                    style={{
                                                        width: `${l._score * 10}%`,
                                                        background: l._score >= settings.hotThreshold ? 'var(--green)' : l._score >= settings.warmThreshold ? 'var(--amber)' : 'var(--t3)',
                                                    }}
                                                />
                                            </div>
                                        </div>
                                        <div className="pipeline-card-footer">
                                            <ScoreRing score={l._score} hot={settings.hotThreshold} warm={settings.warmThreshold} />
                                            <span className="text-sm text-muted">
                                                {String(l.Phone || l.Telefone || l.phone || '')}
                                            </span>
                                        </div>
                                    </div>
                                )) : (
                                    <div className="empty" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 12px', gap: 10 }}>
                                        <div style={{ opacity: 0.15 }}>
                                            <div style={{ width: 32, height: 32, borderRadius: '50%', border: '2px solid #888' }} />
                                        </div>
                                        <div className="text-sm text-muted">Vazio</div>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            <AddLeadModal open={addOpen} onClose={() => setAddOpen(false)} />
        </>
    );
}
