import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { Lead, ImportRecord, PipelineMap, AppSettings, AppState, ActivityEntry, PipelineStage, NoteEntry } from './types';
import { DEFAULT_SETTINGS } from './types';
import * as leadApi from './services/leads';
import { api } from './services/api';

const USE_BACKEND = api.isAuthenticated();

const initialState: AppState = {
    leads: [],
    imports: [],
    pipeline: { novo: [], qualificado: [], proposta: [], negociacao: [], ganho: [], perdido: [] },
    settings: { ...DEFAULT_SETTINGS },
    activities: [],
    isLoading: true,
};

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

export function leadFingerprint(lead: Record<string, unknown>): string {
    const name = String(lead.Name || lead.Nome || lead.name || lead.nome || '').toLowerCase().trim();
    const phone = String(Object.values(lead).find((v) => String(v).match(/\d{8,}/)) || '').replace(/\D/g, '');
    const email = String(Object.values(lead).find((v) => String(v).match(/@/)) || '').toLowerCase().trim();
    return `${name}|${phone}|${email}`;
}

type Action =
    | { type: 'IMPORT_LEADS'; payload: { leads: Lead[]; record: ImportRecord } }
    | { type: 'ADD_LEAD'; payload: Lead }
    | { type: 'UPDATE_LEAD'; payload: { id: string; fields: Record<string, unknown> } }
    | { type: 'DELETE_LEAD'; payload: string }
    | { type: 'MOVE_PIPELINE'; payload: { leadId: string; stage: PipelineStage } }
    | { type: 'UPDATE_SETTINGS'; payload: Partial<AppSettings> }
    | { type: 'CLEAR_ALL' }
    | { type: 'ADD_ACTIVITY'; payload: ActivityEntry }
    | { type: 'ADD_NOTE'; payload: { leadId: string; note: NoteEntry } }
    | { type: 'SET_LEADS'; payload: Lead[] }
    | { type: 'SET_LOADING'; payload: boolean };

interface AppContextType {
    state: AppState;
    dispatch: React.Dispatch<Action>;
    refreshLeads: () => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<AppState>(initialState);

    const updateState = useCallback((updates: Partial<AppState>) => {
        setState(prev => ({ ...prev, ...updates }));
    }, []);

    // Load leads from server ONLY
    const refreshLeads = useCallback(async () => {
        if (!USE_BACKEND) {
            updateState({ leads: [], pipeline: { novo: [], qualificado: [], proposta: [], negociacao: [], ganho: [], perdido: [] }, isLoading: false });
            return;
        }

        try {
            const res = await leadApi.fetchLeads({ page: 1, limit: 10000, sortBy: 'createdAt', sortOrder: 'desc' });
            const leads = res.leads.map(leadFromBackendFormat);

            const pipeline: PipelineMap = { novo: [], qualificado: [], proposta: [], negociacao: [], ganho: [], perdido: [] };
            for (const lead of leads) {
                const stage = lead._pipeline as PipelineStage;
                if (stage && pipeline[stage] !== undefined) {
                    pipeline[stage].push(lead.id);
                } else {
                    pipeline.novo.push(lead.id);
                }
            }

            updateState({ leads, pipeline, isLoading: false });
        } catch (err) {
            console.error('Failed to load leads from server:', err);
            updateState({ isLoading: false });
        }
    }, [updateState]);

    // Initial load from server
    useEffect(() => {
        refreshLeads();
    }, [refreshLeads]);

    const dispatch = useCallback((action: Action) => {
        switch (action.type) {
            case 'SET_LEADS': {
                const pipeline: PipelineMap = { novo: [], qualificado: [], proposta: [], negociacao: [], ganho: [], perdido: [] };
                for (const lead of action.payload) {
                    const stage = lead._pipeline as PipelineStage;
                    if (stage && pipeline[stage] !== undefined) {
                        pipeline[stage].push(lead.id);
                    } else {
                        pipeline.novo.push(lead.id);
                    }
                }
                updateState({ leads: action.payload, pipeline });
                break;
            }
            case 'ADD_LEAD': {
                setState(prev => {
                    const newPipeline = { ...prev.pipeline };
                    newPipeline.novo = [...newPipeline.novo, action.payload.id];
                    return { ...prev, leads: [...prev.leads, action.payload], pipeline: newPipeline };
                });
                break;
            }
            case 'UPDATE_LEAD': {
                const { id, fields } = action.payload;
                setState(prev => ({
                    ...prev,
                    leads: prev.leads.map((l) => l.id === id ? { ...l, ...fields } : l),
                }));
                break;
            }
            case 'DELETE_LEAD': {
                const id = action.payload;
                setState(prev => {
                    const newPipeline: PipelineMap = { novo: [], qualificado: [], proposta: [], negociacao: [], ganho: [], perdido: [] };
                    (Object.keys(prev.pipeline) as PipelineStage[]).forEach((k) => {
                        newPipeline[k] = prev.pipeline[k].filter((lid) => lid !== id);
                    });
                    return { ...prev, leads: prev.leads.filter((l) => l.id !== id), pipeline: newPipeline };
                });
                break;
            }
            case 'MOVE_PIPELINE': {
                const { leadId, stage } = action.payload;
                setState(prev => {
                    const newPipeline: PipelineMap = { novo: [], qualificado: [], proposta: [], negociacao: [], ganho: [], perdido: [] };
                    (Object.keys(prev.pipeline) as PipelineStage[]).forEach((k) => {
                        newPipeline[k] = prev.pipeline[k].filter((lid) => lid !== leadId);
                    });
                    newPipeline[stage].push(leadId);
                    const newLeads = prev.leads.map((l) =>
                        l.id === leadId ? { ...l, _pipeline: stage } : l
                    );
                    return { ...prev, leads: newLeads, pipeline: newPipeline };
                });
                break;
            }
            case 'UPDATE_SETTINGS':
                updateState({ settings: { ...state.settings, ...action.payload } });
                break;
            case 'ADD_ACTIVITY':
                updateState({ activities: [action.payload, ...state.activities].slice(0, 30) });
                break;
            case 'ADD_NOTE': {
                const { leadId, note } = action.payload;
                setState(prev => ({
                    ...prev,
                    leads: prev.leads.map((l) =>
                        l.id === leadId ? { ...l, _notes: [note, ...(l._notes || [])] } : l
                    ),
                }));
                break;
            }
            case 'SET_LOADING':
                updateState({ isLoading: action.payload });
                break;
            case 'IMPORT_LEADS':
            case 'CLEAR_ALL':
                // These should trigger server sync in the calling component
                break;
        }
    }, [updateState, state.settings, state.activities]);

    return <AppContext.Provider value={{ state, dispatch, refreshLeads }}>{children}</AppContext.Provider>;
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
