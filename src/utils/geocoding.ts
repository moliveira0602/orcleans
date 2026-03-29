/**
 * Geocoding utility using Nominatim (OpenStreetMap)
 */

interface GeocodeResult {
    lat: string;
    lon: string;
}

const cache = new Map<string, { lat: number; lng: number } | null>();

function normalizeQuery(q: string) {
    return q.trim().replace(/\s+/g, ' ').toLowerCase();
}

function countryHintFromQuery(q: string): string | null {
    const s = q.replace(/\s+/g, '');
    if (/^\d{4}-?\d{3}$/.test(s)) return 'pt';
    if (/^\d{5}-?\d{3}$/.test(s)) return 'br';
    return null;
}

function buildNominatimUrl(query: string) {
    const base = 'https://nominatim.openstreetmap.org/search';
    const params = new URLSearchParams();
    params.set('format', 'jsonv2');
    params.set('q', query);
    params.set('limit', '1');
    params.set('addressdetails', '0');
    params.set('accept-language', 'pt');
    const hint = countryHintFromQuery(query);
    if (hint) params.set('countrycodes', hint);
    return `${base}?${params.toString()}`;
}

/**
 * Geocode an address string to coordinates.
 * Nominatim has a 1 request/second usage policy.
 */
export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
    if (!address || address.length < 3) return null;

    const key = normalizeQuery(address);
    if (cache.has(key)) return cache.get(key)!;

    try {
        const url = buildNominatimUrl(address);
        const response = await fetch(url, { headers: { Accept: 'application/json' } });

        if (!response.ok) throw new Error('Geocoding failed');

        const data: GeocodeResult[] = await response.json();

        if (data && data.length > 0) {
            const result = {
                lat: parseFloat(data[0].lat),
                lng: parseFloat(data[0].lon)
            };
            cache.set(key, result);
            return result;
        }

        cache.set(key, null);
        return null;
    } catch (error) {
        console.error('Geocoding error:', error);
        return null;
    }
}
