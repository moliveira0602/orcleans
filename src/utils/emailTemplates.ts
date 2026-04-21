export interface EmailTemplate {
    id: string;
    name: string;
    subject: string;
    body: string;
}

const DEFAULT_TEMPLATES: EmailTemplate[] = [
    {
        id: 'primeiro_contato',
        name: 'Primeiro contato',
        subject: 'Olá {{nome}}, vamos conversar sobre oportunidades?',
        body: `Prezado(a) {{nome}},

Sou consultor na área de {{segmento}} e identifiquei sua empresa {{nome}} em {{cidade}} como uma oportunidade interessante.

Gostaria de agendar uma breve conversa para entender os seus desafios e apresentar como podemos ajudar no crescimento do seu negócio.

Quando seria um bom momento?

Atenciosamente`,
    },
    {
        id: 'follow_up',
        name: 'Follow-up',
        subject: 'Acompanhamento — {{nome}}',
        body: `Olá {{nome}},

Gostaria de dar seguimento à nossa conversa anterior.

Ainda temos oportunidades interessantes para {{segmento}} na região de {{cidade}}.

Podemos retomar o diálogo?

Abraço`,
    },
    {
        id: 'reativacao',
        name: 'Reativação',
        subject: '{{nome}}, ainda faz sentido conversarmos?',
        body: `Olá {{nome}},

Notei que não tivemos retorno nas últimas tentativas e queria saber se ainda faz sentido continuarmos o diálogo.

Se não for o momento ideal, sem problemas — podemos reconectar no futuro.

Se houver interesse, estou à disposição.

Atenciosamente`,
    },
];

export function getTemplates(): EmailTemplate[] {
    const stored = localStorage.getItem('orca_email_templates');
    if (stored) {
        try {
            return JSON.parse(stored);
        } catch {
            // corrupted, fall back to defaults
        }
    }
    return DEFAULT_TEMPLATES;
}

export function saveTemplates(templates: EmailTemplate[]) {
    localStorage.setItem('orca_email_templates', JSON.stringify(templates));
}

export function renderTemplate(template: EmailTemplate, lead: Record<string, any>): { subject: string; body: string } {
    const vars: Record<string, string> = {
        nome: String(lead.nome || lead.name || ''),
        segmento: String(lead.segmento || lead.category || lead.segment || ''),
        cidade: String(lead.cidade || lead.city || ''),
        telefone: String(lead.telefone || lead.phone || ''),
        empresa: String(lead.nome || lead.name || lead.company || ''),
    };

    let subject = template.subject;
    let body = template.body;

    for (const [key, value] of Object.entries(vars)) {
        const re = new RegExp(`{{${key}}}`, 'g');
        subject = subject.replace(re, value || '(não disponível)');
        body = body.replace(re, value || '(não disponível)');
    }

    return { subject, body };
}
