/**
 * ORCA Lens - Nominatim (OpenStreetMap) API
 * 
 * API gratuita do OpenStreetMap para busca de estabelecimentos.
 * Totalmente grátis, sem necessidade de API key.
 * 
 * Limitações:
 * - 1 requisição por segundo
 * - Dados menos completos que Google Places
 * - Sem ratings/reviews
 * 
 * Uso: Ideal para MVP e testes sem custo.
 */

import type { Lead } from '../types';

export interface NominatimPlace {
    place_id: number;
    osm_type: string;
    osm_id: number;
    lat: string;
    lon: string;
    display_name: string;
    class: string;
    type: string;
    importance: number;
    icon?: string;
    address?: Record<string, string>;
    name?: string;
    extratags?: Record<string, string>;
}

export interface NominatimSearchRequest {
    query: string;
    limit?: number;
    countrycodes?: string; // ex: 'pt'
}

export interface NominatimResult {
    name: string;
    displayName: string;
    lat: number;
    lon: number;
    type: string;
    class: string;
    address: {
        road?: string;
        house_number?: string;
        suburb?: string;
        city?: string;
        town?: string;
        village?: string;
        state?: string;
        postcode?: string;
        country?: string;
        country_code?: string;
    };
    website?: string;
    phone?: string;
    email?: string;
    openingHours?: string;
    placeId: string;
    extratags?: Record<string, string>;
}

// ============================================================================
// SEARCH
// ============================================================================

export async function searchNominatim(
    request: NominatimSearchRequest
): Promise<NominatimResult[]> {
    const { query, limit = 50, countrycodes = 'pt' } = request;

    console.log('[Nominatim] Searching:', query, 'limit:', limit, 'country:', countrycodes);

    // Nominatim requires User-Agent
    const headers = {
        'Accept': 'application/json',
        'User-Agent': 'ORCALens/1.0 (contact@orcalens.com)',
    };

    const url = `https://nominatim.openstreetmap.org/search?${new URLSearchParams({
        q: query,
        format: 'json',
        limit: String(limit),
        countrycodes,
        addressdetails: '1',
        extratags: '1',
    })}`;

    console.log('[Nominatim] URL:', url);

    // Rate limiting: wait 1 second between requests
    await delay(1000);

    const response = await fetch(url, { headers });
    
    if (!response.ok) {
        const errorText = await response.text();
        console.error('[Nominatim] Error:', response.status, errorText);
        throw new Error(`Nominatim error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data: NominatimPlace[] = await response.json();
    console.log('[Nominatim] Results:', data.length, 'for query:', query);

    const results = data
        .filter(place => {
            // More permissive filter - include any place with a name
            const hasName = !!place.name || !!place.address?.amenity || !!place.address?.name;
            
            // Include businesses and points of interest
            const isBusiness = place.class === 'amenity' || 
                              place.class === 'shop' || 
                              place.class === 'tourism' ||
                              place.class === 'healthcare' ||
                              place.class === 'office' ||
                              place.class === 'leisure' ||
                              place.class === 'craft' ||
                              place.class === 'building';
            
            // If no name, only include if it's clearly a business
            if (!hasName && !isBusiness) return false;
            
            return true;
        })
        .map(place => nominatimToResult(place));
    
    console.log('[Nominatim] Filtered results:', results.length);
    return results;
}

// ============================================================================
// CONVERTER
// ============================================================================

function nominatimToResult(place: NominatimPlace): NominatimResult {
    const name = place.name || place.address?.amenity || place.address?.name || 'Unknown';
    
    // Extract contact info from extratags
    const extratags = place.extratags || {};
    
    // Try to extract email from various sources
    const email = extratags.email || extratags['contact:email'] || '';
    
    return {
        name,
        displayName: place.display_name,
        lat: parseFloat(place.lat),
        lon: parseFloat(place.lon),
        type: place.type,
        class: place.class,
        address: {
            road: place.address?.road,
            house_number: place.address?.house_number,
            suburb: place.address?.suburb,
            city: place.address?.city || place.address?.town || place.address?.village,
            state: place.address?.state,
            postcode: place.address?.postcode,
            country: place.address?.country,
            country_code: place.address?.country_code,
        },
        website: extratags.website || extratags['contact:website'] || '',
        phone: extratags.phone || extratags['contact:phone'] || '',
        email: email,
        openingHours: extratags.opening_hours,
        placeId: `nominatim_${place.place_id}`,
        extratags: extratags,
    };
}

// ============================================================================
// CONVERT TO LEAD
// ============================================================================

export function nominatimToLead(
    result: NominatimResult,
    segment: string,
    city: string,
    _importId: string
): Partial<Lead> {
    const address = result.address;
    const fullAddress = [
        address.road,
        address.house_number,
        address.suburb,
        address.city,
        address.postcode,
        address.country,
    ].filter(Boolean).join(', ');

    // Extract additional info from extratags
    const extratags = result.extratags || {};
    
    // Try to extract services from category/type
    const services: string[] = [];
    if (result.type) services.push(result.type);
    if (result.class) services.push(result.class);
    
    // Extract additional contact info
    const email = result.email || extratags.email || extratags['contact:email'] || '';
    const phone = result.phone || extratags.phone || extratags['contact:phone'] || '';
    const website = result.website || extratags.website || extratags['contact:website'] || '';
    
    // Try to generate email from website if not available
    let finalEmail = email;
    if (!finalEmail && website) {
        try {
            const url = new URL(website.startsWith('http') ? website : `https://${website}`);
            const domain = url.hostname.replace('www.', '');
            finalEmail = `contato@${domain}`;
        } catch {
            // If URL parsing fails, try simple string manipulation
            const domain = website.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
            if (domain) {
                finalEmail = `contato@${domain}`;
            }
        }
    }
    
    // Extract opening hours
    const openingHours = result.openingHours || extratags.opening_hours || '';
    
    // Generate a contact link based on available data
    let linkPedido = '';
    if (website) {
        linkPedido = website;
    } else if (phone) {
        // Create WhatsApp link if phone is available
        const cleanPhone = phone.replace(/\D/g, '');
        if (cleanPhone.length >= 9) {
            linkPedido = `https://wa.me/${cleanPhone}`;
        }
    }

    return {
        nome: result.name,
        segmento: segment,
        endereco: fullAddress,
        cidade: address.city || city,
        distrito_estado: address.state,
        codigo_postal: address.postcode,
        pais: address.country,
        telefone: phone,
        website: website,
        email: finalEmail,
        servicos: services,
        horario: openingHours,
        observacoes: openingHours ? `Horário: ${openingHours}` : '',
        linkOrigem: `https://www.openstreetmap.org/?mlat=${result.lat}&mlon=${result.lon}#map=17/${result.lat}/${result.lon}`,
        linkPedido: linkPedido,
        status: 'Aberto',
        preco: '',
        foto: '',
        // No rating/reviews from Nominatim
        avaliacao: null,
        reviews: null,
        // Metadata
        _raw: result,
    };
}

