"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const axios_1 = __importDefault(require("axios"));
const env_1 = require("../config/env");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
/**
 * Proxy for Google Places Text Search
 */
router.get('/textsearch', auth_1.authenticate, async (req, res) => {
    try {
        const { query, location, radius, type } = req.query;
        if (!query) {
            return res.status(400).json({ error: 'Query is required' });
        }
        if (!env_1.env.GOOGLE_API_KEY) {
            console.error('[ScanProxy] GOOGLE_API_KEY is not configured');
            return res.status(500).json({ error: 'Serviço de busca temporariamente indisponível' });
        }
        const params = {
            query,
            key: env_1.env.GOOGLE_API_KEY,
            language: 'pt-PT',
        };
        if (location)
            params.location = location;
        if (radius)
            params.radius = radius;
        if (type)
            params.type = type;
        const response = await axios_1.default.get('https://maps.googleapis.com/maps/api/place/textsearch/json', {
            params
        });
        return res.status(200).json(response.data);
    }
    catch (error) {
        console.error('[ScanProxy] Google API Error:', error.response?.data || error.message);
        return res.status(500).json({ error: 'Erro ao consultar serviço de mapas' });
    }
});
/**
 * Proxy for Google Places Nearby Search
 */
router.get('/nearby', auth_1.authenticate, async (req, res) => {
    try {
        const { location, radius, keyword } = req.query;
        const response = await axios_1.default.get('https://maps.googleapis.com/maps/api/place/nearbysearch/json', {
            params: {
                location,
                radius,
                keyword,
                key: env_1.env.GOOGLE_API_KEY,
                language: 'pt-PT',
            }
        });
        return res.status(200).json(response.data);
    }
    catch (error) {
        console.error('[ScanProxy] Google Nearby API Error:', error.response?.data || error.message);
        return res.status(500).json({ error: 'Erro ao consultar serviço de proximidade' });
    }
});
/**
 * Proxy for Google Places Details
 * GET /api/scan/details?place_id=...
 */
router.get('/details', auth_1.authenticate, async (req, res) => {
    try {
        const { place_id } = req.query;
        if (!place_id) {
            return res.status(400).json({ error: 'place_id is required' });
        }
        const response = await axios_1.default.get('https://maps.googleapis.com/maps/api/place/details/json', {
            params: {
                place_id,
                key: env_1.env.GOOGLE_API_KEY,
                fields: req.query.fields || 'formatted_phone_number,website,opening_hours,rating,user_ratings_total,reviews,address_components,formatted_address',
                language: 'pt-PT',
            }
        });
        return res.status(200).json(response.data);
    }
    catch (error) {
        console.error('[ScanProxy] Google Details API Error:', error.response?.data || error.message);
        return res.status(500).json({ error: 'Erro ao consultar detalhes do estabelecimento' });
    }
});
exports.default = router;
//# sourceMappingURL=scan.js.map