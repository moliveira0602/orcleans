export type PipelineStage = 'novo' | 'qualificado' | 'proposta' | 'negociacao' | 'ganho' | 'perdido';

export interface NoteEntry {
    text: string;
    date: string;
}

export interface Lead {
    id: string;
    _score: number;
    _pipeline: PipelineStage;
    _importFile: string;
    _importDate: string;
    _notes?: NoteEntry[];
    [key: string]: unknown;
}

export interface ImportRecord {
    file: string;
    rows: number;
    cols: number;
    date: string;
    count: number;
}

export interface AppSettings {
    name: string;
    email: string;
    company: string;
    hotThreshold: number;
    warmThreshold: number;
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
}

export interface AppState {
    leads: Lead[];
    imports: ImportRecord[];
    pipeline: PipelineMap;
    settings: AppSettings;
    activities: ActivityEntry[];
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
};
