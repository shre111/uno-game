import express from 'express';
import { createServer } from 'http';
import { connectDB } from './config/db';
import { connectRedis } from './config/redis';
import { config } from './config';

const app = express();
const httpServer = createServer(app);

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', env: config.nodeEnv });
});

async function bootstrap(): Promise<void> {
  await connectDB();
  await connectRedis();

  httpServer.listen(config.port, () => {
    console.log(`[Server] Listening on port ${config.port} (${config.nodeEnv})`);
  });
}

bootstrap().catch((err) => {
  console.error('[Server] Bootstrap failed:', err);
  process.exit(1);
});
