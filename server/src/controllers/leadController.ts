import { Response } from 'express';
import * as leadService from '../services/leadService.js';
import type { AuthRequest } from '../middleware/auth.js';
import { isSuperAdmin } from '../types/auth.js';

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
    const lead = await leadService.createLead(req.organizationId!, req.body);
    return res.status(201).json(lead);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
}

export async function createLeadsBulk(req: AuthRequest, res: Response) {
  try {
    const { leads } = req.body;
    const result = await leadService.createLeadsBulk(req.organizationId!, leads);
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
    await leadService.deleteLead(req.organizationId!, leadId);
    return res.status(204).send();
  } catch (error: any) {
    return res.status(404).json({ error: error.message });
  }
}

export async function deleteLeadsBulk(req: AuthRequest, res: Response) {
  try {
    const { leadIds } = req.body;
    const result = await leadService.deleteLeadsBulk(req.organizationId!, leadIds);
    return res.status(200).json({ count: result.count });
  } catch (error: any) {
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
