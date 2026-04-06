/**
 * Data Sanitizer - Normalizes and formats imported data for ORCA platform
 * Handles encoding issues, text normalization, and data standardization
 */

/**
 * Fix common encoding issues in strings (e.g., UTF-8 misinterpreted as Latin-1)
 * Example: "CÃ£ovÃ£o" → "Cãovão"
 */
export function fixEncoding(str: string): string {
    if (!str || typeof str !== 'string') return '';
    
    // Common UTF-8 mojibake patterns - using array of tuples to avoid duplicate keys
    const encodingPairs: Array<[string, string]> = [
        ['Ã£', 'ã'], ['Ã¡', 'á'], ['Ã©', 'é'], ['Ã­', 'í'], ['Ã³', 'ó'], ['Ãº', 'ú'],
        ['Ã€', 'À'], ['Ã‚', 'Â'], ['Ã‡', 'Ç'], ['ÃŠ', 'Ê'], ['Ã•', 'Õ'],
        ['â€', '\''], ['â€™', '\''], ['â€œ', '"'], ['â€', '"'],
    ];
    
    let result = str;
    for (const [broken, fixed] of encodingPairs) {
        result = result.replace(new RegExp(broken.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), fixed);
    }
    
    // Try to normalize using TextDecoder if still looks broken
    if (result.match(/[ÃÂ]/)) {
        try {
            // Attempt to decode as if it was double-encoded
            const bytes = new TextEncoder().encode(result);
            const decoded = new TextDecoder('utf-8').decode(bytes);
            if (decoded !== result) {
                result = decoded;
            }
        } catch {
            // Fallback to manual normalization
        }
    }
    
    return result;
}

/**
 * Remove invalid characters and clean up strings
 */
export function removeInvalidChars(str: string): string {
    if (!str || typeof str !== 'string') return '';
    
    // Remove control characters except newlines and tabs
    return str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '').trim();
}

/**
 * Apply Title Case capitalization to names
 */
export function toTitleCase(str: string): string {
    if (!str || typeof str !== 'string') return '';
    
    const smallWords = ['de', 'da', 'do', 'das', 'dos', 'e', 'em', 'com', 'para', 'por', 'a', 'o', 'as', 'os', 'um', 'uma', 'uns', 'umas'];
    
    return str
        .toLowerCase()
        .split(/\s+/)
        .map((word, index) => {
            // Always capitalize first and last word
            if (index === 0 || index === str.split(/\s+/).length - 1) {
                return word.charAt(0).toUpperCase() + word.slice(1);
            }
            // Don't capitalize small words unless they're proper nouns
            if (smallWords.includes(word)) {
                return word;
            }
            return word.charAt(0).toUpperCase() + word.slice(1);
        })
        .join(' ');
}

/**
 * Standardize status values to boolean-like format
 */
export function standardizeStatus(status: string | number | boolean): string {
    if (!status && status !== 0) return '';
    
    const statusStr = String(status).toLowerCase().trim();
    
    const openValues = ['open', 'aberto', 'ativo', 'active', '1', 'true', 'sim', 'yes', 'aberta', 'ativa'];
    const closedValues = ['closed', 'fechado', 'inativo', 'inactive', '0', 'false', 'não', 'nao', 'no', 'fechada', 'inativa'];
    
    if (openValues.includes(statusStr)) return 'Aberto';
    if (closedValues.includes(statusStr)) return 'Fechado';
    
    // Return as-is if not recognized, but capitalize
    return statusStr.charAt(0).toUpperCase() + statusStr.slice(1);
}

/**
 * Standardize and validate rating values
 */
export function standardizeRating(rating: string | number | null | undefined): number | null {
    if (rating === null || rating === undefined || rating === '') return null;
    
    const num = parseFloat(String(rating).replace(',', '.'));
    
    if (isNaN(num)) return null;
    
    // Validate range (0-5)
    if (num < 0) return 0;
    if (num > 5) return 5;
    
    // Round to 1 decimal place
    return Math.round(num * 10) / 10;
}

/**
 * Standardize and validate review counts
 */
export function standardizeReviews(reviews: string | number | null | undefined): number | null {
    if (reviews === null || reviews === undefined || reviews === '') return null;
    
    const num = parseInt(String(reviews).replace(/[^\d]/g, ''), 10);
    
    if (isNaN(num) || num < 0) return null;
    
    return num;
}

/**
 * Truncate text with ellipsis for display
 */
export function truncateText(text: string, maxLength: number = 50): string {
    if (!text || text.length <= maxLength) return text || '';
    
    return text.slice(0, maxLength).trim() + '…';
}

/**
 * Clean and normalize a single string value
 */
export function sanitizeString(value: string | number | null | undefined, options: {
    titleCase?: boolean;
    truncate?: number;
    fixEncoding?: boolean;
} = {}): string {
    if (value === null || value === undefined || value === '') return '';
    
    let result = String(value).trim();
    
    // Fix encoding issues
    if (options.fixEncoding !== false) {
        result = fixEncoding(result);
    }
    
    // Remove invalid characters
    result = removeInvalidChars(result);
    
    // Remove extra whitespace
    result = result.replace(/\s+/g, ' ').trim();
    
    // Apply title case if requested
    if (options.titleCase) {
        result = toTitleCase(result);
    }
    
    // Truncate if requested
    if (options.truncate) {
        result = truncateText(result, options.truncate);
    }
    
    return result;
}

/**
 * Standardize category/segment names
 */
