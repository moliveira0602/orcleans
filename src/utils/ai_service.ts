import type { Lead, LeadInsight, AppSettings } from '../types';
import { getLeadName, getLeadCategory } from './detect';

const API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY;
const API_URL = 'https://openrouter.ai/api/v1/chat/completions';

interface OpenRouterMessage {
    role: 'system' | 'user';
    content: string;
}

const SYSTEM_PROMPT = `Você é um especialista em inteligência comercial B2B da OrcaLens. Sua função é analisar leads e gerar insights verdadeiramente personalizados e únicos para cada cliente.

DIRETRIZES CRÍTICAS:
1. Para CADA lead, você deve gerar conteúdo DIFERENTE - use o nome específico do lead e suas características únicas
2. Não use templates genéricos - cada análise deve ser única
3. Considere: segmento do negócio, localização, avaliação, número de reviews, serviços oferecidos, status, preço
4. O email deve mencionar informações específicas do lead (nome, segmento, localização, etc)

Para cada lead, gere:
1. Análise de Dores: Identifique as principais dores específicas deste lead baseado NO SEU perfil único
2. Estratégia de Abordagem: Determine qualificação, potencial e tipo de abordagem baseados NOS DADOS ESPECÍFICOS deste lead
3. Modelo de Email: Um email de abordagem COMPLETAMENTE personalizado mencionando informações específicas do lead
4. Plano de Ação: Sequência de ações personalizada

Responda SEMPRE em JSON válido com esta estrutura exata:
{
    "analysis": {
        "pains": ["dor 1", "dor 2"],
        "opportunities": ["oportunidade 1"],
        "maturity": "baixa" | "media" | "alta"
    },
    "strategy": {
        "qualification": "quente" | "morno" | "frio",
        "potential": number,
        "priority": "alta" | "media" | "baixa",
        "approachType": "string",
        "tone": "string",
        "triggers": ["trigger1"]
    },
    "templates": {
        "email": ["email completo com dados do lead"],
        "linkedin": "mensagem linkedin",
        "whatsapp": "mensagem whatsapp"
    },
    "actionPlan": {
        "channels": ["LinkedIn", "Email"],
        "sequence": ["ação 1", "ação 2"],
        "bestTiming": "string"
    }
}

IMPORTANTE: Gere conteúdo ÚNICO para cada lead. O email deve conter o nome específico do lead e referências aos seus dados.`;

function buildPrompt(lead: Lead, settings: AppSettings): string {
    const name = getLeadName(lead, 'nome');
    const segment = getLeadCategory(lead, 'segmento') || 'Não identificado';
    const score = lead._score || 0;
    const pipeline = lead._pipeline || 'novo';
    
    let dataInfo = `Nome: ${name}\nSegmento: ${segment}\nScore: ${score}/10\nPipeline: ${pipeline}\n`;
    
    if (lead.email) dataInfo += `Email: ${lead.email}\n`;
    if (lead.telefone) dataInfo += `Telefone: ${lead.telefone}\n`;
    if (lead.endereco || lead.address) dataInfo += `Morada: ${lead.endereco || lead.address}\n`;
    if (lead.cidade || lead.city) dataInfo += `Cidade: ${lead.cidade || lead.city}\n`;
    if (lead.website) dataInfo += `Website: ${lead.website}\n`;
    if (lead.avaliacao || lead.rating) dataInfo += `Avaliação: ${lead.avaliacao || lead.rating} estrelas\n`;
    if (lead.reviews) dataInfo += `Reviews: ${lead.reviews}\n`;
    if (lead.preco || lead.price) dataInfo += `Faixa de Preço: ${lead.preco || lead.price}\n`;
    if (lead.status) dataInfo += `Status: ${lead.status}\n`;
    if (lead.horario || lead.opening_hours) dataInfo += `Horário: ${lead.horario || lead.opening_hours}\n`;
    if (lead.servicos) dataInfo += `Serviços: ${Array.isArray(lead.servicos) ? lead.servicos.join(', ') : lead.servicos}\n`;
    if (lead.descricao || lead.description) dataInfo += `Descrição: ${lead.descricao || lead.description}\n`;
    
    return `Analise o seguinte lead e gere insights PERSONALIZADOS e únicos para este cliente específico:

${dataInfo}

Empresa: ${settings.company || 'OrcaLens'}

IMPORTANTE: Sua resposta deve ser ÚNICA e ESPECÍFICA para este lead. Use o nome "${name}" e as informações acima para criar uma análise verdadeiramente personalizada. Não gere conteúdo genérico.`;
}

