import { useState, useMemo, useEffect, useRef } from 'react';
import { useAppState, useAppDispatch } from '../store';
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
    const toast = useToast();
    const tableRef = useRef<HTMLDivElement>(null);
    const [search, setSearch] = useState(searchQuery);
    const [importFilter, setImportFilter] = useState('');
    const [scoreFilter, setScoreFilter] = useState('');
    const [catFilter, setCatFilter] = useState('');
    const [sortCol, setSortCol] = useState<string | null>(null);
    const [sortDir, setSortDir] = useState(1);
    const [page, setPage] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);
    const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
    const [isDeleting, setIsDeleting] = useState(false);
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
    }, [leads, search, scoreFilter, catFilter, sortCol, sortDir, settings]);

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
        try {
            await deleteLeadsBulk(Array.from(selectedLeads));
            toast(`${selectedLeads.size} lead(s) eliminado(s).`, 'success');
            setSelectedLeads(new Set());
            // Update local state by removing deleted leads
            const idsToDelete = new Set(selectedLeads);
            dispatch({ type: 'SET_LEADS', payload: leads.filter(l => !idsToDelete.has(l.id)) });
        } catch (err) {
            toast('Erro ao eliminar leads.', 'error');
        } finally {
            setIsDeleting(false);
        }
    };

    const pipeBadge: Record<string, string> = { novo: 'badge-gray', qualificado: 'badge-blue', proposta: 'badge-amber', negociacao: 'badge-amber', ganho: 'badge-green', perdido: 'badge-red' };
    const pipeLabel: Record<string, string> = { novo: 'Novo', qualificado: 'Qualif.', proposta: 'Proposta', negociacao: 'Negoc.', ganho: 'Ganho', perdido: 'Perdido' };

    const categories = useMemo(() => {
        return [...new Set(leads.map((l) => l.segmento).filter(Boolean))].sort();
    }, [leads]);

    if (!leads.length) {
        return (
            <div className="empty">
                <span className="empty-icon">◉</span>
                <div className="empty-title">Nenhum lead ainda</div>
                <div className="empty-sub">Importe uma lista para começar.</div>
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
                    <div className="search-wrap">
                        <span className="search-icon">⌕</span>
                        <input
                            className="input"
                            type="text"
                            placeholder="Filtrar leads..."
                            value={search}
                            onChange={(e) => {
                                const val = e.target.value;
                                setSearch(val);
                                setPage(0);
                                if (onSearch) onSearch(val);
                            }}
                            style={{ width: 180, paddingLeft: 30 }}
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
                    <button className="btn btn-ghost btn-sm" onClick={handleExport}>↓ Exportar CSV</button>
                    {selectedLeads.size > 0 && (
                        <button
                            className="btn btn-sm"
                            style={{ background: 'var(--red)', color: '#fff' }}
                            onClick={handleBulkDelete}
                            disabled={isDeleting}
                        >
                            {isDeleting ? 'A eliminar...' : `🗑 ${selectedLeads.size} eliminar`}
                        </button>
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
                                                            color: 'var(--blue3)', fontSize: 14, padding: 2,
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                        }}
                                                    >
                                                        📍
                                                    </button>
                                                ) : l.linkOrigem ? (
                                                    <a href={String(l.linkOrigem)} target="_blank" rel="noreferrer" style={{ color: 'var(--blue3)', fontSize: 12 }}>🔗</a>
                                                ) : null}
                                            </td>
                                        );
                                    }

                                    // Special rendering for 'avaliacao'
                                    if (col.key === 'avaliacao') {
                                        if (value === null || value === undefined || value === 0) return <td key={col.key}><span className="text-muted">—</span></td>;
                                        return <td key={col.key}>⭐ {String(value)}</td>;
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
                                        if (status === 'Aberto' || status === 'Ativo') return <td key={col.key}><span style={{ color: 'var(--green)' }}>● {status}</span></td>;
                                        if (status === 'Fechado' || status === 'Inativo') return <td key={col.key}><span style={{ color: 'var(--red)' }}>● {status}</span></td>;
                                        return <td key={col.key}><span style={{ color: 'var(--gray)' }}>● {status}</span></td>;
                                    }

                                    // Special rendering for 'servicos'
                                    if (col.key === 'servicos') {
                                        const services = Array.isArray(value) ? value : [];
                                        if (!services.length) return <td key={col.key}><span className="text-muted">—</span></td>;
                                        const visible = services.slice(0, 2);
                                        const extra = services.length - 2;
                                        return (
                                            <td key={col.key}>
                                                {visible.map(s => <span key={s} style={{ fontSize: 11, background: 'var(--gray-dim)', padding: '2px 6px', borderRadius: 4, marginRight: 4 }}>{s}</span>)}
                                                {extra > 0 && <span style={{ fontSize: 11, color: 'var(--t2)' }}>+{extra}</span>}
                                            </td>
                                        );
                                    }

                                    // Special rendering for 'linkOrigem'
                                    if (col.key === 'linkOrigem') {
                                        const url = String(value || '');
                                        if (!url) return <td key={col.key}><span className="text-muted">—</span></td>;
                                        return <td key={col.key}><a href={url} target="_blank" rel="noreferrer" style={{ color: 'var(--blue3)' }}>↗</a></td>;
                                    }

                                    // Special rendering for 'website'
                                    if (col.key === 'website') {
                                        const url = String(value || '');
                                        if (!url) return <td key={col.key}><span className="text-muted">—</span></td>;
                                        return <td key={col.key}><a href={url.startsWith('http') ? url : `https://${url}`} target="_blank" rel="noreferrer" style={{ color: 'var(--blue3)', fontSize: 11 }}>↗</a></td>;
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
                                <td><button className="btn btn-ghost btn-sm" onClick={() => onOpenDetail(l.id)}>Ver →</button></td>
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