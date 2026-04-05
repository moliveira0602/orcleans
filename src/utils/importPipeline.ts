/**
 * ORCA Lens - Import Pipeline
 * 
 * Modular pipeline for importing leads from CSV/XLSX files.
 * Steps: Parse → Normalize → Validate → Deduplicate → Import
 */

import type { Lead } from '../types';

// ============================================================================
// TYPES
// ============================================================================

export interface ImportField {
    key: string;
    label: string;
    required: boolean;
    type: 'text' | 'phone' | 'url' | 'number' | 'email';
}

export interface ImportColumnMapping {
    [leadField: string]: string; // leadField -> sourceColumn
}

export interface ImportValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
}

export interface ImportRowResult {
    lead: Partial<Lead>;
    valid: boolean;
    errors: string[];
    warnings: string[];
}

export interface ImportSummary {
    totalRows: number;
    validRows: number;
    invalidRows: number;
    duplicateRows: number;
    importedRows: number;
    errors: Array<{ row: number; errors: string[] }>;
    duplicates: Array<{ row: number; matchedRow: number; reason: string }>;
}

// ============================================================================
// FIELD DEFINITIONS
// ============================================================================

export const IMPORT_FIELDS: ImportField[] = [
    { key: 'nome', label: 'Nome', required: true, type: 'text' },
    { key: 'segmento', label: 'Segmento', required: false, type: 'text' },
    { key: 'telefone', label: 'Telefone', required: false, type: 'phone' },
    { key: 'website', label: 'Website', required: false, type: 'url' },
    { key: 'email', label: 'E-mail', required: false, type: 'email' },
    { key: 'endereco', label: 'Endereço', required: false, type: 'text' },
    { key: 'cidade', label: 'Cidade', required: false, type: 'text' },
    { key: 'distrito_estado', label: 'Distrito/Estado', required: false, type: 'text' },
    { key: 'codigo_postal', label: 'Código Postal', required: false, type: 'text' },
    { key: 'pais', label: 'País', required: false, type: 'text' },
    { key: 'avaliacao', label: 'Avaliação (Rating)', required: false, type: 'number' },
    { key: 'reviews', label: 'Número de Reviews', required: false, type: 'number' },
    { key: 'linkOrigem', label: 'URL de Origem', required: false, type: 'url' },
    { key: 'observacoes', label: 'Observações', required: false, type: 'text' },
];

// ============================================================================
// STEP 1: PARSER (already handled by XLSX library, this is for mapping)
// ============================================================================

export function getAvailableColumns(data: Record<string, unknown>[]): string[] {
    if (!data.length) return [];
    return Object.keys(data[0]);
}

// ============================================================================
// STEP 2: NORMALIZER
// ============================================================================

export function normalizePhone(phone: string): string {
    if (!phone) return '';
    // Remove all non-digit characters except +
    let cleaned = phone.replace(/[^\d+]/g, '');
    // Remove leading zeros after +
    cleaned = cleaned.replace(/^\+0+/, '+');
    // Ensure + prefix if starts with country code pattern
    if (cleaned.length > 10 && !cleaned.startsWith('+')) {
        cleaned = '+' + cleaned;
    }
    return cleaned;
}

