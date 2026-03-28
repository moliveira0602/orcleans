import type { Lead } from '../types';

export function exportLeadsCsv(leads: Lead[]): void {
    if (!leads.length) return;
    const cols = Object.keys(leads[0]).filter((c) => !c.startsWith('_'));
    const rows = [
        ['Score', ...cols],
        ...leads.map((l) => [l._score, ...cols.map((c) => l[c] || '')]),
    ];
    const csv = rows
        .map((r) =>
            r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',')
        )
        .join('\n');
    const blob = new Blob(['\ufeff' + csv], {
        type: 'text/csv;charset=utf-8',
    });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download =
        'orcalens_leads_' +
        new Date().toISOString().slice(0, 10) +
        '.csv';
    a.click();
}
