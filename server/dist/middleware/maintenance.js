"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.maintenanceMode = maintenanceMode;
const database_1 = require("../config/database");
async function maintenanceMode(req, res, next) {
    // Allow health check, debug and ping routes even in maintenance
    const isDiagnostic = req.path === '/health' || req.path === '/api/health' ||
        req.path === '/ping' || req.path === '/api/ping' ||
        req.path === '/ping-direct' ||
        req.path === '/debug-routes' || req.path === '/api/debug-routes';
    if (isDiagnostic) {
        return next();
    }
    try {
        const config = await database_1.prisma.systemConfig.findUnique({
            where: { id: 'global' }
        });
        if (config?.maintenanceMode) {
            // Exemptions:
            // 1. super_admin role (requires user to be already authenticated)
            // 2. Admin routes that toggle maintenance (requires user to be super_admin)
            // 3. Login routes (to allow super_admin to log in and fix things)
            const isAuthRoute = req.path.includes('/auth/login') || req.originalUrl.includes('/api/auth/login');
            const isAdminConfigRoute = req.path.includes('/admin/config') || req.originalUrl.includes('/api/admin/config');
            // If the user is already authenticated (available in req.user or req.userRole),
            // we check if they are super_admin.
            const userRole = req.user?.role || req.userRole;
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
    }
    catch (err) {
        // If check fails (e.g. table doesn't exist), log and continue to avoid breaking the site
        console.error('[Maintenance] Check failed:', err);
    }
    next();
}
//# sourceMappingURL=maintenance.js.map