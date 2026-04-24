/**
 * ORCA Lens - Scan Service
 * 
 * Serviço de scan de estabelecimentos por segmento e cidade.
 * Usa Google Places API como fonte principal com optimização de custos.
 */

import type { Lead } from '../types';
import { runDemoScan } from './demoDataService';
import { getCached, setCached, generateCacheKey } from '../services/placesCache';
import api from '../services/api';

const IS_PRODUCTION = import.meta.env.PROD || false;
const GOOGLE_KEY = import.meta.env.VITE_GOOGLE_API_KEY || ''; 

// Always use backend proxy to avoid CORS issues
const API_BASES = {
    google: `/scan`,
    nominatim: 'https://nominatim.openstreetmap.org',
};

// ============================================================================
// RATE LIMITING - Contador de chamadas por sessão
// ============================================================================

const SESSION_KEY = 'orca_api_calls_today';

interface ApiCallRecord {
    date: string;
    textsearch: number;
    details: number;
    photo: number;
    total: number;
}

const LIMITS = { textsearch: 10, details: 50, photo: 30, total: 80 };

function trackApiCall(type: 'textsearch' | 'details' | 'photo'): boolean {
    const today = new Date().toDateString();
    const raw = sessionStorage.getItem(SESSION_KEY);
    const record: ApiCallRecord = raw ? JSON.parse(raw) : { date: today, textsearch: 0, details: 0, photo: 0, total: 0 };

    // Reset se for novo dia
    if (record.date !== today) {
        record.date = today;
        record.textsearch = 0;
        record.details = 0;
        record.photo = 0;
        record.total = 0;
    }

    // Verificar limites
    if (record.total >= LIMITS.total || record[type] >= LIMITS[type]) {
        console.warn(`[RateLimit] Limite atingido para: ${type}. Total hoje: ${record.total}`);
        return false; // bloqueado
    }

    record[type]++;
    record.total++;
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(record));
    console.log(`[ApiTracker] ${type} #${record[type]} | Total hoje: ${record.total}`);
    return true; // permitido
}

export function getApiCallStats(): ApiCallRecord {
    const today = new Date().toDateString();
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return { date: today, textsearch: 0, details: 0, photo: 0, total: 0 };
    return JSON.parse(raw);
}

// ============================================================================
// ON-DEMAND PHOTO LOADING - Carregar fotos apenas quando necessário
// ============================================================================

export async function loadLeadPhotos(placeId: string): Promise<string[]> {
    const cacheKey = `photos_${placeId}`;
    const cached = getCached<string[]>(cacheKey);
    if (cached) {
        console.log('[Photos] Cache HIT para:', placeId);
        return cached;
    }

    if (!trackApiCall('details')) return [];

    try {
        const data: any = await api.get(
            `${API_BASES.google}/details`,
            { params: { place_id: placeId, fields: 'photos' } }
        );
        
        const fotos = (data.result?.photos || []).slice(0, 3).map(
            (ph: any) => `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photo_reference=${ph.photo_reference}&key=${GOOGLE_KEY}`
        );
        setCached(cacheKey, fotos);
        return fotos;
    } catch (err) {
        return [];
    }
}

/**
 * Enrichment: Fetch details for a specific lead
 */
async function enrichLead(lead: Lead): Promise<Lead> {
    if (!lead.id.startsWith('google_')) return lead;
    const placeId = lead.id.replace('google_', '');
    
    try {
        const data: any = await api.get(`${API_BASES.google}/details`, {
            params: { 
                place_id: placeId,
                fields: 'formatted_phone_number,website,opening_hours,address_components,formatted_address' 
            }
        });
        
        if (data.result) {
            const r = data.result;
            lead.telefone = r.formatted_phone_number || lead.telefone;
            lead.website = r.website || lead.website;
            
            // Extract city from address_components if city is currently coordinates
            if ((!lead.cidade || lead.cidade.includes(',')) && r.address_components) {
                const cityComp = r.address_components.find((c: any) => 
                    c.types.includes('locality') || 
                    c.types.includes('administrative_area_level_2') ||
                    c.types.includes('administrative_area_level_1')
                );
                if (cityComp) {
                    lead.cidade = cityComp.long_name;
                }
            }

            if (r.website && !lead.email) {
                try {
                    const domain = new URL(r.website).hostname.replace('www.', '');
                    lead.email = `info@${domain}`;
                } catch {}
            }
        }
        return lead;
    } catch (err) {
        return lead;
    }
}

