import { Request, Response } from 'express';
import * as authService from '../services/authService';
import { verifyRefreshToken } from '../utils/jwt';
import type { AuthRequest } from '../middleware/auth';

export async function register(req: Request, res: Response) {
  try {
    const result = await authService.register(req.body);
    return res.status(201).json(result);
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
}

export async function login(req: Request, res: Response) {
  try {
    const result = await authService.login(req.body);
    return res.status(200).json(result);
  } catch (error: any) {
    return res.status(401).json({ error: error.message });
  }
}

export async function refreshToken(req: Request, res: Response) {
  try {
    const { refreshToken } = req.body;
    // Extract userId directly from the refresh token payload (no authenticate middleware on this route)
    const decoded = verifyRefreshToken(refreshToken);
    if (!decoded?.sub) {
      return res.status(401).json({ error: 'Refresh token inválido' });
    }
    const result = await authService.refreshTokens(decoded.sub, refreshToken);
    return res.status(200).json(result);
  } catch (error: any) {
    return res.status(401).json({ error: error.message });
  }
}

export async function logout(req: Request, res: Response) {
  try {
    const authReq = req as AuthRequest;
    const { refreshToken } = req.body;
    await authService.logout(authReq.userId!, refreshToken);
    return res.status(204).send();
  } catch (error: any) {
    return res.status(400).json({ error: error.message });
  }
}

export async function getProfile(req: Request, res: Response) {
  try {
    const authReq = req as AuthRequest;
    const profile = await authService.getProfile(authReq.userId!);
    return res.status(200).json(profile);
  } catch (error: any) {
    return res.status(404).json({ error: error.message });
  }
}

export async function updateProfile(req: Request, res: Response) {
  try {
    const authReq = req as AuthRequest;
    const { name, email, company } = req.body;
    console.log('[updateProfile] userId:', authReq.userId);
    console.log('[updateProfile] body:', JSON.stringify(req.body));
    const profile = await authService.updateProfile(authReq.userId!, { name, email, company });
    console.log('[updateProfile] saved:', JSON.stringify(profile));
    return res.status(200).json(profile);
  } catch (error: any) {
    console.error('[updateProfile] error:', error.message);
    return res.status(400).json({ error: error.message });
  }
}
