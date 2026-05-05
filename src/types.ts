export type PipelineStage = 'novo' | 'qualificado' | 'proposta' | 'negociacao' | 'ganho' | 'perdido';

export interface NoteEntry {
    text: string;
    date: string;
}

export interface LeadInsight {
    analysis: {
        pains: string[];
        opportunities: string[];
        maturity: 'baixa' | 'media' | 'alta';
    };
    strategy: {
        classification: string;
        qualification: 'frio' | 'morno' | 'quente';
        potential: number; // 0-100
        priority: 'baixa' | 'media' | 'alta';
        approachType: string;
        tone: string;
        triggers: string[];
    };
    templates: {
        email: string[];
        linkedin: string;
        whatsapp: string;
    };
    actionPlan: {
        channels: string[];
        sequence: string[];
        bestTiming: string;
    };
}

export interface Lead {
    // --- Platform internal ---
    id: string;
    _insight?: LeadInsight;
    _score: number;
    _pipeline: PipelineStage;
    _importedAt: number;
    _importFile?: string;
    _importDate?: string;
    _importId?: string;
    _notes?: NoteEntry[];
    _lastContact?: string;
    _lat?: number;
    _lng?: number;
    _geocodeStatus?: 'pending' | 'ok' | 'failed';
    
    // New functional fields
    outcomeScore?: number;
    lastOutcome?: string;
    presenca?: {
        hasInstagram: boolean;
        hasFacebook: boolean;
        hasPixel: boolean;
        instagramUrl?: string;
        facebookUrl?: string;
    };
    
    // Canonical backend fields
    score?: number;
    pipelineStage?: PipelineStage;
    importFile?: string;
    importDate?: string;
    importId?: string;
    notes?: NoteEntry[];
    raw?: Record<string, any>;
    lastContact?: string;
    lat?: number;
    lng?: number;
    geocodeStatus?: 'pending' | 'ok' | 'failed';
    insight?: LeadInsight;
    createdAt?: string;
    updatedAt?: string;

    // --- FIXED display columns (always shown, always in Portuguese) ---
    nome: string;           // Business/person name
    segmento: string;       // Segment or business type
    avaliacao: number | null;      // Star rating (0–5)
    reviews: number | null;        // Number of reviews/interactions
    preco: string;          // Price range or deal value (ex: "15-20€" or "R$500")
    endereco: string;       // Full address
    cidade: string;         // City
    status: string;         // "Aberto" / "Fechado" / "Ativo" / "Inativo"
    horario: string;        // Opening hours or closing time
    telefone: string;       // Phone number
    website: string;        // Website URL
    email: string;          // Contact email
    servicos: string[];     // Services offered (array)
    foto: string;           // Photo URL (thumbnail)
    fotos: string[];        // Array of photo URLs (from Google/Foursquare)
    linkOrigem: string;     // Source URL (Google Maps, LinkedIn, etc.)
    linkPedido: string;     // Order/contact URL
    observacoes: string;    // Free notes field

    // --- Keep raw original for reference ---
    _raw: Record<string, any>;
    
    // Allow additional dynamic fields
    [key: string]: unknown;
}

export interface ImportRecord {
    id: string;
    name: string;
    file: string;
    rows: number;
    cols: number;
    date: string;
    count: number;
}

export type ToneOfVoice = 'formal' | 'casual' | 'persuasivo' | 'tecnico';

export interface AppSettings {
    name: string;
    email: string;
    company: string;
    hotThreshold: number;
    warmThreshold: number;
    toneOfVoice?: ToneOfVoice;
    socialEnrichment?: boolean;
    notifHot?: boolean;
    notifDaily?: boolean;
}

export interface PipelineMap {
    novo: string[];
    qualificado: string[];
    proposta: string[];
    negociacao: string[];
    ganho: string[];
    perdido: string[];
}

export interface ActivityEntry {
    title: string;
    sub: string;
    icon: string;
    time: string;
    channel?: string;
}

export type ContactChannel = 'telefone' | 'email' | 'whatsapp';

export interface ActivityResponse {
    id: string;
    channel: string;
    title: string;
    sub: string;
    icon: string;
    createdAt: string;
    userName: string;
}

export interface AppState {
    leads: Lead[];
    imports: ImportRecord[];
    pipeline: PipelineMap;
    settings: AppSettings;
    activities: ActivityEntry[];
    isLoading: boolean;
}

export interface PipelineColumnDef {
    id: PipelineStage;
    label: string;
    color: string;
}

export const PIPELINE_COLS: PipelineColumnDef[] = [
    { id: 'novo', label: 'Novo', color: '#64748B' },
    { id: 'qualificado', label: 'Qualificado', color: '#3B82F6' },
    { id: 'proposta', label: 'Proposta', color: '#F59E0B' },
    { id: 'negociacao', label: 'Negociação', color: '#8B5CF6' },
    { id: 'ganho', label: 'Ganho', color: '#10B981' },
    { id: 'perdido', label: 'Perdido', color: '#EF4444' },
];

export const DEFAULT_SETTINGS: AppSettings = {
    name: 'Usuário',
    email: '',
    company: '',
    hotThreshold: 7,
    warmThreshold: 4,
    toneOfVoice: 'casual',
    socialEnrichment: true,
    notifHot: true,
    notifDaily: false,
};