// ============================================================================
// PROCESS PLACES HELPER - Extrai leads de lugares do Google Places
// ============================================================================

function processPlaces(
    places: any[],
    segment: string,
    lat: number,
    lon: number,
    city: string
): (Lead | null)[] {
    return places.map((place: any) => {
        try {
            // Use data from nearby/text search result directly (no extra API call)
            // Nearby search returns basic fields for FREE
            const d = place;
            
            // Extract address components
            let endereco = d.formatted_address || d.vicinity || '';
            let telefone = d.formatted_phone_number || '';
            let website = d.website || '';
            let horario = '';

            // Detect city from address if the input city was coordinates
            let finalCity = city;
            if (city.includes(',') && endereco) {
                const parts = endereco.split(',').map(p => p.trim());
                if (parts.length >= 2) {
                    // In Portugal, city is often in the last part: "8700-240 Olhão"
                    const lastPart = parts[parts.length - 1];
                    const cityMatch = lastPart.match(/(?:\d{4}-\d{3})\s+(.+)$/);
                    if (cityMatch) {
                        finalCity = cityMatch[1].trim();
                    } else {
                        // Fallback: use the second to last part
                        finalCity = parts[parts.length - 2].replace(/\d+/g, '').trim();
                    }
                }
            }
            
            // Email: gerar do website se existir
            let email = '';
            if (website) {
                try { 
                    const domain = new URL(website).hostname.replace('www.', '');
                    email = `info@${domain}`;
                } catch {}
            }

            return {
                id: `google_${place.place_id}`,
                nome: d.name || 'Sem nome',
                endereco,
                cidade: finalCity,
                distrito_estado: '',
                codigo_postal: '',
                pais: 'Portugal',
                telefone,
                website,
                email,
                servicos: [segment],
                horario,
                observacoes: '',
                linkOrigem: '',
                linkPedido: website || '',
                status: d.business_status === 'OPERATIONAL' ? 'Aberto' : 'Fechado',
                preco: '',
                foto: '',
                fotos: [], // Fotos carregadas on-demand via loadLeadPhotos()
                avaliacao: d.rating || null,
                reviews: d.user_ratings_total || null,
                segmento: segment,
                _lat: d.geometry?.location?.lat || lat,
                _lng: d.geometry?.location?.lng || lon,
                _score: (d.rating || 0) * 20,
                _pipeline: 'novo',
                _importedAt: Date.now(),
                _importFile: `Google Places: ${segment} em ${city}`,
                _importDate: new Date().toISOString(),
                _importId: `google_${Date.now()}`,
                _raw: d,
            };
        } catch (err) {
            console.error('[GOOGLE DEBUG] Error processing place:', place.name, err);
            return null;
        }
    });
}

// ============================================================================
// CONFIGURAÇÃO
// ============================================================================

export interface ScanRequest {
    segment: string;
    city: string;
    apiKey: string;
}

export interface ScanResult {
    success: boolean;
    totalFound: number;
    imported: number;
    duplicates: number;
    errors: number;
    leads: Lead[];
    cached: boolean;
    message: string;
}

// ============================================================================
// MAIN SCAN FUNCTION
// ============================================================================

