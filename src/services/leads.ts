import { api } from './api';

export interface Lead {
  id: string;
  nome: string;
  segmento: string;
  avaliacao: number | null;
  reviews: number | null;
  preco: string;
  endereco: string;
  status: string;
  horario: string;
  telefone: string;
  website: string;
  email: string;
  servicos: string[];
  foto: string;
  fotos: string[];
  linkOrigem: string;
  linkPedido: string;
  observacoes: string;
  score: number;
  pipelineStage: string;
  lat: number | null;
  lng: number | null;
  geocodeStatus: string;
  insight: any;
  notes: any;
  raw: any;
  importFile: string | null;
  importDate: string | null;
  importId: string | null;
  createdAt: string;
  updatedAt: string;
}

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
  const queryParams: Record<string, string> = {};
  if (params?.page) queryParams.page = String(params.page);
  if (params?.limit) queryParams.limit = String(params.limit);
  if (params?.search) queryParams.search = params.search;
  if (params?.pipelineStage) queryParams.pipelineStage = params.pipelineStage;
  if (params?.scoreMin !== undefined) queryParams.scoreMin = String(params.scoreMin);
  if (params?.scoreMax !== undefined) queryParams.scoreMax = String(params.scoreMax);
  if (params?.segmento) queryParams.segmento = params.segmento;
  if (params?.sortBy) queryParams.sortBy = params.sortBy;
  if (params?.sortOrder) queryParams.sortOrder = params.sortOrder;
  return api.get<LeadsResponse>('/leads', { params: queryParams });
}

export async function fetchLeadById(id: string): Promise<Lead> {
  return api.get<Lead>(`/leads/${id}`);
}

export async function createLead(data: Partial<Lead>): Promise<Lead> {
  return api.post<Lead>('/leads', data);
}

export async function createLeadsBulk(leads: Partial<Lead>[]): Promise<{ count: number }> {
  return api.post<{ count: number }>('/leads/bulk', { leads });
}

export async function updateLead(id: string, data: Partial<Lead>): Promise<Lead> {
  return api.patch<Lead>(`/leads/${id}`, data);
}

export async function deleteLead(id: string): Promise<void> {
  return api.delete<void>(`/leads/${id}`);
}

export async function deleteLeadsBulk(leadIds: string[]): Promise<{ count: number }> {
  return api.delete<{ count: number }>('/leads/bulk', { leadIds });
}

export async function moveLeadPipeline(id: string, stage: string): Promise<Lead> {
  return api.patch<Lead>(`/leads/${id}/pipeline`, { stage });
}

export async function fetchDashboardMetrics(): Promise<DashboardMetrics> {
  return api.get<DashboardMetrics>('/leads/dashboard');
}
