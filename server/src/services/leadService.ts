import { prisma } from '../config/database.js';
import type { CreateLeadInput, UpdateLeadInput, LeadsQuery } from '../types/leads.js';

function sanitizeJson(value: unknown) {
  if (value === null || value === undefined) return undefined;
  return value as any;
}

export async function createLead(organizationId: string, data: CreateLeadInput) {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
  });

  if (!org) {
    throw new Error('Organização não encontrada');
  }

  const leadCount = await prisma.lead.count({
    where: { organizationId },
  });

  if (leadCount >= org.maxLeads) {
    throw new Error('Limite de leads atingido. Faça upgrade do seu plano.');
  }

  return prisma.lead.create({
    data: {
      organizationId,
      ...data,
      insight: sanitizeJson(data.insight),
      notes: sanitizeJson(data.notes),
      raw: sanitizeJson(data.raw),
      importDate: data.importDate ? new Date(data.importDate) : undefined,
    },
  });
}

export async function createLeadsBulk(organizationId: string, leads: CreateLeadInput[]) {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
  });

  if (!org) {
    throw new Error('Organização não encontrada');
  }

  const leadCount = await prisma.lead.count({
    where: { organizationId },
  });

  if (leadCount + leads.length > org.maxLeads) {
    throw new Error(`Limite de leads atingido. Espaço disponível: ${org.maxLeads - leadCount} leads.`);
  }

  const data = leads.map((lead) => ({
    organizationId,
    ...lead,
    insight: sanitizeJson(lead.insight),
    notes: sanitizeJson(lead.notes),
    raw: sanitizeJson(lead.raw),
    importDate: lead.importDate ? new Date(lead.importDate) : undefined,
  }));

  return prisma.lead.createMany({
    data,
    skipDuplicates: false,
  });
}

export async function getLeads(organizationId: string | undefined, query: LeadsQuery) {
  const { page, limit, search, pipelineStage, scoreMin, scoreMax, segmento, sortBy, sortOrder } = query;

  const where: Record<string, unknown> = {};

  if (organizationId) {
    where.organizationId = organizationId;
  }

  if (search) {
    where.OR = [
      { nome: { contains: search, mode: 'insensitive' } },
      { segmento: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { telefone: { contains: search, mode: 'insensitive' } },
      { endereco: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (pipelineStage) {
    where.pipelineStage = pipelineStage;
  }

  if (scoreMin !== undefined || scoreMax !== undefined) {
    where.score = {};
    if (scoreMin !== undefined) (where.score as Record<string, number>).gte = scoreMin;
    if (scoreMax !== undefined) (where.score as Record<string, number>).lte = scoreMax;
  }

  if (segmento) {
    where.segmento = { contains: segmento, mode: 'insensitive' };
  }

  const [leads, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.lead.count({ where }),
  ]);

  return {
    leads,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getLeadById(organizationId: string | undefined, leadId: string) {
  const where: Record<string, unknown> = { id: leadId };
  
  if (organizationId) {
    where.organizationId = organizationId;
  }

  const lead = await prisma.lead.findFirst({ where });

  if (!lead) {
    throw new Error('Lead não encontrado');
  }

  return lead;
}

export async function updateLead(organizationId: string, leadId: string, data: UpdateLeadInput) {
  const existing = await prisma.lead.findFirst({
    where: { id: leadId, organizationId },
  });

  if (!existing) {
    throw new Error('Lead não encontrado');
  }

  return prisma.lead.update({
    where: { id: leadId },
    data: {
      ...data,
      insight: data.insight !== undefined ? sanitizeJson(data.insight) : undefined,
      notes: data.notes !== undefined ? sanitizeJson(data.notes) : undefined,
      raw: data.raw !== undefined ? sanitizeJson(data.raw) : undefined,
      importDate: data.importDate ? new Date(data.importDate) : undefined,
    },
  });
}

export async function deleteLead(organizationId: string, leadId: string) {
  const existing = await prisma.lead.findFirst({
    where: { id: leadId, organizationId },
  });

  if (!existing) {
    throw new Error('Lead não encontrado');
  }

  return prisma.lead.delete({
    where: { id: leadId },
  });
}

export async function deleteLeadsBulk(organizationId: string, leadIds: string[]) {
  return prisma.lead.deleteMany({
    where: {
      id: { in: leadIds },
      organizationId,
    },
  });
}

export async function moveLeadPipeline(organizationId: string, leadId: string, stage: string) {
  const existing = await prisma.lead.findFirst({
    where: { id: leadId, organizationId },
  });

  if (!existing) {
    throw new Error('Lead não encontrado');
  }

  return prisma.lead.update({
    where: { id: leadId },
    data: { pipelineStage: stage },
  });
}

export async function getDashboardMetrics(organizationId: string | undefined) {
  const where = organizationId ? { organizationId } : {};
  
  const [total, byStage, hotLeads, warmLeads, coldLeads, recentActivities] = await Promise.all([
    prisma.lead.count({ where }),
    prisma.lead.groupBy({
      by: ['pipelineStage'],
      where,
      _count: true,
    }),
    prisma.lead.count({ where: { ...where, score: { gte: 7 } } }),
    prisma.lead.count({ where: { ...where, score: { gte: 4, lte: 6 } } }),
    prisma.lead.count({ where: { ...where, score: { lte: 3 } } }),
    prisma.activity.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        user: { select: { name: true } },
        lead: { select: { nome: true } },
      },
    }),
  ]);

  const stageMap: Record<string, number> = {};
  for (const s of byStage) {
    stageMap[s.pipelineStage] = s._count;
  }

  return {
    total,
    byStage: stageMap,
    hotLeads,
    warmLeads,
    coldLeads,
    recentActivities: recentActivities.map((a) => ({
      id: a.id,
      title: a.title,
      sub: a.sub,
      icon: a.icon,
      time: a.createdAt.toISOString(),
      userName: a.user.name,
      leadName: a.lead?.nome,
    })),
  };
}
