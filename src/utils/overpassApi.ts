/**
 * ORCA Lens - Overpass API
 * 
 * API do OpenStreetMap para busca de estabelecimentos por tags.
 * Usa proxy local para evitar problemas de CORS.
 */

import type { Lead } from '../types';

// ============================================================================
// TYPES
// ============================================================================

export interface OverpassNode {
    type: 'node' | 'way' | 'relation';
    id: number;
    lat?: number;
    lon?: number;
    center?: { lat: number; lon: number };
    tags?: Record<string, string>;
}

export interface OverpassResult {
    id: string;
    name: string;
    lat: number;
    lon: number;
    type: 'node' | 'way' | 'relation';
    category: string;
    tags: Record<string, string>;
    address: {
        street?: string;
        houseNumber?: string;
        city?: string;
        postcode?: string;
        country?: string;
        full?: string;
    };
}

export interface GeocodeResult {
    name: string;
    lat: number;
    lon: number;
    display_name: string;
    boundingbox?: [number, number, number, number];
}

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * Overpass API server - usa proxy local para evitar CORS
 */
const OVERPASS_SERVERS = ['/proxy/overpass/api/interpreter'];

/**
 * Default search radius in meters (for around strategy)
 */
const DEFAULT_RADIUS = 5000; // 5km

/**
 * Rate limiting delay between requests (ms)
 */
const RATE_LIMIT_DELAY = 1000;

// ============================================================================
// SEGMENT TO OSM TAGS MAPPING
// ============================================================================

const SEGMENT_TO_TAGS: Record<string, { key: string; value: string }[]> = {
    'pet shop': [
        { key: 'shop', value: 'pet' },
        { key: 'amenity', value: 'veterinary' },
    ],
    'clínica médica': [
        { key: 'amenity', value: 'clinic' },
        { key: 'healthcare', value: 'doctor' },
        { key: 'amenity', value: 'dentist' },
    ],
    'restaurante': [
        { key: 'amenity', value: 'restaurant' },
        { key: 'amenity', value: 'cafe' },
        { key: 'amenity', value: 'fast_food' },
        { key: 'amenity', value: 'pub' },
        { key: 'amenity', value: 'bar' },
    ],
    'academia': [
        { key: 'leisure', value: 'fitness_centre' },
        { key: 'leisure', value: 'sports_centre' },
        { key: 'leisure', value: 'gym' },
    ],
    'loja': [
        { key: 'shop', value: 'yes' },
        { key: 'shop', value: 'convenience' },
        { key: 'shop', value: 'general' },
    ],
    'shop': [
        { key: 'shop', value: 'yes' },
        { key: 'shop', value: 'convenience' },
        { key: 'shop', value: 'general' },
        { key: 'shop', value: 'retail' },
    ],
    'café': [
        { key: 'amenity', value: 'cafe' },
    ],
    'hotel': [
        { key: 'tourism', value: 'hotel' },
        { key: 'tourism', value: 'guest_house' },
        { key: 'tourism', value: 'motel' },
        { key: 'tourism', value: 'hostel' },
    ],
    'farmácia': [
        { key: 'amenity', value: 'pharmacy' },
    ],
    'supermercado': [
        { key: 'shop', value: 'supermarket' },
        { key: 'shop', value: 'convenience' },
    ],
    'escola': [
        { key: 'amenity', value: 'school' },
        { key: 'amenity', value: 'kindergarten' },
        { key: 'amenity', value: 'college' },
        { key: 'amenity', value: 'university' },
    ],
    'salão de beleza': [
        { key: 'shop', value: 'hairdresser' },
        { key: 'amenity', value: 'beauty_salon' },
        { key: 'shop', value: 'beauty' },
    ],
    'oficina': [
        { key: 'shop', value: 'car_repair' },
        { key: 'amenity', value: 'car_repair' },
    ],
};

// ============================================================================
// NOMINATIM GEOCODING
// ============================================================================

export async function geocodePlace(place: string): Promise<GeocodeResult | null> {
    const startTime = Date.now();
    console.log('[Overpass] Geocoding place:', place);
    
    const headers = {
        'Accept': 'application/json',
        'User-Agent': 'ORCALens/1.0 (contact@orcalens.com)',
    };

    const url = `https://nominatim.openstreetmap.org/search?${new URLSearchParams({
        q: place,
        format: 'json',
        limit: '1',
        addressdetails: '1',
    })}`;

    await delay(RATE_LIMIT_DELAY);

    const response = await fetch(url, { headers });
    if (!response.ok) {
        throw new Error(`Geocoding error: ${response.status}`);
    }

    const data = await response.json();
    if (data.length === 0) {
        return null;
    }

    const result = data[0];
    const elapsed = Date.now() - startTime;
    console.log('[Overpass] Geocoded in', elapsed, 'ms:', result.name || place);
    
    return {
        name: result.name || result.address?.city || result.address?.town || place,
        lat: parseFloat(result.lat),
        lon: parseFloat(result.lon),
        display_name: result.display_name,
        boundingbox: result.boundingbox ? [
            parseFloat(result.boundingbox[0]),
            parseFloat(result.boundingbox[1]),
            parseFloat(result.boundingbox[2]),
            parseFloat(result.boundingbox[3]),
        ] : undefined,
    };
}

