/**
 * Google Places API (New) Integration
 * 
 * IMPORTANT: For production use, these API calls should be proxied through a backend
 * to protect your API key. The frontend implementation below is for development/testing only.
 * 
 * Setup:
 * 1. Enable Google Places API in Google Cloud Console
 * 2. Create an API key with restrictions
 * 3. Set the API key in environment variable VITE_GOOGLE_PLACES_API_KEY
 * 4. Enable billing (required for Places API)
 */

export interface PlaceResult {
    name: string;
    address: string;
    phone: string;
    website: string;
    rating: number | null;
    reviewCount: number | null;
    placeId: string;
    lat: number | null;
    lng: number | null;
    types: string[];
}

export interface PlacesSearchRequest {
    textQuery: string;
    includedType?: string;
    maxResults?: number;
}

const PLACES_API_ENDPOINT = 'https://places.googleapis.com/v1/places:searchText';

/**
 * Field masks for different data tiers:
 * - Essentials: Basic fields (free)
 * - Pro: DisplayName, FormattedAddress, Types (~$32/1000)
 * - Enterprise: Phone, WebsiteUri (~$35/1000)
 */
const FIELD_MASKS = {
    essentials: 'places.id,places.displayName',
    pro: 'places.id,places.displayName,places.formattedAddress,places.types,places.location,places.rating,places.googleMapsUri',
    enterprise: 'places.id,places.displayName,places.formattedAddress,places.types,places.location,places.rating,places.googleMapsUri,places.internationalPhoneNumber,places.websiteUri,places.userRatingCount'
};

/**
 * Search for places using Google Places API (New)
 * 
 * @param request - Search request with text query and optional filters
 * @param apiKey - Google Places API key
 * @returns Array of place results
 */
