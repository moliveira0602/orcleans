/**
 * ORCA Lens - Demo Data Service
 * 
 * Gera dados fictícios para demonstração e testes.
 * Útil para desenvolvimento sem custos de API.
 * 
 * Uso: scanService.ts seleciona esta fonte quando apiKey = 'demo'
 */

import type { Lead } from '../types';

export interface DemoDataConfig {
    segment: string;
    city: string;
    count: number;
}

// Sample data templates for different segments
const DEMO_DATA_TEMPLATES: Record<string, {
    names: string[];
    streets: string[];
    categories: string[];
    websites: string[];
}> = {
    'clínica médica': {
        names: [
            'Clínica Saúde Total', 'Centro Médico Olhão', 'Clínica Vida', 
            'Medical Center Algarve', 'Clínica Bem-Estar', 'Centro de Saúde Atlântico',
            'Clínica Familiar', 'Espaço Médico Ria', 'Clínica do Mar',
            'Centro Médico Peninsular', 'Clínica Lusitana', 'Saúde & Vida',
            'Clínica Medicina Avançada', 'Centro de Diagnóstico Sul', 'Clínica Esperança',
            'Medical Plus', 'Clínica do Trabalhador', 'Centro Médico Popular',
            'Clínica Integrada', 'Espaço da Saúde',
        ],
        streets: [
            'Rua da Liberdade', 'Avenida da República', 'Rua do Comércio',
            'Praça do Município', 'Rua Direita', 'Avenida 5 de Outubro',
            'Rua de Santo António', 'Largo do Chafariz', 'Rua Nova',
            'Avenida Marginal', 'Rua do Porto', 'Travessa da Praia',
        ],
        categories: ['Clínica Médica', 'Centro de Saúde', 'Consultório', 'Policlínica'],
        websites: ['clinicasaude.pt', 'centromedico.pt', 'clinicavida.pt', 'medicalcenter.pt'],
    },
    'restaurante': {
        names: [
            'Restaurante O Marisco', 'Taberna do Zé', 'Restaurante Sabor Algarvio',
            'Cantinho do Sabor', 'Restaurante Ria Formosa', 'Tasca do Chico',
            'Restaurante O Patrão', 'Casa de Pasto Regional', 'Restaurante Mar e Sol',
            'O Forno', 'Restaurante A Lezíria', 'Taberna Portuguesa',
            'Restaurante Quinta', 'Casa do Alentejo', 'Restaurante do Porto',
            'O Grelhado', 'Restaurante Sabores', 'Adega Típica',
            'Restaurante Vista Mar', 'Churrasqueira Central',
        ],
        streets: [
            'Rua da Liberdade', 'Avenida da República', 'Rua do Comércio',
            'Praça do Município', 'Rua Direita', 'Avenida 5 de Outubro',
            'Rua de Santo António', 'Largo do Chafariz', 'Rua Nova',
            'Avenida Marginal', 'Rua do Porto', 'Travessa da Praia',
        ],
        categories: ['Restaurante', 'Taberna', 'Casa de Pasto', 'Churrasqueira'],
        websites: ['restaurante.pt', 'taberna.pt', 'sabores.pt', 'gastronomia.pt'],
    },
    'pet shop': {
        names: [
            'Pet Shop Amigo Fiel', 'Centro Veterinário Patinhas', 'Mundo Animal',
            'Pet Center', 'Clínica Veterinária Animal', 'Pet Shop & Spa',
            'Casa dos Animais', 'Veterinária 24h', 'Pet Shop Central',
            'Animal Care', 'Pet Shop do Bairro', 'Centro Animal',
            'Veterinária Popular', 'Pet Shop Premium', 'Amigo Peludo',
            'Pet Shop & Clínica', 'Mundo Pet', 'Animal Store',
            'Pet Shop Online', 'Veterinária Regional',
        ],
        streets: [
            'Rua da Liberdade', 'Avenida da República', 'Rua do Comércio',
            'Praça do Município', 'Rua Direita', 'Avenida 5 de Outubro',
            'Rua de Santo António', 'Largo do Chafariz', 'Rua Nova',
            'Avenida Marginal', 'Rua do Porto', 'Travessa da Praia',
        ],
        categories: ['Pet Shop', 'Veterinária', 'Centro Veterinário', 'Pet Spa'],
        websites: ['petshop.pt', 'veterinaria.pt', 'animal.pt', 'petcare.pt'],
    },
};

// Generic fallback for unknown segments
const GENERIC_TEMPLATES = {
    names: [
        'Empresa Alfa', 'Comércio Beta', 'Serviços Gama', 'Loja Delta',
        'Negócio Épsilon', 'Estabelecimento Zeta', 'Centro Eta',
        'Espaço Theta', 'Ponto Iota', 'Casa Kappa',
    ],
    streets: [
        'Rua Principal', 'Avenida Central', 'Rua do Comércio',
        'Praça da Cidade', 'Rua Nova', 'Avenida Brasil',
    ],
    categories: ['Comércio', 'Serviços', 'Empresa'],
    websites: ['empresa.pt', 'servicos.pt', 'comercio.pt'],
};

