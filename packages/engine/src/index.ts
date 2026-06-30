import { serve } from '@hono/node-server';
import { buildApp } from './http/app.js';
import { buildContainer } from './http/container.js';
import { env } from './config/env.js';

const container = buildContainer();
const app = buildApp(container);

const server = serve({ fetch: app.fetch, port: env.PORT }, (info) => {
  console.log(
    JSON.stringify({
      level: 'info',
      event: 'server.start',
      port: info.port,
      nodeEnv: env.NODE_ENV,
      useFakeNomba: env.USE_FAKE_NOMBA,
    }),
  );
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log(JSON.stringify({ level: 'info', event: 'server.shutdown' }));
  await container.close();
  server.close();
});
