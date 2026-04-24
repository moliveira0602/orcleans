"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOrganization = getOrganization;
exports.generateApiKey = generateApiKey;
exports.validateApiKey = validateApiKey;
const database_1 = require("../config/database");
const crypto_1 = __importDefault(require("crypto"));
async function getOrganization(id) {
    // Sync lead count before returning
    const realCount = await database_1.prisma.lead.count({
        where: { organizationId: id }
    });
    const org = await database_1.prisma.organization.findUnique({
        where: { id },
    });
    if (!org)
        return null;
    // Update in background if out of sync
    if (org.leadsConsumed !== realCount) {
        database_1.prisma.organization.update({
            where: { id },
            data: { leadsConsumed: realCount }
        }).catch(err => console.error('[OrgService] Sync failed:', err));
    }
    // Define limits for consistency
    const PLAN_LIMITS = {
        'trial': 50,
        'starter': 500,
        'pro': 2000,
        'enterprise': 10000
    };
    const effectiveMax = org.maxLeads > 0 ? org.maxLeads : (PLAN_LIMITS[org.plan.toLowerCase()] || 50);
    return {
        ...org,
        leadsConsumed: realCount,
        maxLeads: effectiveMax
    };
}
async function generateApiKey(organizationId) {
    const apiKey = `orca_${crypto_1.default.randomBytes(24).toString('hex')}`;
    return database_1.prisma.organization.update({
        where: { id: organizationId },
        data: { apiKey },
    });
}
async function validateApiKey(apiKey) {
    return database_1.prisma.organization.findUnique({
        where: { apiKey },
    });
}
//# sourceMappingURL=organizationService.js.map