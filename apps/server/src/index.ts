import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import helmet from 'helmet';
import { connectDB } from './config/db';
import { connectRedis } from './config/redis';
import { createSocketServer } from './socket';
import { config } from './config';

const app = express();
const httpServer = createServer(app);

app.use(helmet());
app.use(cors({ origin: config.corsOrigin, credentials: true }));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', env: config.nodeEnv });
});

async function bootstrap(): Promise<void> {
  await connectDB();
  await connectRedis();

  createSocketServer(httpServer);

  httpServer.listen(config.port, () => {
    console.log(`[Server] Listening on port ${config.port} (${config.nodeEnv})`);
  });
}

bootstrap().catch((err) => {
  console.error('[Server] Bootstrap failed:', err);
  process.exit(1);
});
