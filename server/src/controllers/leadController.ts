import { Response } from 'express';
import * as leadService from '../services/leadService';
import type { AuthRequest } from '../middleware/auth';
import { isSuperAdmin } from '../types/auth';

type SortBy = 'createdAt' | 'score' | 'nome' | 'updatedAt';
type SortOrder = 'asc' | 'desc';
type PipelineStage = 'novo' | 'qualificado' | 'proposta' | 'negociacao' | 'ganho' | 'perdido';

interface ParsedQuery {
  page: number;
  limit: number;
  search?: string;
  pipelineStage?: PipelineStage;
  scoreMin?: number;
  scoreMax?: number;
  segmento?: string;
  sortBy: SortBy;
  sortOrder: SortOrder;
}

function parseQueryParams(query: Record<string, unknown>): ParsedQuery {
  const page = parseInt(String(query.page || '1'), 10);
  const limit = parseInt(String(query.limit || '20'), 10);
  
  const safePage = isNaN(page) || page < 1 ? 1 : page;
  const safeLimit = isNaN(limit) || limit < 1 ? 20 : Math.min(limit, 1000);
  
  const sortBy = String(query.sortBy || 'createdAt');
  const allowedSortFields: SortBy[] = ['createdAt', 'score', 'nome', 'updatedAt'];
  const safeSortBy = allowedSortFields.includes(sortBy as SortBy) ? sortBy as SortBy : 'createdAt';
  
  const sortOrder = String(query.sortOrder || 'desc').toLowerCase();
  const safeSortOrder: SortOrder = sortOrder === 'asc' ? 'asc' : 'desc';
  
  const pipelineStage = query.pipelineStage ? String(query.pipelineStage) : undefined;
  const allowedPipelineStages: PipelineStage[] = ['novo', 'qualificado', 'proposta', 'negociacao', 'ganho', 'perdido'];
  const safePipelineStage = pipelineStage && allowedPipelineStages.includes(pipelineStage as PipelineStage) 
    ? pipelineStage as PipelineStage 
    : undefined;
  
  return {
    page: safePage,
    limit: safeLimit,
    search: query.search ? String(query.search) : undefined,
    pipelineStage: safePipelineStage,
    scoreMin: query.scoreMin !== undefined ? parseInt(String(query.scoreMin), 10) : undefined,
    scoreMax: query.scoreMax !== undefined ? parseInt(String(query.scoreMax), 10) : undefined,
    segmento: query.segmento ? String(query.segmento) : undefined,
    sortBy: safeSortBy,
    sortOrder: safeSortOrder,
  };
}

