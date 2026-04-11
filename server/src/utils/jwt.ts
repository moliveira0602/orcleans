import jwt, { type SignOptions } from 'jsonwebtoken';
import { jwtConfig } from '../config/jwt.js';

interface TokenPayload {
  sub: string;
  organizationId: string;
  role: string;
  name: string;
  email: string;
}

export function generateAccessToken(payload: TokenPayload): string {
  const options: SignOptions = {
    expiresIn: '15m',
  };
  return jwt.sign(payload, jwtConfig.accessSecret, options);
}

export function generateRefreshToken(userId: string): string {
  const options: SignOptions = {
    expiresIn: '7d',
  };
  return jwt.sign({ sub: userId }, jwtConfig.refreshSecret, options);
}

export function verifyRefreshToken(token: string): { sub: string } | null {
  try {
    return jwt.verify(token, jwtConfig.refreshSecret) as { sub: string };
  } catch {
    return null;
  }
}
