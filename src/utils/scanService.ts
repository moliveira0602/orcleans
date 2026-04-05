/**
 * ORCA Lens - Scan Service
 * 
 * Serviço de scan de estabelecimentos por segmento e cidade.
 * Utiliza OpenStreetMap (Nominatim) como fonte principal - 100% gratuito.
 * 
 * Regras:
 * - Cache de 7 dias por segmento+cidade
 * - Máximo 100 estabelecimentos por scan
 * - Deduplicação automática
 * - Reutiliza estrutura existente (store, scoring)
 * 
 * Fontes de dados:
 * - OpenStreetMap (Nominatim) → Dados reais, 100% gratuito
 * - Demo → Modo demonstração (dados fictícios para testes)
 */

import type { Lead } from '../types';
import { searchNominatimBatch, getNominatimQueries, nominatimToLead } from './nominatimApi';
import { runDemoScan } from './demoDataService';
import { computeScore } from './scoring';

// ============================================================================
// CONFIGURAÇÃO
// ============================================================================

const CACHE_TTL_DAYS = 7;
const CACHE_KEY_PREFIX = 'orca_scan_cache_';

export interface ScanRequest {
    segment: string; // ex: "clínica médica"
    city: string;    // ex: "Olhão, Portugal"
    apiKey: string;  // Google Places API Key
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

interface ScanCacheEntry {
    timestamp: number;
    segment: string;
    city: string;
    count: number;
    placeIds: string[];
}

// ============================================================================
// CACHE SERVICE
// ============================================================================

function getCacheKey(segment: string, city: string): string {
    return `${CACHE_KEY_PREFIX}${segment.toLowerCase().trim()}_${city.toLowerCase().trim()}`;
}

function getCacheEntry(segment: string, city: string): ScanCacheEntry | null {
    try {
        const key = getCacheKey(segment, city);
        const data = localStorage.getItem(key);
        if (!data) return null;
        
        const entry: ScanCacheEntry = JSON.parse(data);
        const ageDays = (Date.now() - entry.timestamp) / (1000 * 60 * 60 * 24);
        
        if (ageDays > CACHE_TTL_DAYS) {
            localStorage.removeItem(key);
            return null;
        }
        
        return entry;
    } catch {
        return null;
    }
}

function setCacheEntry(segment: string, city: string, placeIds: string[], count: number) {
    try {
        const key = getCacheKey(segment, city);
        const entry: ScanCacheEntry = {
            timestamp: Date.now(),
            segment,
            city,
            count,
            placeIds,
        };
        localStorage.setItem(key, JSON.stringify(entry));
    } catch {
        // Ignore storage errors
    }
}

// ============================================================================
// SCAN SERVICE (Multi-Source)
// ============================================================================

export async function runScan(
    request: ScanRequest,
    existingLeads: Lead[],
    onProgress?: (message: string) => void
): Promise<ScanResult> {
    const { segment, city, apiKey } = request;

    try {
        // Step 1: Check cache (skip for demo mode)
        if (apiKey !== 'demo') {
            const cacheEntry = getCacheEntry(segment, city);
            if (cacheEntry) {
                const msg = `Cache válido (${cacheEntry.count} estabelecimentos, ${CACHE_TTL_DAYS} dias). Retornando dados existentes.`;
                onProgress?.(msg);
                
                return {
                    success: true,
                    totalFound: cacheEntry.count,
                    imported: 0,
                    duplicates: 0,
                    errors: 0,
                    leads: [],
                    cached: true,
                    message: msg,
                };
            }
        }

        // Step 2: Select data source based on apiKey
        if (apiKey === 'demo') {
            // DEMO MODE - Use mock data
            return runDemoScan(segment, city, existingLeads, onProgress);
        } else {
            // NOMINATIM MODE - Free OpenStreetMap (default)
            return runNominatimScan(segment, city, existingLeads, onProgress);
        }
    } catch (err) {
        const errorMsg = `Erro no scan: ${err instanceof Error ? err.message : 'Erro desconhecido'}`;
        onProgress?.(errorMsg);
        
        return {
            success: false,
            totalFound: 0,
            imported: 0,
            duplicates: 0,
            errors: 0,
            leads: [],
            cached: false,
            message: errorMsg,
        };
    }
}

// ============================================================================
// NOMINATIM SCAN (Free OpenStreetMap)
// ============================================================================

async function runNominatimScan(
    segment: string,
    city: string,
    existingLeads: Lead[],
    onProgress?: (message: string) => void
): Promise<ScanResult> {
    onProgress?.(`Iniciando scan: ${segment} em ${city}...`);
    onProgress?.(`Fonte: OpenStreetMap (Nominatim) - GRATUITO`);

    // Generate multiple queries for better coverage
    const queries = getNominatimQueries(segment, city);
    onProgress?.(`Buscando: ${queries.length} consultas...`);

    const results = await searchNominatimBatch(queries, { limit: 30 });
    
    onProgress?.(`${results.length} estabelecimentos encontrados.`);

    // Deduplicate against existing leads
    const existingNames = new Set(existingLeads.map(l => l.nome?.toLowerCase()));
    const newResults = results.filter(r => !existingNames.has(r.name.toLowerCase()));
    const duplicateCount = results.length - newResults.length;

    onProgress?.(`${duplicateCount} duplicados removidos (já existem na base).`);

    // Convert to leads
    const importId = `nominatim_${Date.now()}`;
    const leads: Lead[] = [];
    const placeIds: string[] = [];
    let errorCount = 0;

    for (let i = 0; i < newResults.length; i++) {
        const result = newResults[i];
        
        try {
            const partial = nominatimToLead(result, segment, city, importId);
            const score = computeScore(partial as unknown as Record<string, unknown>, null, []);
            
            const lead: Lead = {
                id: `lead_nominatim_${Date.now()}_${i}`,
                _score: score,
                _pipeline: 'novo',
                _importedAt: Date.now(),
                _importFile: `Nominatim: ${segment} em ${city}`,
                _importDate: new Date().toISOString(),
                _importId: importId,
                nome: partial.nome || result.name,
                segmento: partial.segmento || segment,
                endereco: partial.endereco || '',
                cidade: partial.cidade || city,
                distrito_estado: partial.distrito_estado || '',
                codigo_postal: partial.codigo_postal || '',
                pais: partial.pais || '',
                preco: '',
                status: 'Aberto',
                horario: '',
                telefone: partial.telefone || '',
                website: partial.website || '',
                email: partial.email || '',
                servicos: [],
                foto: '',
                observacoes: partial.observacoes || '',
                linkOrigem: partial.linkOrigem || '',
                linkPedido: '',
                avaliacao: partial.avaliacao ?? null,
                reviews: partial.reviews ?? null,
                _raw: result,
            };

            leads.push(lead);
            placeIds.push(result.placeId);
        } catch (err) {
            errorCount++;
            console.error('[Nominatim Scan] Error processing:', result.name, err);
        }
    }

    onProgress?.(`${leads.length} leads criados com sucesso.`);

    // Cache results
    setCacheEntry(segment, city, placeIds, leads.length);
    
    const message = `Scan concluído: ${leads.length} novos, ${duplicateCount} duplicados, ${errorCount} erros.`;
    onProgress?.(message);

    return {
        success: true,
        totalFound: results.length,
        imported: leads.length,
        duplicates: duplicateCount,
        errors: errorCount,
        leads,
        cached: false,
        message,
    };
}

// ============================================================================
// SCAN STATUS
// ============================================================================

export function getScanStatus(segment: string, city: string): {
    hasCache: boolean;
    ageDays: number | null;
    cachedCount: number;
    canRefresh: boolean;
} {
    const cacheEntry = getCacheEntry(segment, city);
    
    if (!cacheEntry) {
        return {
            hasCache: false,
            ageDays: null,
            cachedCount: 0,
            canRefresh: true,
        };
    }

    const ageDays = (Date.now() - cacheEntry.timestamp) / (1000 * 60 * 60 * 24);
    
    return {
        hasCache: true,
        ageDays: Math.round(ageDays * 10) / 10,
        cachedCount: cacheEntry.count,
        canRefresh: ageDays > CACHE_TTL_DAYS,
    };
}

export function clearScanCache(segment?: string, city?: string) {
    if (segment && city) {
        const key = getCacheKey(segment, city);
        localStorage.removeItem(key);
    } else {
        // Clear all scan caches
        Object.keys(localStorage).forEach(key => {
            if (key.startsWith(CACHE_KEY_PREFIX)) {
                localStorage.removeItem(key);
            }
        });
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