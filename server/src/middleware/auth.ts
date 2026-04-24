import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { jwtConfig } from '../config/jwt';
import { isSuperAdmin, type Role } from '../types/auth';

export interface AuthRequest extends Request {
  userId?: string;
  organizationId?: string;
  userRole?: Role;
  headers: Request['headers'] & { 'x-user-email'?: string };
}

export async function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, jwtConfig.accessSecret) as {
      sub: string;
      organizationId: string;
      role: string;
    };

    req.userId = decoded.sub;
    req.organizationId = decoded.organizationId;
    req.userRole = decoded.role as Role;

    // Prevent aggressive caching of authenticated routes (CDN or Browser side)
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');

    return next();
  } catch {
    return res.status(401).json({ error: 'Token inválido ou expirado' });
  }
}

export function authorize(...allowedRoles: Role[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.userRole || !allowedRoles.includes(req.userRole)) {
      return res.status(403).json({ error: 'Permissão negada' });
    }
    return next();
  };
}

export function requireSuperAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.userRole || !isSuperAdmin(req.userRole)) {
    return res.status(403).json({ error: 'Acesso restrito a Super Admin' });
  }
  return next();
}
