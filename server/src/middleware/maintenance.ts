import type { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';

export async function maintenanceMode(req: Request, res: Response, next: NextFunction) {
  // Allow health check and OIDC token endpoint (for Vercel/Neon)
  if (req.path === '/health' || req.path === '/api/health') {
    return next();
  }

  try {
    const config = await prisma.systemConfig.findUnique({
      where: { id: 'global' }
    });

    if (config?.maintenanceMode) {
      // Exemptions:
      // 1. super_admin role (requires user to be already authenticated)
      // 2. Admin routes that toggle maintenance (requires user to be super_admin)
      // 3. Login routes (to allow super_admin to log in and fix things)

      const isAuthRoute = req.path.includes('/api/auth/login');
      const isAdminConfigRoute = req.path === '/api/admin/config';
      
      // If the user is already authenticated (available in req.user from authenticate middleware),
      // we check if they are super_admin.
      const userRole = (req as any).user?.role;
      const isSuperAdmin = userRole === 'super_admin';

      if (isSuperAdmin || isAuthRoute || isAdminConfigRoute) {
        return next();
      }

      // Block all other requests
      return res.status(503).json({
        maintenance: true,
        message: config.maintenanceMsg || 'Estamos em manutenção para melhorar a sua experiência. Voltamos em breve!'
      });
    }
  } catch (err) {
    // If check fails (e.g. table doesn't exist), log and continue to avoid breaking the site
    console.error('[Maintenance] Check failed:', err);
  }

  next();
}
