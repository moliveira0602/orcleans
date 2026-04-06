/**
 * ORCA Lens - Places Cache Service
 * 
 * Cache local para Google Places API para reduzir custos.
 * Armazena resultados no localStorage com TTL de 7 dias.
 */

const CACHE_PREFIX = 'orca_places_';
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 dias

export interface CachedData<T> {
    data: T;
    timestamp: number;
}

/**
 * Obter dados do cache
 */
export function getCached<T>(key: string): T | null {
    try {
        const raw = localStorage.getItem(CACHE_PREFIX + key);
        if (!raw) return null;
        const { data, timestamp }: CachedData<T> = JSON.parse(raw);
        if (Date.now() - timestamp > CACHE_TTL_MS) {
            localStorage.removeItem(CACHE_PREFIX + key);
            return null;
        }
        console.log('[Cache] HIT para:', key);
        return data;
    } catch {
        return null;
    }
}

/**
 * Guardar dados no cache
 */
export function setCached<T>(key: string, data: T): void {
    try {
        localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({
            data,
            timestamp: Date.now()
        }));
        console.log('[Cache] STORED para:', key);
    } catch (e) {
        console.warn('[Cache] localStorage cheio, limpando entradas antigas...');
        clearOldCache();
        // Tentar novamente após limpar
        try {
            localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({
                data,
                timestamp: Date.now()
            }));
        } catch (e2) {
            console.error('[Cache] Falha ao guardar após limpeza:', e2);
        }
    }
}

/**
 * Limpar cache antigo (expirado)
 */
export function clearOldCache(): void {
    const keys = Object.keys(localStorage).filter(k => k.startsWith(CACHE_PREFIX));
    keys.forEach(k => {
        try {
            const { timestamp } = JSON.parse(localStorage.getItem(k) || '{}');
            if (!timestamp || Date.now() - timestamp > CACHE_TTL_MS) {
                localStorage.removeItem(k);
            }
        } catch {
            localStorage.removeItem(k);
        }
    });
}

/**
 * Limpar todo o cache
 */
export function clearAllCache(): void {
    const keys = Object.keys(localStorage).filter(k => k.startsWith(CACHE_PREFIX));
    keys.forEach(k => localStorage.removeItem(k));
    console.log('[Cache] Todo o cache foi limpo.');
}

/**
 * Obter estatísticas do cache
 */
export function getCacheStats(): { entries: number; sizeKB: number } {
    const keys = Object.keys(localStorage).filter(k => k.startsWith(CACHE_PREFIX));
    const size = keys.reduce((acc, k) => acc + (localStorage.getItem(k)?.length || 0), 0);
    return { entries: keys.length, sizeKB: Math.round(size / 1024) };
}

/**
 * Gerar chave de cache baseada em categoria + localização
 * Arredonda coordenadas a 2 casas decimais (~1km de precisão)
 */
export function generateCacheKey(category: string, lat: number, lon: number): string {
    const latRound = Math.round(lat * 100) / 100;
    const lonRound = Math.round(lon * 100) / 100;
    return `scan_${category.replace(/\s+/g, '_').toLowerCase()}_${latRound}_${lonRound}`;
}