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
    openingHours?: string;
    placeId: string;
}

// ============================================================================
// SEARCH
// ============================================================================

export async function searchNominatim(
    request: NominatimSearchRequest
): Promise<NominatimResult[]> {
    const { query, limit = 50, countrycodes = 'pt' } = request;

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

    // Rate limiting: wait 1 second between requests
    await delay(1000);

    const response = await fetch(url, { headers });
    if (!response.ok) {
        throw new Error(`Nominatim error: ${response.status} ${response.statusText}`);
    }

    const data: NominatimPlace[] = await response.json();

    return data
        .filter(place => {
            // Filter by class/type for businesses
            const isBusiness = place.class === 'amenity' || 
                              place.class === 'shop' || 
                              place.class === 'tourism' ||
                              place.class === 'healthcare' ||
                              (place.class === 'office' && place.type === 'company');
            
            // Also check if name exists (avoid generic locations)
            const hasName = !!place.name || !!place.address?.amenity || !!place.address?.name;
            
            return isBusiness && hasName;
        })
        .map(place => nominatimToResult(place));
}

// ============================================================================
// CONVERTER
// ============================================================================

function nominatimToResult(place: NominatimPlace): NominatimResult {
    const name = place.name || place.address?.amenity || place.address?.name || 'Unknown';
    
    // Extract contact info from extratags
    const extratags = place.extratags || {};
    
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
        website: extratags.website || extratags['contact:website'],
        phone: extratags.phone || extratags['contact:phone'],
        openingHours: extratags.opening_hours,
        placeId: `nominatim_${place.place_id}`,
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

    return {
        nome: result.name,
        segmento: segment,
        endereco: fullAddress,
        cidade: address.city || city,
        distrito_estado: address.state,
        codigo_postal: address.postcode,
        pais: address.country,
        telefone: result.phone || '',
        website: result.website || '',
        observacoes: result.openingHours ? `Horário: ${result.openingHours}` : '',
        linkOrigem: `https://www.openstreetmap.org/?mlat=${result.lat}&mlon=${result.lon}#map=17/${result.lat}/${result.lon}`,
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
    
    // Map common segments to OSM categories
    const queryMap: Record<string, string[]> = {
        'clínica médica': [
            `${segment} em ${city}`,
            `clinics in ${city}`,
            `medical clinic ${city}`,
            `doctors ${city}`,
            `healthcare ${city}`,
        ],
        'restaurante': [
            `${segment} em ${city}`,
            `restaurants in ${city}`,
            `food ${city}`,
            `dining ${city}`,
        ],
        'pet shop': [
            `${segment} em ${city}`,
            `pet shop ${city}`,
            `pet store ${city}`,
            `veterinary ${city}`,
        ],
    };

    return queryMap[segmentLower] || [
        `${segment} em ${city}`,
        `${segment} ${city}`,
    ];
}