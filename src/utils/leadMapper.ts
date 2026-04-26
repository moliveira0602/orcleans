import type { Lead } from '../types';

/**
 * FIXED column definitions for the Leads table.
 * These columns are ALWAYS shown in Portuguese, in this exact order.
 * The imported Excel data ADAPTS to these columns — never the other way around.
 */
export const LEAD_COLUMNS = [
    { key: 'nome',       label: 'Nome',        width: 220, always: true },
    { key: 'segmento',   label: 'Segmento',    width: 150 },
    { key: 'avaliacao',  label: 'Avaliação',   width: 90 },
    { key: 'reviews',    label: 'Reviews',     width: 90 },
    { key: 'preco',      label: 'Preço',       width: 100 },
    { key: 'status',     label: 'Status',      width: 100 },
    { key: 'horario',    label: 'Horário',     width: 130 },
    { key: 'endereco',   label: 'Endereço',    width: 200 },
    { key: 'cidade',     label: 'Cidade',      width: 130 },
    { key: 'telefone',   label: 'Telefone',    width: 130 },
    { key: 'website',    label: 'Website',     width: 150 },
    { key: 'email',      label: 'E-mail',      width: 180 },
    { key: 'servicos',   label: 'Serviços',    width: 180 },
    { key: 'linkOrigem', label: 'Origem',      width: 80  },
    { key: '_score',     label: 'Score',       width: 80,  always: true },
    { key: '_pipeline',  label: 'Pipeline',    width: 110, always: true },
] as const;

/**
 * Detect the source type of an Excel export based on column names.
 */
export function detectSourceType(columns: string[]): 'google_maps' | 'linkedin' | 'generic' {
    const gmCols = ['hfpxzc href', 'qBF1Pd', 'MW4etd', 'UY7F9', 'AJB7ye'];
    if (columns.filter(c => gmCols.includes(c)).length >= 4) return 'google_maps';
    const liCols = ['First Name', 'Last Name', 'Company', 'Position', 'LinkedIn URL'];
    if (columns.filter(c => liCols.includes(c)).length >= 3) return 'linkedin';
    return 'generic';
}

/**
 * Smart auto-mapper that detects the Excel source and maps to canonical Lead fields.
 */
