import { Router, Request, Response } from 'express';
import axios from 'axios';
import { env } from '../config/env';
import { authenticate } from '../middleware/auth';

const router = Router();

/**
 * Proxy for Google Places Text Search
 */
router.get('/textsearch', authenticate, async (req: Request, res: Response) => {
  try {
    const { query, location, radius, type } = req.query;

    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    if (!env.GOOGLE_API_KEY) {
      console.error('[ScanProxy] GOOGLE_API_KEY is not configured');
      return res.status(500).json({ error: 'Serviço de busca temporariamente indisponível' });
    }

    const params: any = {
      query,
      key: env.GOOGLE_API_KEY,
      language: 'pt-PT',
    };

    if (location) params.location = location;
    if (radius) params.radius = radius;
    if (type) params.type = type;

    const response = await axios.get('https://maps.googleapis.com/maps/api/place/textsearch/json', {
      params
    });

    return res.status(200).json(response.data);
  } catch (error: any) {
    console.error('[ScanProxy] Google API Error:', error.response?.data || error.message);
    return res.status(500).json({ error: 'Erro ao consultar serviço de mapas' });
  }
});

/**
 * Proxy for Google Places Nearby Search
 */
router.get('/nearby', authenticate, async (req: Request, res: Response) => {
  try {
    const { location, radius, keyword } = req.query;

    const response = await axios.get('https://maps.googleapis.com/maps/api/place/nearbysearch/json', {
      params: {
        location,
        radius,
        keyword,
        key: env.GOOGLE_API_KEY,
        language: 'pt-PT',
      }
    });

    return res.status(200).json(response.data);
  } catch (error: any) {
    console.error('[ScanProxy] Google Nearby API Error:', error.response?.data || error.message);
    return res.status(500).json({ error: 'Erro ao consultar serviço de proximidade' });
  }
});

/**
 * Proxy for Google Places Details
 * GET /api/scan/details?place_id=...
 */
router.get('/details', authenticate, async (req: Request, res: Response) => {
  try {
    const { place_id } = req.query;

    if (!place_id) {
      return res.status(400).json({ error: 'place_id is required' });
    }

    const response = await axios.get('https://maps.googleapis.com/maps/api/place/details/json', {
      params: {
        place_id,
        key: env.GOOGLE_API_KEY,
        fields: 'formatted_phone_number,website,opening_hours,rating,user_ratings_total,reviews',
        language: 'pt-PT',
      }
    });

    return res.status(200).json(response.data);
  } catch (error: any) {
    console.error('[ScanProxy] Google Details API Error:', error.response?.data || error.message);
    return res.status(500).json({ error: 'Erro ao consultar detalhes do estabelecimento' });
  }
});

export default router;