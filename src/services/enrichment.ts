/**
 * ORCA Lens - Enrichment Service
 * 
 * Enriquecimento de leads com dados de Foursquare Places API.
 * Adiciona telefone, website, morada, avaliações e fotos.
 */

import type { Lead } from '../types';

const FSQ_KEY = import.meta.env.VITE_FSQ_API_KEY || '';

interface FoursquareResult {
    telefone?: string;
    website?: string;
    endereco?: string;
    avaliacao?: number;
    reviews?: number;
    fotos?: string[];
}

/**
 * Enriquece dados de um estabelecimento usando Foursquare Places API.
 * 
 * @param nome Nome do estabelecimento
 * @param cidade Cidade/região para busca
 * @param lat Latitude (opcional, para busca mais precisa)
 * @param lon Longitude (opcional, para busca mais precisa)
 */
export async function enrichWithFoursquare(
    nome: string,
    cidade: string,
    lat?: number,
    lon?: number
): Promise<FoursquareResult> {
    if (!FSQ_KEY) {
        console.log('[Enrichment] Foursquare API key not configured, skipping enrichment');
        return {};
    }

    try {
        console.log('[Enrichment] Searching Foursquare for:', nome, 'in', cidade);

        // PASSO 1: Buscar place por nome + localização
        const searchParams = new URLSearchParams({
            query: nome,
            near: cidade,
            limit: '1',
            fields: 'fsq_id,name,location,tel,website,rating,stats,photos'
        });
        
        if (lat && lon) {
            searchParams.set('ll', `${lat},${lon}`);
            searchParams.delete('near');
            searchParams.set('radius', '500');
        }

        const searchRes = await fetch(
            `https://api.foursquare.com/v3/places/search?${searchParams}`,
            { 
                headers: { 
                    Authorization: FSQ_KEY, 
                    Accept: 'application/json' 
                } 
            }
        );

        if (!searchRes.ok) {
            console.warn('[Enrichment] Foursquare search failed:', searchRes.status);
            return {};
        }

        const searchData = await searchRes.json();
        const place = searchData.results?.[0];
        
        if (!place) {
            console.log('[Enrichment] No Foursquare result found for:', nome);
            return {};
        }

        console.log('[Enrichment] Found Foursquare place:', place.name, place.fsq_id);

        // PASSO 2: Buscar detalhes completos
        const detailRes = await fetch(
            `https://api.foursquare.com/v3/places/${place.fsq_id}?fields=tel,website,location,rating,stats,photos`,
            { 
                headers: { 
                    Authorization: FSQ_KEY, 
                    Accept: 'application/json' 
                } 
            }
        );

        if (!detailRes.ok) {
            console.warn('[Enrichment] Foursquare details failed:', detailRes.status);
            return {};
        }

        const detail = await detailRes.json();

        // PASSO 3: Buscar fotos
        let fotos: string[] = [];
        try {
            const photosRes = await fetch(
                `https://api.foursquare.com/v3/places/${place.fsq_id}/photos?limit=3`,
                { 
                    headers: { 
                        Authorization: FSQ_KEY, 
                        Accept: 'application/json' 
                    } 
                }
            );
            
            if (photosRes.ok) {
                const photosData = await photosRes.json();
                fotos = (photosData.results || []).map(
                    (p: { prefix: string; suffix: string }) => `${p.prefix}300x300${p.suffix}`
                );
            }
        } catch (photoErr) {
            console.warn('[Enrichment] Failed to fetch photos:', photoErr);
        }

        // Montar endereço
        const loc = detail.location || place.location || {};
        const enderecoPartes = [
            loc.address,
            loc.postcode,
            loc.locality || loc.city
        ].filter(Boolean);

        const result: FoursquareResult = {
            telefone:  detail.tel        || place.tel        || undefined,
            website:   detail.website    || place.website    || undefined,
            endereco:  enderecoPartes.join(', ') || undefined,
            avaliacao: detail.rating     ? parseFloat((detail.rating / 2).toFixed(1)) : undefined,
            reviews:   detail.stats?.total_ratings            || undefined,
            fotos:     fotos.length > 0 ? fotos : undefined,
        };

        console.log('[Enrichment] Enriched data:', result);
        return result;

    } catch (err) {
        console.error('[Enrichment] Foursquare failed for:', nome, err);
        return {};
    }
}

/**
 * Enriquece um lead completo com dados do Foursquare.
 * 
 * @param lead Lead parcial vindo do OSM
 * @param cidade Cidade para busca
 */
export async function enrichLead(
    lead: Partial<Lead>,
    cidade: string
): Promise<Partial<Lead>> {
    const extra = await enrichWithFoursquare(
        lead.nome || '',
        cidade,
        (lead as any)._lat,
        (lead as any)._lng
    );

    return {
        ...lead,
        telefone:  lead.telefone  || extra.telefone  || '',
        website:   lead.website   || extra.website   || '',
        endereco:  lead.endereco  || extra.endereco  || '',
        avaliacao: lead.avaliacao ?? extra.avaliacao ?? null,
        reviews:   lead.reviews   ?? extra.reviews   ?? null,
        fotos:     lead.fotos?.length ? lead.fotos : (extra.fotos || []),
    };
}