// ============================================================================
// OVERPASS API - MAIN SEARCH FUNCTION
// ============================================================================

export async function searchBusinessesInArea(
    areaName: string,
    segment: string,
    limit: number = 50
): Promise<OverpassResult[]> {
    const startTime = Date.now();
    console.log('[Overpass] Searching businesses:', segment, 'in', areaName);
    
    // Step 1: Geocode the area name to get coordinates
    const geocoded = await geocodePlace(areaName);
    if (!geocoded) {
        console.warn('[Overpass] Could not geocode area:', areaName);
        return [];
    }
    
    console.log('[Overpass] Geocoded area:', geocoded.name, '(', geocoded.lat, ',', geocoded.lon, ')');

    // Step 2: Get tags for the segment
    const tags = SEGMENT_TO_TAGS[segment.toLowerCase()] || [];
    if (tags.length === 0) {
        console.warn('[Overpass] No tags defined for segment:', segment);
        return [];
    }

    // Step 3: Try Strategy A - Area search
    console.log('[Overpass] Strategy A: Searching by administrative area...');
    try {
        const areaQuery = buildAreaQuery(geocoded.name, tags, limit);
        const results = await executeOverpassQuery(areaQuery);
        
        if (results.length > 0) {
            const elapsed = Date.now() - startTime;
            console.log('[Overpass] Strategy A succeeded:', results.length, 'results in', elapsed, 'ms');
            return deduplicateResults(results);
        }
        
        console.log('[Overpass] Strategy A returned 0 results, trying Strategy B...');
    } catch (err) {
        console.warn('[Overpass] Strategy A failed:', err instanceof Error ? err.message : err);
        console.log('[Overpass] Trying Strategy B...');
    }

    // Step 4: Try Strategy B - Radius search (fallback)
    console.log('[Overpass] Strategy B: Searching by radius (' + DEFAULT_RADIUS + 'm)...');
    try {
        const radiusQuery = buildRadiusQuery(geocoded.lat, geocoded.lon, DEFAULT_RADIUS, tags, limit);
        const results = await executeOverpassQuery(radiusQuery);
        
        if (results.length > 0) {
            const elapsed = Date.now() - startTime;
            console.log('[Overpass] Strategy B succeeded:', results.length, 'results in', elapsed, 'ms');
            return deduplicateResults(results);
        }
    } catch (err) {
        console.error('[Overpass] Strategy B failed:', err instanceof Error ? err.message : err);
    }

    const elapsed = Date.now() - startTime;
    console.log('[Overpass] All strategies failed after', elapsed, 'ms');
    return [];
}

// ============================================================================
// QUERY BUILDERS
// ============================================================================

function buildAreaQuery(areaName: string, tags: { key: string; value: string }[], limit: number): string {
    const elementQueries = tags.flatMap(tag => {
        const escapedValue = escapeOverpassValue(tag.value);
        return [
            `node["${tag.key}"="${escapedValue}"](area.searchArea);`,
            `way["${tag.key}"="${escapedValue}"](area.searchArea);`,
        ];
    });

    return `[out:json][timeout:10];
area["name"~"^${escapeRegex(areaName)}$"]["boundary"="administrative"]->.searchArea;
(
    ${elementQueries.join('\n    ')}
);
out center ${limit};`;
}

function buildRadiusQuery(lat: number, lon: number, radius: number, tags: { key: string; value: string }[], limit: number): string {
    const elementQueries = tags.flatMap(tag => {
        const escapedValue = escapeOverpassValue(tag.value);
        return [
            `node["${tag.key}"="${escapedValue}"](around:${radius},${lat},${lon});`,
            `way["${tag.key}"="${escapedValue}"](around:${radius},${lat},${lon});`,
        ];
    });

    return `[out:json][timeout:10];
(
    ${elementQueries.join('\n    ')}
);
out center ${limit};`;
}

// ============================================================================
// QUERY EXECUTION
// ============================================================================

