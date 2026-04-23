import { useState, useMemo, useEffect, useRef } from 'react';
import { Search, MapPin, Star, Trash2, Download, ExternalLink, ChevronRight, Filter, MoreHorizontal, ArrowRight, XCircle, CheckCircle, Info } from 'lucide-react';
import { useAppState, useAppDispatch, useApp } from '../store';
import { LEAD_COLUMNS } from '../utils/leadMapper';
import ScoreRing from '../components/ScoreRing';
import { exportLeadsCsv } from '../utils/export';
import { useToast } from '../components/Toast';
import { deleteLeadsBulk } from '../services/leads';
import type { Lead } from '../types';

interface LeadsProps {
    searchQuery?: string;
    onSearch?: (query: string) => void;
    onOpenDetail: (id: string) => void;
    onOpenMap?: (id: string) => void;
}

export default function Leads({ searchQuery = '', onSearch, onOpenDetail, onOpenMap }: LeadsProps) {
    const { leads, settings, imports } = useAppState();
    const dispatch = useAppDispatch();
    const { refreshLeads } = useApp();
    const toast = useToast();
    const tableRef = useRef<HTMLDivElement>(null);
    const [search, setSearch] = useState(searchQuery);
    const [importFilter, setImportFilter] = useState('');
    const [scoreFilter, setScoreFilter] = useState('');
    const [catFilter, setCatFilter] = useState('');
    const [pipelineFilter, setPipelineFilter] = useState('');
    const [sortCol, setSortCol] = useState<string | null>(null);
    const [sortDir, setSortDir] = useState(1);
    const [page, setPage] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);
    const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
    const [isDeleting, setIsDeleting] = useState(false);
    const [bulkPipelineStage, setBulkPipelineStage] = useState('');
    const perPage = 25;

    const handleMouseDown = (e: React.MouseEvent) => {
        if (!tableRef.current) return;
        setIsDragging(true);
        setStartX(e.pageX - tableRef.current.offsetLeft);
        setScrollLeft(tableRef.current.scrollLeft);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging || !tableRef.current) return;
        e.preventDefault();
        const x = e.pageX - tableRef.current.offsetLeft;
        const walk = (x - startX) * 2;
        tableRef.current.scrollLeft = scrollLeft - walk;
    };

    const handleMouseUp = () => setIsDragging(false);

    useEffect(() => {
        const handleGlobalMouseUp = () => setIsDragging(false);
        window.addEventListener('mouseup', handleGlobalMouseUp);
        return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
    }, []);

    // Sync external search query
    useEffect(() => {
        setSearch(searchQuery);
        setPage(0);
    }, [searchQuery]);

    const filtered = useMemo(() => {
        const hot = settings.hotThreshold;
        const warm = settings.warmThreshold;
        let result = leads.filter((l) => {
            if (pipelineFilter && l._pipeline !== pipelineFilter) return false;
            if (scoreFilter === 'hot' && l._score < hot) return false;
            if (scoreFilter === 'warm' && (l._score < warm || l._score >= hot)) return false;
            if (scoreFilter === 'cold' && l._score >= warm) return false;
            if (catFilter && l.segmento && l.segmento !== catFilter) return false;
            if (importFilter && l._importId !== importFilter) return false;
            if (search) {
                const str = `${l.nome} ${l.segmento} ${l.endereco} ${l.cidade || ''} ${l.telefone} ${l.email}`.toLowerCase();
                if (!str.includes(search.toLowerCase())) return false;
            }
            return true;
        });

        if (sortCol) {
            result = [...result].sort((a, b) => {
                const va = a[sortCol as keyof Lead] as string | number | null;
                const vb = b[sortCol as keyof Lead] as string | number | null;
                const na = typeof va === 'number' ? va : parseFloat(String(va || 0));
                const nb = typeof vb === 'number' ? vb : parseFloat(String(vb || 0));
                if (!isNaN(na) && !isNaN(nb)) return (na - nb) * sortDir;
                return String(va || '').localeCompare(String(vb || '')) * sortDir;
            });
        } else {
            result = [...result].sort((a, b) => b._score - a._score);
        }

        return result;
    }, [leads, search, scoreFilter, catFilter, importFilter, pipelineFilter, sortCol, sortDir, settings]);

    const total = filtered.length;
    const paged = filtered.slice(page * perPage, (page + 1) * perPage);
    const start = page * perPage + 1;
    const end = Math.min((page + 1) * perPage, total);

    // Use fixed columns from leadMapper
    const displayCols = LEAD_COLUMNS;

    const handleSort = (col: string) => {
        if (sortCol === col) setSortDir((d) => d * -1);
        else { setSortCol(col); setSortDir(-1); }
    };

    const handleExport = () => {
        if (!leads.length) { toast('Nenhum lead para exportar.', 'info'); return; }
        exportLeadsCsv(leads);
        toast('CSV exportado com sucesso.', 'success');
    };

    const handleToggleSelect = (id: string) => {
        setSelectedLeads((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const handleSelectAll = () => {
        if (selectedLeads.size === paged.length) {
            setSelectedLeads(new Set());
        } else {
            setSelectedLeads(new Set(paged.map((l) => l.id)));
        }
    };

    const handleBulkDelete = async () => {
        if (selectedLeads.size === 0) return;
        if (!confirm(`Eliminar ${selectedLeads.size} lead(s)?`)) return;
        setIsDeleting(true);
        console.log(`[Leads] Starting bulk delete for ${selectedLeads.size} leads...`);

        try {
            const ids = Array.from(selectedLeads);
            
            // 1. Chamar API e aguardar confirmação real
            let result;
            try {
                result = await deleteLeadsBulk(ids);
                console.log('[Leads] API response:', result);
            } catch (apiError) {
                console.error('[Leads] Delete API failed:', apiError);
                throw new Error('Erro de conexão: Não foi possível comunicar com o servidor.');
            }
            
            // 2. Verificar se algo foi realmente deletado
            const deletedCount = result?.count ?? 0;

            if (deletedCount <= 0) {
                console.warn('[Leads] Server reported 0 leads deleted. IDs might be out of sync.');
                await refreshLeads(); // Sincroniza estado real
                throw new Error('O servidor não encontrou os leads selecionados para exclusão. A lista foi atualizada.');
            }
            
            console.log(`[Leads] ${deletedCount} leads confirmed deleted on server.`);
            
            // 3. Só agora atualiza o estado local (Store)
            const idsToDelete = new Set(ids);
            dispatch({ 
                type: 'SET_LEADS', 
                payload: leads.filter((l) => !idsToDelete.has(l.id)) 
            });
            
            toast(`${deletedCount} lead(s) eliminado(s) com sucesso.`, 'success');
            setSelectedLeads(new Set());
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Erro inesperado ao eliminar leads.';
            console.error('[Leads] handleBulkDelete catch:', err);
            toast(message, 'error');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleBulkMovePipeline = async () => {
        if (selectedLeads.size === 0 || !bulkPipelineStage) return;
        if (!confirm(`Mover ${selectedLeads.size} lead(s) para "${pipeLabel[bulkPipelineStage]}"?`)) return;
        
        const idsToMove = Array.from(selectedLeads);
        dispatch({ type: 'MOVE_BULK_PIPELINE', payload: { leadIds: idsToMove, stage: bulkPipelineStage } });
        toast(`${idsToMove.length} lead(s) movido(s) para ${pipeLabel[bulkPipelineStage]}.`, 'success');
        setSelectedLeads(new Set());
        setBulkPipelineStage('');
    };

    const pipeBadge: Record<string, string> = { novo: 'badge-gray', qualificado: 'badge-blue', proposta: 'badge-amber', negociacao: 'badge-amber', ganho: 'badge-green', perdido: 'badge-red' };
    const pipeLabel: Record<string, string> = { novo: 'Novo', qualificado: 'Qualif.', proposta: 'Proposta', negociacao: 'Negoc.', ganho: 'Ganho', perdido: 'Perdido' };

    const categories = useMemo(() => {
        return [...new Set(leads.map((l) => l.segmento).filter(Boolean))].sort();
    }, [leads]);

    if (!leads.length) {
        return (
            <div className="empty" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 20px', gap: 16 }}>
                <div style={{ background: '#111', padding: 24, borderRadius: '50%', border: '1px solid #222' }}>
                    <Info size={48} color="#444" />
                </div>
                <div className="empty-title" style={{ fontSize: 18, fontWeight: 700, color: '#FFF' }}>Nenhum lead encontrado</div>
                <div className="empty-sub" style={{ fontSize: 13, color: '#888' }}>Sua base está vazia ou os filtros aplicados não retornaram resultados.</div>
            </div>
        );
    }

    return (
        <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div className="text-muted" style={{ fontSize: 13 }}>
                    {total} leads{(search || scoreFilter || catFilter) ? ' (filtrado)' : ''} · {leads.length} total
                </div>
                <div className="flex flex-center gap-8">
                    <div className="search-wrap" style={{ position: 'relative' }}>
                        <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#555' }} />
                        <input
                            className="input"
                            type="text"
                            placeholder="Pesquisar..."
                            value={search}
                            onChange={(e) => {
                                const val = e.target.value;
                                setSearch(val);
                                setPage(0);
                                if (onSearch) onSearch(val);
                            }}
                            style={{ width: 180, paddingLeft: 32, background: '#111', borderColor: '#222' }}
                        />
                    </div>
                    <select className="input" style={{ width: 130 }} value={importFilter} onChange={(e) => { setImportFilter(e.target.value); setPage(0); }}>
                        <option value="">Todas importações</option>
                        {imports.map((imp) => (
                            <option key={imp.id} value={imp.id}>{imp.name} ({imp.count})</option>
                        ))}
                    </select>
                    <select className="input" style={{ width: 130 }} value={scoreFilter} onChange={(e) => { setScoreFilter(e.target.value); setPage(0); }}>
                        <option value="">Todos scores</option>
                        <option value="hot">Quentes (≥{settings.hotThreshold})</option>
                        <option value="warm">Mornos ({settings.warmThreshold}–{settings.hotThreshold - 1})</option>
                        <option value="cold">Frios (&lt;{settings.warmThreshold})</option>
                    </select>
                    <select className="input" style={{ width: 130 }} value={catFilter} onChange={(e) => { setCatFilter(e.target.value); setPage(0); }}>
                        <option value="">Todas categorias</option>
                        {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <select className="input" style={{ width: 130 }} value={pipelineFilter} onChange={(e) => { setPipelineFilter(e.target.value); setPage(0); }}>
                        <option value="">Todos estágios</option>
                        <option value="novo">Novo</option>
                        <option value="qualificado">Qualificado</option>
                        <option value="proposta">Proposta</option>
                        <option value="negociacao">Negociação</option>
                        <option value="ganho">Ganho</option>
                        <option value="perdido">Perdido</option>
                    </select>
                    <button className="btn btn-ghost btn-sm" onClick={handleExport} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#111', borderColor: '#222' }}>
                        <Download size={14} /> 
                        <span>Exportar</span>
                    </button>
                    {selectedLeads.size > 0 && (
                        <>
                            <select 
                                className="input" 
                                style={{ width: 140 }} 
                                value={bulkPipelineStage} 
                                onChange={(e) => setBulkPipelineStage(e.target.value)}
                            >
                                <option value="">Mover para...</option>
                                <option value="novo">Novo</option>
                                <option value="qualificado">Qualificado</option>
                                <option value="proposta">Proposta</option>
                                <option value="negociacao">Negociação</option>
                                <option value="ganho">Ganho</option>
                                <option value="perdido">Perdido</option>
                            </select>
                            {bulkPipelineStage && (
                                <button
                                    className="btn btn-sm"
                                    style={{ background: '#FFFFFF', color: '#0A0A0A', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}
                                    onClick={handleBulkMovePipeline}
                                >
                                    <ArrowRight size={14} /> Mover {selectedLeads.size}
                                </button>
                            )}
                            <button
                                className="btn btn-sm"
                                style={{ background: '#000', color: '#EF4444', border: '1px solid #EF4444', display: 'flex', alignItems: 'center', gap: 6 }}
                                onClick={handleBulkDelete}
                                disabled={isDeleting}
                            >
                                <Trash2 size={14} />
                                <span>{isDeleting ? 'A eliminar...' : `Eliminar (${selectedLeads.size})`}</span>
                            </button>
                        </>
                    )}
                </div>
            </div>

            <div 
                ref={tableRef}
                className="table-wrap" 
                style={{ 
                    overflowX: 'auto', 
                    scrollbarWidth: 'thin', 
                    scrollbarColor: 'var(--blue) var(--bg4)',
                    cursor: isDragging ? 'grabbing' : 'grab',
                    userSelect: 'none'
                }}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
            >
                <style>{`
                    .table-wrap::-webkit-scrollbar { height: 8px; }
                    .table-wrap::-webkit-scrollbar-track { background: var(--bg4); border-radius: 4px; }
                    .table-wrap::-webkit-scrollbar-thumb { background: var(--blue); border-radius: 4px; }
                `}</style>
                <table>
                    <thead>
                        <tr>
                            <th style={{ width: 40 }}>
                                <input
                                    type="checkbox"
                                    checked={paged.length > 0 && selectedLeads.size === paged.length}
                                    onChange={handleSelectAll}
                                />
                            </th>
                            {displayCols.map((col) => (
                                <th 
                                    key={col.key} 
                                    onClick={() => handleSort(col.key)} 
                                    className={sortCol === col.key ? 'sorted' : ''}
                                    style={{ width: col.width }}
                                >
                                    {col.label} ↕
                                </th>
                            ))}
                            <th>Funil</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {paged.map((l) => (
                            <tr key={l.id}>
                                <td>
                                    <input
                                        type="checkbox"
                                        checked={selectedLeads.has(l.id)}
                                        onChange={() => handleToggleSelect(l.id)}
                                    />
                                </td>
                                {displayCols.map((col) => {
                                    const field = col.key as keyof Lead;
                                    const value = l[field];

                                    // Special rendering for 'nome' - show photo + link to map
                                    if (col.key === 'nome') {
                                        const hasCoords = typeof l._lat === 'number' && typeof l._lng === 'number';
                                        return (
                                            <td key={col.key} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                {l.foto && <img src={l.foto} alt="" style={{ width: 28, height: 28, borderRadius: 4, objectFit: 'cover' }} />}
                                                <span style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{l.nome || <span className="text-muted">—</span>}</span>
                                                {hasCoords && onOpenMap ? (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); onOpenMap(l.id); }}
                                                        title="Ver no mapa"
                                                        style={{
                                                            background: 'none', border: 'none', cursor: 'pointer',
                                                            color: '#FFF', fontSize: 14, padding: 2,
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                        }}
                                                    >
                                                        <MapPin size={12} />
                                                    </button>
                                                ) : l.linkOrigem ? (
                                                    <a href={String(l.linkOrigem)} target="_blank" rel="noreferrer" style={{ color: '#FFF', fontSize: 12 }}><ExternalLink size={12} /></a>
                                                ) : null}
                                            </td>
                                        );
                                    }

                                    // Special rendering for 'avaliacao'
                                    if (col.key === 'avaliacao') {
                                        if (value === null || value === undefined || value === 0) return <td key={col.key}><span className="text-muted">—</span></td>;
                                        return <td key={col.key}><div style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#fbbf24' }}><Star size={10} fill="#fbbf24" /> {String(value)}</div></td>;
                                    }

                                    // Special rendering for 'reviews'
                                    if (col.key === 'reviews') {
                                        if (value === null || value === undefined || value === 0) return <td key={col.key}><span className="text-muted">—</span></td>;
                                        return <td key={col.key}>({String(value)})</td>;
                                    }

                                    // Special rendering for 'status'
                                    if (col.key === 'status') {
                                        const status = String(value || '');
                                        if (!status) return <td key={col.key}><span className="text-muted">—</span></td>;
                                        if (status === 'Aberto' || status === 'Ativo') return <td key={col.key}><span style={{ color: '#22C55E', display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}><CheckCircle size={10} /> {status}</span></td>;
                                        if (status === 'Fechado' || status === 'Inativo') return <td key={col.key}><span style={{ color: '#EF4444', display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}><XCircle size={10} /> {status}</span></td>;
                                        return <td key={col.key}><span style={{ color: '#888', display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}><MoreHorizontal size={10} /> {status}</span></td>;
                                    }

                                    // Special rendering for 'servicos'
                                    if (col.key === 'servicos') {
                                        const services = Array.isArray(value) ? value : [];
                                        if (!services.length) return <td key={col.key}><span className="text-muted">—</span></td>;
                                        const visible = services.slice(0, 2);
                                        const extra = services.length - 2;
                                        return (
                                            <td key={col.key}>
                                                {visible.map(s => <span key={s} style={{ fontSize: 11, background: '#333333', color: '#FFFFFF', padding: '2px 8px', borderRadius: 4, marginRight: 4 }}>{s}</span>)}
                                                {extra > 0 && <span style={{ fontSize: 11, color: 'var(--t2)' }}>+{extra}</span>}
                                            </td>
                                        );
                                    }

                                    // Special rendering for 'linkOrigem'
                                    if (col.key === 'linkOrigem') {
                                        const url = String(value || '');
                                        if (!url) return <td key={col.key}><span className="text-muted">—</span></td>;
                                        return <td key={col.key}><a href={url} target="_blank" rel="noreferrer" style={{ color: 'var(--blue3)', display: 'flex', alignItems: 'center' }}><ExternalLink size={14} /></a></td>;
                                    }

                                    // Special rendering for 'website'
                                    if (col.key === 'website') {
                                        const url = String(value || '');
                                        if (!url) return <td key={col.key}><span className="text-muted">—</span></td>;
                                        return <td key={col.key}><a href={url.startsWith('http') ? url : `https://${url}`} target="_blank" rel="noreferrer" style={{ color: 'var(--blue3)', display: 'flex', alignItems: 'center' }}><ExternalLink size={14} /></a></td>;
                                    }

                                    // Special rendering for '_score'
                                    if (col.key === '_score') {
                                        return <td key={col.key}><ScoreRing score={l._score} hot={settings.hotThreshold} warm={settings.warmThreshold} /></td>;
                                    }

                                    // Special rendering for '_pipeline'
                                    if (col.key === '_pipeline') {
                                        return <td key={col.key}><span className={`badge ${pipeBadge[l._pipeline] || 'badge-gray'}`}>{pipeLabel[l._pipeline] || l._pipeline}</span></td>;
                                    }

                                    // Default rendering
                                    const v = String(value || '');
                                    if (!v) return <td key={col.key}><span className="text-muted">—</span></td>;
                                    return <td key={col.key} title={v.length > 45 ? v : undefined}>{v.length > 45 ? v.slice(0, 45) + '…' : v}</td>;
                                })}
                                <td><button className="btn btn-ghost btn-sm" onClick={() => onOpenDetail(l.id)} style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span>Detalhes</span> <ArrowRight size={12} /></button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div style={{ padding: '14px 0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className="text-sm text-muted">{total ? `Mostrando ${start}–${end} de ${total}` : ''}</span>
                <div className="flex gap-8">
                    <button className="btn btn-ghost btn-sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>← Anterior</button>
                    <button className="btn btn-ghost btn-sm" disabled={end >= total} onClick={() => setPage((p) => p + 1)}>Próximo →</button>
                </div>
            </div>
        </>
    );
}