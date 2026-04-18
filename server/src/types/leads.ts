import { z } from 'zod';

export const createLeadSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  segmento: z.string().default(''),
  avaliacao: z.number().nullable().optional(),
  reviews: z.number().nullable().optional(),
  preco: z.string().default(''),
  endereco: z.string().default(''),
  status: z.string().default(''),
  horario: z.string().default(''),
  telefone: z.string().default(''),
  website: z.string().default(''),
  email: z.string().default(''),
  servicos: z.array(z.string()).default([]),
  foto: z.string().default(''),
  fotos: z.array(z.string()).default([]),
  linkOrigem: z.string().default(''),
  linkPedido: z.string().default(''),
  observacoes: z.string().default(''),
  score: z.number().int().min(0).max(10).default(0),
  pipelineStage: z.enum(['novo', 'qualificado', 'proposta', 'negociacao', 'ganho', 'perdido']).default('novo'),
  lat: z.number().nullable().optional(),
  lng: z.number().nullable().optional(),
  geocodeStatus: z.enum(['pending', 'ok', 'failed']).default('pending'),
  insight: z.unknown().nullable().optional(),
  notes: z.unknown().nullable().optional(),
  raw: z.unknown().nullable().optional(),
  importFile: z.string().nullable().optional(),
  importDate: z.string().nullable().optional(),
  importId: z.string().nullable().optional(),
});

export const updateLeadSchema = createLeadSchema.partial();

export const leadsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(10000).default(100),
  search: z.string().optional(),
  pipelineStage: z.enum(['novo', 'qualificado', 'proposta', 'negociacao', 'ganho', 'perdido']).optional(),
  scoreMin: z.coerce.number().int().min(0).max(10).optional(),
  scoreMax: z.coerce.number().int().min(0).max(10).optional(),
  segmento: z.string().optional(),
  sortBy: z.enum(['createdAt', 'score', 'nome', 'updatedAt']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type CreateLeadInput = z.infer<typeof createLeadSchema>;
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>;
export type LeadsQuery = z.infer<typeof leadsQuerySchema>;