async function executeOverpassQuery(query: string): Promise<OverpassResult[]> {
    const server = OVERPASS_SERVERS[0];
    
    try {
        console.log('[Overpass] Trying server:', server);
        
        const startTime = Date.now();
        const headers = {
            'Accept': 'application/json',
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'ORCALens/1.0 (contact@orcalens.com)',
        };

        const response = await fetch(server, {
            method: 'POST',
            headers,
            body: `data=${encodeURIComponent(query)}`,
        });

        const elapsed = Date.now() - startTime;

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Overpass API error: ${response.status} - ${errorText.substring(0, 100)}`);
        }

        const data = await response.json();
        
        if (!data.elements || data.elements.length === 0) {
            console.log('[Overpass] No elements returned in', elapsed, 'ms');
            return [];
        }

        const results = data.elements
            .filter((element: OverpassNode) => element.tags && element.tags.name)
            .map((element: OverpassNode) => normalizeOverpassResult(element))
            .filter((result: OverpassResult | null): result is OverpassResult => {
                if (!result) return false;
                if (result.lat === 0 && result.lon === 0) return false;
                if (Math.abs(result.lat) > 90 || Math.abs(result.lon) > 180) return false;
                return true;
            });

        console.log('[Overpass] Got', results.length, 'results in', elapsed, 'ms');
        return results;
    } catch (err) {
        console.warn('[Overpass] Server failed:', server, err instanceof Error ? err.message : err);
        throw err;
    }
}

// ============================================================================
// RESULT NORMALIZATION
// ============================================================================

function normalizeOverpassResult(element: OverpassNode): OverpassResult | null {
    const tags = element.tags || {};
    
    let category = 'unknown';
    if (tags.shop) category = tags.shop;
    else if (tags.amenity) category = tags.amenity;
    else if (tags.tourism) category = tags.tourism;
    else if (tags.leisure) category = tags.leisure;
    else if (tags.healthcare) category = tags.healthcare;

    let lat: number | undefined;
    let lon: number | undefined;
    
    if (element.type === 'node' && typeof element.lat === 'number' && typeof element.lon === 'number') {
        lat = element.lat;
        lon = element.lon;
    } else if (element.center && typeof element.center.lat === 'number' && typeof element.center.lon === 'number') {
        lat = element.center.lat;
        lon = element.center.lon;
    }
    
    if (lat === undefined || lon === undefined) {
        return null;
    }

    const address: OverpassResult['address'] = {
        street: tags['addr:street'] || tags.street,
        houseNumber: tags['addr:housenumber'] || tags.housenumber,
        city: tags['addr:city'] || tags['addr:town'] || tags['addr:village'] || tags.city,
        postcode: tags['addr:postcode'] || tags.postcode,
        country: tags['addr:country'] || tags.country,
    };
    
    address.full = [address.street, address.houseNumber, address.city, address.postcode, address.country]
        .filter(Boolean)
        .join(', ');

    return {
        id: `${element.type}_${element.id}`,
        name: tags.name || 'Unknown',
        lat,
        lon,
        type: element.type,
        category,
        tags,
        address,
    };
}

function deduplicateResults(results: OverpassResult[]): OverpassResult[] {
    const seen = new Set<string>();
    return results.filter(r => {
        if (seen.has(r.id)) return false;
        seen.add(r.id);
        return true;
    });
}

// ============================================================================
// CONVERT TO LEAD
// ============================================================================

export function overpassToLead(
    result: OverpassResult,
    segment: string,
    city: string,
    _importId: string
): Partial<Lead> {
    const phone = result.tags.phone || result.tags['contact:phone'] || '';
    const website = result.tags.website || result.tags['contact:website'] || '';
    const email = result.tags.email || result.tags['contact:email'] || '';
    
    let finalEmail = email;
    if (!finalEmail && website) {
        try {
            const url = new URL(website.startsWith('http') ? website : `https://${website}`);
            const domain = url.hostname.replace('www.', '');
            finalEmail = `contato@${domain}`;
        } catch {
            const domain = website.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
            if (domain) {
                finalEmail = `contato@${domain}`;
            }
        }
    }

    const openingHours = result.tags.opening_hours || '';
    
    let linkPedido = '';
    if (website) {
        linkPedido = website;
    } else if (phone) {
        const cleanPhone = phone.replace(/\D/g, '');
        if (cleanPhone.length >= 9) {
            linkPedido = `https://wa.me/${cleanPhone}`;
        }
    }

    let avaliacao: number | null = null;
    if (result.tags.rating) {
        const rating = parseFloat(result.tags.rating);
        if (!isNaN(rating) && rating >= 0 && rating <= 5) {
            avaliacao = Math.round(rating * 2) / 2;
        }
    }
    
    let reviews: number | null = null;
    if (result.tags['review:count']) {
        const reviewCount = parseInt(result.tags['review:count'] || '0');
        if (!isNaN(reviewCount) && reviewCount > 0) {
            reviews = reviewCount;
        }
    }
    
    let preco: string = '';
    if (result.tags.price_range) {
        preco = result.tags.price_range;
    }

    return {
        nome: result.name,
        segmento: segment,
        endereco: result.address.full || '',
        cidade: result.address.city || city,
        distrito_estado: result.tags['addr:state'] || '',
        codigo_postal: result.address.postcode || '',
        pais: result.address.country || 'Portugal',
        telefone: phone,
        website: website,
        email: finalEmail,
        servicos: [result.category],
        horario: openingHours,
        observacoes: openingHours ? `Horário: ${openingHours}` : '',
        linkOrigem: '',
        linkPedido: linkPedido,
        status: 'Aberto',
        preco,
        foto: '',
        fotos: [],
        avaliacao,
        reviews,
        _raw: result,
    };
}

// ============================================================================
// UTILS
// ============================================================================

function delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function escapeRegex(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function escapeOverpassValue(value: string): string {
    return value.replace(/"/g, '\\"');
}