export async function getLeads(req: AuthRequest, res: Response) {
  try {
    console.log('[leadController] req.userRole:', req.userRole);
    console.log('[leadController] req.organizationId:', req.organizationId);
    console.log('[leadController] isSuperAdmin:', isSuperAdmin(req.userRole!));
    const orgId = isSuperAdmin(req.userRole!) ? undefined : req.organizationId;
    console.log('[leadController] orgId used for query:', orgId);
    const query = parseQueryParams(req.query as Record<string, unknown>);
    console.log('[leadController] getLeads query:', query);
    const result = await leadService.getLeads(orgId, query);
    return res.status(200).json(result);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
}

export async function getLeadById(req: AuthRequest, res: Response) {
  try {
    const leadId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const orgId = isSuperAdmin(req.userRole!) ? undefined : req.organizationId;
    const lead = await leadService.getLeadById(orgId, leadId);
    return res.status(200).json(lead);
  } catch (error: any) {
    return res.status(404).json({ error: error.message });
  }
}

export async function createLead(req: AuthRequest, res: Response) {
  try {
    const lead = await leadService.createLead(req.organizationId!, req.userId!, req.body);
    return res.status(201).json(lead);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
}

export async function createLeadsBulk(req: AuthRequest, res: Response) {
  try {
    const { leads } = req.body;
    const result = await leadService.createLeadsBulk(req.organizationId!, req.userId!, leads);
    return res.status(201).json({ count: result.count });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
}

export async function updateLead(req: AuthRequest, res: Response) {
  try {
    const leadId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const lead = await leadService.updateLead(req.organizationId!, leadId, req.body);
    return res.status(200).json(lead);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
}

export async function deleteLead(req: AuthRequest, res: Response) {
  try {
    const leadId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    await leadService.deleteLead(req.organizationId!, req.userId!, leadId);
    return res.status(204).send();
  } catch (error: any) {
    return res.status(404).json({ error: error.message });
  }
}

export async function debugLeads(req: AuthRequest, res: Response) {
  try {
    const orgId = isSuperAdmin(req.userRole!) ? undefined : req.organizationId;
    
    // Pegar amostra de leads
    const sample = await prisma.lead.findMany({
      where: orgId ? { organizationId: orgId } : {},
      take: 5,
      select: { id: true, organizationId: true, nome: true }
    });

    const totalCount = await prisma.lead.count();
    const orgCount = orgId ? await prisma.lead.count({ where: { organizationId: orgId } }) : totalCount;

    return res.json({
      timestamp: new Date().toISOString(),
      user: {
        id: req.userId,
        orgId: req.organizationId,
        role: req.userRole,
        isSuper: isSuperAdmin(req.userRole!)
      },
      database: {
        totalLeadsInDb: totalCount,
        leadsInThisOrg: orgCount,
        sampleLeads: sample
      },
      version: 'v14_debug'
    });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}

export async function deleteLeadsBulk(req: AuthRequest, res: Response) {
  try {
    const { leadIds } = req.body;
    
    if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
      console.warn('[leadController] deleteLeadsBulk - Invalid or empty leadIds array');
      return res.status(400).json({ error: 'Lista de IDs de leads inválida ou vazia' });
    }

    console.log(`[leadController] deleteLeadsBulk - Attempting to delete ${leadIds.length} leads`);
    console.log('[leadController] leadIds sample:', leadIds.slice(0, 5));
    console.log('[leadController] organizationId:', req.organizationId);

    const orgId = isSuperAdmin(req.userRole!) ? undefined : req.organizationId;
    const result = await leadService.deleteLeadsBulk(orgId, req.userId!, leadIds);
    
    console.log(`[leadController] deleteLeadsBulk - Success: ${result.count} leads deleted`);
    
    return res.status(200).json({ 
      count: result.count,
      _debug: result.count === 0 ? result.diagnostic : undefined,
      _v: 'v13_debug'
    });
  } catch (error: any) {
    console.error('[leadController] deleteLeadsBulk error:', error);
    return res.status(400).json({ error: error.message });
  }
}

export async function movePipeline(req: AuthRequest, res: Response) {
  try {
    const leadId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { stage } = req.body;
    const lead = await leadService.moveLeadPipeline(req.organizationId!, leadId, stage);
    return res.status(200).json(lead);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
}

export async function getDashboard(req: AuthRequest, res: Response) {
  try {
    const orgId = isSuperAdmin(req.userRole!) ? undefined : req.organizationId;
    const metrics = await leadService.getDashboardMetrics(orgId);
    return res.status(200).json(metrics);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
}

export async function logActivity(req: AuthRequest, res: Response) {
  try {
    const leadId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const { channel } = req.body;
    if (!channel || !['telefone', 'email', 'whatsapp'].includes(channel)) {
      return res.status(400).json({ error: 'Canal de contato inválido' });
    }
    await leadService.logLeadActivity(req.organizationId!, req.userId!, leadId, channel);
    return res.status(200).json({ success: true });
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
}

export async function getActivities(req: AuthRequest, res: Response) {
  try {
    const leadId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const page = parseInt(String(req.query.page || '1'), 10);
    const limit = parseInt(String(req.query.limit || '20'), 10);
    const orgId = isSuperAdmin(req.userRole!) ? undefined : req.organizationId;
    const result = await leadService.getLeadActivities(leadId, orgId, page, limit);
    return res.status(200).json(result);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
}
