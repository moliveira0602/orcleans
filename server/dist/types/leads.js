"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.leadsQuerySchema = exports.updateLeadSchema = exports.createLeadSchema = void 0;
const zod_1 = require("zod");
exports.createLeadSchema = zod_1.z.object({
    nome: zod_1.z.string().min(1, 'Nome é obrigatório'),
    segmento: zod_1.z.string().default(''),
    avaliacao: zod_1.z.number().nullable().optional(),
    reviews: zod_1.z.number().nullable().optional(),
    preco: zod_1.z.string().default(''),
    endereco: zod_1.z.string().default(''),
    cidade: zod_1.z.string().default(''),
    status: zod_1.z.string().default(''),
    horario: zod_1.z.string().default(''),
    telefone: zod_1.z.string().default(''),
    website: zod_1.z.string().default(''),
    email: zod_1.z.string().default(''),
    servicos: zod_1.z.array(zod_1.z.string()).default([]),
    foto: zod_1.z.string().default(''),
    fotos: zod_1.z.array(zod_1.z.string()).default([]),
    linkOrigem: zod_1.z.string().default(''),
    linkPedido: zod_1.z.string().default(''),
    observacoes: zod_1.z.string().default(''),
    score: zod_1.z.number().int().min(0).max(10).default(0),
    pipelineStage: zod_1.z.enum(['novo', 'qualificado', 'proposta', 'negociacao', 'ganho', 'perdido']).default('novo'),
    lat: zod_1.z.number().nullable().optional(),
    lng: zod_1.z.number().nullable().optional(),
    geocodeStatus: zod_1.z.enum(['pending', 'ok', 'failed']).default('pending'),
    insight: zod_1.z.unknown().nullable().optional(),
    notes: zod_1.z.unknown().nullable().optional(),
    raw: zod_1.z.unknown().nullable().optional(),
    importFile: zod_1.z.string().nullable().optional(),
    importDate: zod_1.z.string().nullable().optional(),
    importId: zod_1.z.string().nullable().optional(),
});
exports.updateLeadSchema = exports.createLeadSchema.partial();
exports.leadsQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().min(1).default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(10000).default(100),
    search: zod_1.z.string().optional(),
    pipelineStage: zod_1.z.enum(['novo', 'qualificado', 'proposta', 'negociacao', 'ganho', 'perdido']).optional(),
    scoreMin: zod_1.z.coerce.number().int().min(0).max(10).optional(),
    scoreMax: zod_1.z.coerce.number().int().min(0).max(10).optional(),
    segmento: zod_1.z.string().optional(),
    sortBy: zod_1.z.enum(['createdAt', 'score', 'nome', 'updatedAt']).default('createdAt'),
    sortOrder: zod_1.z.enum(['asc', 'desc']).default('desc'),
});
//# sourceMappingURL=leads.js.map