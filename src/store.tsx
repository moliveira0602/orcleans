import React, { createContext, useContext, useReducer, useEffect, type ReactNode } from 'react';
import type { Lead, ImportRecord, PipelineMap, AppSettings, AppState, ActivityEntry, PipelineStage, NoteEntry } from './types';
import { DEFAULT_SETTINGS } from './types';
import { loadLeadsDB, saveLeadsDB } from './utils/db';
import * as leadApi from './services/leads';
import { api } from './services/api';

const STORAGE_KEY = 'orcalens_meta';
const USE_BACKEND = api.isAuthenticated();

const initialState: AppState = {
    leads: [],
    imports: [],
    pipeline: { novo: [], qualificado: [], proposta: [], negociacao: [], ganho: [], perdido: [] },
    settings: { ...DEFAULT_SETTINGS },
    activities: [],
    isLoading: true,
};

function loadMeta(): Partial<AppState> {
    try {
        const s = localStorage.getItem(STORAGE_KEY);
        if (s) {
            const d = JSON.parse(s);
            void d.isLoading;
            void d.leads;
            const { isLoading, leads, ...rest } = d;
            return { ...rest, settings: { ...DEFAULT_SETTINGS, ...rest.settings } };
        }
    } catch { /* ignore */ }
    return {};
}

function saveMeta(state: AppState) {
    try {
        const { leads, isLoading, ...meta } = state;
        void leads; void isLoading;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(meta));
    } catch { /* ignore */ }
}

function leadFromBackendFormat(lead: any): Lead {
    return {
        id: lead.id,
        nome: lead.nome,
        segmento: lead.segmento,
        avaliacao: lead.avaliacao,
        reviews: lead.reviews,
        preco: lead.preco,
        endereco: lead.endereco,
        status: lead.status,
        horario: lead.horario,
        telefone: lead.telefone,
        website: lead.website,
        email: lead.email,
        servicos: lead.servicos || [],
        foto: lead.foto || '',
        fotos: lead.fotos || [],
        linkOrigem: lead.linkOrigem || '',
        linkPedido: lead.linkPedido || '',
        observacoes: lead.observacoes || '',
        _score: lead.score,
        _pipeline: lead.pipelineStage,
        _importedAt: lead.importDate ? new Date(lead.importDate).getTime() : Date.now(),
        _importFile: lead.importFile,
        _importDate: lead.importDate,
        _importId: lead.importId,
        _notes: lead.notes,
        _lat: lead.lat,
        _lng: lead.lng,
        _geocodeStatus: lead.geocodeStatus,
        _insight: lead.insight,
        _raw: lead.raw || {},
    };
}

/** Generate a fingerprint from key fields to detect duplicates */
export function leadFingerprint(lead: Record<string, unknown>): string {
    const name = String(lead.Name || lead.Nome || lead.name || lead.nome || '').toLowerCase().trim();
    const phone = String(Object.values(lead).find((v) => String(v).match(/\d{8,}/)) || '').replace(/\D/g, '');
    const email = String(Object.values(lead).find((v) => String(v).match(/@/)) || '').toLowerCase().trim();
    return `${name}|${phone}|${email}`;
}

type Action =
    | { type: 'IMPORT_LEADS'; payload: { leads: Lead[]; record: ImportRecord } }
    | { type: 'UPSERT_LEADS'; payload: { leads: Lead[]; record: ImportRecord; mode: 'skip' | 'update' } }
    | { type: 'ADD_LEAD'; payload: Lead }
    | { type: 'UPDATE_LEAD'; payload: { id: string; fields: Record<string, unknown> } }
    | { type: 'DELETE_LEAD'; payload: string }
    | { type: 'MOVE_PIPELINE'; payload: { leadId: string; stage: PipelineStage } }
    | { type: 'UPDATE_SETTINGS'; payload: Partial<AppSettings> }
    | { type: 'CLEAR_ALL' }
    | { type: 'ADD_ACTIVITY'; payload: ActivityEntry }
    | { type: 'ADD_NOTE'; payload: { leadId: string; note: NoteEntry } }
    | { type: 'UPDATE_LEAD_SCORES'; payload: Lead[] }
    | { type: 'SET_STATE'; payload: AppState }
    | { type: 'FINISH_LOADING'; payload: Lead[] }
    | { type: 'DELETE_IMPORT'; payload: string };

