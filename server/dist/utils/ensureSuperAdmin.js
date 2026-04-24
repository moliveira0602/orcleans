"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureSuperAdminExists = ensureSuperAdminExists;
const database_1 = require("../config/database");
const crypto_1 = require("./crypto");
const SUPER_ADMIN_EMAIL = 'moliveira@etos.pt';
const SUPER_ADMIN_PASSWORD = 'Orca1234!';
const SUPER_ADMIN_NAME = 'Marcos Oliveira';
async function ensureSuperAdminExists() {
    const existing = await database_1.prisma.user.findUnique({
        where: { email: SUPER_ADMIN_EMAIL },
    });
    if (existing) {
        console.log('[SuperAdmin] User already exists:', SUPER_ADMIN_EMAIL);
        return;
    }
    // Find or create organization
    let org = await database_1.prisma.organization.findFirst();
    if (!org) {
        org = await database_1.prisma.organization.create({
            data: {
                name: 'ETOS',
                plan: 'growth',
                maxLeads: 5000,
                maxUsers: 10,
            },
        });
        console.log('[SuperAdmin] Created organization:', org.id);
    }
    const passwordHash = await (0, crypto_1.hashPassword)(SUPER_ADMIN_PASSWORD);
    await database_1.prisma.user.create({
        data: {
            organizationId: org.id,
            name: SUPER_ADMIN_NAME,
            email: SUPER_ADMIN_EMAIL,
            passwordHash,
            role: 'super_admin',
        },
    });
    console.log('[SuperAdmin] Created super admin:', SUPER_ADMIN_EMAIL);
}
//# sourceMappingURL=ensureSuperAdmin.js.map