export function normalizeWebsite(website: string): string {
    if (!website) return '';
    let url = website.trim();
    // Add https if no protocol
    if (!url.match(/^https?:\/\//i)) {
        url = 'https://' + url;
    }
    // Remove trailing slashes
    url = url.replace(/\/+$/, '');
    return url;
}

export function normalizeEmail(email: string): string {
    if (!email) return '';
    return email.trim().toLowerCase();
}

export function normalizeNumber(value: string | number): number | null {
    if (typeof value === 'number') {
        return isNaN(value) ? null : value;
    }
    if (!value) return null;
    const num = parseFloat(String(value).replace(',', '.'));
    return isNaN(num) ? null : num;
}

export function normalizeText(text: string): string {
    if (!text) return '';
    // Remove extra whitespace, tabs, newlines
    return text.trim().replace(/\s+/g, ' ');
}

export function normalizeRow(
    row: Record<string, unknown>,
    mapping: ImportColumnMapping
): Partial<Lead> {
    const normalized: Partial<Lead> = {};

    for (const [fieldKey, sourceColumn] of Object.entries(mapping)) {
        const rawValue = row[sourceColumn];
        if (rawValue === undefined || rawValue === null || rawValue === '') continue;

        const value = String(rawValue).trim();
        const field = IMPORT_FIELDS.find(f => f.key === fieldKey);

        switch (field?.type) {
            case 'phone':
                normalized[fieldKey as keyof Lead] = normalizePhone(value) as never;
                break;
            case 'url':
                normalized[fieldKey as keyof Lead] = normalizeWebsite(value) as never;
                break;
            case 'email':
                normalized[fieldKey as keyof Lead] = normalizeEmail(value) as never;
                break;
            case 'number':
                normalized[fieldKey as keyof Lead] = normalizeNumber(value) as never;
                break;
            default:
                normalized[fieldKey as keyof Lead] = normalizeText(value) as never;
        }
    }

    return normalized;
}

// ============================================================================
// STEP 3: VALIDATOR
// ============================================================================

export function validateRow(
    normalized: Partial<Lead>,
    _rowNumber: number
): ImportRowResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required field: nome
    if (!normalized.nome || !normalized.nome.trim()) {
        errors.push('Nome é obrigatório');
    }

    // Validate email format if present
    if (normalized.email && !normalized.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
        errors.push('Formato de e-mail inválido');
    }

    // Validate website format if present
    if (normalized.website && !normalized.website.match(/^https?:\/\/.+\..+/i)) {
        warnings.push('Website pode não ser uma URL válida');
    }

    // Validate rating range
    if (normalized.avaliacao !== null && normalized.avaliacao !== undefined) {
        if (normalized.avaliacao < 0 || normalized.avaliacao > 5) {
            warnings.push('Avaliação fora do intervalo 0-5');
        }
    }

    // Validate reviews is positive
    if (normalized.reviews !== null && normalized.reviews !== undefined) {
        if (normalized.reviews < 0) {
            warnings.push('Número de reviews não pode ser negativo');
        }
    }

    // Check for phone or website (at least one contact method)
    if (!normalized.telefone && !normalized.website && !normalized.email) {
        warnings.push('Nenhum método de contato (telefone, website ou e-mail)');
    }

    return {
        lead: normalized,
        valid: errors.length === 0,
        errors,
        warnings,
    };
}

// ============================================================================
// STEP 4: DEDUPER
// ============================================================================

export function generateDedupeKey(lead: Partial<Lead>): string[] {
    const keys: string[] = [];

    // Priority 1: website
    if (lead.website) {
        keys.push('website:' + lead.website.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, ''));
    }

    // Priority 2: phone
    if (lead.telefone) {
        keys.push('phone:' + lead.telefone.replace(/\D/g, ''));
    }

    // Priority 3: name + address
    if (lead.nome && lead.endereco) {
        keys.push('name_addr:' + (lead.nome + lead.endereco).toLowerCase().replace(/\s+/g, ''));
    }

    return keys;
}

export function deduplicateLeads(
    leads: Array<{ lead: Partial<Lead>; rowNumber: number; valid: boolean; errors: string[]; warnings: string[] }>
): {
    unique: typeof leads;
    duplicates: Array<{ row: number; matchedRow: number; reason: string }>;
} {
    const seen = new Map<string, number>(); // key -> first row number
    const unique: typeof leads = [];
    const duplicates: Array<{ row: number; matchedRow: number; reason: string }> = [];

    for (const item of leads) {
        if (!item.valid) {
            // Don't deduplicate invalid rows, keep them for error reporting
            unique.push(item);
            continue;
        }

        const keys = generateDedupeKey(item.lead);
        let matchedRow: number | null = null;
        let matchReason = '';

        for (const key of keys) {
            if (seen.has(key)) {
                matchedRow = seen.get(key)!;
                matchReason = key.split(':')[0];
                break;
            }
        }

        if (matchedRow !== null) {
            duplicates.push({
                row: item.rowNumber,
                matchedRow,
                reason: matchReason === 'website' ? 'website' : 
                         matchReason === 'phone' ? 'telefone' : 'nome + endereço',
            });
        } else {
            // Mark this lead as seen
            for (const key of keys) {
                seen.set(key, item.rowNumber);
            }
            unique.push(item);
        }
    }

    return { unique, duplicates };
}

// ============================================================================
// STEP 5: LEAD FACTORY
// ============================================================================

