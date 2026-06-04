/**
 * ORCA — Sonar Contínuo Service
 *
 * Manages SonarWatch records and executes scheduled/manual scans.
 * When a watch fires, it calls Google Places via the scan proxy,
 * deduplicates against existing org leads, and persists new ones.
 */

import axios from 'axios';
import { prisma } from '../config/database';
import { env } from '../config/env';

// ── TYPES ────────────────────────────────────────────────────────────────────

export interface CreateSonarWatchInput {
  organizationId: string;
  segment: string;
  city: string;
  frequency: 'daily' | 'weekly';
}

// ── CRUD ─────────────────────────────────────────────────────────────────────

export async function listSonarWatches(organizationId: string) {
  return prisma.sonarWatch.findMany({
    where: { organizationId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function createSonarWatch(input: CreateSonarWatchInput) {
  const count = await prisma.sonarWatch.count({
    where: { organizationId: input.organizationId },
  });
  if (count >= 10) {
    throw new Error('Limite de 10 Sonars por organização atingido.');
  }
  return prisma.sonarWatch.create({ data: input });
}

export async function deleteSonarWatch(organizationId: string, watchId: string) {
  const existing = await prisma.sonarWatch.findFirst({
    where: { id: watchId, organizationId },
  });
  if (!existing) throw new Error('Sonar não encontrado');
  await prisma.sonarWatch.delete({ where: { id: watchId } });
}

// ── SCAN EXECUTION ───────────────────────────────────────────────────────────

/**
 * Execute a single SonarWatch scan and persist any new leads found.
 * Returns the number of leads actually imported.
 */
export async function runSonarWatch(
  organizationId: string,
  watchId: string
): Promise<{ imported: number }> {
  const watch = await prisma.sonarWatch.findFirst({
    where: { id: watchId, organizationId },
  });
  if (!watch) throw new Error('Sonar não encontrado');

  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { leadsConsumed: true, maxLeads: true, plan: true },
  });
  if (!org) throw new Error('Organização não encontrada');

  const available = org.maxLeads - org.leadsConsumed;
  if (available <= 0) {
    await prisma.sonarWatch.update({
      where: { id: watchId },
      data: { lastRunAt: new Date() },
    });
    return { imported: 0 };
  }

  // ── Geocode city ───────────────────────────────────────────────────────────
  let lat: number, lon: number;
  const coordMatch = watch.city.match(/^(-?\d+\.?\d*),(-?\d+\.?\d*)$/);
  if (coordMatch) {
    lat = parseFloat(coordMatch[1]);
    lon = parseFloat(coordMatch[2]);
  } else {
    try {
      const geoRes = await axios.get('https://nominatim.openstreetmap.org/search', {
        params: { q: watch.city, format: 'json', limit: 1 },
        headers: { 'User-Agent': 'ORCALens-Sonar/1.0' },
        timeout: 8000,
      });
      if (!geoRes.data.length) {
        console.warn(`[Sonar] Cannot geocode city "${watch.city}" for watch ${watchId}`);
        await prisma.sonarWatch.update({ where: { id: watchId }, data: { lastRunAt: new Date() } });
        return { imported: 0 };
      }
      lat = parseFloat(geoRes.data[0].lat);
      lon = parseFloat(geoRes.data[0].lon);
    } catch (err) {
      console.error('[Sonar] Geocoding failed:', err);
      await prisma.sonarWatch.update({ where: { id: watchId }, data: { lastRunAt: new Date() } });
      return { imported: 0 };
    }
  }

  // ── Call Google Places ─────────────────────────────────────────────────────
  if (!env.GOOGLE_API_KEY) {
    console.warn('[Sonar] GOOGLE_API_KEY not configured, skipping scan');
    await prisma.sonarWatch.update({ where: { id: watchId }, data: { lastRunAt: new Date() } });
    return { imported: 0 };
  }

  let places: any[] = [];
  try {
    const resp = await axios.get('https://maps.googleapis.com/maps/api/place/textsearch/json', {
      params: {
        query: watch.segment,
        location: `${lat},${lon}`,
        radius: '5000',
        key: env.GOOGLE_API_KEY,
        language: 'pt-PT',
      },
      timeout: 15000,
    });
    places = resp.data.results || [];
  } catch (err) {
    console.error('[Sonar] Google Places call failed:', err);
  }

  if (!places.length) {
    await prisma.sonarWatch.update({ where: { id: watchId }, data: { lastRunAt: new Date() } });
    return { imported: 0 };
  }

  // ── Deduplicate ────────────────────────────────────────────────────────────
  const existingNames = await prisma.lead.findMany({
    where: { organizationId },
    select: { nome: true },
  });
  const existingSet = new Set(existingNames.map(l => l.nome.toLowerCase().trim()));

  const newPlaces = places
    .filter((p: any) => !existingSet.has((p.name || '').toLowerCase().trim()))
    .slice(0, Math.min(20, available));

  if (!newPlaces.length) {
    await prisma.sonarWatch.update({ where: { id: watchId }, data: { lastRunAt: new Date() } });
    return { imported: 0 };
  }

  // ── Persist leads ──────────────────────────────────────────────────────────
  const importId = `sonar_${watchId}_${Date.now()}`;
  const importDate = new Date();

  const leadsData = newPlaces.map((p: any) => ({
    organizationId,
    nome: p.name || 'Sem nome',
    segmento: watch.segment,
    avaliacao: p.rating ?? null,
    reviews: p.user_ratings_total ?? null,
    endereco: p.formatted_address || p.vicinity || '',
    cidade: watch.city,
    status: p.business_status === 'OPERATIONAL' ? 'Aberto' : 'Fechado',
    lat: p.geometry?.location?.lat ?? null,
    lng: p.geometry?.location?.lng ?? null,
    geocodeStatus: p.geometry?.location ? 'ok' : 'pending',
    score: Math.round((p.rating || 0) * 20),
    pipelineStage: 'novo',
    importFile: `Sonar: ${watch.segment} em ${watch.city}`,
    importDate,
    importId,
    raw: p,
    servicos: [watch.segment],
  }));

  await prisma.$transaction(async (tx) => {
    await tx.lead.createMany({ data: leadsData as any, skipDuplicates: false });
    await tx.organization.update({
      where: { id: organizationId },
      data: { leadsConsumed: { increment: leadsData.length } },
    });
    await tx.sonarWatch.update({
      where: { id: watchId },
      data: { lastRunAt: importDate },
    });
  });

  console.log(
    `[Sonar] Watch ${watchId} (${watch.segment} em ${watch.city}) ` +
    `imported ${leadsData.length} leads`
  );

  return { imported: leadsData.length };
}

// ── SCHEDULED RUNNER ─────────────────────────────────────────────────────────

/**
 * Called by the cron job. Finds all active sonars that are due and runs them.
 */
export async function runDueSonars(): Promise<void> {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const lastWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const due = await prisma.sonarWatch.findMany({
    where: {
      isActive: true,
      OR: [
        // Daily: never run OR last run > 24h ago
        {
          frequency: 'daily',
          OR: [{ lastRunAt: null }, { lastRunAt: { lte: yesterday } }],
        },
        // Weekly: never run OR last run > 7d ago
        {
          frequency: 'weekly',
          OR: [{ lastRunAt: null }, { lastRunAt: { lte: lastWeek } }],
        },
      ],
    },
  });

  console.log(`[Sonar Cron] ${due.length} sonar(s) due to run`);

  for (const watch of due) {
    try {
      const result = await runSonarWatch(watch.organizationId, watch.id);
      console.log(`[Sonar Cron] Watch ${watch.id}: ${result.imported} leads imported`);
    } catch (err) {
      console.error(`[Sonar Cron] Watch ${watch.id} failed:`, err);
    }
  }
}
