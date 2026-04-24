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
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const leadController = __importStar(require("../controllers/leadController"));
const validate_1 = require("../middleware/validate");
const leads_1 = require("../types/leads");
const plans_1 = require("../middleware/plans");
const router = (0, express_1.Router)();
router.use(auth_1.authenticate);
router.options('*', (_req, res) => res.status(200).end());
router.get('/dashboard', leadController.getDashboard);
router.get('/', leadController.getLeads);
router.post('/bulk', plans_1.checkPlanLimits, leadController.createLeadsBulk);
router.post('/bulk-delete', leadController.deleteLeadsBulk);
router.get('/:id', leadController.getLeadById);
router.delete('/', leadController.deleteAllLeads);
router.post('/', plans_1.checkPlanLimits, (0, validate_1.validate)(leads_1.createLeadSchema), leadController.createLead);
router.patch('/:id/pipeline', leadController.movePipeline);
router.post('/:id/activity', leadController.logActivity);
router.get('/:id/activities', leadController.getActivities);
router.post('/:id/interactions', leadController.logInteraction);
router.get('/:id/interactions', leadController.getInteractions);
router.post('/:id/enrich', leadController.enrich);
exports.default = router;
//# sourceMappingURL=leads.js.map