// ============================================================================
// UTILS
// ============================================================================

function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// BATCH SEARCH (for better coverage)
// ============================================================================

export async function searchNominatimBatch(
    queries: string[],
    options?: { limit?: number; countrycodes?: string }
): Promise<NominatimResult[]> {
    const allResults: NominatimResult[] = [];
    const seen = new Set<string>();

    for (const query of queries) {
        try {
            const results = await searchNominatim({
                query,
                limit: options?.limit || 20,
                countrycodes: options?.countrycodes,
            });

            for (const result of results) {
                if (!seen.has(result.placeId)) {
                    allResults.push(result);
                    seen.add(result.placeId);
                }
            }
        } catch (err) {
            console.error('[Nominatim] Error searching:', query, err);
        }
    }

    return allResults;
}

// ============================================================================
// PRESET QUERIES FOR COMMON SEGMENTS
// ============================================================================

export function getNominatimQueries(segment: string, city: string): string[] {
    const segmentLower = segment.toLowerCase();
    
    // Map common segments to Portuguese and English search terms
    // Nominatim works best with simple text queries
    const queryMap: Record<string, string[]> = {
        'clínica médica': [
            `clinic in ${city}`,
            `medical clinic ${city}`,
            `clínica médica ${city}`,
            `clínica ${city}`,
            `consultório médico ${city}`,
            `doctor ${city}`,
            `healthcare ${city}`,
        ],
        'restaurante': [
            `restaurant in ${city}`,
            `restaurante em ${city}`,
            `restaurante ${city}`,
            `café ${city}`,
            `comida ${city}`,
            `dining ${city}`,
        ],
        'pet shop': [
            `pet shop in ${city}`,
            `pet store ${city}`,
            `loja de animais ${city}`,
            `veterinário ${city}`,
            `veterinary ${city}`,
            `pet ${city}`,
        ],
        'academia': [
            `gym in ${city}`,
            `fitness center ${city}`,
            `academia ${city}`,
            `ginásio ${city}`,
            `fitness ${city}`,
            `sports center ${city}`,
        ],
        'loja': [
            `shop in ${city}`,
            `store ${city}`,
            `loja ${city}`,
            `shopping ${city}`,
            `retail ${city}`,
        ],
        'café': [
            `cafe in ${city}`,
            `café ${city}`,
            `coffee shop ${city}`,
            `cafetaria ${city}`,
            `coffee ${city}`,
        ],
        'hotel': [
            `hotel in ${city}`,
            `hotel ${city}`,
            `hospedagem ${city}`,
            `pousada ${city}`,
            `guest house ${city}`,
            `accommodation ${city}`,
        ],
        'farmácia': [
            `pharmacy in ${city}`,
            `farmácia ${city}`,
            `drogaria ${city}`,
            `chemist ${city}`,
            `drugstore ${city}`,
        ],
        'supermercado': [
            `supermarket in ${city}`,
            `supermercado ${city}`,
            `grocery ${city}`,
            `mercado ${city}`,
            `food store ${city}`,
        ],
        'escola': [
            `school in ${city}`,
            `escola ${city}`,
            `colégio ${city}`,
            `education ${city}`,
            `college ${city}`,
        ],
        'salão de beleza': [
            `hairdresser in ${city}`,
            `beauty salon ${city}`,
            `salão de beleza ${city}`,
            `cabeleireiro ${city}`,
            `barbearia ${city}`,
            `barber ${city}`,
        ],
        'oficina': [
            `car repair in ${city}`,
            `auto repair ${city}`,
            `oficina ${city}`,
            `mecânico ${city}`,
            `garage ${city}`,
            `workshop ${city}`,
        ],
    };

    // Return mapped queries or fall back to generic search
    if (queryMap[segmentLower]) {
        return queryMap[segmentLower];
    }
    
    // Generic fallback - try multiple formats
    return [
        `${segment} in ${city}`,
        `${segment} ${city}`,
        `${segmentLower} ${city}`,
    ];
}
