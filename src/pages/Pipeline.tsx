import { useState, useCallback } from 'react';
import { useAppState, useAppDispatch } from '../store';
import { detectNameCol, detectCatCol, getLeadName, getLeadCategory } from '../utils/detect';
import ScoreRing from '../components/ScoreRing';
import AddLeadModal from '../components/AddLeadModal';
import { PIPELINE_COLS } from '../types';
import type { PipelineStage } from '../types';
import { useToast } from '../components/Toast';

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

    // Sync: any lead not in any stage → novo
    const allInPipe = Object.values(pipeline).flat();
    const unassigned = leads.filter((l) => !allInPipe.includes(l.id));
    if (unassigned.length) {
        unassigned.forEach((l) => {
            dispatch({ type: 'MOVE_PIPELINE', payload: { leadId: l.id, stage: 'novo' } });
        });
    }

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

    const handleDrop = useCallback((e: React.DragEvent, colId: PipelineStage) => {
        e.preventDefault();
        setDragOverCol(null);
        if (!dragId) return;
        dispatch({ type: 'MOVE_PIPELINE', payload: { leadId: dragId, stage: colId } });
        const label = PIPELINE_COLS.find((c) => c.id === colId)?.label || colId;
        toast(`Lead movido para "${label}"`, 'success');
        dispatch({
            type: 'ADD_ACTIVITY',
            payload: { title: `Lead movido para "${label}"`, sub: new Date().toLocaleString('pt-BR'), icon: '▦', time: new Date().toISOString() },
        });
        setDragId(null);
    }, [dragId, dispatch, toast]);

    return (
        <>
            <div className="sec-header mb-20">
                <div>
                    <div className="sec-title">Pipeline Comercial</div>
                    <div className="sec-sub">Arraste os cards para mover entre etapas</div>
                </div>
                <button className="btn btn-primary btn-sm" onClick={() => setAddOpen(true)}>+ Adicionar lead</button>
            </div>

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
                                    <div className="empty" style={{ padding: '30px 12px' }}>
                                        <span className="empty-icon" style={{ fontSize: 28 }}>○</span>
                                        <div className="text-sm text-muted">Sem leads</div>
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