export function mapRowToLead(
    row: Record<string, any>,
    sourceType: 'google_maps' | 'linkedin' | 'generic',
    originalColumns: string[]
): Omit<Lead, 'id' | '_score' | '_pipeline' | '_importedAt'> {
    
    if (sourceType === 'google_maps') {
        const get = (key: string) => {
            const val = row[key];
            return (!val || val === '·' || val === '⋅') ? '' : String(val).trim();
        };
        
        // Debug: Log all columns and values for this row
        console.log('[ORCA] Google Maps row columns:', Object.keys(row));
        console.log('[ORCA] Google Maps row values:', row);
        
        // Get all non-empty values from the row for pattern matching
        const allValues = Object.values(row).filter(v => v !== null && v !== undefined && v !== '' && v !== '·' && v !== 'null');
        
        // Find column indices dynamically by looking at the first row's structure
        const keys = Object.keys(row);
        
        // Try to find the category/segment column - usually after the name
        let categoriaKey = '';
        for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            const val = String(row[key] || '');
            // Category is usually a text that looks like a business type
            if (val && val !== '·' && val.length > 2 && val.length < 100 && 
                !val.match(/^https?:\/\//) && !val.match(/^\+?\d/) && 
                !val.match(/^\d+,\d+$/) && !val.match(/^\d+$/)) {
                // Check if it's a common category pattern
                const lowerVal = val.toLowerCase();
                if (['restaurante', 'restaurante', 'clínica', 'clinica', 'loja', 'shop', 'serviço', 'servico', 
                     'hotel', 'bar', 'café', 'cafe', 'mercado', 'farmácia', 'farmacia', 'academia', 
                     'salão', 'salao', 'oficina', 'consultório', 'consultorio'].some(c => lowerVal.includes(c))) {
                    categoriaKey = key;
                    break;
                }
            }
        }
        
        // Fallback: try known Google Maps column keys for category
        if (!categoriaKey) {
            categoriaKey = keys.find(k => k.startsWith('W4Efsd') && k !== 'W4Efsd href') || '';
        }
        
        // Try to find services - usually labeled with 'ah5Ghc'
        const serviceKeys = keys.filter(k => k.includes('ah5Ghc'));
        const services = serviceKeys.map(k => get(k)).filter(v => v && v !== '·' && v.length > 2);
        
        // Try to find address parts - usually W4Efsd columns after category
        const addressKeys = keys.filter(k => k.startsWith('W4Efsd'));
        const addressParts: string[] = [];
        for (const key of addressKeys) {
            const val = get(key);
            // Address parts are usually street addresses, cities, etc.
            if (val && val !== '·' && val.length > 5 && !val.match(/^\d+$/) && 
                !val.match(/^https?:\/\//) && !val.match(/^\+?\d/)) {
                // Skip if it looks like a category (short text) or already used
                if (val.length > 15 || addressParts.length > 0) {
                    addressParts.push(val);
                }
            }
        }
        
        const reviewRaw = get('UY7F9').replace(/[()]/g, '');
        
        // Extract website - look for URL patterns in any column (excluding Google Maps URLs and images)
        let website = '';
        for (const val of allValues) {
            const strVal = String(val).trim();
            // Must be a valid URL
            if (!strVal.match(/^https?:\/\/.+/i)) continue;
            
            // Skip Google Maps URLs
            if (strVal.includes('maps.google') || 
                strVal.includes('google.com/maps') ||
                strVal.includes('/maps/place') ||
                strVal.includes('maps.gstatic') ||
                strVal.includes('maps.googleusercontent') ||
                strVal.includes('staticmap')) {
                continue;
            }
            
            // Skip image URLs
            if (strVal.match(/\.(jpg|jpeg|png|gif|svg|webp|bmp|ico)(\?.*)?$/i) ||
                strVal.includes('/photos/') ||
                strVal.includes('/photo/') ||
                strVal.includes('lh3.google') ||
                strVal.includes('lh4.google') ||
                strVal.includes('lh5.google') ||
                strVal.includes('lh6.google')) {
                continue;
            }
            
            // Skip data URLs and tracking URLs
            if (strVal.startsWith('data:') || 
                strVal.includes('googleadservices') ||
                strVal.includes('google-analytics') ||
                strVal.includes('doubleclick')) {
                continue;
            }
            
            // This looks like a real website URL
            website = strVal;
            break;
        }
        
        // If no website found in values, try to extract from order URL (A1zNzb href) if it's a website
        if (!website) {
            const orderUrl = get('A1zNzb href');
            if (orderUrl && 
                orderUrl.match(/^https?:\/\/.+/i) &&
                !orderUrl.includes('maps.google') &&
                !orderUrl.includes('google.com/maps') &&
                !orderUrl.match(/\.(jpg|jpeg|png|gif|svg|webp)$/i)) {
                website = orderUrl;
            }
        }
        
        // Extract phone - look for phone patterns in any column
        let telefone = '';
        for (const val of allValues) {
            const strVal = String(val).trim();
            // Skip if it looks like a rating, price, or other numeric data
            if (!isNaN(parseFloat(strVal)) || strVal.match(/^[\d,]+€?$/)) continue;
            
            // Match phone number patterns (various formats - PT, BR, US, etc.)
            const phonePatterns = [
                /^\+\d[\d\s\-\(\)]{7,}$/,           // +XX XXX XXX XXX
                /^[\(]?\d{2}[\)]?[\s\-]?9?\d{4}[\s\-]?\d{4}$/,  // (XX) XXXXX-XXXX
                /^\d{8,}$/                            // XXXXXXXX
            ];
            
            if (phonePatterns.some(p => p.test(strVal.replace(/\s/g, '')))) {
                const digits = strVal.replace(/\D/g, '');
                // Exclude if it looks like a zip code, rating, or too long/short
                if (digits.length >= 8 && digits.length <= 15 && !strVal.match(/^\d{5}\-?\d{3}$/)) {
                    telefone = strVal;
                    break;
                }
            }
        }
        
        // Extract email - look for email patterns in any column
        let email = '';
        for (const val of allValues) {
            const strVal = String(val).trim();
            // Match standard email pattern
            if (strVal.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
                email = strVal;
                break;
            }
        }
        
        // Parse avaliacao and reviews - CRITICAL: never default or estimate
        // Google Maps exports rating as integer (e.g., 40 = 4.0, 47 = 4.7, 50 = 5.0)
        let avaliacao: number | null = null;
        const ratingRaw = get('MW4etd');
        if (ratingRaw && ratingRaw !== '') {
            const ratingNum = parseFloat(String(ratingRaw));
            if (!isNaN(ratingNum)) {
                // If rating is > 5, assume it's scaled by 10 (e.g., 40 -> 4.0)
                if (ratingNum > 5 && ratingNum <= 50) {
                    avaliacao = Math.round(ratingNum / 10 * 10) / 10;
                } else if (ratingNum >= 0 && ratingNum <= 5) {
                    avaliacao = ratingNum;
                } else {
                    console.warn('[ORCA] avaliacao fora do range esperado:', ratingRaw, '→ lead:', get('qBF1Pd'));
                }
            } else {
                console.warn('[ORCA] avaliacao não parseada:', ratingRaw, '→ lead:', get('qBF1Pd'));
            }
        }
        
        // Google Maps exports reviews as negative numbers (encoding unknown)
        // We'll store the absolute value as a fallback, but mark as null if clearly invalid
        let reviews: number | null = null;
        if (reviewRaw && reviewRaw !== '') {
            const reviewsNum = parseInt(String(reviewRaw));
            if (!isNaN(reviewsNum)) {
                // If negative, take absolute value (Google Maps encoding)
                const absReviews = Math.abs(reviewsNum);
                // Sanity check: if it's a reasonable review count (< 100000)
                if (absReviews >= 0 && absReviews < 100000) {
                    reviews = absReviews;
                } else {
                    console.warn('[ORCA] reviews valor suspeito:', reviewRaw, '→ lead:', get('qBF1Pd'));
                }
            } else {
                console.warn('[ORCA] reviews não parseada:', reviewRaw, '→ lead:', get('qBF1Pd'));
            }
        }

        // Extract segmento from dynamic key or fallback
        const segmento = categoriaKey ? get(categoriaKey) : '';
        
        // Try to find horario (opening hours) - look for time patterns
        let horario = '';
        const horarioKeys = keys.filter(k => k.startsWith('W4Efsd'));
        for (const key of horarioKeys) {
            const val = get(key);
            // Opening hours usually contain time patterns like "09:00", "18:00", or days like "Seg"
            if (val && val.match(/(\d{1,2}:\d{2}|Seg|Ter|Qua|Qui|Sex|Sab|Dom|Mon|Tue|Wed|Thu|Fri|Sat|Sun)/i)) {
                horario = val.replace('⋅', '').trim();
                break;
            }
        }
        
        // Try to find status (open/closed) - look for "Aberto", "Fechado", etc.
        let status = '';
        const statusKeys = keys.filter(k => k.startsWith('W4Efsd'));
        for (const key of statusKeys) {
            const val = get(key);
            const lowerVal = val.toLowerCase();
            if (lowerVal.includes('aberto') || lowerVal.includes('fechado') || 
                lowerVal.includes('open') || lowerVal.includes('closed') ||
                lowerVal.includes('ativo') || lowerVal.includes('inativo')) {
                status = val;
                break;
            }
        }
        
        // Try to find price range - look for € or $ patterns
        let preco = '';
        const priceKeys = keys.filter(k => k.includes('AJB7ye'));
        for (const key of priceKeys) {
            const val = get(key);
            if (val && (val.includes('€') || val.includes('$') || val.includes('R$') || 
                val.match(/^[€$R]{1,3}$/) || val.match(/^\d+[,\.]\d+[€$]/i))) {
                preco = val.replace(/\u00a0/g, ' ');
                break;
            }
        }
        
        // If no price found in known columns, search all values
        if (!preco) {
            for (const val of allValues) {
                const strVal = String(val).trim();
                if (strVal.match(/^[€$]{1,3}$/) || strVal.match(/^\d+[,\.]?\d*[€$]/i) || 
                    strVal.match(/^[R$]{2}/)) {
                    preco = strVal;
                    break;
                }
            }
        }

        return {
            nome:        get('qBF1Pd'),
            segmento:    segmento,
            avaliacao,
            reviews,
            preco:       preco,
            endereco:    addressParts.join(', '),
            cidade:      '',
            status:      status,
            horario:     horario,
            foto:        get('FQ2IWe src'),
            linkOrigem:  get('hfpxzc href'),
            linkPedido:  get('A1zNzb href'),
            servicos:    services,
            telefone,
            website,
            email,
            observacoes: '',
            _raw:        row,
        };
    }

    if (sourceType === 'linkedin') {
        const get = (key: string) => String(row[key] || '').trim();
        return {
            nome:        [get('First Name'), get('Last Name')].filter(Boolean).join(' '),
            segmento:    get('Position'),
            avaliacao:   null,
            reviews:     null,
            preco:       '',
            endereco:    get('Location'),
            cidade:      get('City'),
            status:      'Ativo',
            horario:     '',
            telefone:    get('Phone') || get('Mobile'),
            website:     get('Website') || get('Company Website'),
            email:       get('Email') || get('Email Address'),
            servicos:    [],
            foto:        '',
            linkOrigem:  get('LinkedIn URL'),
            linkPedido:  '',
            observacoes: '',
            _raw:        row,
        };
    }

    // GENERIC: use fuzzy matching on column names
    const fuzzy = (candidates: string[]) => {
        const found = originalColumns.find(col =>
            candidates.some(c => col.toLowerCase().includes(c.toLowerCase()))
        );
        return found ? String(row[found] || '').trim() : '';
    };

    // Find multiple values for services (look for columns with numbers suffixes)
    const findMultiple = (baseCandidates: string[], maxCount: number = 5): string[] => {
        const results: string[] = [];
        for (let i = 1; i <= maxCount; i++) {
            for (const candidate of baseCandidates) {
                const key = originalColumns.find(col => 
                    col.toLowerCase() === `${candidate.toLowerCase()} ${i}` ||
                    col.toLowerCase() === `${candidate.toLowerCase()}${i}`
                );
                if (key) {
                    const val = String(row[key] || '').trim();
                    if (val && val !== '·') {
                        results.push(val);
                        break;
                    }
                }
            }
        }
        return results;
    };

    // Parse numeric fields - CRITICAL: never default or estimate
    let avaliacao: number | null = null;
    const ratingRaw = fuzzy(['avaliacao', 'rating', 'nota', 'score', 'estrela']);
    if (ratingRaw && ratingRaw !== '') {
        const parsed = parseFloat(ratingRaw.replace(',', '.'));
        if (!isNaN(parsed)) {
            avaliacao = parsed;
        }
    }
    
    let reviews: number | null = null;
    const reviewsRaw = fuzzy(['reviews', 'avaliacoes', 'feedbacks', 'comments', 'num_reviews']);
    if (reviewsRaw && reviewsRaw !== '') {
        const parsed = parseInt(reviewsRaw);
        if (!isNaN(parsed)) {
            reviews = parsed;
        }
    }

    return {
        nome:        fuzzy(['nome', 'name', 'empresa', 'company', 'razao', 'cliente']),
        segmento:    fuzzy(['categoria', 'category', 'segmento', 'segment', 'tipo', 'type', 'setor']),
        avaliacao,
        reviews,
        preco:       fuzzy(['preco', 'price', 'valor', 'ticket', 'faixa', 'price_range']),
        endereco:    fuzzy(['endereco', 'address', 'localizacao', 'location', 'morada']),
        cidade:      fuzzy(['cidade', 'city', 'localidade', 'municipio', 'concelho']),
        telefone:    fuzzy(['telefone', 'phone', 'celular', 'mobile', 'whatsapp', 'tel', 'telephone']),
        email:       fuzzy(['email', 'e-mail', 'mail', 'contato', 'email_address']),
        website:     fuzzy(['website', 'site', 'url', 'www', 'link', 'web']),
        status:      fuzzy(['status', 'situacao', 'estado', 'ativo', 'open_status']),
        servicos:    findMultiple(['servico', 'serviço', 'service', 'servicos', 'services']),
        linkOrigem:  fuzzy(['linkedin', 'maps', 'origem', 'source', 'url', 'link', 'source_url']),
        horario:     fuzzy(['horario', 'hours', 'opening_hours', 'horas', 'funcionamento', 'aberto']),
        foto:        fuzzy(['foto', 'photo', 'image', 'imagem', 'picture', 'thumbnail']),
        linkPedido:  fuzzy(['pedido', 'order', 'booking', 'reserva', 'agendamento']),
        observacoes: fuzzy(['observacao', 'notes', 'nota', 'comentario', 'obs', 'description', 'descricao']),
        _raw:        row,
    };
}