function fallbackInsight(lead: Lead, settings: AppSettings): LeadInsight {
    const name = getLeadName(lead, 'nome');
    const segment = getLeadCategory(lead, 'segmento') || 'Mercado';
    const score = lead._score || 0;
    
    const qualification = score >= 7 ? 'quente' : score >= 4 ? 'morno' : 'frio';
    const potential = Math.round(score * 10);
    const priority = score >= 7 ? 'alta' : score >= 4 ? 'media' : 'baixa';
    
    const approachType = qualification === 'quente' ? 'Direta / Focada em Fechamento' : qualification === 'morno' ? 'Educativa / Relacional' : 'Branding / Awareness';
    const tone = qualification === 'quente' ? 'Persuasivo e Profissional' : qualification === 'morno' ? 'Consultivo e Técnico' : 'Geral e Educativo';
    
    const pains = [];
    if (!lead.telefone && !lead.email) {
        pains.push('Ausência de dados de contato diretos');
    }
    if (score < 5) {
        pains.push('Baixa pontuação indica necessidade de qualificação');
    }
    pains.push(`Segmento ${segment} em expansão`);
    
    const opportunities = [];
    opportunities.push('Oportunidade de consultoria especializada');
    if (lead.website) opportunities.push('Presença digital pode ser otimizada');
    
    return {
        analysis: { 
            pains, 
            opportunities, 
            maturity: score >= 7 ? 'alta' : score >= 4 ? 'media' : 'baixa' 
        },
        strategy: {
            classification: `Lead do setor de ${segment}`,
            qualification,
            potential,
            priority,
            approachType,
            tone,
            triggers: ['Escalabilidade', 'Prova Social', 'Autoridade']
        },
        templates: {
            email: [
                `Assunto: Oportunidade para ${name}\n\nOlá,\n\nAnalisamos o perfil da ${name} no setor de ${segment} e identificamos uma grande oportunidade de otimização dos seus processos comerciais.\n\nNossa solução pode ajudar a aumentar a eficiência e conversão. Podemos agendar uma conversa de 15 minutos?`
            ],
            linkedin: `Olá! Vi o trabalho da ${name} no setor de ${segment}. Gostaria de trocar ideias sobre tendências e oportunidades. Vamos nos conectar?`,
            whatsapp: `Olá! Sou da OrcaLens. Vi o trabalho da ${name} e gostaria de apresentar uma solução que pode agregar ao negócio. Tem 2 minutos?`
        },
        actionPlan: {
            channels: lead.email ? ['Email', 'LinkedIn'] : ['LinkedIn'],
            sequence: [
                'Dia 1: Conexão personalizada no LinkedIn',
                'Dia 2: Email de abordagem',
                'Dia 5: Seguimento',
                'Dia 10:whatsApp ou ligação'
            ],
            bestTiming: 'Terça a Quinta, 10h-12h'
        }
    };
}

export async function generateLeadInsight(lead: Lead, settings: AppSettings): Promise<LeadInsight> {
    if (!API_KEY) {
        console.warn('[AI] OpenRouter API key not configured, using fallback');
        return fallbackInsight(lead, settings);
    }
    
    const name = getLeadName(lead, 'nome');
    console.log('[AI] Generating insight for lead:', name);
    
    const messages: OpenRouterMessage[] = [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: buildPrompt(lead, settings) }
    ];
    
    try {
        console.log('[AI] Calling OpenRouter API...');
        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`,
                'HTTP-Referer': window.location.origin,
                'X-Title': 'OrcaLens'
            },
            body: JSON.stringify({
                model: 'anthropic/claude-3-haiku',
                messages,
                max_tokens: 2000,
                temperature: 0.7
            })
        });
        
        console.log('[AI] Response status:', response.status);
        
        if (!response.ok) {
            const error = await response.text();
            console.error('[AI] API error:', error);
            return fallbackInsight(lead, settings);
        }
        
        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;
        
        console.log('[AI] Response content:', content?.substring(0, 200));
        
        if (!content) {
            console.warn('[AI] No content in response, using fallback');
            return fallbackInsight(lead, settings);
        }
        
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            console.warn('[AI] No JSON found in response, using fallback');
            return fallbackInsight(lead, settings);
        }
        
        const parsed = JSON.parse(jsonMatch[0]);
        console.log('[AI] Parsed insight:', JSON.stringify(parsed).substring(0, 200));
        
        return {
            analysis: parsed.analysis || { pains: [], opportunities: [], maturity: 'media' },
            strategy: parsed.strategy || { qualification: 'morno', potential: 50, priority: 'media', approachType: 'Educativa', tone: 'Consultivo', triggers: [] },
            templates: parsed.templates || { email: [''], linkedin: '', whatsapp: '' },
            actionPlan: parsed.actionPlan || { channels: [], sequence: [], bestTiming: '' }
        };
    } catch (error) {
        console.error('[AI] Error generating insight:', error);
        return fallbackInsight(lead, settings);
    }
}

export function generateLeadInsightSync(lead: Lead, settings: AppSettings): LeadInsight {
    return fallbackInsight(lead, settings);
}