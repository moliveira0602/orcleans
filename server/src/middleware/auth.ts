import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { jwtConfig } from '../config/jwt.js';

export interface AuthRequest extends Request {
  userId?: string;
  organizationId?: string;
  userRole?: string;
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
    req.userRole = decoded.role;

    return next();
  } catch {
    return res.status(401).json({ error: 'Token inválido ou expirado' });
  }
}

export function authorize(...allowedRoles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.userRole || !allowedRoles.includes(req.userRole)) {
      return res.status(403).json({ error: 'Permissão negada' });
    }
    return next();
  };
}
