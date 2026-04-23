import { api } from './api';

import type { Lead } from '../types';

export interface LeadsResponse {
  leads: Lead[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface DashboardMetrics {
  total: number;
  byStage: Record<string, number>;
  hotLeads: number;
  warmLeads: number;
  coldLeads: number;
  recentActivities: Array<{
    id: string;
    title: string;
    sub: string;
    icon: string;
    time: string;
    userName: string;
    leadName: string | null;
  }>;
}

export async function fetchLeads(params?: {
  page?: number;
  limit?: number;
  search?: string;
  pipelineStage?: string;
  scoreMin?: number;
  scoreMax?: number;
  segmento?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}): Promise<LeadsResponse> {
  const queryParams = new URLSearchParams();
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.search) queryParams.append('search', params.search);
  if (params?.pipelineStage) queryParams.append('pipelineStage', params.pipelineStage);
  if (params?.scoreMin !== undefined) queryParams.append('scoreMin', params.scoreMin.toString());
  if (params?.scoreMax !== undefined) queryParams.append('scoreMax', params.scoreMax.toString());
  if (params?.segmento) queryParams.append('segmento', params.segmento);
  if (params?.sortBy) queryParams.append('sortBy', params.sortBy);
  if (params?.sortOrder) queryParams.append('sortOrder', params.sortOrder);
  
  // Burlar cache da Vercel
  queryParams.append('_cb', Date.now().toString());

  return api.get<LeadsResponse>(`/leads?${queryParams.toString()}`);
}

export async function fetchLeadById(id: string): Promise<Lead> {
  return api.get<Lead>(`/leads/${id}`);
}

export async function createLead(data: Partial<Lead>): Promise<Lead> {
  return api.post<Lead>('/leads', data);
}

export async function createLeadsBulk(leads: Partial<Lead>[]): Promise<{ count: number }> {
  const mapped = leads.map(lead => ({
    nome: lead.nome || '',
    segmento: lead.segmento || '',
    avaliacao: lead.avaliacao,
    reviews: lead.reviews,
    preco: lead.preco || '',
    endereco: lead.endereco || '',
    status: lead.status || '',
    horario: lead.horario || '',
    telefone: lead.telefone || '',
    website: lead.website || '',
    email: lead.email || '',
    servicos: lead.servicos || [],
    foto: lead.foto || '',
    fotos: lead.fotos || [],
    linkOrigem: lead.linkOrigem || '',
    linkPedido: lead.linkPedido || '',
    observacoes: lead.observacoes || '',
    score: lead.score ?? lead._score ?? 0,
    pipelineStage: lead.pipelineStage ?? lead._pipeline ?? 'novo',
    lat: lead.lat ?? lead._lat ?? null,
    lng: lead.lng ?? lead._lng ?? null,
    geocodeStatus: lead.geocodeStatus ?? lead._geocodeStatus ?? 'pending',
    insight: lead.insight ?? lead._insight ?? null,
    notes: lead.notes ?? lead._notes,
    raw: lead.raw ?? lead._raw,
    importFile: lead.importFile ?? lead._importFile ?? null,
    importDate: lead.importDate ?? lead._importDate ?? null,
    importId: lead.importId ?? lead._importId ?? null,
  }));
  return api.post<{ count: number }>('/leads/bulk', { leads: mapped });
}

export async function updateLead(id: string, data: Partial<Lead>): Promise<Lead> {
  return api.patch<Lead>(`/leads/${id}`, data);
}

export async function deleteLead(id: string): Promise<void> {
  return api.delete<void>(`/leads/${id}`);
}

export async function deleteLeadsBulk(leadIds: string[]): Promise<{ count: number }> {
  // POST é mais confiável que DELETE com body no serverless/Vercel
  return api.post<{ count: number }>('/leads/bulk-delete', { leadIds });
}

export async function moveLeadPipeline(id: string, stage: string): Promise<Lead> {
  return api.patch<Lead>(`/leads/${id}/pipeline`, { stage });
}

export async function logLeadActivity(leadId: string, channel: string): Promise<void> {
  return api.post<void>(`/leads/${leadId}/activity`, { channel });
}

export interface ActivityRecord {
  id: string;
  channel: string;
  title: string;
  sub: string;
  icon: string;
  createdAt: string;
  userName: string;
}

export async function fetchLeadActivities(leadId: string, options?: {
  page?: number;
  limit?: number;
}): Promise<{ activities: ActivityRecord[]; pagination: { page: number; limit: number; total: number; totalPages: number } }> {
  const params: Record<string, string> = {};
  if (options?.page) params.page = String(options.page);
  if (options?.limit) params.limit = String(options.limit);
  return api.get(`/leads/${leadId}/activities`, { params });
}

export async function fetchDashboardMetrics(): Promise<DashboardMetrics> {
  return api.get<DashboardMetrics>('/leads/dashboard');
}

export async function logLeadInteraction(leadId: string, data: { type: string; outcome: string; notes?: string }): Promise<any> {
  return api.post(`/leads/${leadId}/interactions`, data);
}

export async function fetchLeadInteractions(leadId: string): Promise<any[]> {
  return api.get(`/leads/${leadId}/interactions`);
}

export async function enrichLead(leadId: string): Promise<Lead> {
  return api.post<Lead>(`/leads/${leadId}/enrich`, {});
}
