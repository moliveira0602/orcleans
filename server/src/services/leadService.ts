import { prisma } from '../config/database';
import type { CreateLeadInput, UpdateLeadInput, LeadsQuery } from '../types/leads';

function sanitizeJson(value: unknown) {
  if (value === null || value === undefined) return undefined;
  return value as any;
}

export async function createLead(organizationId: string, userId: string, data: CreateLeadInput) {
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
      userId,
      ...data,
      insight: sanitizeJson(data.insight),
      notes: sanitizeJson(data.notes),
      raw: sanitizeJson(data.raw),
      importDate: data.importDate ? new Date(data.importDate) : undefined,
    } as any,
  });
}

export async function createLeadsBulk(organizationId: string, userId: string, leads: CreateLeadInput[]) {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
  });

  if (!org) {
    throw new Error('Organização não encontrada');
  }

  // Check import batch limit (separate from total leads limit)
  const maxBatch = org.maxImportBatch ?? 50;
  if (leads.length > maxBatch) {
    throw new Error(`Importação excede o limite de ${maxBatch} leads por vez. Divida o arquivo em partes menores.`);
  }

  const leadCount = await prisma.lead.count({
    where: { organizationId },
  });

  if (leadCount + leads.length > org.maxLeads) {
    throw new Error(`Limite de leads atingido. Espaço disponível: ${org.maxLeads - leadCount} leads.`);
  }

  const data = leads.map((lead) => ({
    organizationId,
    userId,
    ...lead,
    insight: sanitizeJson(lead.insight),
    notes: sanitizeJson(lead.notes),
    raw: sanitizeJson(lead.raw),
    importDate: lead.importDate ? new Date(lead.importDate) : undefined,
  }));

  return prisma.lead.createMany({
    data: data as any,
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
      { cidade: { contains: search, mode: 'insensitive' } },
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

  const pageNum = Number(page);
  const limitNum = Number(limit);

  // Force convert to integers to prevent Prisma string errors
  const skipNum = Math.floor(pageNum - 1) * Math.floor(limitNum);
  const takeNum = Math.floor(limitNum);

  const [leads, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip: skipNum,
      take: takeNum,
    }),
    prisma.lead.count({ where }),
  ]);

  return {
    leads,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum),
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

export async function deleteLead(organizationId: string, userId: string, leadId: string) {
  // Exclusão em nível de organização (não restrita ao criador),
  // para que qualquer membro da org possa eliminar leads importados por outros.
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

export async function deleteLeadsBulk(organizationId: string, _userId: string, leadIds: string[]) {
  if (!Array.isArray(leadIds) || leadIds.length === 0) {
    throw new Error('Lista de leads inválida');
  }

  console.log('[deleteLeadsBulk] organizationId:', JSON.stringify(organizationId));
  console.log('[deleteLeadsBulk] leadIds:', JSON.stringify(leadIds));

  // Verificar quais leads existem com esses IDs (sem filtro de org)
  const leadsFound = await prisma.lead.findMany({
    where: { id: { in: leadIds } },
    select: { id: true, organizationId: true },
  });

  console.log('[deleteLeadsBulk] leadsFound count:', leadsFound.length);
  if (leadsFound.length > 0) {
    console.log('[deleteLeadsBulk] sample lead orgId:', JSON.stringify(leadsFound[0].organizationId));
    console.log('[deleteLeadsBulk] orgId match:', leadsFound[0].organizationId === organizationId);
    console.log('[deleteLeadsBulk] orgId lengths:', leadsFound[0].organizationId.length, 'vs', organizationId.length);
  }

  // Excluir apenas leads que pertencem à organização do utilizador
  const result = await prisma.lead.deleteMany({
    where: {
      id: { in: leadIds },
      organizationId,
    },
  });

  console.log('[deleteLeadsBulk] deleted:', result.count);

  // Se não eliminou nenhum mas os leads existem, reportar no erro
  if (result.count === 0 && leadsFound.length > 0) {
    const orgs = [...new Set(leadsFound.map(l => l.organizationId))];
    console.error('[deleteLeadsBulk] MISMATCH! Lead orgs:', orgs, 'User org:', organizationId);
    throw new Error(`Organization mismatch: leads belong to ${orgs.join(',')} but user is in ${organizationId}`);
  }

  return result;
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

export async function logLeadActivity(
  organizationId: string,
  userId: string,
  leadId: string,
  channel: string,
) {
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, organizationId },
  });
  if (!lead) throw new Error('Lead não encontrado');

  const channelLabels: Record<string, string> = {
    telefone: 'Contato telefônico',
    email: 'Email enviado',
    whatsapp: 'WhatsApp enviado',
  };
  const channelIcons: Record<string, string> = {
    telefone: '📞',
    email: '✉',
    whatsapp: '💬',
  };

  await prisma.$transaction([
    prisma.activity.create({
      data: {
        organizationId,
        userId,
        leadId,
        title: channelLabels[channel] || channel,
        sub: lead.nome,
        icon: channelIcons[channel] || '📋',
        channel,
      },
    }),
    prisma.lead.update({
      where: { id: leadId },
      data: { lastContact: new Date() },
    }),
  ]);
}

export async function getLeadActivities(
  leadId: string,
  organizationId: string | undefined,
  page: number,
  limit: number,
) {
  const where: Record<string, unknown> = { leadId };
  if (organizationId) {
    where.organizationId = organizationId;
  }

  const skip = (page - 1) * limit;
  const take = limit;

  const [activities, total] = await Promise.all([
    prisma.activity.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take,
      include: {
        user: { select: { name: true } },
      },
    }),
    prisma.activity.count({ where }),
  ]);

  return {
    activities: activities.map((a) => ({
      id: a.id,
      channel: a.channel,
      title: a.title,
      sub: a.sub,
      icon: a.icon,
      createdAt: a.createdAt.toISOString(),
      userName: a.user.name,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}
