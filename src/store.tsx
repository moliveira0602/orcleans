import React, { createContext, useContext, useReducer, useEffect, type ReactNode } from 'react';
import type { Lead, ImportRecord, PipelineMap, AppSettings, AppState, ActivityEntry, PipelineStage, NoteEntry } from './types';
import { DEFAULT_SETTINGS } from './types';
import { loadLeadsDB, saveLeadsDB } from './utils/db';

const STORAGE_KEY = 'orcalens_meta';

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
            return { ...d, settings: { ...DEFAULT_SETTINGS, ...d.settings } };
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
    | { type: 'FINISH_LOADING'; payload: Lead[] };

function reducer(state: AppState, action: Action): AppState {
    switch (action.type) {
        case 'FINISH_LOADING':
            return { ...state, leads: action.payload, isLoading: false };
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

    // Load leads from IndexedDB on mount
    useEffect(() => {
        loadLeadsDB().then((leads) => {
            dispatch({ type: 'FINISH_LOADING', payload: leads });
        }).catch(() => {
            dispatch({ type: 'FINISH_LOADING', payload: [] });
        });
    }, []);

    // Save meta to localStorage
    useEffect(() => {
        if (!state.isLoading) saveMeta(state);
    }, [state]);

    // Save leads to IndexedDB periodically or on change
    useEffect(() => {
        if (!state.isLoading) {
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
