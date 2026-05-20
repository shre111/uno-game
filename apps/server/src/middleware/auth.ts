import jwt from 'jsonwebtoken';
import { randomUUID } from 'crypto';
import type { Request, Response, NextFunction } from 'express';

export interface GuestPayload {
  token: string;
  username: string;
  avatar: string;
}

function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET environment variable is not set');
  return secret;
}

export function generateGuestToken(username: string, avatar: string): string {
  const payload: GuestPayload = {
    token: randomUUID(),
    username,
    avatar,
  };
  return jwt.sign(payload, getSecret(), {
    expiresIn: (process.env.JWT_EXPIRES_IN ?? '7d') as jwt.SignOptions['expiresIn'],
  });
}

export function verifyGuestToken(jwtToken: string): GuestPayload {
  const decoded = jwt.verify(jwtToken, getSecret());
  if (
    typeof decoded !== 'object' ||
    decoded === null ||
    !('token' in decoded) ||
    !('username' in decoded) ||
    !('avatar' in decoded)
  ) {
    throw new jwt.JsonWebTokenError('Invalid guest token payload');
  }
  return decoded as GuestPayload;
}

// Express middleware — attaches verified payload to req.guest
export interface AuthenticatedRequest extends Request {
  guest?: GuestPayload;
}

export function requireGuest(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or malformed Authorization header' });
    return;
  }
  try {
    req.guest = verifyGuestToken(authHeader.slice(7));
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}
