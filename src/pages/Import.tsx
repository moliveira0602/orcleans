import { useRef, useState, useMemo, useEffect } from 'react';
import * as ExcelJS from 'exceljs';
import { useAppState, useAppDispatch, leadFingerprint, useApp } from '../store';
import { useToast } from '../components/Toast';
import { computeScore } from '../utils/scoring';
import { detectSourceType, mapRowToLead } from '../utils/leadMapper';
import { analyzeColumns, getColumnAnalysisSummary, type ColumnMapping, type StandardColumnKey } from '../utils/columnMapper';
import { sanitizeImportedData, getSanitizationSummary, type SanitizationSummary, type SanitizedLeadData } from '../utils/dataSanitizer';
import type { Lead } from '../types';
import type { Page } from '../components/Layout';
import { createLeadsBulk } from '../services/leads';
import * as leadApi from '../services/leads';

interface ImportPageProps {
    onNavigate?: (page: Page) => void;
}

export default function ImportPage({ onNavigate }: ImportPageProps) {
    const { imports, leads: existingLeads } = useAppState();
    const dispatch = useAppDispatch();
    const { refreshLeads } = useApp();
    const toast = useToast();
    const fileInput = useRef<HTMLInputElement>(null);
    const [dragOver, setDragOver] = useState(false);
    const [deleteImportId, setDeleteImportId] = useState<string | null>(null);
    const [pending, setPending] = useState<{
        file: string;
        data: Record<string, unknown>[];
        rows: number;
        cols: string[];
        numericCols: string[];
    } | null>(null);
    const [scoreCol, setScoreCol] = useState('');
    const [dupeMode, setDupeMode] = useState<'skip' | 'update'>('skip');
    
    // Column mapping state
    const [columnMappings, setColumnMappings] = useState<ColumnMapping[]>([]);
    const [editingColumn, setEditingColumn] = useState<string | null>(null);
    const [editValue, setEditValue] = useState('');
    
    // Sanitization state
    const [sanitizationSummary, setSanitizationSummary] = useState<SanitizationSummary | null>(null);
    const [sanitizedData, setSanitizedData] = useState<SanitizedLeadData[]>([]);

    // Analyze columns and sanitize data when file is loaded
    useEffect(() => {
        if (pending) {
            // Column mapping analysis
            const mappings = analyzeColumns(pending.cols);
            setColumnMappings(mappings);
            
            // Data sanitization
            const sanitized = sanitizeImportedData(pending.data);
            setSanitizedData(sanitized);
            
            // Generate sanitization summary
            const summary = getSanitizationSummary(pending.data, sanitized);
            setSanitizationSummary(summary);
        } else {
            setColumnMappings([]);
            setSanitizedData([]);
            setSanitizationSummary(null);
        }
    }, [pending]);

    // Compute duplicate stats when pending data is available
    const dupeStats = useMemo(() => {
        if (!pending || !existingLeads.length) return { newCount: pending?.rows || 0, dupeCount: 0 };
        const existingFPs = new Set(existingLeads.map((l) => leadFingerprint(l)));
        let dupes = 0;
        let newCount = 0;
        for (const row of pending.data) {
            const fp = leadFingerprint(row);
            if (fp !== '||' && existingFPs.has(fp)) dupes++;
            else newCount++;
        }
        return { newCount, dupeCount: dupes };
    }, [pending, existingLeads]);

    const processFile = async (file: File) => {
        try {
            const workbook = new ExcelJS.Workbook();
            let data: Record<string, unknown>[];
            
            if (file.name.toLowerCase().endsWith('.csv')) {
                const text = await file.text();
                const worksheet = workbook.addWorksheet('Sheet1');
                
                // Parse CSV manually for ExcelJS
                const rows = text.split('\n').map(row => {
                    const result: string[] = [];
                    let current = '';
                    let inQuotes = false;
                    
                    for (let i = 0; i < row.length; i++) {
                        const char = row[i];
                        if (char === '"') {
                            inQuotes = !inQuotes;
                        } else if (char === ',' && !inQuotes) {
                            result.push(current.trim());
                            current = '';
                        } else {
                            current += char;
                        }
                    }
                    result.push(current.trim());
                    return result;
                }).filter(row => row.some(cell => cell));
                
                if (rows.length === 0) {
                    toast('Arquivo vazio ou sem dados tabulares.', 'error');
                    return;
                }
                
                const headers = rows[0];
                data = rows.slice(1).map(row => {
                    const obj: Record<string, unknown> = {};
                    headers.forEach((header, i) => {
                        obj[header] = row[i] || '';
                    });
                    return obj;
                });
            } else {
                const buffer = await file.arrayBuffer();
                await workbook.xlsx.load(buffer);
                const worksheet = workbook.getWorksheet(1);
                
                if (!worksheet) {
                    toast('Arquivo vazio ou sem dados tabulares.', 'error');
                    return;
                }
                
                const headers: string[] = [];
                worksheet.getRow(1).eachCell((cell, colNumber) => {
                    headers[colNumber - 1] = String(cell.value || '');
                });
                
                data = [];
                worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
                    if (rowNumber === 1) return; // Skip header row
                    
                    const obj: Record<string, unknown> = {};
                    row.eachCell((cell, colNumber) => {
                        obj[headers[colNumber - 1]] = cell.value || '';
                    });
                    data.push(obj);
                });
            }
            
            if (!data || !data.length) {
                toast('Arquivo vazio ou sem dados tabulares.', 'error');
                return;
            }
            
            const cols = Object.keys(data[0]);
            const numericCols = cols.filter((c) =>
                data.slice(0, 20).filter((r) => !isNaN(parseFloat(String(r[c]))) && r[c] !== '').length > 3
            );
            setPending({ file: file.name, data, rows: data.length, cols, numericCols });
        } catch (err) {
            toast('Erro ao ler arquivo: ' + (err as Error).message, 'error');
        }
    };

    const confirmImport = async () => {
        if (!pending) return;
        const { data, file, cols } = pending;
        const numCol = scoreCol || null;
        const importId = 'imp_' + Date.now();
        
        // Detect source type
        const sourceType = detectSourceType(cols);
        
        // Use sanitized data if available, otherwise fall back to original
        const importData = sanitizedData.length > 0 ? sanitizedData : data;
        
        const newLeads: Lead[] = importData.map((row, i) => {
            // Map row to canonical Lead fields
            const mapped = mapRowToLead(row as Record<string, any>, sourceType, cols) as Lead;
            
            // Extract fields with proper typing
            const nome: string = mapped.nome || '';
            const segmento: string = mapped.segmento || '';
            const avaliacao: number | null = mapped.avaliacao ?? null;
            const reviews: number | null = mapped.reviews ?? null;
            const preco: string = mapped.preco || '';
            const endereco: string = mapped.endereco || '';
            const status: string = mapped.status || '';
            const horario: string = mapped.horario || '';
            const telefone: string = mapped.telefone || '';
            const website: string = mapped.website || '';
            const email: string = mapped.email || '';
            const servicos: string[] = Array.isArray(mapped.servicos) ? mapped.servicos : [];
            const foto: string = mapped.foto || '';
            const fotos: string[] = Array.isArray(mapped.fotos) ? mapped.fotos : [];
            const linkOrigem: string = mapped.linkOrigem || '';
            const linkPedido: string = mapped.linkPedido || '';
            const observacoes: string = mapped.observacoes || '';
            const _raw: Record<string, any> = mapped._raw || {};
            
            // Calculate score using canonical fields
            const leadData = {
                nome, segmento, avaliacao: avaliacao ?? 0, reviews: reviews ?? 0,
                preco, endereco, status, horario, telefone, website, email, servicos,
                foto, fotos, linkOrigem, linkPedido, observacoes, _raw,
            };
            let score = computeScore(leadData, numCol, data as Record<string, unknown>[]);
            
            // Apply score boosts based on canonical fields
            const hasRating = avaliacao !== null && avaliacao > 0;
            const hasReviews = reviews !== null && reviews > 0;
            
            if (hasRating && avaliacao >= 4.5 && hasReviews && reviews >= 100) score += 2;
            if (hasRating && avaliacao >= 4.0) score += 1;
            if (preco.includes('15') || preco.includes('20')) score += 1;
            if (servicos.some(s => s.toLowerCase().includes('delivery'))) score += 0.5;
            if (status === 'Aberto' || status === 'Ativo') score += 0.5;
            if (website) score += 0.5;
            if (email) score += 0.5;

            return {
                id: 'lead_' + Date.now() + '_' + i,
                _score: score,
                _pipeline: 'novo' as const,
                _importedAt: Date.now(),
                _importFile: file,
                _importDate: new Date().toISOString(),
                _importId: importId,
                nome, segmento, avaliacao, reviews, preco, endereco, status, horario,
                telefone, website, email, servicos, foto, fotos, linkOrigem, linkPedido, observacoes, _raw,
            };
        });

        const importRecord = {
            id: importId,
            name: file.replace(/\.[^/.]+$/, ""),
            file,
            rows: pending.rows,
            cols: cols.length,
            date: new Date().toISOString(),
            count: pending.rows,
        };

        // Sync to backend API FIRST
        let serverLeads: any[] = [];
        try {
            console.log('[Import] Sending leads to backend, count:', newLeads.length);
            const result = await createLeadsBulk(newLeads.map(l => ({
                nome: l.nome,
                segmento: l.segmento,
                avaliacao: l.avaliacao,
                reviews: l.reviews,
                preco: l.preco,
                endereco: l.endereco,
                status: l.status,
                horario: l.horario,
                telefone: l.telefone,
                website: l.website,
                email: l.email,
                servicos: l.servicos,
                foto: l.foto,
                fotos: l.fotos,
                linkOrigem: l.linkOrigem,
                linkPedido: l.linkPedido,
                observacoes: l.observacoes,
                score: l._score,
                pipelineStage: l._pipeline,
                importFile: l._importFile,
                importDate: l._importDate,
                importId: l._importId,
            })));
            console.log('[Import] Backend result:', result);
            
            // Fetch the newly created leads to get server IDs
            const freshLeads = await leadApi.fetchLeads({ page: 1, limit: result.count || newLeads.length, sortBy: 'createdAt', sortOrder: 'desc' });
            console.log('[Import] Fetched leads from backend:', freshLeads.leads.length);
            serverLeads = freshLeads.leads.slice(0, result.count || newLeads.length);
            console.log('[Import] Leads synced to backend, count:', serverLeads.length);
        } catch (err) {
            console.error('[Import] Failed to sync leads to backend:', err);
            toast('Erro ao sincronizar leads: ' + (err as Error).message, 'error');
            return;
        }

        const hasDupes = dupeStats.dupeCount > 0;
        if (hasDupes) {
            dispatch({
                type: 'UPSERT_LEADS',
                payload: {
                    leads: newLeads,
                    record: importRecord,
                    mode: dupeMode,
                },
            });
            const modeLabel = dupeMode === 'skip' ? 'ignorados' : 'atualizados';
            toast(
                `✓ ${dupeStats.newCount} novos importados · ${dupeStats.dupeCount} duplicados ${modeLabel} · Fonte: ${sourceType === 'google_maps' ? 'Google Maps' : sourceType === 'linkedin' ? 'LinkedIn' : 'Genérica'}`,
                'success'
            );
        } else {
            dispatch({
                type: 'IMPORT_LEADS',
                payload: {
                    leads: newLeads,
                    record: importRecord,
                },
            });
            toast(`✓ ${pending.rows} leads importados · Fonte: ${sourceType === 'google_maps' ? 'Google Maps' : sourceType === 'linkedin' ? 'LinkedIn' : 'Genérica'}`, 'success');
        }

        dispatch({
            type: 'ADD_ACTIVITY',
            payload: { title: `Importação: ${file}`, sub: `${dupeStats.newCount} novos leads`, icon: '📂', time: new Date().toISOString() },
        });
        setPending(null);
        setScoreCol('');
        setDupeMode('skip');
        if (fileInput.current) fileInput.current.value = '';
        
        // Refresh leads from backend to ensure consistency
        await refreshLeads();
        
        // Navigate to Leads tab after import
        if (onNavigate) {
            onNavigate('leads');
        }
    };

    const cancelImport = () => {
        setPending(null);
        setScoreCol('');
        if (fileInput.current) fileInput.current.value = '';
    };

    const previewCols = pending ? pending.cols.slice(0, 8) : [];
    const previewRows = pending ? pending.data.slice(0, 8) : [];

    // Column editing handlers
    const handleColumnEdit = (originalName: string) => {
        setEditingColumn(originalName);
        const mapping = columnMappings.find(m => m.originalName === originalName);
        setEditValue(mapping?.suggestedName || originalName);
    };

    const handleColumnSave = (originalName: string) => {
        setColumnMappings(prev => prev.map(m => 
            m.originalName === originalName 
                ? { ...m, suggestedName: editValue, isStandard: false, standardKey: null }
                : m
        ));
        setEditingColumn(null);
        setEditValue('');
    };

    const handleColumnCancel = () => {
        setEditingColumn(null);
        setEditValue('');
    };

    // Get column analysis summary for alerts
    const columnSummary = pending ? getColumnAnalysisSummary(pending.cols) : null;

    return (
        <>
            {!pending && (
                <div
                    className={`upload-zone${dragOver ? ' over' : ''}`}
                    onClick={() => fileInput.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={(e) => {
                        e.preventDefault();
                        setDragOver(false);
                        const f = e.dataTransfer.files[0];
                        if (f) processFile(f);
                    }}
                >
                    <input
                        ref={fileInput}
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        style={{ display: 'none' }}
                        onChange={(e) => { if (e.target.files?.[0]) processFile(e.target.files[0]); }}
                    />
                    <span className="upload-icon">📂</span>
                    <div className="upload-title">Solte seu arquivo aqui</div>
                    <div className="upload-sub">
                        Arraste e solte ou clique para selecionar. A ORCA detecta automaticamente as colunas e gera o scoring.
                    </div>
                    <div className="upload-types">
                        <span className="upload-type-tag">xlsx</span>
                        <span className="upload-type-tag">xls</span>
                        <span className="upload-type-tag">csv</span>
                    </div>
                </div>
            )}

            {pending && (
                <div style={{ marginTop: 24 }}>
                    <div className="card mb-20">
                        <div className="sec-header">
                            <div>
                                <div className="sec-title">Prévia: {pending.file}</div>
                                <div className="sec-sub">{pending.rows} registros · {pending.cols.length} colunas</div>
                            </div>
                            <div className="flex gap-8" style={{ flexWrap: 'wrap' }}>
                                <select className="input" style={{ width: 180 }} value={scoreCol} onChange={(e) => setScoreCol(e.target.value)}>
                                    <option value="">Detectar automaticamente</option>
                                    {pending.numericCols.map((c) => <option key={c} value={c}>{c}</option>)}
                                </select>
                                <button className="btn btn-primary" onClick={confirmImport}>✓ Confirmar importação</button>
                                <button className="btn btn-ghost" onClick={cancelImport}>Cancelar</button>
                            </div>
                        </div>

                        {dupeStats.dupeCount > 0 && (
                            <div style={{
                                background: 'var(--amber-dim)', border: '1px solid rgba(245,158,11,.25)',
                                borderRadius: 10, padding: '14px 18px', marginBottom: 16,
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap',
                            }}>
                                <div>
                                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--amber)', marginBottom: 2 }}>
                                        ⚠ {dupeStats.dupeCount} lead{dupeStats.dupeCount !== 1 ? 's' : ''} já existe{dupeStats.dupeCount !== 1 ? 'm' : ''} na base
                                    </div>
                                    <div style={{ fontSize: 12, color: 'var(--t2)' }}>
                                        Detectados por nome + telefone + email. {dupeStats.newCount} são novos.
                                    </div>
                                </div>
                                <div className="tabs">
                                    <button className={`tab${dupeMode === 'skip' ? ' active' : ''}`} onClick={() => setDupeMode('skip')}>
                                        Pular duplicados
                                    </button>
                                    <button className={`tab${dupeMode === 'update' ? ' active' : ''}`} onClick={() => setDupeMode('update')}>
                                        Atualizar existentes
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Sanitization Summary Alert */}
                        {sanitizationSummary && (sanitizationSummary.fixedEncoding > 0 || sanitizationSummary.standardizedCategories > 0) && (
                            <div style={{
                                background: 'var(--green-dim)', border: '1px solid rgba(16,185,129,.25)',
                                borderRadius: 10, padding: '14px 18px', marginBottom: 16,
                            }}>
                                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--green)', marginBottom: 2 }}>
                                    ✨ Dados normalizados automaticamente
                                </div>
                                <div style={{ fontSize: 12, color: 'var(--t2)' }}>
                                    {sanitizationSummary.fixedEncoding > 0 && `${sanitizationSummary.fixedEncoding} encoding(s) corrigido(s)`}
                                    {sanitizationSummary.standardizedCategories > 0 && ` · ${sanitizationSummary.standardizedCategories} categoria(s) padronizada(s)`}
                                </div>
                            </div>
                        )}

                        {/* Column Mapping Alert */}
                        {columnSummary && columnSummary.hasInconsistencies && (
                            <div style={{
                                background: 'var(--blue-dim)', border: '1px solid rgba(0,194,255,.25)',
                                borderRadius: 10, padding: '14px 18px', marginBottom: 16,
                            }}>
                                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--blue3)', marginBottom: 4 }}>
                                    📋 {columnSummary.mappedColumns} de {columnSummary.totalColumns} colunas mapeadas automaticamente
                                </div>
                                <div style={{ fontSize: 12, color: 'var(--t2)', marginBottom: 8 }}>
                                    {columnSummary.unmappedColumns} coluna(s) não identificada(s). Clique no nome da coluna para editar.
                                </div>
                            </div>
                        )}

                        {/* Column Mapping Preview */}
                        {columnMappings.length > 0 && (
                            <div style={{ marginBottom: 16 }}>
                                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
                                    Mapeamento de Colunas
                                </div>
                                <div style={{
                                    display: 'flex', flexWrap: 'wrap', gap: 6, padding: 12,
                                    background: 'var(--card)', borderRadius: 8, border: '1px solid var(--border)',
                                }}>
                                    {columnMappings.map((mapping) => (
                                        <div
                                            key={mapping.originalName}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: 6,
                                                padding: '6px 10px', borderRadius: 6,
                                                background: mapping.isStandard ? 'var(--green-dim)' : 'var(--amber-dim)',
                                                border: `1px solid ${mapping.isStandard ? 'rgba(16,185,129,.3)' : 'rgba(245,158,11,.3)'}`,
                                                cursor: 'pointer',
                                                transition: 'all var(--transition)',
                                            }}
                                            onClick={() => handleColumnEdit(mapping.originalName)}
                                            title="Clique para editar"
                                        >
                                            <span style={{ fontSize: 11, color: 'var(--t3)' }}>{mapping.originalName}</span>
                                            <span style={{ fontSize: 10, color: 'var(--t3)' }}>→</span>
                                            {editingColumn === mapping.originalName ? (
                                                <input
                                                    autoFocus
                                                    value={editValue}
                                                    onChange={(e) => setEditValue(e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') handleColumnSave(mapping.originalName);
                                                        if (e.key === 'Escape') handleColumnCancel();
                                                    }}
                                                    onBlur={() => handleColumnSave(mapping.originalName)}
                                                    style={{
                                                        width: 80, fontSize: 11, padding: '2px 4px',
                                                        background: 'var(--bg4)', border: '1px solid var(--blue)',
                                                        color: 'var(--t1)', borderRadius: 4,
                                                    }}
                                                />
                                            ) : (
                                                <span style={{ fontSize: 11, fontWeight: 600, color: mapping.isStandard ? 'var(--green)' : 'var(--amber)' }}>
                                                    {mapping.suggestedName}
                                                </span>
                                            )}
                                            {mapping.isStandard && (
                                                <span style={{ fontSize: 9, color: 'var(--green)' }}>✓</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="table-wrap">
                            <table>
                                <thead>
                                    <tr>{previewCols.map((c) => <th key={c}>{c}</th>)}</tr>
                                </thead>
                                <tbody>
                                    {previewRows.map((row, i) => (
                                        <tr key={i}>
                                            {previewCols.map((c) => {
                                                const v = String(row[c] || '');
                                                return <td key={c}>{v.length > 40 ? v.slice(0, 40) + '…' : v || '—'}</td>;
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            <div style={{ marginTop: 28 }}>
                <div className="sec-title mb-16" style={{ fontSize: 14 }}>Importações recentes</div>
                {imports.length ? (
                    <div className="table-wrap">
                        <table>
                            <thead><tr><th>Arquivo</th><th>Registros</th><th>Colunas</th><th>Data</th><th></th></tr></thead>
                            <tbody>
                                {[...imports].reverse().map((imp, i) => (
                                    <tr key={i}>
                                        <td>📂 {imp.file}</td>
                                        <td><span className="badge badge-blue">{imp.rows}</span></td>
                                        <td className="muted">{imp.cols}</td>
                                        <td className="muted">{new Date(imp.date).toLocaleString('pt-BR')}</td>
                                        <td>
                                            <button 
                                                className="btn btn-ghost btn-sm" 
                                                style={{ color: 'var(--red)' }}
                                                onClick={() => setDeleteImportId(imp.id)}
                                                title="Excluir importação e leads associados"
                                            >
                                                🗑
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="empty">
                        <span className="empty-icon">📋</span>
                        <div className="empty-title">Nenhuma importação ainda</div>
                    </div>
                )}
            </div>

            {deleteImportId && (
                <div className="modal-overlay open" onClick={() => setDeleteImportId(null)}>
                    <div className="modal" style={{ maxWidth: 400 }} onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <div className="modal-title">Excluir Importação</div>
                            <button className="modal-close" onClick={() => setDeleteImportId(null)}>✕</button>
                        </div>
                        <p style={{ color: 'var(--t2)', marginBottom: 24, lineHeight: 1.6 }}>
                            Tem certeza que deseja excluir esta importação? <strong>Todos os leads associados também serão excluídos.</strong>
                        </p>
                        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                            <button className="btn btn-ghost" onClick={() => setDeleteImportId(null)}>Cancelar</button>
                            <button 
                                className="btn" 
                                style={{ background: 'var(--red)', color: '#fff' }}
                                onClick={() => {
                                    dispatch({ type: 'DELETE_IMPORT', payload: deleteImportId });
                                    toast('Importação e leads associados excluídos.', 'success');
                                    setDeleteImportId(null);
                                }}
                            >
                                Excluir
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}