function reducer(state: AppState, action: Action): AppState {
    switch (action.type) {
        case 'FINISH_LOADING': {
            const rebuilt: PipelineMap = { novo: [], qualificado: [], proposta: [], negociacao: [], ganho: [], perdido: [] };
            for (const lead of action.payload) {
                const stage = lead._pipeline as PipelineStage;
                if (stage && rebuilt[stage] !== undefined) {
                    rebuilt[stage].push(lead.id);
                } else {
                    rebuilt.novo.push(lead.id);
                }
            }
            return { ...state, leads: action.payload, pipeline: rebuilt, isLoading: false };
        }
        case 'IMPORT_LEADS': {
            const newLeads = [...state.leads, ...action.payload.leads];
            const newImports = [...state.imports, action.payload.record];
            const newPipeline = { ...state.pipeline };
            newPipeline.novo = [...newPipeline.novo, ...action.payload.leads.map((l) => l.id)];
            return { ...state, leads: newLeads, imports: newImports, pipeline: newPipeline };
        }
        case 'UPSERT_LEADS': {
            const { leads: incoming, record, mode } = action.payload;
            const existingFPs = new Map(state.leads.map((l) => [leadFingerprint(l), l.id]));
            let added = 0;
            let updated = 0;
            let newLeads = [...state.leads];
            const newPipeline = { ...state.pipeline, novo: [...state.pipeline.novo] };

            for (const lead of incoming) {
                const fp = leadFingerprint(lead);
                const existingId = existingFPs.get(fp);
                if (existingId && fp !== '||') {
                    if (mode === 'update') {
                        newLeads = newLeads.map((l) =>
                            l.id === existingId ? { ...l, ...lead, id: existingId, _pipeline: l._pipeline } : l
                        );
                        updated++;
                    }
                } else {
                    newLeads.push(lead);
                    newPipeline.novo.push(lead.id);
                    added++;
                }
            }
            const newRecord = { ...record, rows: added, count: added };
            return { ...state, leads: newLeads, imports: [...state.imports, newRecord], pipeline: newPipeline };
        }
        case 'ADD_LEAD': {
            const newPipeline = { ...state.pipeline };
            newPipeline.novo = [...newPipeline.novo, action.payload.id];
            return { ...state, leads: [...state.leads, action.payload], pipeline: newPipeline };
        }
        case 'UPDATE_LEAD': {
            const { id, fields } = action.payload;
            return {
                ...state,
                leads: state.leads.map((l) => l.id === id ? { ...l, ...fields } : l),
            };
        }
        case 'DELETE_LEAD': {
            const id = action.payload;
            const newPipeline: PipelineMap = { novo: [], qualificado: [], proposta: [], negociacao: [], ganho: [], perdido: [] };
            (Object.keys(state.pipeline) as PipelineStage[]).forEach((k) => {
                newPipeline[k] = state.pipeline[k].filter((lid) => lid !== id);
            });
            return { ...state, leads: state.leads.filter((l) => l.id !== id), pipeline: newPipeline };
        }
        case 'MOVE_PIPELINE': {
            const { leadId, stage } = action.payload;
            const newPipeline: PipelineMap = { novo: [], qualificado: [], proposta: [], negociacao: [], ganho: [], perdido: [] };
            (Object.keys(state.pipeline) as PipelineStage[]).forEach((k) => {
                newPipeline[k] = state.pipeline[k].filter((lid) => lid !== leadId);
            });
            newPipeline[stage].push(leadId);
            const newLeads = state.leads.map((l) =>
                l.id === leadId ? { ...l, _pipeline: stage } : l
            );
            return { ...state, leads: newLeads, pipeline: newPipeline };
        }
        case 'UPDATE_SETTINGS':
            return { ...state, settings: { ...state.settings, ...action.payload } };
        case 'CLEAR_ALL':
            return {
                ...state,
                leads: [],
                imports: [],
                pipeline: { novo: [], qualificado: [], proposta: [], negociacao: [], ganho: [], perdido: [] },
                activities: [],
            };
        case 'DELETE_IMPORT': {
            const importId = action.payload;
            const importToDelete = state.imports.find(i => i.id === importId);
            if (!importToDelete) return state;
            
            const newLeads = state.leads.filter(l => l._importId !== importId);
            const newImports = state.imports.filter(i => i.id !== importId);
            
            const newPipeline: PipelineMap = { novo: [], qualificado: [], proposta: [], negociacao: [], ganho: [], perdido: [] };
            (Object.keys(state.pipeline) as PipelineStage[]).forEach((k) => {
                newPipeline[k] = state.pipeline[k].filter((lid) => newLeads.some(l => l.id === lid));
            });
            
            return { ...state, leads: newLeads, imports: newImports, pipeline: newPipeline };
        }
        case 'ADD_ACTIVITY':
            return { ...state, activities: [action.payload, ...state.activities].slice(0, 30) };
        case 'ADD_NOTE': {
            const { leadId, note } = action.payload;
            return {
                ...state,
                leads: state.leads.map((l) =>
                    l.id === leadId ? { ...l, _notes: [note, ...(l._notes || [])] } : l
                ),
            };
        }
        case 'UPDATE_LEAD_SCORES':
            return { ...state, leads: action.payload };
        case 'SET_STATE':
            return { ...action.payload, isLoading: false };
        default:
            return state;
    }
}

interface AppContextType {
    state: AppState;
    dispatch: React.Dispatch<Action>;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
    const [state, dispatch] = useReducer(reducer, { ...initialState, ...loadMeta() });

