/**
 * ORCA Lens - Scan Service
 * 
 * Serviço de scan de estabelecimentos por segmento e cidade.
 * Usa Google Places API como fonte principal com optimização de custos.
 */

import type { Lead } from '../types';
import { runDemoScan } from './demoDataService';
import { getCached, setCached, generateCacheKey } from '../services/placesCache';

const GOOGLE_KEY = import.meta.env.VITE_GOOGLE_API_KEY || '';
const IS_PRODUCTION = import.meta.env.PROD || false;

// API base URLs - use direct URLs in production, proxy in development
const API_BASES = IS_PRODUCTION
    ? {
        google: 'https://maps.googleapis.com',
        nominatim: 'https://nominatim.openstreetmap.org',
    }
    : {
        google: '/proxy/google',
        nominatim: '/proxy/nominatim',
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

    if (!trackApiCall('photo')) {
        console.warn('[Photos] Rate limit atingido para fotos');
        return [];
    }

    if (!GOOGLE_KEY) return [];

    try {
        const res = await fetch(
            `${API_BASES.google}/maps/api/place/details/json?place_id=${placeId}&fields=photos&key=${GOOGLE_KEY}`
        );
        const data = await res.json();
        const fotos = (data.result?.photos || []).slice(0, 3).map(
            (ph: any) => `${API_BASES.google}/maps/api/place/photo?maxwidth=400&photo_reference=${ph.photo_reference}&key=${GOOGLE_KEY}`
        );
        setCached(cacheKey, fotos);
        return fotos;
    } catch (err) {
        console.error('[Photos] Error loading:', placeId, err);
        return [];
    }
}

// ============================================================================
// PROCESS PLACES HELPER - Extrai leads de lugares do Google Places
// ============================================================================

