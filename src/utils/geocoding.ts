/**
 * Geocoding utility using Nominatim (OpenStreetMap)
 */

interface GeocodeResult {
    lat: string;
    lon: string;
}

const cache = new Map<string, { lat: number; lng: number } | null>();

/**
 * Geocode an address string to coordinates.
 * Nominatim has a 1 request/second usage policy.
 */
export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
    if (!address || address.length < 3) return null;

    if (cache.has(address)) return cache.get(address)!;

    try {
        const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`;
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'OrcaLens-B2B-Intelligence/1.0'
            }
        });

        if (!response.ok) throw new Error('Geocoding failed');

        const data: GeocodeResult[] = await response.json();

        if (data && data.length > 0) {
            const result = {
                lat: parseFloat(data[0].lat),
                lng: parseFloat(data[0].lon)
            };
            cache.set(address, result);
            return result;
        }

        cache.set(address, null);
        return null;
    } catch (error) {
        console.error('Geocoding error:', error);
        return null;
    }
}
