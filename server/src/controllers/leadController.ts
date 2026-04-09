import { Response } from 'express';
import * as leadService from '../services/leadService.js';
import type { AuthRequest } from '../middleware/auth.js';

export async function getLeads(req: AuthRequest, res: Response) {
  try {
    const result = await leadService.getLeads(req.organizationId!, req.query as any);
    return res.status(200).json(result);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
}

export async function getLeadById(req: AuthRequest, res: Response) {
  try {
    const leadId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const lead = await leadService.getLeadById(req.organizationId!, leadId);
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
    const metrics = await leadService.getDashboardMetrics(req.organizationId!);
    return res.status(200).json(metrics);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
}