async function processPlaces(
    places: any[],
    segment: string,
    lat: number,
    lon: number,
    city: string
): Promise<(Lead | null)[]> {
    return await Promise.all(
        places.map(async (place: any) => {
            try {
                // Rate limit check for details
                if (!trackApiCall('details')) {
                    console.warn('[RateLimit] Limite de details atingido');
                    return null;
                }

                // ESTRATÉGIA 3 — Campos mínimos (sem photos no scan)
                const detailRes = await fetch(
                    `${API_BASES.google}/maps/api/place/details/json?place_id=${place.place_id}&fields=name,formatted_address,formatted_phone_number,website,rating,user_ratings_total,opening_hours,geometry&language=pt&key=${GOOGLE_KEY}`
                );
                const detailData = await detailRes.json();
                const d = detailData.result || {};

                // Email: gerar do website se existir
                let email = '';
                if (d.website) {
                    try { email = `info@${new URL(d.website).hostname.replace('www.', '')}` } catch {}
                }

                return {
                    id: `google_${place.place_id}`,
                    nome: d.name || place.name || 'Sem nome',
                    endereco: d.formatted_address || place.formatted_address || '',
                    cidade: city,
                    distrito_estado: '',
                    codigo_postal: '',
                    pais: 'Portugal',
                    telefone: d.formatted_phone_number || '',
                    website: d.website || '',
                    email,
                    servicos: [segment],
                    horario: d.opening_hours?.weekday_text?.join(' | ') || '',
                    observacoes: '',
                    linkOrigem: '',
                    linkPedido: d.website || '',
                    status: 'Aberto',
                    preco: '',
                    foto: '',
                    fotos: [], // Fotos carregadas on-demand via loadLeadPhotos()
                    avaliacao: d.rating || place.rating || null,
                    reviews: d.user_ratings_total || place.user_ratings_total || null,
                    segmento: segment,
                    _lat: d.geometry?.location?.lat || place.geometry?.location?.lat || lat,
                    _lng: d.geometry?.location?.lng || place.geometry?.location?.lng || lon,
                    _score: (d.rating || 0) * 20,
                    _pipeline: 'novo',
                    _importedAt: Date.now(),
                    _importFile: `Google Places: ${segment} em ${city}`,
                    _importDate: new Date().toISOString(),
                    _importId: `google_${Date.now()}`,
                    _raw: d,
                };
            } catch (err) {
                console.error('[GOOGLE DEBUG] Error fetching details for:', place.name, err);
                return null;
            }
        })
    );
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

        const lat = parseFloat(geocodeData[0].lat);
        const lon = parseFloat(geocodeData[0].lon);

        onProgress?.(`Iniciando scan: ${segment} em ${city}...`);
        onProgress?.(`Fonte: Google Places API`);

        // Usar Google Places API como fonte principal
        if (!GOOGLE_KEY) {
            onProgress?.(`Erro: Chave Google API não configurada`);
            return {
                success: false,
                totalFound: 0,
                imported: 0,
                duplicates: 0,
                errors: 1,
                leads: [],
                cached: false,
                message: `Chave Google API não configurada`,
            };
        }

        console.log('[GOOGLE DEBUG] Key exists:', !!GOOGLE_KEY, '| prefix:', GOOGLE_KEY?.substring(0, 10));

        // ========================================================================
        // ESTRATÉGIA 1 — CACHE CHECK antes de chamar API
        // ========================================================================
        const cacheKey = generateCacheKey(segment, lat, lon);
        const cachedResult = getCached<{ results: any[] }>(cacheKey);
        if (cachedResult) {
            console.log('[Cache] HIT — Resultados do cache local (0 chamadas à API)');
            onProgress?.(`✓ Resultados do cache local (0 chamadas à API)`);
            
            // Process cached results
            const searchData = { results: cachedResult.results, status: 'OK' };
            const existingNames = new Set(existingLeads.map(l => l.nome?.toLowerCase()));
            const newPlaces = (searchData.results || []).filter((p: any) => !existingNames.has((p.name || '').toLowerCase()));
            const duplicateCount = searchData.results.length - newPlaces.length;
            onProgress?.(`${duplicateCount} duplicados removidos.`);
            onProgress?.(`Processando ${Math.min(newPlaces.length, 20)} lugares...`);
            
            const leads = await processPlaces(newPlaces.slice(0, 20), segment, lat, lon, city);
            const validLeads = leads.filter((l): l is Lead => l !== null);
            
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

        // Rate limit check for textsearch
        if (!trackApiCall('textsearch')) {
            onProgress?.(`⚠ Limite de chamadas atingido hoje. Tente novamente amanhã.`);
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

        // PASSO 1 — Text Search: buscar lista de lugares
        const query = `${segment} em ${city}`;
        onProgress?.(`Buscando "${query}" no Google Places...`);
        
        const searchRes = await fetch(
            `${API_BASES.google}/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&location=${lat},${lon}&radius=5000&language=pt&key=${GOOGLE_KEY}`
        );
        const searchData = await searchRes.json();
        console.log('[GOOGLE DEBUG] Text Search status:', searchData.status);
        console.log('[GOOGLE DEBUG] Total resultados:', searchData.results?.length);
        
        if (searchData.status !== 'OK') {
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

        // Deduplicate against existing leads
        const existingNames = new Set(existingLeads.map(l => l.nome?.toLowerCase()));
        const newPlaces = (searchData.results || []).filter((p: any) => !existingNames.has((p.name || '').toLowerCase()));
        const duplicateCount = searchData.results.length - newPlaces.length;
        onProgress?.(`${duplicateCount} duplicados removidos.`);

        // PASSO 2 — Para cada lugar, buscar detalhes completos
        onProgress?.(`Obtendo detalhes de ${Math.min(newPlaces.length, 20)} lugares...`);
        
        const leads = await Promise.all(
            newPlaces.slice(0, 20).map(async (place: any) => {
                try {
                    const detailRes = await fetch(
                        `${API_BASES.google}/maps/api/place/details/json?place_id=${place.place_id}&fields=name,formatted_address,formatted_phone_number,website,rating,user_ratings_total,photos,opening_hours,geometry&language=pt&key=${GOOGLE_KEY}`
                    );
                    const detailData = await detailRes.json();
                    const d = detailData.result || {};

                    // Fotos: máximo 3
                    const fotos = (d.photos || []).slice(0, 3).map(
                        (ph: any) => `${API_BASES.google}/maps/api/place/photo?maxwidth=400&photo_reference=${ph.photo_reference}&key=${GOOGLE_KEY}`
                    );

                    // Email: gerar do website se existir
                    let email = '';
                    if (d.website) {
                        try { email = `info@${new URL(d.website).hostname.replace('www.', '')}` } catch {}
                    }

                    const lead: Lead = {
                        id: `google_${place.place_id}`,
                        nome: d.name || place.name || 'Sem nome',
                        endereco: d.formatted_address || place.formatted_address || '',
                        cidade: city,
                        distrito_estado: '',
                        codigo_postal: '',
                        pais: 'Portugal',
                        telefone: d.formatted_phone_number || '',
                        website: d.website || '',
                        email,
                        servicos: [segment],
                        horario: d.opening_hours?.weekday_text?.join(' | ') || '',
                        observacoes: '',
                        linkOrigem: '',
                        linkPedido: d.website || '',
                        status: 'Aberto',
                        preco: '',
                        foto: '',
                        fotos,
                        avaliacao: d.rating || place.rating || null,
                        reviews: d.user_ratings_total || place.user_ratings_total || null,
                        segmento: segment,
                        _lat: d.geometry?.location?.lat || place.geometry?.location?.lat || lat,
                        _lng: d.geometry?.location?.lng || place.geometry?.location?.lng || lon,
                        _score: (d.rating || 0) * 20,
                        _pipeline: 'novo',
                        _importedAt: Date.now(),
                        _importFile: `Google Places: ${segment} em ${city}`,
                        _importDate: new Date().toISOString(),
                        _importId: `google_${Date.now()}`,
                        _raw: d,
                    };

                    console.log('[GOOGLE DEBUG] Lead mapeado:', JSON.stringify({
                        nome: lead.nome,
                        telefone: lead.telefone,
                        website: lead.website,
                        avaliacao: lead.avaliacao,
                        reviews: lead.reviews,
                        fotos: lead.fotos.length
                    }, null, 2));

                    return lead;
                } catch (err) {
                    console.error('[GOOGLE DEBUG] Error fetching details for:', place.name, err);
                    return null;
                }
            })
        );

        const validLeads = leads.filter((l): l is Lead => l !== null);
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
        onProgress?.(`✓ ${validLeads.length} leads carregados via Google Places API (cacheado por 7 dias)`);

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