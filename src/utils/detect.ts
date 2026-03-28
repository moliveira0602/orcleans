import type { Lead } from '../types';

export function detectNameCol(leads: Lead[]): string {
    if (!leads.length) return 'Name';
    const cols = Object.keys(leads[0]);
    return (
        cols.find((c) =>
            ['Name', 'Nome', 'name', 'nome', 'Empresa', 'Company', 'company'].includes(c)
        ) ||
        cols.find((c) => !c.startsWith('_')) ||
        cols[0]
    );
}

export function detectCatCol(leads: Lead[]): string | null {
    if (!leads.length) return null;
    const cols = Object.keys(leads[0]).filter((c) => !c.startsWith('_'));
    const prefer = [
        'Category', 'Categoria', 'category', 'categoria',
        'Type', 'Tipo', 'type', 'segment',
    ];
    const found = prefer.find((c) => cols.includes(c));
    if (found) return found;
    return (
        cols.find((c) => {
            const vals = [
                ...new Set(
                    leads
                        .slice(0, 30)
                        .map((r) => String(r[c] || ''))
                        .filter(Boolean)
                ),
            ];
            return vals.length >= 2 && vals.length <= 25;
        }) || null
    );
}

export function getLeadName(lead: Lead, nameCol: string): string {
    return String(
        lead[nameCol] ||
        lead.Name ||
        lead.name ||
        Object.values(lead).find(
            (v) => v && String(v).length > 2 && !String(v).startsWith('http')
        ) ||
        'Lead'
    ).slice(0, 50);
}

export function getLeadCategory(lead: Lead, catCol: string | null): string {
    if (!catCol) return '';
    return String(
        lead[catCol] ||
        lead.Category ||
        lead.category ||
        ''
    ).slice(0, 40);
}
