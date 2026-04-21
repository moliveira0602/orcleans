/**
 * Column Mapper - Maps common column names to standard ORCA columns
 */

// Standard ORCA columns
export const STANDARD_COLUMNS = {
    nome: 'Nome',
    segmento: 'Segmento',
    avaliacao: 'Avaliação',
    reviews: 'Reviews',
    preco: 'Preço',
    endereco: 'Endereço',
    cidade: 'Cidade',
    status: 'Status',
    horario: 'Horário',
    telefone: 'Telefone',
    website: 'Website',
    email: 'Email',
    servicos: 'Serviços',
    foto: 'Foto',
    fotos: 'Fotos',
    linkOrigem: 'Link Origem',
    linkPedido: 'Link Pedido',
    observacoes: 'Observações',
} as const;

export type StandardColumnKey = keyof typeof STANDARD_COLUMNS;

// Column name variations that map to each standard column
const COLUMN_MAPPINGS: Record<StandardColumnKey, string[]> = {
    nome: ['nome', 'name', 'empresa', 'company', 'business', 'razao social', 'razão social', 'fantasia', 'trade name', 'titulo', 'title', 'estabelecimento'],
    segmento: ['segmento', 'segment', 'categoria', 'category', 'tipo', 'type', 'nicho', 'niche', 'area', 'ramo', 'atividade', 'industry'],
    avaliacao: ['avaliacao', 'avaliação', 'rating', 'stars', 'estrelas', 'nota', 'score', 'grade', 'classificacao', 'classificação'],
    reviews: ['reviews', 'avaliacoes', 'avaliações', 'comentarios', 'comments', 'feedback', 'opiniao', 'opinião', 'num_reviews', 'total_reviews', 'qtd_reviews'],
    preco: ['preco', 'preço', 'price', 'valor', 'cost', 'ticket', 'faixa_preco', 'faixa de preco', 'faixa de preço', 'price_range'],
    endereco: ['endereco', 'endereço', 'address', 'localizacao', 'localização', 'local', 'location', 'morada', 'bairro', 'neighborhood'],
    cidade: ['cidade', 'city', 'vil', 'town', 'localidade', 'municipio', 'município', 'concelho'],
    status: ['status', 'situacao', 'situação', 'state', 'aberto', 'open', 'fechado', 'closed', 'ativo', 'active', 'condicao', 'condição'],
    horario: ['horario', 'horário', 'hours', 'opening_hours', 'funcionamento', 'abertura', 'fechamento', 'schedule', 'expediente'],
    telefone: ['telefone', 'phone', 'tel', 'contato', 'contact', 'whatsapp', 'zap', 'celular', 'mobile', 'fone', 'number', 'numero'],
    website: ['website', 'site', 'url', 'link', 'home', 'homepage', 'pagina', 'página', 'web', 'www'],
    email: ['email', 'e-mail', 'mail', 'correio', 'contato_email', 'contato email'],
    servicos: ['servicos', 'serviços', 'services', 'specialties', 'especialidades', 'ofertas', 'offers', 'produtos', 'products'],
    foto: ['foto', 'photo', 'image', 'imagem', 'picture', 'avatar', 'logo', 'capa', 'cover'],
    fotos: ['fotos', 'photos', 'images', 'imagens', 'pictures', 'galeria', 'gallery', 'album'],
    linkOrigem: ['link_origem', 'linkorigem', 'source_url', 'source', 'origem', 'origin', 'url_origem', 'url origem', 'pagina_origem', 'pagina origem'],
    linkPedido: ['link_pedido', 'linkpedido', 'order_url', 'order', 'pedido', 'delivery_link', 'delivery', 'iFood', 'ifood', 'uber_eats', 'ubereats'],
    observacoes: ['observacoes', 'observações', 'notes', 'notas', 'obs', 'descricao', 'descrição', 'description', 'detalhes', 'details', 'comentarios', 'comments'],
};

/**
 * Normalize a column name for comparison
 */
function normalizeColumnName(name: string): string {
    return name
        .toLowerCase()
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove accents
        .replace(/[_\-\s]+/g, ' ') // Normalize separators
        .replace(/[^\w\s]/g, ''); // Remove special chars
}

/**
 * Try to map a column name to a standard ORCA column
 */
export function mapColumnName(columnName: string): StandardColumnKey | null {
    const normalized = normalizeColumnName(columnName);
    
    for (const [key, variations] of Object.entries(COLUMN_MAPPINGS)) {
        for (const variation of variations) {
            if (normalized === variation || normalized.includes(variation) || variation.includes(normalized)) {
                return key as StandardColumnKey;
            }
        }
    }
    
    return null;
}

/**
 * Analyze columns from imported data and create mapping
 */
export interface ColumnMapping {
    originalName: string;
    standardKey: StandardColumnKey | null;
    isStandard: boolean;
    suggestedName: string;
}

export function analyzeColumns(columns: string[]): ColumnMapping[] {
    const mappings: ColumnMapping[] = [];
    const usedStandardKeys = new Set<StandardColumnKey>();
    
    for (const col of columns) {
        const standardKey = mapColumnName(col);
        
        // Check if this standard key was already used
        if (standardKey && usedStandardKeys.has(standardKey)) {
            // Create a generic name for duplicate standard columns
            mappings.push({
                originalName: col,
                standardKey: null,
                isStandard: false,
                suggestedName: generateGenericName(col, mappings),
            });
        } else {
            if (standardKey) {
                usedStandardKeys.add(standardKey);
            }
            
            mappings.push({
                originalName: col,
                standardKey,
                isStandard: standardKey !== null,
                suggestedName: standardKey ? STANDARD_COLUMNS[standardKey] : col,
            });
        }
    }
    
    return mappings;
}

/**
 * Generate a generic column name for unmapped columns
 */
function generateGenericName(originalName: string, existingMappings: ColumnMapping[]): string {
    const genericCount = existingMappings.filter(m => m.suggestedName.startsWith('Coluna ')).length;
    return `Coluna ${genericCount + 1}`;
}

/**
 * Get summary of column analysis
 */
export interface ColumnAnalysisSummary {
    totalColumns: number;
    mappedColumns: number;
    unmappedColumns: number;
    hasInconsistencies: boolean;
    mappings: ColumnMapping[];
}

export function getColumnAnalysisSummary(columns: string[]): ColumnAnalysisSummary {
    const mappings = analyzeColumns(columns);
    const mappedColumns = mappings.filter(m => m.isStandard).length;
    const unmappedColumns = mappings.filter(m => !m.isStandard).length;
    
    return {
        totalColumns: columns.length,
        mappedColumns,
        unmappedColumns,
        hasInconsistencies: unmappedColumns > 0,
        mappings,
    };
}