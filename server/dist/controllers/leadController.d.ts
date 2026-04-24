import { Response } from 'express';
import type { AuthRequest } from '../middleware/auth.js';
export declare function getLeads(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function getLeadById(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function createLead(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function createLeadsBulk(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function updateLead(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function deleteLead(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function deleteLeadsBulk(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function movePipeline(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
export declare function getDashboard(req: AuthRequest, res: Response): Promise<Response<any, Record<string, any>>>;
//# sourceMappingURL=leadController.d.ts.map