export function standardizeCategory(category: string | null | undefined): string {
    if (!category || typeof category !== 'string') return '';
    
    const normalized = sanitizeString(category, { fixEncoding: true });
    
    // Common category mappings
    const categoryMap: Record<string, string> = {
        'pet shop': 'Loja de Animais',
        'petshop': 'Loja de Animais',
        'pet': 'Loja de Animais',
        'loja de animais': 'Loja de Animais',
        'restaurante': 'Restaurante',
        'restaurante e lanchonete': 'Restaurante',
        'lanchonete': 'Lanchonete',
        'cafe': 'Café',
        'cafeteria': 'Café',
        'clinica': 'Clínica',
        'clinica médica': 'Clínica Médica',
        'clinica medica': 'Clínica Médica',
        'hospital': 'Hospital',
        'farmacia': 'Farmácia',
        'drogaria': 'Farmácia',
        'academia': 'Academia',
        'escola': 'Escola',
        'hotel': 'Hotel',
        'pousada': 'Pousada',
        'loja': 'Loja',
        'mercado': 'Mercado',
        'supermercado': 'Supermercado',
    };
    
    const lower = normalized.toLowerCase();
    
    for (const [key, value] of Object.entries(categoryMap)) {
        if (lower.includes(key)) {
            return value;
        }
    }
    
    return toTitleCase(normalized);
}

/**
 * Sanitize a complete lead record
 */
export interface SanitizedLeadData {
    nome: string;
    segmento: string;
    avaliacao: number | null;
    reviews: number | null;
    endereco: string;
    status: string;
    telefone: string;
    website: string;
    email: string;
    horario: string;
    preco: string;
    observacoes: string;
    servicos: string[];
    fotos: string[];
    linkOrigem: string;
    linkPedido: string;
    foto: string;
    _raw: Record<string, unknown>;
}

export function sanitizeLeadData(data: Record<string, unknown>): SanitizedLeadData {
    // Helper to safely get string value
    const getStr = (...keys: string[]): string => {
        for (const key of keys) {
            const val = data[key];
            if (typeof val === 'string' && val.trim()) return val;
        }
        return '';
    };
    
    // Helper to safely get number-like value
    const getNum = (...keys: string[]): string | number | null | undefined => {
        for (const key of keys) {
            const val = data[key] as string | number | null | undefined;
            if (val !== null && val !== undefined && val !== '') return val;
        }
        return null;
    };
    
    const sanitized: SanitizedLeadData = {
        nome: sanitizeString(getStr('nome', 'name', 'empresa'), { titleCase: true, truncate: 100 }),
        segmento: standardizeCategory(getStr('segmento', 'segment', 'categoria', 'category')),
        avaliacao: standardizeRating(getNum('avaliacao', 'rating', 'stars', 'nota')),
        reviews: standardizeReviews(getNum('reviews', 'avaliacoes', 'comments', 'num_reviews')),
        endereco: sanitizeString(getStr('endereco', 'address', 'localizacao'), { truncate: 80 }),
        status: standardizeStatus(getStr('status', 'situacao', 'state') || ''),
        telefone: sanitizeString(getStr('telefone', 'phone', 'tel', 'contato'), { truncate: 30 }),
        website: sanitizeString(getStr('website', 'site', 'url'), { truncate: 200 }),
        email: sanitizeString(getStr('email', 'mail'), { truncate: 100 }),
        horario: sanitizeString(getStr('horario', 'hours', 'opening_hours'), { truncate: 200 }),
        preco: sanitizeString(getStr('preco', 'price', 'valor'), { truncate: 50 }),
        observacoes: sanitizeString(getStr('observacoes', 'notes', 'obs', 'descricao'), { truncate: 500 }),
        servicos: Array.isArray(data.servicos) ? data.servicos.map(s => sanitizeString(s, { truncate: 50 })) : [],
        fotos: Array.isArray(data.fotos) ? data.fotos.filter((f): f is string => typeof f === 'string') : [],
        foto: sanitizeString(getStr('foto', 'photo'), { truncate: 500 }),
        linkOrigem: sanitizeString(getStr('linkOrigem', 'source_url', 'origem'), { truncate: 500 }),
        linkPedido: sanitizeString(getStr('linkPedido', 'order_url', 'delivery'), { truncate: 500 }),
        _raw: data,
    };
    
    return sanitized;
}

/**
 * Sanitize an array of lead records
 */
export function sanitizeImportedData(data: Record<string, unknown>[]): SanitizedLeadData[] {
    return data.map(row => sanitizeLeadData(row));
}

/**
 * Get sanitization summary for user feedback
 */
export interface SanitizationSummary {
    totalRecords: number;
    validRecords: number;
    invalidRecords: number;
    fixedEncoding: number;
    standardizedCategories: number;
    warnings: string[];
}

export function getSanitizationSummary(
    originalData: Record<string, unknown>[],
    sanitizedData: SanitizedLeadData[]
): SanitizationSummary {
    const summary: SanitizationSummary = {
        totalRecords: originalData.length,
        validRecords: 0,
        invalidRecords: 0,
        fixedEncoding: 0,
        standardizedCategories: 0,
        warnings: [],
    };
    
    sanitizedData.forEach((lead, index) => {
        // Check if record has minimum required data
        if (lead.nome || lead.endereco || lead.telefone) {
            summary.validRecords++;
        } else {
            summary.invalidRecords++;
            summary.warnings.push(`Registro ${index + 1}: Dados insuficientes`);
        }
        
        // Check for encoding fixes
        const originalRow = originalData[index];
        const originalName = String(originalRow.nome || originalRow.name || '');
        if (originalName !== lead.nome && originalName.match(/[ÃÂ]/)) {
            summary.fixedEncoding++;
        }
        
        // Check for category standardization
        const originalCategory = String(originalRow.segmento || originalRow.categoria || '');
        if (originalCategory && originalCategory !== lead.segmento) {
            summary.standardizedCategories++;
        }
    });
    
    return summary;
}