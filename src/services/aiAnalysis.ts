import type { Lead, AppSettings } from '../types';
import { api } from './api';

export interface LeadAIInsight {
  canal: 'whatsapp' | 'email' | 'telefone';
  urgencia: 'alta' | 'media' | 'baixa';
  score_oportunidade: number; // 1-10
  motivo: string;
  abordagem: string;
  melhor_horario: string;
}

export interface LeadWithInsight {
  lead: Lead;
  insight: LeadAIInsight;
}

async function callOpenRouter(leadsChunk: Lead[], indices: number[], settings?: AppSettings): Promise<Map<number, LeadAIInsight>> {
  const data = await api.post<{ results?: any[] }>('/ai/analyze', {
    leads: leadsChunk,
    indices,
    settings,
  });

  const resultMap = new Map<number, LeadAIInsight>();
  for (const result of (data?.results || [])) {
    const idx = indices[result.index ?? 0];
    if (idx !== undefined) {
      resultMap.set(idx, {
        canal: result.canal || 'telefone',
        urgencia: result.urgencia || 'media',
        score_oportunidade: Math.min(10, Math.max(1, Number(result.score_oportunidade) || 5)),
        motivo: result.motivo || '',
        abordagem: result.abordagem || '',
        melhor_horario: result.melhor_horario || 'Dias úteis (9h-18h)',
      });
    }
  }

  return resultMap;
}

export interface AnalysisProgress {
  completed: number;
  total: number;
  results: LeadWithInsight[];
}

export async function analyzeLeadsWithAI(
  leads: Lead[],
  onProgress?: (progress: AnalysisProgress) => void,
  maxLeads = 50,
  settings?: AppSettings,
): Promise<LeadWithInsight[]> {
  if (!api.isAuthenticated()) {
    throw new Error('Sessão expirada ou não autenticada');
  }

  // Sort by score descending, take top N
  const sorted = [...leads]
    .sort((a, b) => (b._score ?? 0) - (a._score ?? 0))
    .slice(0, maxLeads);

  const BATCH_SIZE = 8;
  const results: LeadWithInsight[] = [];
  let completed = 0;

  for (let i = 0; i < sorted.length; i += BATCH_SIZE) {
    const chunk = sorted.slice(i, i + BATCH_SIZE);
    const indices = chunk.map((_, j) => i + j);

    try {
      const insightMap = await callOpenRouter(chunk, indices, settings);

      for (let j = 0; j < chunk.length; j++) {
        const globalIdx = i + j;
        const insight = insightMap.get(globalIdx) ?? {
          canal: chunk[j].telefone ? 'whatsapp' : chunk[j].email ? 'email' : 'telefone',
          urgencia: 'media' as const,
          score_oportunidade: chunk[j]._score ?? 5,
          motivo: 'Lead identificado com potencial de contacto',
          abordagem: `Olá, encontrámos o ${chunk[j].nome} e gostaríamos de apresentar uma solução para o seu negócio.`,
          melhor_horario: 'Dias úteis (9h-18h)',
        };
        results.push({ lead: chunk[j], insight });
        completed++;
      }
    } catch (err) {
      console.error('[AI Analysis] Batch failed:', err);
      // Add fallback insights for failed batch
      for (const lead of chunk) {
        results.push({
          lead,
          insight: {
            canal: lead.telefone ? 'whatsapp' : lead.email ? 'email' : 'telefone',
            urgencia: 'media',
            score_oportunidade: Math.min(10, Math.round(lead._score ?? 5)),
            motivo: 'Análise manual recomendada',
            abordagem: `Contactar ${lead.nome} para apresentar proposta personalizada.`,
            melhor_horario: 'Dias úteis (9h-18h)',
          },
        });
        completed++;
      }
    }

    onProgress?.({
      completed,
      total: sorted.length,
      results: [...results].sort((a, b) => b.insight.score_oportunidade - a.insight.score_oportunidade),
    });

    // Small delay between batches to avoid rate limiting
    if (i + BATCH_SIZE < sorted.length) {
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }

  // Sort by AI score descending
  return results.sort((a, b) => b.insight.score_oportunidade - a.insight.score_oportunidade);
}
