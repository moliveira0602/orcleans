import { useRef, useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { useAppState, useAppDispatch, leadFingerprint } from '../store';
import { useToast } from '../components/Toast';
import { computeScore } from '../utils/scoring';
import type { Lead } from '../types';

export default function ImportPage() {
    const { imports, leads: existingLeads } = useAppState();
    const dispatch = useAppDispatch();
    const toast = useToast();
    const fileInput = useRef<HTMLInputElement>(null);
    const [dragOver, setDragOver] = useState(false);
    const [pending, setPending] = useState<{
        file: string;
        data: Record<string, unknown>[];
        rows: number;
        cols: string[];
        numericCols: string[];
    } | null>(null);
    const [scoreCol, setScoreCol] = useState('');
    const [dupeMode, setDupeMode] = useState<'skip' | 'update'>('skip');

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

    const processFile = (file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                let data: Record<string, unknown>[];
                if (file.name.toLowerCase().endsWith('.csv')) {
                    const wb = XLSX.read(e.target?.result, { type: 'binary' });
                    data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });
                } else {
                    const wb = XLSX.read(new Uint8Array(e.target?.result as ArrayBuffer), { type: 'array' });
                    data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });
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
        if (file.name.toLowerCase().endsWith('.csv')) reader.readAsBinaryString(file);
        else reader.readAsArrayBuffer(file);
    };

    const confirmImport = () => {
        if (!pending) return;
        const { data, file, cols } = pending;
        const numCol = scoreCol || null;
        const importId = 'imp_' + Date.now();
        const newLeads: Lead[] = data.map((row, i) => {
            const score = computeScore(row, numCol, data);
            return {
                id: 'lead_' + Date.now() + '_' + i,
                _score: score,
                _pipeline: 'novo' as const,
                _importFile: file,
                _importDate: new Date().toISOString(),
                _importId: importId,
                ...row,
            };
        });

        const importRecord = {
            id: importId,
            name: file.replace(/\.[^/.]+$/, ""), // file name without extension
            file,
            rows: pending.rows,
            cols: cols.length,
            date: new Date().toISOString(),
            count: pending.rows,
        };

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
                `✓ ${dupeStats.newCount} novos importados · ${dupeStats.dupeCount} duplicados ${modeLabel}`,
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
            toast(`✓ ${pending.rows} leads importados com scoring automático`, 'success');
        }

        dispatch({
            type: 'ADD_ACTIVITY',
            payload: { title: `Importação: ${file}`, sub: `${dupeStats.newCount} novos leads`, icon: '📂', time: new Date().toISOString() },
        });
        setPending(null);
        setScoreCol('');
        setDupeMode('skip');
        if (fileInput.current) fileInput.current.value = '';
    };

    const cancelImport = () => {
        setPending(null);
        setScoreCol('');
        if (fileInput.current) fileInput.current.value = '';
    };

    const previewCols = pending ? pending.cols.slice(0, 8) : [];
    const previewRows = pending ? pending.data.slice(0, 8) : [];

    return (
        <>
            <div className="sec-header mb-20">
                <div>
                    <div className="sec-title">Importar Leads</div>
                    <div className="sec-sub">Qualquer formato tabular é aceito</div>
                </div>
            </div>

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
                        Arraste e solte ou clique para selecionar. A OrcaLens detecta automaticamente as colunas e gera o scoring.
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
                            <thead><tr><th>Arquivo</th><th>Registros</th><th>Colunas</th><th>Data</th></tr></thead>
                            <tbody>
                                {[...imports].reverse().map((imp, i) => (
                                    <tr key={i}>
                                        <td>📂 {imp.file}</td>
                                        <td><span className="badge badge-blue">{imp.rows}</span></td>
                                        <td className="muted">{imp.cols}</td>
                                        <td className="muted">{new Date(imp.date).toLocaleString('pt-BR')}</td>
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
        </>
    );
}