    useEffect(() => {
        if (USE_BACKEND) {
            leadApi.fetchLeads({ page: 1, limit: 10000, sortBy: 'createdAt', sortOrder: 'desc' })
                .then((res) => {
                    const leads = res.leads.map(leadFromBackendFormat);
                    dispatch({ type: 'FINISH_LOADING', payload: leads });
                })
                .catch(() => {
                    loadLeadsDB().then((leads) => {
                        dispatch({ type: 'FINISH_LOADING', payload: leads });
                    }).catch(() => {
                        dispatch({ type: 'FINISH_LOADING', payload: [] });
                    });
                });
        } else {
            loadLeadsDB().then((leads) => {
                if (leads.length === 0) {
                    const demoLeads: Lead[] = [
                        {
                            id: 'demo-1',
                            nome: 'Clínica Saúde Olhão',
                            segmento: 'Clínica Médica',
                            avaliacao: 4.5,
                            reviews: 127,
                            preco: '€€',
                            endereco: 'Rua Dr. Francisco Sá Carneiro, Olhão',
                            status: 'Ativo',
                            horario: '09:00-19:00',
                            telefone: '+351 289 123 456',
                            website: 'https://clinicasaude.pt',
                            email: 'info@clinicasaude.pt',
                            servicos: ['Consultas', 'Exames', 'Urgência'],
                            foto: '',
                            fotos: [],
                            linkOrigem: '',
                            linkPedido: '',
                            observacoes: '',
                            _score: 9,
                            _pipeline: 'novo',
                            _importedAt: Date.now(),
                            _importFile: undefined,
                            _importDate: undefined,
                            _importId: undefined,
                            _notes: [],
                            _lat: 37.0267,
                            _lng: -7.8369,
                            _geocodeStatus: 'ok',
                            _insight: undefined,
                            _raw: {},
                        },
                        {
                            id: 'demo-2',
                            nome: 'Restaurante Marisqueira Ria',
                            segmento: 'Restaurante',
                            avaliacao: 4.8,
                            reviews: 342,
                            preco: '€€€',
                            endereco: 'Cais da Ria Formosa, Olhão',
                            status: 'Ativo',
                            horario: '12:00-23:00',
                            telefone: '+351 289 789 012',
                            website: 'https://marisqueiraria.pt',
                            email: 'reservas@marisqueiraria.pt',
                            servicos: ['Marisco', 'Peixe fresco', 'Eventos'],
                            foto: '',
                            fotos: [],
                            linkOrigem: '',
                            linkPedido: '',
                            observacoes: '',
                            _score: 7,
                            _pipeline: 'qualificado',
                            _importedAt: Date.now(),
_importFile: undefined,
                            _importDate: undefined,
                            _importId: undefined,
                            _notes: [],
                            _lat: 37.0267,
                            _lng: -7.8369,
                            _geocodeStatus: 'ok',
                            _insight: undefined,
                            _raw: {},
                        },
                        {
                            id: 'demo-3',
                            nome: 'Pet Shop Patinhas',
                            segmento: 'Pet Shop',
                            avaliacao: 4.2,
                            reviews: 89,
                            preco: '€€',
                            endereco: 'Av. da República, Porto',
                            status: 'Ativo',
                            horario: '09:00-20:00',
                            telefone: '+351 22 345 6789',
                            website: 'https://patinhas.pt',
                            email: 'loja@patinhas.pt',
                            servicos: ['Banho', 'Tosa', 'Veterinário'],
                            foto: '',
                            fotos: [],
                            linkOrigem: '',
                            linkPedido: '',
                            observacoes: '',
                            _score: 5,
                            _pipeline: 'proposta',
                            _importedAt: Date.now(),
                            _importFile: undefined,
                            _importDate: undefined,
                            _importId: undefined,
                            _notes: [],
                            _lat: 41.1579,
                            _lng: -8.6291,
                            _geocodeStatus: 'ok',
                            _insight: undefined,
                            _raw: {},
                        },
                    ];
                    dispatch({ type: 'FINISH_LOADING', payload: demoLeads });
                } else {
                    dispatch({ type: 'FINISH_LOADING', payload: leads });
                }
            }).catch(() => {
                dispatch({ type: 'FINISH_LOADING', payload: [] });
            });
        }
    }, []);

    useEffect(() => {
        if (!state.isLoading) saveMeta(state);
    }, [state]);

    useEffect(() => {
        if (!state.isLoading && !USE_BACKEND) {
            saveLeadsDB(state.leads);
        }
    }, [state.leads, state.isLoading]);

    return <AppContext.Provider value={{ state, dispatch }}>{children}</AppContext.Provider>;
}

export function useApp() {
    const ctx = useContext(AppContext);
    if (!ctx) throw new Error('useApp must be used within AppProvider');
    return ctx;
}

export function useAppState() {
    return useApp().state;
}

export function useAppDispatch() {
    return useApp().dispatch;
}
