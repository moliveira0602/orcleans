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

export function detectAddressCol(leads: Lead[]): string | null {
    if (!leads.length) return null;
    const cols = Object.keys(leads[0]).filter(c => !c.startsWith('_'));
    const prefer = ['Address', 'Morada', 'Endereço', 'address', 'morada', 'Localidade', 'Localidade/Morada'];
    return prefer.find(c => cols.includes(c)) || cols.find(c => c.toLowerCase().includes('morada') || c.toLowerCase().includes('address')) || null;
}

export function getLeadAddress(lead: Lead, addressCol: string | null): string {
    if (!addressCol) return '';
    return String(lead[addressCol] || '').trim();
}

export function detectPostalCol(leads: Lead[]): string | null {
    if (!leads.length) return null;
    const cols = Object.keys(leads[0]).filter(c => !c.startsWith('_'));
    const prefer = ['Código Postal', 'Codigo Postal', 'cod_postal', 'codigo_postal', 'postal_code', 'postcode', 'zip', 'ZIP', 'CEP', 'cep', 'CP'];
    return (
        prefer.find(c => cols.includes(c)) ||
        cols.find(c => {
            const lc = c.toLowerCase();
            return lc.includes('código postal') || lc.includes('codigo postal') || lc.includes('cod_postal') || lc.includes('codigo_postal') || lc.includes('postal') || lc.includes('postcode') || lc === 'cp' || lc === 'cep';
        }) ||
        null
    );
}

export function getLeadPostal(lead: Lead, postalCol: string | null): string {
    if (!postalCol) return '';
    return String(lead[postalCol] || '').trim();
}

export function detectLatCol(leads: Lead[]): string | null {
    if (!leads.length) return null;
    const cols = Object.keys(leads[0]);
    return cols.find(c => ['Latitude', 'lat', 'Lat', 'latitude', 'LAT'].includes(c)) || null;
}

export function detectLngCol(leads: Lead[]): string | null {
    if (!leads.length) return null;
    const cols = Object.keys(leads[0]);
    return cols.find(c => ['Longitude', 'lng', 'Lng', 'longitude', 'LON', 'Long'].includes(c)) || null;
}

export function getRawCoord(lead: Lead, col: string | null): number | undefined {
    if (!col) return undefined;
    const raw = lead[col];
    if (raw === null || raw === undefined) return undefined;
    const str = String(raw).trim();
    if (!str) return undefined;
    const m = str.match(/-?\d+(?:[.,]\d+)?/);
    if (!m) return undefined;
    const val = Number(m[0].replace(',', '.'));
    return Number.isFinite(val) ? val : undefined;
}