export function generateDemoLeads(config: DemoDataConfig): Partial<Lead>[] {
    const template = DEMO_DATA_TEMPLATES[config.segment.toLowerCase()] || GENERIC_TEMPLATES;
    const leads: Partial<Lead>[] = [];
    const count = Math.min(config.count, 100);

    for (let i = 0; i < count; i++) {
        const name = template.names[i % template.names.length];
        const street = template.streets[Math.floor(Math.random() * template.streets.length)];
        const number = Math.floor(Math.random() * 200) + 1;
        const category = template.categories[Math.floor(Math.random() * template.categories.length)];
        const website = `www.${template.websites[Math.floor(Math.random() * template.websites.length)]}/${name.toLowerCase().replace(/\s+/g, '-')}`;
        
        // Generate realistic phone
        const phone = `+351 289 ${Math.floor(Math.random() * 900 + 100)}`;
        
        // Generate realistic rating (3.5 - 5.0 for demo)
        const rating = (3.5 + Math.random() * 1.5).toFixed(1);
        
        // Generate realistic reviews (10 - 500)
        const reviews = Math.floor(Math.random() * 490) + 10;

        const lead: Partial<Lead> = {
            nome: name,
            segmento: category,
            endereco: `${street}, ${number}`,
            cidade: config.city || 'Olhão',
            distrito_estado: 'Faro',
            codigo_postal: `${Math.floor(Math.random() * 8999) + 1000}-${Math.floor(Math.random() * 999) + 100}`,
            pais: 'Portugal',
            telefone: phone,
            website: `https://${website}`,
            avaliacao: parseFloat(rating),
            reviews: reviews,
            observacoes: `Demo gerado automaticamente para ${config.segment} em ${config.city}`,
            linkOrigem: `https://www.google.com/maps/search/${encodeURIComponent(name + ' ' + config.city)}`,
            _raw: { source: 'demo', index: i },
        };

        leads.push(lead);
    }

    return leads;
}

// ============================================================================
// DEMO SCAN RESULT
// ============================================================================

export interface DemoScanResult {
    success: boolean;
    totalFound: number;
    imported: number;
    duplicates: number;
    errors: number;
    leads: Lead[];
    cached: boolean;
    message: string;
}

export async function runDemoScan(
    segment: string,
    city: string,
    existingLeads: Lead[],
    onProgress?: (message: string) => void
): Promise<DemoScanResult> {
    const importId = `demo_${Date.now()}`;

    onProgress?.(`[DEMO] Iniciando scan fictício: ${segment} em ${city}...`);

    // Simulate delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    onProgress?.(`[DEMO] Buscando estabelecimentos...`);
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Generate demo data
    const demoLeads = generateDemoLeads({
        segment,
        city,
        count: Math.floor(Math.random() * 30) + 20, // 20-50 leads
    });

    onProgress?.(`[DEMO] ${demoLeads.length} estabelecimentos encontrados.`);

    // Deduplicate (simple check by name)
    const existingNames = new Set(existingLeads.map(l => l.nome?.toLowerCase()));
    const newLeads = demoLeads.filter(l => l.nome && !existingNames.has(l.nome.toLowerCase()));
    const duplicateCount = demoLeads.length - newLeads.length;

    onProgress?.(`[DEMO] ${duplicateCount} duplicados removidos.`);

    // Convert to full Lead objects
    const leads: Lead[] = newLeads.map((partial, i) => {
        const score = partial.avaliacao ? Math.min(10, (partial.avaliacao / 5) * 7 + 2) : 5;
        
        return {
            id: `demo_lead_${Date.now()}_${i}`,
            _score: Math.round(score * 10) / 10,
            _pipeline: 'novo',
            _importedAt: Date.now(),
            _importFile: `Demo: ${segment} em ${city}`,
            _importDate: new Date().toISOString(),
            _importId: importId,
            ...partial,
        } as Lead;
    });

    onProgress?.(`[DEMO] ${leads.length} leads criados com sucesso.`);

    const message = `[DEMO] Scan concluído: ${leads.length} novos, ${duplicateCount} duplicados.`;
    onProgress?.(message);

    return {
        success: true,
        totalFound: demoLeads.length,
        imported: leads.length,
        duplicates: duplicateCount,
        errors: 0,
        leads,
        cached: false,
        message,
    };
}

// ============================================================================
// DEMO CONFIG
// ============================================================================

export const DEMO_INSTRUCTIONS = `
MODO DEMONSTRAÇÃO

Este modo gera dados fictícios para teste da interface.
Não requer API Key e não tem custos.

Use digitando "demo" no campo da API Key.

Os dados gerados incluem:
- Nomes realistas de estabelecimentos
- Endereços completos
- Telefones e websites fictícios
- Ratings e reviews simulados
- Scores calculados automaticamente

Ideal para:
- Desenvolvimento
- Demonstração para clientes
- Testes de funcionalidades
- Prototipagem
`;