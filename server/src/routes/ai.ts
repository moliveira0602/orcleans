import { Router, Response } from 'express';
import { authenticate, type AuthRequest } from '../middleware/auth';
import axios from 'axios';
import { env } from '../config/env';

const router = Router();

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

function buildLeadSummary(lead: any): string {
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

router.post('/analyze', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { leads, indices, settings } = req.body;

    if (!leads || !Array.isArray(leads)) {
      return res.status(400).json({ error: 'Leads são obrigatórios' });
    }

    if (!env.OPENROUTER_API_KEY) {
      console.error('[AiRoute] OPENROUTER_API_KEY is not configured');
      return res.status(500).json({ error: 'Serviço de IA não configurado no servidor' });
    }

    const leadsText = leads.map((lead: any, i: number) => {
      const globalIdx = indices && indices[i] !== undefined ? indices[i] : i;
      return `--- LEAD ${globalIdx} ---\n${buildLeadSummary(lead)}`;
    }).join('\n\n');

    const userMessage = `Analisa estes ${leads.length} leads comerciais e retorna o JSON com a estratégia de contacto para cada um:\n\n${leadsText}`;

    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'meta-llama/llama-3.3-70b-instruct',
        messages: [
          { role: 'system', content: buildSystemPrompt(settings?.toneOfVoice) },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.3,
        max_tokens: 2000,
        response_format: { type: 'json_object' },
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${env.OPENROUTER_API_KEY}`,
          'HTTP-Referer': 'https://orcaleads.online',
          'X-Title': 'ORCA - Lead Intelligence',
        },
      }
    );

    const content = response.data.choices?.[0]?.message?.content || '{}';
    let parsed: any;
    try {
      parsed = JSON.parse(content);
    } catch {
      const match = content.match(/\{[\s\S]*\}/);
      parsed = match ? JSON.parse(match[0]) : { results: [] };
    }

    return res.json(parsed);
  } catch (error: any) {
    console.error('[AiRoute] OpenRouter call failed:', error.response?.data || error.message);
    return res.status(500).json({ error: 'Erro ao consultar serviço de inteligência artificial' });
  }
});

export default router;
