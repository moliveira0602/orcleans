import { prisma } from '../config/database';
import type { CreateLeadInput, UpdateLeadInput, LeadsQuery } from '../types/leads';

function sanitizeJson(value: unknown) {
  if (value === null || value === undefined) return undefined;
  return value as any;
}

export async function createLead(organizationId: string, userId: string, data: CreateLeadInput) {
  return prisma.$transaction(async (tx) => {
    const org = await tx.organization.findUnique({
      where: { id: organizationId },
    });

    if (!org) {
      throw new Error('Organização não encontrada');
    }

    if (org.leadsConsumed >= org.maxLeads) {
      throw new Error('Limite de leads atingido. Faça upgrade do seu plano.');
    }

    const lead = await tx.lead.create({
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

    await tx.organization.update({
      where: { id: organizationId },
      data: { leadsConsumed: { increment: 1 } }
    });

    return lead;
  });
}

export async function createLeadsBulk(organizationId: string, userId: string, leads: CreateLeadInput[]) {
  return prisma.$transaction(async (tx) => {
    const org = await tx.organization.findUnique({
      where: { id: organizationId },
    });

    if (!org) {
      throw new Error('Organização não encontrada');
    }

    const maxBatch = org.maxImportBatch ?? 50;
    if (leads.length > maxBatch) {
      throw new Error(`Importação excede o limite de ${maxBatch} leads por vez. Divida o arquivo em partes menores.`);
    }

    const PLAN_LIMITS: Record<string, number> = {
      'trial': 50,
      'starter': 500,
      'pro': 2000,
      'enterprise': 10000
    };
    
    const effectiveMaxLeads = org.maxLeads > 0 ? org.maxLeads : (PLAN_LIMITS[(org.plan || '').toLowerCase()] || 50);

    if (org.leadsConsumed + leads.length > effectiveMaxLeads) {
      throw new Error(`Limite de leads atingido. Espaço disponível: ${effectiveMaxLeads - org.leadsConsumed} leads.`);
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

    const result = await tx.lead.createMany({
      data: data as any,
      skipDuplicates: false,
    });

    await tx.organization.update({
      where: { id: organizationId },
      data: { leadsConsumed: { increment: leads.length } }
    });

    return result;
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
  return prisma.$transaction(async (tx) => {
    const existing = await tx.lead.findFirst({
      where: { id: leadId, organizationId },
    });

    if (!existing) {
      throw new Error('Lead não encontrado');
    }

    const lead = await tx.lead.delete({
      where: { id: leadId },
    });

    await tx.organization.update({
      where: { id: organizationId },
      data: { leadsConsumed: { decrement: 1 } }
    });

    return lead;
  });
}

export async function deleteAllLeads(organizationId: string) {
  return prisma.$transaction(async (tx) => {
    const result = await tx.lead.deleteMany({
      where: { organizationId },
    });

    await tx.organization.update({
      where: { id: organizationId },
      data: { leadsConsumed: 0 }
    });

    return result;
  });
}

export async function deleteLeadsBulk(organizationId: string | undefined, _userId: string, leadIds: string[]) {
  return prisma.$transaction(async (tx) => {
    const cleanOrgId = organizationId?.trim();
    const cleanIds = leadIds.map(id => id.trim()).filter(Boolean);

    if (cleanIds.length === 0) {
      throw new Error('Lista de leads inválida ou vazia');
    }

    const where: any = { id: { in: cleanIds } };
    if (cleanOrgId) {
      where.organizationId = cleanOrgId;
    }

    const result = await tx.lead.deleteMany({ where });

    if (cleanOrgId) {
      await tx.organization.update({
        where: { id: cleanOrgId },
        data: { leadsConsumed: { decrement: result.count } }
      });
    }

    return { count: result.count };
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

export async function logLeadInteraction(
  organizationId: string,
  userId: string,
  leadId: string,
  data: { type: string; outcome: string; notes?: string }
) {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
  });

  if (!lead || (lead.organizationId !== organizationId)) {
    throw new Error('Lead não encontrado');
  }

  // Calculate score adjustment based on outcome
  let scoreAdjustment = 0;
  if (data.outcome === 'converted') scoreAdjustment = 10;
  if (data.outcome === 'answered') scoreAdjustment = 2;
  if (data.outcome === 'rejected') scoreAdjustment = -5;

  return await prisma.$transaction([
    prisma.leadInteraction.create({
      data: {
        leadId,
        userId,
        type: data.type,
        outcome: data.outcome,
        notes: data.notes || '',
      },
    }),
    prisma.lead.update({
      where: { id: leadId },
      data: {
        lastContact: new Date(),
        lastOutcome: data.outcome,
        outcomeScore: { increment: scoreAdjustment },
        pipelineStage: data.outcome === 'converted' ? 'ganho' : lead.pipelineStage,
      },
    }),
    // Also log as a general activity for the feed
    prisma.activity.create({
      data: {
        organizationId,
        userId,
        leadId,
        title: `Interação: ${data.type}`,
        sub: `Resultado: ${data.outcome}`,
        icon: data.type === 'call' ? '📞' : data.type === 'whatsapp' ? '💬' : '📧',
        channel: data.type,
      },
    }),
  ]);
}

export async function getLeadInteractions(leadId: string, organizationId?: string) {
  // First, verify the lead belongs to the organization
  if (organizationId) {
    const lead = await prisma.lead.findFirst({
      where: { id: leadId, organizationId },
    });
    if (!lead) throw new Error('Acesso negado ao lead');
  }

  return prisma.leadInteraction.findMany({
    where: { leadId },
    orderBy: { createdAt: 'desc' },
    include: {
      user: { select: { name: true } },
    },
  });
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

export async function enrichLead(organizationId: string, leadId: string) {
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, organizationId },
  });

  if (!lead) {
    throw new Error('Lead não encontrado ou acesso negado');
  }

  const signals = {
    website: lead.website || (lead.nome.toLowerCase().includes('clinica') ? `https://www.${lead.nome.toLowerCase().replace(/\s+/g, '')}.pt` : ''),
    instagram: `https://instagram.com/${lead.nome.toLowerCase().replace(/\s+/g, '')}`,
    facebook: `https://facebook.com/${lead.nome.toLowerCase().replace(/\s+/g, '')}`,
    hasAdsPixel: Math.random() > 0.5,
    lastUpdate: new Date().toISOString(),
  };

  return prisma.lead.update({
    where: { id: leadId },
    data: {
      website: signals.website,
      insight: {
        ...(lead.insight as any || {}),
        digitalPresence: signals,
      },
      score: { increment: signals.hasAdsPixel ? 1 : 0 },
    } as any,
  });
}
