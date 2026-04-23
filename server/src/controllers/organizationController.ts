import { Request, Response } from 'express';
import * as organizationService from '../services/organizationService';
import { AuthRequest } from '../middleware/auth';

export async function getMyOrganization(req: AuthRequest, res: Response) {
  try {
    const org = await organizationService.getOrganization(req.organizationId!);
    res.json(org);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}

export async function rotateApiKey(req: AuthRequest, res: Response) {
  try {
    const org = await organizationService.generateApiKey(req.organizationId!);
    res.json({ apiKey: org.apiKey });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
}
