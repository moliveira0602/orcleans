import { useRef, useState, useMemo, useEffect } from 'react';
import * as ExcelJS from 'exceljs';
import { useAppState, useAppDispatch, leadFingerprint, useApp } from '../store';
import { useToast } from '../components/Toast';
import { computeScore } from '../utils/scoring';
import { detectSourceType, mapRowToLead } from '../utils/leadMapper';
import { analyzeColumns, getColumnAnalysisSummary, STANDARD_COLUMNS, type ColumnMapping, type StandardColumnKey } from '../utils/columnMapper';
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

        // Build mapping: original column name -> standard field key
        const mapping: Record<string, string> = {};
        for (const m of columnMappings) {
            if (m.standardKey) {
                mapping[m.originalName] = m.standardKey;
            }
        }

        console.log('[Import] Excel columns:', cols);
        console.log('[Import] Active mappings:', mapping);

        // Use sanitized data if available, otherwise fall back to original
        const importData = sanitizedData.length > 0 ? sanitizedData : data;

        const newLeads: Lead[] = importData.map((row, i) => {
            // Build lead from explicit column mappings (user-selected or auto-detected)
            // Don't rely on mapRowToLead — it uses fuzzy matching that often fails
            const lead: Lead = {
                id: 'lead_' + Date.now() + '_' + i,
                nome: '', segmento: '', avaliacao: null, reviews: null,
                preco: '', endereco: '', cidade: '', status: '', horario: '',
                telefone: '', website: '', email: '', servicos: [],
                foto: '', fotos: [], linkOrigem: '', linkPedido: '', observacoes: '',
                _score: 0, _pipeline: 'novo', _importedAt: Date.now(),
                _importFile: file, _importDate: new Date().toISOString(),
                _importId: importId, _raw: {},
            };

            // Apply each mapped column
            for (const [originalCol, standardKey] of Object.entries(mapping)) {
                const value = row[originalCol];
                if (value !== undefined && value !== null && String(value).trim() !== '') {
                    if (['avaliacao', 'reviews'].includes(standardKey)) {
                        const num = parseFloat(String(value).replace(',', '.'));
                        if (standardKey === 'avaliacao') lead.avaliacao = isNaN(num) ? null : num;
                        if (standardKey === 'reviews') lead.reviews = isNaN(num) ? null : Math.round(num);
                    } else if (standardKey === 'servicos') {
                        lead.servicos = Array.isArray(value) ? value : String(value).split(';').map((s: string) => s.trim()).filter(Boolean);
                    } else if (standardKey === 'fotos') {
                        lead.fotos = Array.isArray(value) ? value : String(value).split(';').map((s: string) => s.trim()).filter(Boolean);
                    } else {
                        (lead as any)[standardKey] = String(value).trim();
                    }
                }
            }

            // If no mappings exist, fall back to auto-detector
            if (Object.keys(mapping).length === 0) {
                const sourceType = detectSourceType(cols);
                const mapped = mapRowToLead(row as Record<string, any>, sourceType, cols);
                for (const key of Object.keys(mapped)) {
                    if (mapped[key as keyof typeof mapped] !== null && mapped[key as keyof typeof mapped] !== undefined && mapped[key as keyof typeof mapped] !== '') {
                        (lead as any)[key] = mapped[key as keyof typeof mapped];
                    }
                }
                if (typeof mapped.avaliacao === 'number') lead.avaliacao = mapped.avaliacao;
                if (typeof mapped.reviews === 'number') lead.reviews = mapped.reviews;
                if (Array.isArray(mapped.servicos) && mapped.servicos.length > 0) lead.servicos = mapped.servicos;
                if (Array.isArray(mapped.fotos) && mapped.fotos.length > 0) lead.fotos = mapped.fotos;
            }

            // Debug first row
            if (i === 0) {
                console.log('[Import] First row:', {
                    nome: lead.nome, segmento: lead.segmento,
                    telefone: lead.telefone, email: lead.email,
                    endereco: lead.endereco, cidade: lead.cidade,
                });
            }

            // Calculate score
            const leadData = {
                nome: lead.nome, segmento: lead.segmento,
                avaliacao: lead.avaliacao ?? 0, reviews: lead.reviews ?? 0,
                preco: lead.preco, endereco: lead.endereco, status: lead.status,
                horario: lead.horario, telefone: lead.telefone, website: lead.website,
                email: lead.email, servicos: lead.servicos, foto: lead.foto,
                fotos: lead.fotos, linkOrigem: lead.linkOrigem, leadPedido: lead.linkPedido,
                observacoes: lead.observacoes, _raw: lead._raw,
            };
            let score = computeScore(leadData, numCol, data as Record<string, unknown>[]);

            // Score boosts
            if (lead.avaliacao !== null && lead.avaliacao >= 4 && lead.reviews !== null && lead.reviews > 0) score += 1;
            if (lead.preco.includes('15') || lead.preco.includes('20')) score += 1;
            if (lead.servicos.some(s => s.toLowerCase().includes('delivery'))) score += 0.5;
            if (lead.status === 'Aberto' || lead.status === 'Ativo') score += 0.5;
            if (lead.website) score += 0.5;
            if (lead.email) score += 0.5;

            lead._score = score;
            return lead;
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
                cidade: l.cidade,
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
                score: Math.round(l._score),
                pipelineStage: l._pipeline,
                importFile: l._importFile,
                importDate: l._importDate,
                importId: l._importId,
                raw: l._raw,
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
                                <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
                                    Mapeamento de Colunas
                                </div>

                                {/* Available platform columns reference */}
                                <div style={{ marginBottom: 10, padding: 10, background: 'var(--bg3)', borderRadius: 8 }}>
                                    <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
                                        Colunas disponíveis na plataforma
                                    </div>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                        {Object.entries(STANDARD_COLUMNS).map(([key, label]) => {
                                            const isUsed = columnMappings.some(m => m.standardKey === key);
                                            return (
                                                <span
                                                    key={key}
                                                    style={{
                                                        fontSize: 10, padding: '2px 8px', borderRadius: 4,
                                                        background: isUsed ? 'rgba(16,185,129,0.15)' : 'var(--card)',
                                                        border: `1px solid ${isUsed ? 'rgba(16,185,129,0.3)' : 'var(--border)'}`,
                                                        color: isUsed ? 'var(--green)' : 'var(--t3)',
                                                        textDecoration: isUsed ? 'underline' : 'none',
                                                    }}
                                                    title={isUsed ? 'Já mapeada' : 'Não mapeada'}
                                                >
                                                    {label}
                                                    {isUsed && ' ✓'}
                                                </span>
                                            );
                                        })}
                                    </div>
                                </div>

                                <div style={{
                                    display: 'flex', flexDirection: 'column', gap: 4,
                                }}>
                                    {columnMappings.map((mapping, idx) => (
                                        <div
                                            key={mapping.originalName}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: 8,
                                                padding: '8px 12px', borderRadius: 8,
                                                background: mapping.isStandard ? 'rgba(16,185,129,0.06)' : 'rgba(245,158,11,0.06)',
                                                border: `1px solid ${mapping.isStandard ? 'rgba(16,185,129,0.15)' : 'rgba(245,158,11,0.2)'}`,
                                                transition: 'all var(--transition)',
                                            }}
                                        >
                                            {/* Column index + original name */}
                                            <span style={{ fontSize: 9, color: 'var(--t4)', minWidth: 16 }}>#{idx + 1}</span>
                                            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--t1)', minWidth: 100, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {mapping.originalName}
                                            </span>

                                            <span style={{ fontSize: 10, color: 'var(--t3)' }}>→</span>

                                            {editingColumn === mapping.originalName ? (
                                                <select
                                                    autoFocus
                                                    value={mapping.standardKey || '__custom__'}
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        if (val === '__custom__') {
                                                            setColumnMappings(prev => prev.map(m =>
                                                                m.originalName === mapping.originalName
                                                                    ? { ...m, standardKey: null, suggestedName: mapping.originalName, isStandard: false }
                                                                    : m
                                                            ));
                                                        } else {
                                                            const key = val as StandardColumnKey;
                                                            setColumnMappings(prev => prev.map(m =>
                                                                m.originalName === mapping.originalName
                                                                    ? { ...m, standardKey: key, suggestedName: STANDARD_COLUMNS[key], isStandard: true }
                                                                    : m
                                                            ));
                                                        }
                                                    }}
                                                    onBlur={() => handleColumnCancel()}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter' || e.key === 'Escape') handleColumnCancel();
                                                    }}
                                                    style={{
                                                        flex: 1, maxWidth: 220, fontSize: 11, padding: '4px 8px',
                                                        background: 'var(--bg4)', border: '1px solid var(--blue)',
                                                        color: 'var(--t1)', borderRadius: 6, cursor: 'pointer',
                                                    }}
                                                >
                                                    {Object.entries(STANDARD_COLUMNS).map(([key, label]) => (
                                                        <option key={key} value={key}>{label}</option>
                                                    ))}
                                                    <option value="__custom__">Manter original</option>
                                                </select>
                                            ) : (
                                                <div
                                                    onClick={() => handleColumnEdit(mapping.originalName)}
                                                    style={{
                                                        cursor: 'pointer',
                                                        display: 'flex', alignItems: 'center', gap: 4,
                                                    }}
                                                >
                                                    <span style={{
                                                        fontSize: 11, fontWeight: 600,
                                                        color: mapping.isStandard ? 'var(--green)' : 'var(--amber)',
                                                    }}>
                                                        {mapping.suggestedName}
                                                    </span>
                                                    {mapping.isStandard ? (
                                                        <span style={{ fontSize: 11, color: 'var(--green)' }}>✓</span>
                                                    ) : null}
                                                </div>
                                            )}

                                            {/* Auto-match indicator */}
                                            {!mapping.isStandard && (
                                                <span style={{
                                                    fontSize: 9, color: 'var(--amber)', padding: '1px 5px',
                                                    borderRadius: 3, background: 'rgba(245,158,11,0.12)',
                                                }}>
                                                    pendente
                                                </span>
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