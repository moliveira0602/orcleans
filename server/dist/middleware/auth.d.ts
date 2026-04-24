import { Request, Response, NextFunction } from 'express';
import { type Role } from '../types/auth.js';
export interface AuthRequest extends Request {
    userId?: string;
    organizationId?: string;
    userRole?: Role;
    headers: Request['headers'] & {
        'x-user-email'?: string;
    };
}
export declare function authenticate(req: AuthRequest, res: Response, next: NextFunction): Promise<void | Response<any, Record<string, any>>>;
export declare function authorize(...allowedRoles: Role[]): (req: AuthRequest, res: Response, next: NextFunction) => void | Response<any, Record<string, any>>;
export declare function requireSuperAdmin(req: AuthRequest, res: Response, next: NextFunction): void | Response<any, Record<string, any>>;
//# sourceMappingURL=auth.d.ts.map