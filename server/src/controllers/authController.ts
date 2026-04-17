import { Request, Response } from 'express';
import * as authService from '../services/authService';
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
    const authReq = req as AuthRequest;
    const { refreshToken } = req.body;
    const result = await authService.refreshTokens(authReq.userId!, refreshToken);
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