export async function searchPlaces(
    request: PlacesSearchRequest,
    apiKey: string
): Promise<PlaceResult[]> {
    const { textQuery, includedType, maxResults = 20 } = request;

    // Build request body
    const requestBody: Record<string, unknown> = {
        textQuery,
        languageCode: 'pt-PT',
        regionCode: 'PT',
        maxResultCount: Math.min(maxResults, 20), // Max 20 per page
    };

    if (includedType) {
        requestBody.includedType = includedType;
    }

    // Use enterprise field mask to get phone and website
    requestBody.fieldsMask = FIELD_MASKS.enterprise;

    // Validate API key format
    if (!apiKey || !apiKey.startsWith('AIza')) {
        throw new Error('API Key inválida. Deve começar com "AIza"');
    }

    const response = await fetch(PLACES_API_ENDPOINT, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-Goog-Api-Key': apiKey,
            'X-Goog-FieldMask': FIELD_MASKS.enterprise,
        },
        body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(`Google Places API Error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const places = data.places || [];

    return places.map((place: Record<string, unknown>): PlaceResult => {
        // Extract display name (can be a LocalizedText object)
        const displayName = typeof place.displayName === 'object' 
            ? (place.displayName as { text?: string }).text || ''
            : String(place.displayName || '');

        // Extract location
        const location = place.location as { latitude?: number; longitude?: number } | undefined;

        // Extract rating and review count
        const ratingRaw = place.rating as number | undefined;
        const reviewCountRaw = place.userRatingCount as number | undefined;

        // Extract website URI (can be a string or object)
        const websiteUri = place.websiteUri as string | { uri?: string } | undefined;
        const website = typeof websiteUri === 'object' 
            ? websiteUri.uri || ''
            : String(websiteUri || '');

        // Extract phone
        const phone = String(place.internationalPhoneNumber || '');

        // Extract types
        const types = Array.isArray(place.types) 
            ? (place.types as string[]).map(t => typeof t === 'object' ? (t as { name?: string }).name || '' : t)
            : [];

        return {
            name: displayName,
            address: String(place.formattedAddress || ''),
            phone,
            website,
            rating: ratingRaw !== undefined ? Math.round(ratingRaw * 10) / 10 : null,
            reviewCount: reviewCountRaw !== undefined ? Math.max(0, reviewCountRaw) : null,
            placeId: String(place.id || ''),
            lat: location?.latitude || null,
            lng: location?.longitude || null,
            types,
        };
    });
}

/**
 * Paginate through all results (up to 60 total as per Google limits)
 */
export async function searchPlacesPaginated(
    request: PlacesSearchRequest,
    apiKey: string
): Promise<PlaceResult[]> {
    const { maxResults = 60 } = request;
    const allResults: PlaceResult[] = [];
    let nextPageToken: string | undefined;
    let pageCount = 0;
    const maxPages = 3; // Google limits to ~60 results (3 pages of 20)

    do {
        const requestBody: Record<string, unknown> = {
            textQuery: request.textQuery,
            languageCode: 'pt-PT',
            regionCode: 'PT',
            maxResultCount: Math.min(maxResults - allResults.length, 20),
            fieldsMask: FIELD_MASKS.enterprise,
        };

        if (request.includedType) {
            requestBody.includedType = request.includedType;
        }

        if (nextPageToken) {
            requestBody.pageToken = nextPageToken;
        }

        const response = await fetch(PLACES_API_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': apiKey,
                'X-Goog-FieldMask': FIELD_MASKS.enterprise,
            },
            body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Unknown error' }));
            throw new Error(`Google Places API Error: ${error.error?.message || response.statusText}`);
        }

        const data = await response.json();
        const places = data.places || [];

        // Parse and add results
        for (const place of places) {
            const displayName = typeof place.displayName === 'object' 
                ? (place.displayName as { text?: string }).text || ''
                : String(place.displayName || '');

            const location = place.location as { latitude?: number; longitude?: number } | undefined;
            const ratingRaw = place.rating as number | undefined;
            const reviewCountRaw = place.userRatingCount as number | undefined;
            const websiteUri = place.websiteUri as string | { uri?: string } | undefined;
            const website = typeof websiteUri === 'object' 
                ? websiteUri.uri || ''
                : String(websiteUri || '');

            const types = Array.isArray(place.types) 
                ? (place.types as string[]).map(t => typeof t === 'object' ? (t as { name?: string }).name || '' : t)
                : [];

            allResults.push({
                name: displayName,
                address: String(place.formattedAddress || ''),
                phone: String(place.internationalPhoneNumber || ''),
                website,
                rating: ratingRaw !== undefined ? Math.round(ratingRaw * 10) / 10 : null,
                reviewCount: reviewCountRaw !== undefined ? Math.max(0, reviewCountRaw) : null,
                placeId: String(place.id || ''),
                lat: location?.latitude || null,
                lng: location?.longitude || null,
                types,
            });
        }

        nextPageToken = data.nextPageToken;
        pageCount++;

    } while (nextPageToken && pageCount < maxPages && allResults.length < maxResults);

    return allResults.slice(0, maxResults);
}

/**
 * Common Google Places types for business categories
 */
export const PLACE_TYPES = {
    pet_store: 'pet_store',
    pet_grooming: 'pet_grooming',
    pet_care: 'pet_care',
    veterinarian: 'veterinarian',
    restaurant: 'restaurant',
    cafe: 'cafe',
    bar: 'bar',
    clothing_store: 'clothing_store',
    shopping_mall: 'shopping_mall',
    beauty_salon: 'beauty_salon',
    hair_care: 'hair_care',
    spa: 'spa',
    gym: 'gym',
    health: 'health',
    dentist: 'dentist',
    doctor: 'doctor',
    pharmacy: 'pharmacy',
    school: 'school',
    university: 'university',
    real_estate_agency: 'real_estate_agency',
    car_dealer: 'car_dealer',
    car_repair: 'car_repair',
    gas_station: 'gas_station',
    grocery_or_supermarket: 'grocery_or_supermarket',
    bakery: 'bakery',
    lodging: 'lodging',
    travel_agency: 'travel_agency',
    electronics_store: 'electronics_store',
    furniture_store: 'furniture_store',
    home_goods_store: 'home_goods_store',
    jewelry_store: 'jewelry_store',
    shoe_store: 'shoe_store',
    bookstore: 'bookstore',
    florist: 'florist',
    gift_shop: 'gift_shop',
    insurance_agency: 'insurance_agency',
    lawyer: 'lawyer',
    accounting: 'accounting',
    finance: 'finance',
    bank: 'bank',
    atm: 'atm',
    post_office: 'post_office',
    church: 'church',
    mosque: 'mosque',
    synagogue: 'synagogue',
    hindu_temple: 'hindu_temple',
    cemetery: 'cemetery',
    funeral_home: 'funeral_home',
    movie_theater: 'movie_theater',
    museum: 'museum',
    art_gallery: 'art_gallery',
    aquarium: 'aquarium',
    zoo: 'zoo',
    amusement_park: 'amusement_park',
    park: 'park',
    stadium: 'stadium',
    bowling_alley: 'bowling_alley',
    casino: 'casino',
    night_club: 'night_club',
    rv_park: 'rv_park',
    campground: 'campground',
};

/**
 * Convert a PlaceResult to a Lead-compatible object
 */
export function placeToLead(place: PlaceResult) {
    return {
        nome: place.name,
        segmento: place.types.filter(t => t !== 'point_of_interest' && t !== 'establishment').join(', '),
        avaliacao: place.rating,
        reviews: place.reviewCount,
        preco: '',
        endereco: place.address,
        status: 'Aberto', // Default to open, API doesn't provide status
        horario: '',
        telefone: place.phone,
        website: place.website,
        email: '', // Google Places API doesn't provide email
        servicos: [],
        foto: '',
        linkOrigem: place.placeId ? `https://www.google.com/maps/place/?q=place_id:${place.placeId}` : '',
        linkPedido: '',
        observacoes: '',
    };
}