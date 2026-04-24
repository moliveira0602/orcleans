"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLeads = getLeads;
exports.getLeadById = getLeadById;
exports.enrich = enrich;
exports.createLead = createLead;
exports.createLeadsBulk = createLeadsBulk;
exports.updateLead = updateLead;
exports.deleteLead = deleteLead;
exports.deleteAllLeads = deleteAllLeads;
exports.deleteLeadsBulk = deleteLeadsBulk;
exports.movePipeline = movePipeline;
exports.getDashboard = getDashboard;
exports.logActivity = logActivity;
exports.logInteraction = logInteraction;
exports.getInteractions = getInteractions;
exports.getActivities = getActivities;
const leadService = __importStar(require("../services/leadService"));
const auth_1 = require("../types/auth");
function parseQueryParams(query) {
    const page = parseInt(String(query.page || '1'), 10);
    const limit = parseInt(String(query.limit || '20'), 10);
    const safePage = isNaN(page) || page < 1 ? 1 : page;
    const safeLimit = isNaN(limit) || limit < 1 ? 20 : Math.min(limit, 1000);
    const sortBy = String(query.sortBy || 'createdAt');
    const allowedSortFields = ['createdAt', 'score', 'nome', 'updatedAt'];
    const safeSortBy = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const sortOrder = String(query.sortOrder || 'desc').toLowerCase();
    const safeSortOrder = sortOrder === 'asc' ? 'asc' : 'desc';
    const pipelineStage = query.pipelineStage ? String(query.pipelineStage) : undefined;
    const allowedPipelineStages = ['novo', 'qualificado', 'proposta', 'negociacao', 'ganho', 'perdido'];
    const safePipelineStage = pipelineStage && allowedPipelineStages.includes(pipelineStage)
        ? pipelineStage
        : undefined;
    return {
        page: safePage,
        limit: safeLimit,
        search: query.search ? String(query.search) : undefined,
        pipelineStage: safePipelineStage,
        scoreMin: query.scoreMin !== undefined ? parseInt(String(query.scoreMin), 10) : undefined,
        scoreMax: query.scoreMax !== undefined ? parseInt(String(query.scoreMax), 10) : undefined,
        segmento: query.segmento ? String(query.segmento) : undefined,
        sortBy: safeSortBy,
        sortOrder: safeSortOrder,
    };
}
async function getLeads(req, res) {
    try {
        const orgId = (0, auth_1.isSuperAdmin)(req.userRole) ? undefined : req.organizationId;
        const query = parseQueryParams(req.query);
        const result = await leadService.getLeads(orgId, query);
        return res.status(200).json(result);
    }
    catch (error) {
        return res.status(400).json({ error: error.message });
    }
}
async function getLeadById(req, res) {
    try {
        const leadId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const orgId = (0, auth_1.isSuperAdmin)(req.userRole) ? undefined : req.organizationId;
        const lead = await leadService.getLeadById(orgId, leadId);
        return res.status(200).json(lead);
    }
    catch (error) {
        return res.status(404).json({ error: error.message });
    }
}
async function enrich(req, res) {
    try {
        const leadId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const lead = await leadService.enrichLead(req.organizationId, leadId);
        return res.status(200).json(lead);
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
async function createLead(req, res) {
    try {
        const lead = await leadService.createLead(req.organizationId, req.userId, req.body);
        return res.status(201).json(lead);
    }
    catch (error) {
        return res.status(400).json({ error: error.message });
    }
}
async function createLeadsBulk(req, res) {
    try {
        const { leads } = req.body;
        const result = await leadService.createLeadsBulk(req.organizationId, req.userId, leads);
        return res.status(201).json({ count: result.count });
    }
    catch (error) {
        return res.status(400).json({ error: error.message });
    }
}
async function updateLead(req, res) {
    try {
        const leadId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const lead = await leadService.updateLead(req.organizationId, leadId, req.body);
        return res.status(200).json(lead);
    }
    catch (error) {
        return res.status(400).json({ error: error.message });
    }
}
async function deleteLead(req, res) {
    try {
        const leadId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        await leadService.deleteLead(req.organizationId, req.userId, leadId);
        return res.status(204).send();
    }
    catch (error) {
        return res.status(404).json({ error: error.message });
    }
}
async function deleteAllLeads(req, res) {
    try {
        const result = await leadService.deleteAllLeads(req.organizationId);
        return res.status(200).json({ count: result.count });
    }
    catch (error) {
        return res.status(400).json({ error: error.message });
    }
}
async function deleteLeadsBulk(req, res) {
    try {
        const { leadIds } = req.body;
        if (!leadIds || !Array.isArray(leadIds) || leadIds.length === 0) {
            return res.status(400).json({ error: 'Lista de IDs de leads inválida ou vazia' });
        }
        const orgId = (0, auth_1.isSuperAdmin)(req.userRole) ? undefined : req.organizationId;
        const result = await leadService.deleteLeadsBulk(orgId, req.userId, leadIds);
        return res.status(200).json({ count: result.count });
    }
    catch (error) {
        console.error('[leadController] deleteLeadsBulk error:', error);
        return res.status(400).json({ error: error.message });
    }
}
async function movePipeline(req, res) {
    try {
        const leadId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const { stage } = req.body;
        const lead = await leadService.moveLeadPipeline(req.organizationId, leadId, stage);
        return res.status(200).json(lead);
    }
    catch (error) {
        return res.status(400).json({ error: error.message });
    }
}
async function getDashboard(req, res) {
    try {
        const orgId = (0, auth_1.isSuperAdmin)(req.userRole) ? undefined : req.organizationId;
        const metrics = await leadService.getDashboardMetrics(orgId);
        return res.status(200).json(metrics);
    }
    catch (error) {
        return res.status(400).json({ error: error.message });
    }
}
async function logActivity(req, res) {
    try {
        const leadId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const { channel } = req.body;
        if (!channel || !['telefone', 'email', 'whatsapp'].includes(channel)) {
            return res.status(400).json({ error: 'Canal de contato inválido' });
        }
        await leadService.logLeadActivity(req.organizationId, req.userId, leadId, channel);
        return res.status(200).json({ success: true });
    }
    catch (error) {
        return res.status(400).json({ error: error.message });
    }
}
async function logInteraction(req, res) {
    try {
        const leadId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const { type, outcome, notes } = req.body;
        if (!type || !outcome) {
            return res.status(400).json({ error: 'Tipo e resultado são obrigatórios' });
        }
        const result = await leadService.logLeadInteraction(req.organizationId, req.userId, leadId, {
            type,
            outcome,
            notes,
        });
        return res.status(200).json(result);
    }
    catch (error) {
        return res.status(400).json({ error: error.message });
    }
}
async function getInteractions(req, res) {
    try {
        const leadId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const result = await leadService.getLeadInteractions(leadId, req.organizationId);
        return res.status(200).json(result);
    }
    catch (error) {
        return res.status(400).json({ error: error.message });
    }
}
async function getActivities(req, res) {
    try {
        const leadId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
        const page = parseInt(String(req.query.page || '1'), 10);
        const limit = parseInt(String(req.query.limit || '20'), 10);
        const orgId = (0, auth_1.isSuperAdmin)(req.userRole) ? undefined : req.organizationId;
        const result = await leadService.getLeadActivities(leadId, orgId, page, limit);
        return res.status(200).json(result);
    }
    catch (error) {
        return res.status(400).json({ error: error.message });
    }
}
//# sourceMappingURL=leadController.js.map