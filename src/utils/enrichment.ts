/**
 * ORCA Lens - Lead Enrichment Service
 * 
 * Enriquecimento de leads com dados do Google Places API e Foursquare API.
 * 
 * Estratégia:
 * 1. Overpass API (OSM) → nome, morada, coordenadas, telefone, website, horário
 * 2. Google Places API → avaliação, reviews, fotos (se GOOGLE_API_KEY configurada)
 * 3. Foursquare API → avaliação, reviews, fotos (fallback, se FSQ_API_KEY configurada)
 */

export interface EnrichedData {
    avaliacao: number | null;
    reviews: number | null;
    fotos: string[];
    telefone?: string | null;
    website?: string | null;
    fonte: 'osm' | 'google' | 'foursquare';
}

export interface EnrichmentResult {
    id: string;
    nome: string;
    cidade: string;
    enriched: EnrichedData;
}

// ============================================================================
// GOOGLE PLACES API
// ============================================================================

const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY || '';

export async function enrichWithGoogle(
    nome: string,
    cidade: string
): Promise<{ avaliacao: number | null; reviews: number | null; fotos: string[] } | null> {
    if (!GOOGLE_API_KEY) {
        console.log('[Enrichment] Google API key not configured, skipping');
        return null;
    }

    try {
        // Step 1: Find place
        const findUrl = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?${new URLSearchParams({
            input: `${nome} ${cidade}`,
            inputtype: 'textquery',
            fields: 'place_id,name,rating,user_ratings_total,photos,formatted_phone_number,website',
            key: GOOGLE_API_KEY,
        })}`;

        const findResponse = await fetch(findUrl);
        const findData = await findResponse.json();

        if (findData.status !== 'OK' || !findData.candidates || findData.candidates.length === 0) {
            console.log('[Enrichment] Google: No place found for', nome);
            return null;
        }

        const place = findData.candidates[0];
        const placeId = place.place_id;

        // Step 2: Get place details
        const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?${new URLSearchParams({
            place_id: placeId,
            fields: 'rating,user_ratings_total,photos,formatted_phone_number,website',
            key: GOOGLE_API_KEY,
        })}`;

        const detailsResponse = await fetch(detailsUrl);
        const detailsData = await detailsResponse.json();

        if (detailsData.status !== 'OK' || !detailsData.result) {
            console.log('[Enrichment] Google: No details for place_id', placeId);
            return null;
        }

        const result = detailsData.result;

        // Extract photos
        const fotos: string[] = [];
        if (result.photos && result.photos.length > 0) {
            for (const photo of result.photos.slice(0, 5)) {
                const photoUrl = `https://maps.googleapis.com/maps/api/place/photo?${new URLSearchParams({
                    maxwidth: '400',
                    photo_reference: photo.photo_reference,
                    key: GOOGLE_API_KEY,
                })}`;
                fotos.push(photoUrl);
            }
        }

        return {
            avaliacao: result.rating ?? null,
            reviews: result.user_ratings_total ?? null,
            fotos,
        };
    } catch (err) {
        console.error('[Enrichment] Google error:', err);
        return null;
    }
}

// ============================================================================
// FOURSQUARE API (Fallback)
// ============================================================================

const FSQ_API_KEY = import.meta.env.VITE_FSQ_API_KEY || '';

export async function enrichWithFoursquare(
    nome: string,
    cidade: string
): Promise<{ avaliacao: number | null; reviews: number | null; fotos: string[] } | null> {
    if (!FSQ_API_KEY) {
        console.log('[Enrichment] Foursquare API key not configured, skipping');
        return null;
    }

    try {
        // Step 1: Search places
        const searchUrl = `https://api.foursquare.com/v3/places/search?${new URLSearchParams({
            query: nome,
            near: cidade,
            limit: '1',
        })}`;

        const searchResponse = await fetch(searchUrl, {
            headers: {
                'Authorization': FSQ_API_KEY,
                'Accept': 'application/json',
            },
        });

        const searchData = await searchResponse.json();

        if (!searchData.results || searchData.results.length === 0) {
            console.log('[Enrichment] Foursquare: No place found for', nome);
            return null;
        }

        const place = searchData.results[0];
        const fsqId = place.fsq_id;

        // Step 2: Get place details
        const detailsUrl = `https://api.foursquare.com/v3/places/${fsqId}?fields=rating,stats,photos`;

        const detailsResponse = await fetch(detailsUrl, {
            headers: {
                'Authorization': FSQ_API_KEY,
                'Accept': 'application/json',
            },
        });

        const detailsData = await detailsResponse.json();

        // Extract photos
        const fotos: string[] = [];
        if (detailsData.photos && detailsData.photos.count > 0 && detailsData.photos.items) {
            for (const photo of detailsData.photos.items.slice(0, 5)) {
                if (photo.prefix && photo.suffix) {
                    const photoUrl = `${photo.prefix}300x300${photo.suffix}`;
                    fotos.push(photoUrl);
                }
            }
        }

        return {
            avaliacao: detailsData.rating ?? null,
            reviews: detailsData.stats?.checkins_count ?? null,
            fotos,
        };
    } catch (err) {
        console.error('[Enrichment] Foursquare error:', err);
        return null;
    }
}

// ============================================================================
// MAIN ENRICHMENT FUNCTION
// ============================================================================

/**
 * Enrich a lead with ratings, reviews, and photos.
 * Uses Google Places API first, then falls back to Foursquare.
 * All enrichments are done in parallel for efficiency.
 */
export async function enrichLead(
    nome: string,
    cidade: string
): Promise<EnrichedData> {
    // Try Google first, then Foursquare
    const [googleData, foursquareData] = await Promise.all([
        enrichWithGoogle(nome, cidade),
        enrichWithFoursquare(nome, cidade),
    ]);

    if (googleData) {
        return {
            ...googleData,
            fonte: 'google',
        };
    }

    if (foursquareData) {
        return {
            ...foursquareData,
            fonte: 'foursquare',
        };
    }

    // No enrichment available
    return {
        avaliacao: null,
        reviews: null,
        fotos: [],
        fonte: 'osm',
    };
}

/**
 * Check if enrichment APIs are configured
 */
export function getEnrichmentStatus(): {
    googleConfigured: boolean;
    foursquareConfigured: boolean;
    anyConfigured: boolean;
} {
    return {
        googleConfigured: !!GOOGLE_API_KEY,
        foursquareConfigured: !!FSQ_API_KEY,
        anyConfigured: !!GOOGLE_API_KEY || !!FSQ_API_KEY,
    };
}