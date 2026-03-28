import React, { useState, useMemo, useEffect } from 'react';
import { useAppState } from '../store';
import { detectNameCol, detectCatCol } from '../utils/detect';
import { scoreClass } from '../utils/scoring';
import ScoreRing from '../components/ScoreRing';
import { exportLeadsCsv } from '../utils/export';
import { useToast } from '../components/Toast';

interface LeadsProps {
    searchQuery?: string;
    onSearch?: (query: string) => void;
    onOpenDetail: (id: string) => void;
}

export default function Leads({ searchQuery = '', onSearch, onOpenDetail }: LeadsProps) {
    const { leads, settings, imports } = useAppState();
    const toast = useToast();
    const [search, setSearch] = useState(searchQuery);
    const [importFilter, setImportFilter] = useState('');
    const [scoreFilter, setScoreFilter] = useState('');
    const [catFilter, setCatFilter] = useState('');
    const [sortCol, setSortCol] = useState<string | null>(null);
    const [sortDir, setSortDir] = useState(1);
    const [page, setPage] = useState(0);
    const perPage = 25;

    // Sync external search query
    useEffect(() => {
        setSearch(searchQuery);
        setPage(0);
    }, [searchQuery]);

    const nameCol = detectNameCol(leads);
    const catCol = detectCatCol(leads);

    const categories = useMemo(() => {
        return [...new Set(leads.map((l) => String(l[catCol || ''] || '')).filter(Boolean))].sort();
    }, [leads, catCol]);

    const filtered = useMemo(() => {
        const hot = settings.hotThreshold;
        const warm = settings.warmThreshold;
        let result = leads.filter((l) => {
            if (scoreFilter === 'hot' && l._score < hot) return false;
            if (scoreFilter === 'warm' && (l._score < warm || l._score >= hot)) return false;
            if (scoreFilter === 'cold' && l._score >= warm) return false;
            if (catFilter && catCol && String(l[catCol] || '') !== catFilter) return false;
            if (importFilter && l._importId !== importFilter) return false;
            if (search) {
                const str = Object.values(l).join(' ').toLowerCase();
                if (!str.includes(search.toLowerCase())) return false;
            }
            return true;
        });

        if (sortCol) {
            result = [...result].sort((a, b) => {
                const va = a[sortCol] as string;
                const vb = b[sortCol] as string;
                const na = parseFloat(String(va));
                const nb = parseFloat(String(vb));
                if (!isNaN(na) && !isNaN(nb)) return (na - nb) * sortDir;
                return String(va || '').localeCompare(String(vb || '')) * sortDir;
            });
        } else {
            result = [...result].sort((a, b) => b._score - a._score);
        }

        return result;
    }, [leads, search, scoreFilter, catFilter, sortCol, sortDir, settings, catCol]);

    const total = filtered.length;
    const paged = filtered.slice(page * perPage, (page + 1) * perPage);
    const start = page * perPage + 1;
    const end = Math.min((page + 1) * perPage, total);

    // Display columns
    const allCols = leads.length
        ? Object.keys(leads[0]).filter((c) => !c.startsWith('_'))
        : [];
    const priorityCols = ['Name', 'Nome', 'name', 'nome', 'Address', 'Endereço', 'Category', 'Categoria', 'Phone', 'Telefone', 'Website', 'Rating'];
    const displayCols = [...priorityCols.filter((c) => allCols.includes(c)), ...allCols.filter((c) => !priorityCols.includes(c))].slice(0, 7);

    const handleSort = (col: string) => {
        if (sortCol === col) setSortDir((d) => d * -1);
        else { setSortCol(col); setSortDir(-1); }
    };

    const handleExport = () => {
        if (!leads.length) { toast('Nenhum lead para exportar.', 'info'); return; }
        exportLeadsCsv(leads);
        toast('CSV exportado com sucesso.', 'success');
    };

    const pipeBadge: Record<string, string> = { novo: 'badge-gray', qualificado: 'badge-blue', proposta: 'badge-amber', negociacao: 'badge-amber', ganho: 'badge-green', perdido: 'badge-red' };
    const pipeLabel: Record<string, string> = { novo: 'Novo', qualificado: 'Qualif.', proposta: 'Proposta', negociacao: 'Negoc.', ganho: 'Ganho', perdido: 'Perdido' };

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
            <div className="sec-header mb-20">
                <div>
                    <div className="sec-title">Base de Leads</div>
                    <div className="sec-sub">
                        {total} leads{(search || scoreFilter || catFilter) ? ' (filtrado)' : ''} · {leads.length} total
                    </div>
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
                </div>
            </div>

            <div className="table-wrap">
                <table>
                    <thead>
                        <tr>
                            <th onClick={() => handleSort('_score')} className={sortCol === '_score' ? 'sorted' : ''}>Score ↕</th>
                            {displayCols.map((c) => (
                                <th key={c} onClick={() => handleSort(c)} className={sortCol === c ? 'sorted' : ''}>{c} ↕</th>
                            ))}
                            <th>Pipeline</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {paged.map((l) => (
                            <tr key={l.id}>
                                <td><ScoreRing score={l._score} hot={settings.hotThreshold} warm={settings.warmThreshold} /></td>
                                {displayCols.map((c) => {
                                    const v = String(l[c] || '');
                                    if (v.startsWith('http')) {
                                        return (
                                            <td key={c}>
                                                <a href={v} target="_blank" rel="noreferrer" style={{ color: 'var(--blue3)', textDecoration: 'none', fontSize: 11 }}>↗ link</a>
                                            </td>
                                        );
                                    }
                                    return <td key={c} title={v.length > 45 ? v : undefined}>{v.length > 45 ? v.slice(0, 45) + '…' : v || <span className="text-muted">—</span>}</td>;
                                })}
                                <td><span className={`badge ${pipeBadge[l._pipeline] || 'badge-gray'}`}>{pipeLabel[l._pipeline] || l._pipeline || 'Novo'}</span></td>
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
