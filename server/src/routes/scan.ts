import { Router, Request, Response } from 'express';
import { env } from '../config/env.js';

const router = Router();

const GOOGLE_API_KEY = env.GOOGLE_API_KEY || process.env.GOOGLE_API_KEY || '';

// Cache to avoid repeated calls for same query
const cache = new Map<string, { data: any; timestamp: number }>();
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

// Text Search endpoint - returns phone, website, and other basic fields
router.get('/textsearch', async (req: Request, res: Response) => {
  try {
    const query = req.query.query as string;
    const location = req.query.location as string;
    const radius = Math.min(parseInt(req.query.radius as string) || 3000, 5000);
    const language = req.query.language as string;

    if (!query || !location) {
      return res.status(400).json({ error: 'query and location are required' });
    }

    // Cache key
    const cacheKey = `textsearch_${query}_${location}_${radius}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return res.json(cached.data);
    }

    // Text Search with basic fields (includes phone & website)
    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&location=${location}&radius=${radius}&language=${language || 'pt'}&fields=${BASIC_FIELDS}&key=${GOOGLE_API_KEY}`;

    const response = await fetch(url);
    const data = await response.json();

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
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Nearby Search endpoint (cheaper but no phone/website)
router.get('/nearby', async (req: Request, res: Response) => {
  try {
    const location = req.query.location as string;
    const radius = Math.min(parseInt(req.query.radius as string) || 2000, 5000);
    const type = req.query.type as string;
    const keyword = req.query.keyword as string;

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
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Details endpoint - only call when user explicitly needs more info
router.get('/details', async (req: Request, res: Response) => {
  try {
    const placeId = req.query.place_id as string;
    const fields = req.query.fields as string || BASIC_FIELDS;

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
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

// Geocode endpoint
router.get('/geocode', async (req: Request, res: Response) => {
  try {
    const address = req.query.address as string;

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
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
});

export default router;