export async function runScan(
    request: ScanRequest,
    existingLeads: Lead[],
    onProgress?: (message: string) => void
): Promise<ScanResult> {
    const { segment, city, apiKey } = request;

    try {
        if (apiKey === 'demo') {
            return runDemoScan(segment, city, existingLeads, onProgress);
        }

        // Check if city is already coordinates (lat,lng format)
        let lat: number, lon: number;
        const coordMatch = city.match(/^(-?\d+\.?\d*),(-?\d+\.?\d*)$/);
        
        if (coordMatch) {
            // Already coordinates - use directly
            lat = parseFloat(coordMatch[1]);
            lon = parseFloat(coordMatch[2]);
            onProgress?.(`Usando coordenadas: ${lat.toFixed(4)}, ${lon.toFixed(4)}`);
        } else {
            // Geocode city to get coordinates
            onProgress?.(`Geocodificando ${city}...`);
            const geocodeRes = await fetch(
                `${API_BASES.nominatim}/search?${new URLSearchParams({
                    q: city,
                    format: 'json',
                    limit: '1',
                })}`,
                { headers: { 'Accept': 'application/json', 'User-Agent': 'ORCALens/1.0' } }
            );
            const geocodeData = await geocodeRes.json();
            
            if (geocodeData.length === 0) {
                return {
                    success: false,
                    totalFound: 0,
                    imported: 0,
                    duplicates: 0,
                    errors: 1,
                    leads: [],
                    cached: false,
                    message: `Não foi possível geocodificar: ${city}`,
                };
            }

            lat = parseFloat(geocodeData[0].lat);
            lon = parseFloat(geocodeData[0].lon);
        }

        onProgress?.(`Iniciando scan: ${segment} em ${city}...`);
        onProgress?.(`Fonte: Google Places API (Proxy)`);

        console.log('[GOOGLE DEBUG] Proxy usage enabled | prefix:', GOOGLE_KEY ? GOOGLE_KEY.substring(0, 8) + '...' : 'MISSING');

        // ========================================================================
        // ESTRATÉGIA 1 — CACHE CHECK antes de chamar API
        // ========================================================================
        const cacheKey = generateCacheKey(segment, lat, lon);
        const cachedResult = getCached<{ results: any[] }>(cacheKey);
        if (cachedResult) {
            console.log('[Cache] HIT — Resultados do cache local (0 chamadas à API)');
            onProgress?.(`Resultados do cache local (0 chamadas à API)`);
            
            // Process cached results
            const searchData = { results: cachedResult.results, status: 'OK' };
            const existingNames = new Set(existingLeads.map(l => l.nome?.toLowerCase()));
            const newPlaces = (searchData.results || []).filter((p: any) => !existingNames.has((p.name || '').toLowerCase()));
            const duplicateCount = searchData.results.length - newPlaces.length;
            onProgress?.(`${duplicateCount} duplicados removidos.`);
            onProgress?.(`Processando ${Math.min(newPlaces.length, 20)} lugares...`);
            
            const leads = processPlaces(newPlaces.slice(0, 20), segment, lat, lon, city);
            const validLeads = leads.filter((l: Lead | null): l is Lead => l !== null);
            
            return {
                success: true,
                totalFound: searchData.results.length,
                imported: validLeads.length,
                duplicates: duplicateCount,
                errors: 0,
                leads: validLeads,
                cached: true,
                message: `Scan concluído: ${validLeads.length} leads do cache.`,
            };
        }

        // Rate limit check
        if (!trackApiCall('textsearch')) {
            onProgress?.(`Limite de chamadas atingido hoje. Tente novamente amanhã.`);
            return {
                success: false,
                totalFound: 0,
                imported: 0,
                duplicates: 0,
                errors: 1,
                leads: [],
                cached: false,
                message: `Limite de chamadas API atingido hoje (${LIMITS.total}).`,
            };
        }

        const query = `${segment}`;
        onProgress?.(`Buscando "${query}" próximo a ${lat.toFixed(4)},${lon.toFixed(4)} no Google Places...`);
        
        let searchData: any;
        
        try {
            searchData = await api.get(
                `${API_BASES.google}/textsearch`,
                { params: { query, location: `${lat},${lon}`, radius: '5000' } }
            );
        } catch (err) {
            console.error('[ScanProxy] TextSearch error:', err);
            searchData = { status: 'ERROR' };
        }
        
        // If zero results, try nearbysearch instead
        if (searchData.status === 'ZERO_RESULTS' || !searchData.results?.length) {
            console.log('[ScanProxy] Text search returned no results, trying nearby search...');
            try {
                searchData = await api.get(
                    `${API_BASES.google}/nearby`,
                    { params: { location: `${lat},${lon}`, radius: '5000', keyword: query } }
                );
            } catch (err) {
                console.error('[ScanProxy] Nearby fetch error:', err);
                searchData = { status: 'ERROR', results: [], error_message: String(err) };
            }
        }
        
        console.log('[GOOGLE DEBUG] Search status:', searchData.status);
        console.log('[GOOGLE DEBUG] Total resultados:', searchData.results?.length);
        
        if (searchData.status !== 'OK' && searchData.status !== 'ZERO_RESULTS') {
            onProgress?.(`Erro Google Places: ${searchData.status}`);
            console.error('[GOOGLE DEBUG] Error:', searchData.error_message || searchData.results);
            return {
                success: false,
                totalFound: 0,
                imported: 0,
                duplicates: 0,
                errors: 1,
                leads: [],
                cached: false,
                message: `Erro Google Places: ${searchData.status}`,
            };
        }
        
        if (!searchData.results?.length) {
            onProgress?.(`Nenhum resultado encontrado para "${segment}". Tente outro segmento.`);
            return {
                success: false,
                totalFound: 0,
                imported: 0,
                duplicates: 0,
                errors: 1,
                leads: [],
                cached: false,
                message: `ZERO_RESULTS: Nenhum estabelecimento encontrado para "${segment}" nesta localização.`,
            };
        }

        // Deduplicate against existing leads
        const existingNames = new Set(existingLeads.map(l => l.nome?.toLowerCase()));
        const newPlaces = (searchData.results || []).filter((p: any) => !existingNames.has((p.name || '').toLowerCase()));
        const duplicateCount = searchData.results.length - newPlaces.length;
        onProgress?.(`${duplicateCount} duplicados removidos.`);

        // Process places using data from nearby search (no extra API calls)
        onProgress?.(`Processando ${Math.min(newPlaces.length, 20)} lugares...`);
        
        const leads = processPlaces(newPlaces.slice(0, 20), segment, lat, lon, city);
        let validLeads = leads.filter((l: Lead | null): l is Lead => l !== null);
        
        // ========================================================================
        // ENRICHMENT Phase - Auto-fetch details for results
        // ========================================================================
        const toEnrich = validLeads.slice(0, 20); // Enrich more leads to ensure data is present
        if (toEnrich.length > 0) {
            onProgress?.(`Enriquecendo dados de ${toEnrich.length} leads (Telefone, Website, Cidade)...`);
            const enriched = await Promise.all(toEnrich.map(l => enrichLead(l)));
            validLeads = enriched; // Since we took slice(0, 20) and Google usually returns 20
        }

        console.log('[ScanService] Google Places retornou:', validLeads.length, 'leads');

        // Log first lead for verification
        if (validLeads.length > 0) {
            console.log('[ScanService] Primeiro lead:', {
                nome: validLeads[0].nome,
                telefone: validLeads[0].telefone,
                website: validLeads[0].website,
                avaliacao: validLeads[0].avaliacao,
                reviews: validLeads[0].reviews,
                fotos: validLeads[0].fotos?.length,
            });
        }

        // ========================================================================
        // ESTRATÉGIA 1 — GUARDAR no cache após chamada bem-sucedida
        // ========================================================================
        setCached(cacheKey, { results: searchData.results });
        console.log('[Cache] Resultados guardados no cache para:', cacheKey);
        onProgress?.(`${validLeads.length} leads carregados via Google Places API (cacheado por 7 dias)`);

        const message = `Scan concluído: ${validLeads.length} novos leads.`;
        onProgress?.(message);

        return {
            success: true,
            totalFound: searchData.results.length,
            imported: validLeads.length,
            duplicates: duplicateCount,
            errors: 0,
            leads: validLeads,
            cached: false,
            message,
        };
    } catch (err) {
        const errorMsg = `Erro no scan: ${err instanceof Error ? err.message : 'Erro desconhecido'}`;
        onProgress?.(errorMsg);
        
        return {
            success: false,
            totalFound: 0,
            imported: 0,
            duplicates: 0,
            errors: 1,
            leads: [],
            cached: false,
            message: errorMsg,
        };
    }
}

// ============================================================================
// PRESET CONFIGURATIONS
// ============================================================================

export const SCAN_PRESETS = {
    clinicasOlhao: {
        segment: 'clínica médica',
        city: 'Olhão, Portugal',
        label: 'Clínicas em Olhão',
    },
    restaurantesLisboa: {
        segment: 'restaurante',
        city: 'Lisboa, Portugal',
        label: 'Restaurantes em Lisboa',
    },
    petshopsPorto: {
        segment: 'pet shop',
        city: 'Porto, Portugal',
        label: 'Pet Shops no Porto',
    },
};

export type ScanPresetKey = keyof typeof SCAN_PRESETS;

// ============================================================================
// SCAN STATUS (for compatibility)
// ============================================================================

export function getScanStatus(_segment: string, _city: string) {
    return { hasCache: false, ageDays: null, cachedCount: 0, canRefresh: true };
}

export function clearScanCache(_segment?: string, _city?: string) {
    // No-op for now
}