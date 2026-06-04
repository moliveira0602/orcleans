/**
 * ORCA — Sonar Routes
 *
 * Endpoints for managing and executing SonarWatch entries
 * (Sonar Contínuo feature).
 */

import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import type { AuthRequest } from '../middleware/auth';
import {
  listSonarWatches,
  createSonarWatch,
  deleteSonarWatch,
  runSonarWatch,
} from '../services/sonarService';

const router = Router();
router.use(authenticate);

// GET /api/sonar/suggestions — popular segment suggestions (used by Insights.tsx)
router.get('/suggestions', (_req, res) => {
  res.json([
    { segment: 'clínica médica', city: '' },
    { segment: 'restaurante', city: '' },
    { segment: 'pet shop', city: '' },
    { segment: 'academia', city: '' },
    { segment: 'salão de beleza', city: '' },
    { segment: 'farmácia', city: '' },
    { segment: 'odontologia', city: '' },
    { segment: 'hotel', city: '' },
    { segment: 'escola', city: '' },
    { segment: 'oficina mecânica', city: '' },
  ]);
});

// GET /api/sonar/watches — list active sonars for the org
router.get('/watches', async (req: AuthRequest, res) => {
  try {
    const watches = await listSonarWatches(req.organizationId!);
    res.json(watches);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/sonar/watches — create a new sonar
router.post('/watches', async (req: AuthRequest, res) => {
  try {
    const { segment, city, frequency } = req.body;
    if (!segment || !city) {
      return res.status(400).json({ error: 'Segmento e cidade são obrigatórios' });
    }
    const freq = frequency === 'daily' ? 'daily' : 'weekly';
    const watch = await createSonarWatch({
      organizationId: req.organizationId!,
      segment: segment.trim(),
      city: city.trim(),
      frequency: freq,
    });
    res.status(201).json(watch);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/sonar/watches/:id — remove a sonar
router.delete('/watches/:id', async (req: AuthRequest, res) => {
  try {
    await deleteSonarWatch(req.organizationId!, req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(404).json({ error: err.message });
  }
});

// POST /api/sonar/watches/:id/run — execute immediately
router.post('/watches/:id/run', async (req: AuthRequest, res) => {
  try {
    const result = await runSonarWatch(req.organizationId!, req.params.id);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