export function createLeadFromImport(
    normalized: Partial<Lead>,
    importId: string,
    importFile: string,
    rowNumber: number
): Lead {
    return {
        id: 'lead_' + Date.now() + '_' + rowNumber,
        _score: 5, // Will be calculated by scoring algorithm
        _pipeline: 'novo',
        _importedAt: Date.now(),
        _importFile: importFile,
        _importDate: new Date().toISOString(),
        _importId: importId,
        nome: normalized.nome || '',
        segmento: normalized.segmento || '',
        avaliacao: normalized.avaliacao ?? null,
        reviews: normalized.reviews ?? null,
        preco: '',
        endereco: normalized.endereco || '',
        cidade: (normalized as any).cidade || '',
        distrito_estado: (normalized as any).distrito_estado || '',
        codigo_postal: (normalized as any).codigo_postal || '',
        pais: (normalized as any).pais || '',
        status: 'Aberto',
        horario: '',
        telefone: normalized.telefone || '',
        website: normalized.website || '',
        email: normalized.email || '',
        servicos: [],
        foto: '',
        linkOrigem: normalized.linkOrigem || '',
        linkPedido: '',
        observacoes: normalized.observacoes || '',
        _raw: normalized,
    };
}

// ============================================================================
// AUTO-MAPPING HELPERS
// ============================================================================

export function suggestColumnMapping(
    sourceColumns: string[]
): ImportColumnMapping {
    const mapping: ImportColumnMapping = {};

    for (const field of IMPORT_FIELDS) {
        // Try to find a matching column
        const match = findBestColumnMatch(field.key, sourceColumns);
        if (match) {
            mapping[field.key] = match;
        }
    }

    return mapping;
}

function findBestColumnMatch(fieldKey: string, columns: string[]): string | null {
    const fieldLower = fieldKey.toLowerCase();
    
    // Exact match (case insensitive)
    const exact = columns.find(c => c.toLowerCase() === fieldLower);
    if (exact) return exact;

    // Partial match
    const synonyms: Record<string, string[]> = {
        nome: ['name', 'nome', 'razao', 'empresa', 'business', 'company', 'qBF1Pd'],
        categoria: ['category', 'categoria', 'segmento', 'tipo', 'W4Efsd'],
        telefone: ['phone', 'telefone', 'tel', 'celular', 'mobile', 'whatsapp'],
        website: ['website', 'site', 'url', 'www', 'link'],
        email: ['email', 'e-mail', 'mail', 'contato'],
        endereco: ['address', 'endereco', 'morada', 'localizacao', 'W4Efsd 3'],
        cidade: ['city', 'cidade', 'localidade'],
        distrito_estado: ['state', 'distrito', 'estado', 'province'],
        codigo_postal: ['zip', 'postal', 'codigo postal', 'cep'],
        pais: ['country', 'pais', 'país'],
        avaliacao: ['rating', 'avaliacao', 'nota', 'score', 'MW4etd'],
        reviews: ['reviews', 'avaliacoes', 'comentarios', 'UY7F9'],
        linkOrigem: ['origem', 'source', 'url_origem', 'hfpxzc'],
        observacoes: ['notes', 'observacoes', 'notas', 'obs'],
    };

    const fieldSynonyms = synonyms[fieldKey] || [fieldLower];
    
    for (const synonym of fieldSynonyms) {
        const match = columns.find(c => c.toLowerCase().includes(synonym.toLowerCase()));
        if (match) return match;
    }

    return null;
}

// ============================================================================
// FULL PIPELINE
// ============================================================================

export interface PipelineResult {
    summary: ImportSummary;
    leads: Lead[];
}

export function runImportPipeline(
    data: Record<string, unknown>[],
    fileName: string,
    importId: string,
    customMapping?: ImportColumnMapping
): PipelineResult {
    const sourceColumns = getAvailableColumns(data);
    
    // Auto-detect mapping if not provided
    const mapping = customMapping || suggestColumnMapping(sourceColumns);

    const validationResults: Array<{
        lead: Partial<Lead>;
        rowNumber: number;
        valid: boolean;
        errors: string[];
        warnings: string[];
    }> = [];

    // Process each row
    for (let i = 0; i < data.length; i++) {
        const row = data[i];
        const normalized = normalizeRow(row, mapping);
        const validation = validateRow(normalized, i + 2); // +2 for 1-based + header

        validationResults.push({
            ...validation,
            rowNumber: i + 2,
        });
    }

    // Deduplicate
    const { unique, duplicates } = deduplicateLeads(validationResults);

    // Create leads from valid, unique rows
    const leads: Lead[] = [];
    const errors: Array<{ row: number; errors: string[] }> = [];

    for (const item of unique) {
        if (item.valid) {
            const lead = createLeadFromImport(item.lead, importId, fileName, item.rowNumber);
            leads.push(lead);
        } else {
            errors.push({ row: item.rowNumber, errors: item.errors });
        }
    }

    const summary: ImportSummary = {
        totalRows: data.length,
        validRows: leads.length,
        invalidRows: errors.length,
        duplicateRows: duplicates.length,
        importedRows: leads.length,
        errors,
        duplicates,
    };

    return { summary, leads };
}