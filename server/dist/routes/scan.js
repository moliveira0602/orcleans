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
const env_1 = require("../config/env");
const auth_1 = require("../middleware/auth");
const sonarService = __importStar(require("../services/sonarService"));
const router = (0, express_1.Router)();
router.options('*', (_req, res) => res.status(200).end());
const GOOGLE_API_KEY = env_1.env.GOOGLE_API_KEY || process.env.GOOGLE_API_KEY || '';
// Cache to avoid repeated calls for same query
const cache = new Map();
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes
// Force cache clear on startup
cache.clear();
// ============================================================================
// COST OPTIMIZATION STRATEGY
// ============================================================================
// 1. Use Text Search with basic fields ($17/1000) - includes phone & website
// 2. NO details call per lead (saves $17/1000 per lead)
// 3. Cache results for 15 minutes
// 4. Limit to 20 results per scan
//
// Basic fields included in Text Search (no extra charge):
//   place_id, name, formatted_address, geometry, types, business_status,
//   icon, rating, user_ratings_total, price_level, opening_hours,
//   formatted_phone_number, website, utc_offset_minutes, vicinity
// ============================================================================
const BASIC_FIELDS = 'place_id,name,formatted_address,geometry,types,business_status,rating,user_ratings_total,price_level,opening_hours,formatted_phone_number,website,utc_offset_minutes,vicinity';
const plans_1 = require("../middleware/plans");
// Apply authentication and plan limits to ALL scan routes
router.use(auth_1.authenticate);
router.use(plans_1.checkPlanLimits);
// Details endpoint - only call when user explicitly needs more info
router.get('/textsearch', async (req, res) => {
    try {
        const query = req.query.query;
        const location = req.query.location;
        const radius = Math.min(parseInt(req.query.radius) || 3000, 5000);
        const language = req.query.language;
        if (!query || !location) {
            return res.status(400).json({ error: 'query and location are required' });
        }
        // Cache key
        const cacheKey = `textsearch_${query}_${location}_${radius}`;
        const cached = cache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
            return res.json(cached.data);
        }
        // Text Search with basic fields - limit to 10 results to save costs
        const MAX_RESULTS = 10;
        const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&location=${location}&radius=${radius}&language=${language || 'pt'}&fields=${BASIC_FIELDS}&key=${GOOGLE_API_KEY}`;
        const response = await fetch(url);
        const data = await response.json();
        if (data.status !== 'OK' || !data.results) {
            cache.set(cacheKey, { data, timestamp: Date.now() });
            return res.status(response.status).json(data);
        }
        // Limit results to MAX_RESULTS
        data.results = data.results.slice(0, MAX_RESULTS);
        // Fetch details for each place to get phone and website
        // Already limited to MAX_RESULTS from textsearch
        const resultsWithDetails = await Promise.all(data.results.map(async (place) => {
            try {
                const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=name,formatted_address,formatted_phone_number,website,opening_hours,business_status,rating,user_ratings_total,geometry&language=pt&key=${GOOGLE_API_KEY}`;
                const detailsRes = await fetch(detailsUrl);
                const detailsData = await detailsRes.json();
                if (detailsData.result) {
                    return {
                        ...place,
                        formatted_phone_number: detailsData.result.formatted_phone_number || '',
                        website: detailsData.result.website || '',
                        opening_hours: detailsData.result.opening_hours || place.opening_hours,
                        rating: detailsData.result.rating || place.rating,
                        user_ratings_total: detailsData.result.user_ratings_total || place.user_ratings_total,
                    };
                }
            }
            catch (e) {
                // Return original place if details fail
            }
            return place;
        }));
        data.results = resultsWithDetails;
        // Cache the results
        cache.set(cacheKey, { data, timestamp: Date.now() });
        // Clean old cache entries
        if (cache.size > 100) {
            const now = Date.now();
            for (const [key, value] of cache.entries()) {
                if (now - value.timestamp > CACHE_TTL) {
                    cache.delete(key);
                }
            }
        }
        return res.status(response.status).json(data);
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
});
// Nearby Search endpoint (cheaper but no phone/website)
router.get('/nearby', async (req, res) => {
    try {
        const location = req.query.location;
        const radius = Math.min(parseInt(req.query.radius) || 2000, 5000);
        const type = req.query.type;
        const keyword = req.query.keyword;
        if (!location) {
            return res.status(400).json({ error: 'location is required' });
        }
        const [lat, lng] = location.split(',');
        if (!lat || !lng) {
            return res.status(400).json({ error: 'location must be lat,lng format' });
        }
        // Cache key
        const cacheKey = `nearby_${lat}_${lng}_${radius}_${type}_${keyword}`;
        const cached = cache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
            return res.json(cached.data);
        }
        let url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&fields=${BASIC_FIELDS}&key=${GOOGLE_API_KEY}`;
        if (type) {
            url += `&type=${encodeURIComponent(type)}`;
        }
        if (keyword) {
            url += `&keyword=${encodeURIComponent(keyword)}`;
        }
        const response = await fetch(url);
        const data = await response.json();
        cache.set(cacheKey, { data, timestamp: Date.now() });
        return res.status(response.status).json(data);
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
});
// Details endpoint - only call when user explicitly needs more info
router.get('/details', async (req, res) => {
    try {
        const placeId = req.query.place_id;
        const fields = req.query.fields || BASIC_FIELDS;
        if (!placeId) {
            return res.status(400).json({ error: 'place_id is required' });
        }
        const cacheKey = `details_${placeId}_${fields}`;
        const cached = cache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
            return res.json(cached.data);
        }
        const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&language=pt&key=${GOOGLE_API_KEY}`;
        const response = await fetch(url);
        const data = await response.json();
        cache.set(cacheKey, { data, timestamp: Date.now() });
        return res.status(response.status).json(data);
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
});
// Geocode endpoint
router.get('/geocode', async (req, res) => {
    try {
        const address = req.query.address;
        if (!address) {
            return res.status(400).json({ error: 'address is required' });
        }
        const cacheKey = `geocode_${address}`;
        const cached = cache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
            return res.json(cached.data);
        }
        const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_API_KEY}`;
        const response = await fetch(url);
        const data = await response.json();
        cache.set(cacheKey, { data, timestamp: Date.now() });
        return res.status(response.status).json(data);
    }
    catch (error) {
        return res.status(500).json({ error: error.message });
    }
});
// Suggestions endpoint
router.get('/suggestions', auth_1.authenticate, async (req, res) => {
    try {
        const suggestions = await sonarService.getSpatialSuggestions(req.organizationId);
        res.json(suggestions);
    }
    catch (error) {
        res.status(500).json({ error: error.message });
    }
});
exports.default = router;
//# sourceMappingURL=scan.js.map