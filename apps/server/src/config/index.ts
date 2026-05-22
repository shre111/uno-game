const rawOrigin = process.env.CORS_ORIGIN ?? 'http://localhost:3000';
const corsOrigin = rawOrigin.includes(',')
  ? rawOrigin.split(',').map((s) => s.trim())
  : rawOrigin;

export const config = {
  port: parseInt(process.env.PORT ?? '3001', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  jwtSecret: process.env.JWT_SECRET ?? '',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  corsOrigin,
} as const;

export type Config = typeof config;
