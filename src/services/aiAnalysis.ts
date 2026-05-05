import type { Lead, AppSettings } from '../types';

const OPENROUTER_KEY = import.meta.env.VITE_OPENROUTER_API_KEY || '';
const MODEL = 'meta-llama/llama-3.3-70b-instruct';
const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions';

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

function buildLeadSummary(lead: Lead): string {
  const hasWhatsApp = !!lead.telefone;
  const hasEmail = !!lead.email;
  const hasWebsite = !!lead.website;
  const rating = lead.avaliacao != null ? `${lead.avaliacao}/5` : 'sem avaliação';
  const reviews = lead.reviews != null ? `${lead.reviews} reviews` : 'sem reviews';

  return [
    `Nome: ${lead.nome || 'N/A'}`,
    `Segmento: ${lead.segmento || 'N/A'}`,
    `Cidade: ${lead.cidade || lead.endereco || 'N/A'}`,
    `Avaliação Google: ${rating} (${reviews})`,
    `Preço: ${lead.preco || 'N/A'}`,
    `Telefone/WhatsApp: ${hasWhatsApp ? lead.telefone : 'NÃO DISPONÍVEL'}`,
    `Email: ${hasEmail ? lead.email : 'NÃO DISPONÍVEL'}`,
    `Website: ${hasWebsite ? 'SIM' : 'NÃO TEM'}`,
    `Status: ${lead.status || 'N/A'}`,
    `Serviços: ${lead.servicos?.slice(0, 3).join(', ') || 'N/A'}`,
  ].join('\n');
}

const SYSTEM_PROMPT_BASE = `Você é um especialista em vendas B2B para o mercado português/brasileiro. 
Analisa leads comerciais e indica a melhor estratégia de contacto.
Responde SEMPRE em JSON válido com o seguinte formato exato para cada lead:

{
  "results": [
    {
      "index": 0,
      "canal": "whatsapp|email|telefone",
      "urgencia": "alta|media|baixa",
      "score_oportunidade": 7,
      "motivo": "Justificativa curta em 1 frase do porquê é uma boa oportunidade",
      "abordagem": "Script de primeiro contacto personalizado em 2-3 frases, em português",
      "melhor_horario": "Ex: Manhã (9h-12h) dias úteis"
    }
  ]
}

Regras:
- Se não tem email → prioriza whatsapp ou telefone
- Avaliação alta (4+) com muitos reviews → score_oportunidade mais alto
- Negócios sem website → alta oportunidade (precisam de presença digital)
- A "abordagem" deve mencionar o nome do negócio e ser natural, não robótica
- canal "whatsapp" só se telefone disponível
- canal "email" só se email disponível
- Urgência "alta" = contactar hoje, "media" = esta semana, "baixa" = este mês`;

function buildSystemPrompt(tone: string = 'casual'): string {
  const toneInstruction = {
    casual: "Usa um tom amigável, direto e informal. Não uses linguagem corporativa pesada.",
    formal: "Usa um tom polido, profissional e formal. Ideal para executivos e grandes empresas.",
    persuasivo: "Usa um tom persuasivo, focado em vendas e benefícios claros. Sê assertivo.",
    tecnico: "Usa um tom técnico, de especialista, focado em precisão e autoridade no assunto."
  }[tone] || "Usa um tom casual.";

  return `${SYSTEM_PROMPT_BASE}\n\nDIRETRIZ DE TOM DE VOZ: ${toneInstruction}\nImportante: Escreva a 'abordagem' respeitando estritamente este tom de voz.`;
}

async function callOpenRouter(leadsChunk: Lead[], indices: number[], settings?: AppSettings): Promise<Map<number, LeadAIInsight>> {
  const leadsText = leadsChunk.map((lead, i) => {
    return `--- LEAD ${indices[i]} ---\n${buildLeadSummary(lead)}`;
  }).join('\n\n');

  const userMessage = `Analisa estes ${leadsChunk.length} leads comerciais e retorna o JSON com a estratégia de contacto para cada um:\n\n${leadsText}`;

  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENROUTER_KEY}`,
      'HTTP-Referer': window.location.origin,
      'X-Title': 'ORCA - Lead Intelligence',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: buildSystemPrompt(settings?.toneOfVoice) },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.3,
      max_tokens: 2000,
      response_format: { type: 'json_object' },
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenRouter error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '{}';

  let parsed: { results?: any[] };
  try {
    parsed = JSON.parse(content);
  } catch {
    // Try to extract JSON from the response
    const match = content.match(/\{[\s\S]*\}/);
    parsed = match ? JSON.parse(match[0]) : { results: [] };
  }

  const resultMap = new Map<number, LeadAIInsight>();
  for (const result of (parsed.results || [])) {
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
  if (!OPENROUTER_KEY) {
    throw new Error('OpenRouter API key não configurada');
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
