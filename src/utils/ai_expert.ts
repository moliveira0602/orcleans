import type { Lead, LeadInsight, AppSettings } from '../types';
import { getLeadName, getLeadCategory } from './detect';

/**
 * AI Expert Engine for B2B Lead Intelligence
 * Simulates a deep analysis based on lead metadata and industry patterns.
 */
export function generateLeadInsight(lead: Lead, settings: AppSettings): LeadInsight {
    const name = getLeadName(lead, 'nome');
    const segment = getLeadCategory(lead, 'segmento') || 'Segmento não identificado';
    const score = lead._score || 0;

    // 1. Analysis Logic
    const pains = [];
    const opportunities = [];
    let maturity: 'baixa' | 'media' | 'alta' = 'media';

    if (!lead.telefone && !lead.email) {
        pains.push('Dificuldade de prospecção direta por ausência de dados de contato.');
        opportunities.push('Enriquecimento de dados via LinkedIn ou ferramentas de Sales Intelligence.');
        maturity = 'baixa';
    } else if (score < 5) {
        pains.push('Baixo engajamento digital ou presença online fragmentada.');
        opportunities.push('Melhoria do posicionamento de marca e autoridade digital.');
        maturity = 'baixa';
    } else {
        pains.push('Necessidade de otimização de conversão e escala comercial.');
        opportunities.push('Implementação de fluxos automatizados e segmentação avançada.');
        maturity = 'alta';
    }

    if (segment.toLowerCase().includes('tecnologia') || segment.toLowerCase().includes('software')) {
        pains.push('Alta competitividade no setor e necessidade de diferenciação técnica.');
        opportunities.push('Abordagem focada em ROI e eficiência operacional.');
    }

    // 2. Strategy Logic
    const qualification = score >= 7 ? 'quente' : score >= 4 ? 'morno' : 'frio';
    const potential = Math.round(score * 10);
    const priority = score >= 7 ? 'alta' : score >= 4 ? 'media' : 'baixa';

    let approachType = 'Educativa';
    let tone = 'Consultivo e Técnico';
    if (qualification === 'quente') {
        approachType = 'Direta / Focada em Fechamento';
        tone = 'Persuasivo e Profissional';
    } else if (qualification === 'frio') {
        approachType = 'Relacional / Branding';
        tone = 'Geral e Educativo';
    }

    const triggers = ['Escalabilidade', 'Prova Social', 'Autoridade'];
    if (qualification === 'quente') triggers.push('Escassez / Urgência');

    // 3. Templates (Dynamic generation)
    const emailTemplates = [
        `Assunto: Oportunidade de escala para a ${name}\n\nOlá,\n\nNotei que a ${name} está em um momento de expansão no setor de ${segment}. Identificamos que a implementação de processos de inteligência comercial pode acelerar seus resultados em até 30%.\n\nPodemos agendar 15 minutos para eu te mostrar como outras empresas de ${segment} estão resolvendo a dor de ${pains[0]}?`,
        `Assunto: Insights Estratégicos - ${name}\n\nOlá,\n\nEstive analisando a presença digital da ${name} e vejo uma grande oportunidade em ${opportunities[0]}.\n\nTrabalhamos com soluções que podem ajudar exatamente nesse ponto. Teriam disponibilidade para um breve café virtual na próxima terça?`
    ];

    const linkedin = `Olá, notei sua atuação na ${name}. Acompanho o setor de ${segment} e gostaria de trocar alguns insights sobre como estamos ajudando empresas similares a superarem o desafio de ${pains[0]}. Vamos nos conectar?`;

    const whatsapp = `Olá! Sou da ${settings.company || 'OrcaLens'} e gostaria de falar rapidinho sobre uma oportunidade de melhoria que identifiquei para a ${name}. Você seria a pessoa certa para conversarmos sobre ${segment}?`;

    // 4. Action Plan
    const channels = ['LinkedIn', 'E-mail'];
    if (lead.telefone) channels.push('WhatsApp');

    const sequence = [
        'Dia 1: Solicitação de conexão personalizada no LinkedIn',
        'Dia 2: Envio do primeiro e-mail de abordagem consultiva',
        'Dia 4: Interação com postagem recente (se houver)',
        'Dia 6: Segundo e-mail (follow-up de valor)',
        'Dia 10: Mensagem curta via WhatsApp/Telefone'
    ];

    return {
        analysis: { pains, opportunities, maturity },
        strategy: {
            classification: `Lead do setor de ${segment}`,
            qualification,
            potential,
            priority,
            approachType,
            tone,
            triggers
        },
        templates: {
            email: emailTemplates,
            linkedin,
            whatsapp
        },
        actionPlan: {
            channels,
            sequence,
            bestTiming: 'Terça a Quinta, entre 10h e 11h30'
        }
    };
}
