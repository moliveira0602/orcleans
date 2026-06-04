/**
 * ORCA — Enrichment Routes (CNPJ / NIF)
 *
 * Proxy endpoints that call free public APIs to validate
 * Brazilian CNPJ (via BrasilAPI) and Portuguese NIF (via nif.pt).
 */

import { Router } from 'express';
import axios from 'axios';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// ── CNPJ (Brazil) ─────────────────────────────────────────────────────────────
// BrasilAPI is free, no key required.
// Docs: https://brasilapi.com.br/docs#tag/CNPJ

router.get('/cnpj/:cnpj', async (req, res) => {
  const cnpj = req.params.cnpj.replace(/\D/g, '');

  if (cnpj.length !== 14) {
    return res.status(400).json({ error: 'CNPJ deve ter 14 dígitos' });
  }

  try {
    const response = await axios.get(
      `https://brasilapi.com.br/api/cnpj/v1/${cnpj}`,
      { timeout: 10000, headers: { 'Accept': 'application/json' } }
    );

    const d = response.data;

    // Normalize to a common shape used by the frontend
    return res.json({
      cnpj: d.cnpj,
      razao_social: d.razao_social,
      nome_fantasia: d.nome_fantasia || d.razao_social,
      email: d.email || '',
      telefone: d.ddd_telefone_1
        ? `(${d.ddd_telefone_1}) ${d.telefone_1}`
        : '',
      logradouro: [d.logradouro, d.numero, d.complemento].filter(Boolean).join(', '),
      municipio: d.municipio,
      uf: d.uf,
      cep: d.cep,
      descricao_atividade_principal:
        d.cnae_fiscal_descricao || d.atividade_principal?.[0]?.text || '',
      situacao_cadastral: d.descricao_situacao_cadastral || d.situacao_cadastral,
      data_inicio_atividade: d.data_inicio_atividade,
    });
  } catch (err: any) {
    const status = err.response?.status || 500;
    const msg =
      status === 404
        ? 'CNPJ não encontrado na Receita Federal'
        : 'Erro ao consultar CNPJ';
    return res.status(status === 404 ? 404 : 500).json({ error: msg });
  }
});

// ── NIF (Portugal) ────────────────────────────────────────────────────────────
// nif.pt offers a free tier (no key) for validation.
// Docs: https://www.nif.pt/

router.get('/nif/:nif', async (req, res) => {
  const nif = req.params.nif.replace(/\D/g, '');

  if (nif.length !== 9) {
    return res.status(400).json({ error: 'NIF deve ter 9 dígitos' });
  }

  try {
    const response = await axios.get('https://www.nif.pt/', {
      params: { json: 1, q: nif },
      timeout: 10000,
      headers: { 'Accept': 'application/json', 'User-Agent': 'ORCALens/1.0' },
    });

    const d = response.data;

    // nif.pt returns { result: 'success'|'error', records: {...} }
    if (d.result !== 'success' || !d.records) {
      return res.status(404).json({ error: 'NIF não encontrado' });
    }

    const record = d.records[nif] || Object.values(d.records)[0] || {};

    return res.json({
      nif,
      name: record.title || record.name || '',
      address: record.address || '',
      city: record.pc_desig || record.city || '',
      zip: record.pc || record.zip || '',
      activity: record.activity || '',
      status: record.situation || record.status || '',
    });
  } catch (err: any) {
    const status = err.response?.status || 500;
    const msg =
      status === 404
        ? 'NIF não encontrado no Portal das Finanças'
        : 'Erro ao consultar NIF';
    return res.status(status === 404 ? 404 : 500).json({ error: msg });
  }
});

export default router;
