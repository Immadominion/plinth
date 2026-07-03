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

// Outbound webhook dispatcher: periodically fan out new events to endpoints and deliver due retries.
// DB-backed (no separate worker/Redis needed). Skipped under NODE_ENV=test.
let dispatchTimer: ReturnType<typeof setInterval> | undefined;
if (env.NODE_ENV !== 'test') {
  const intervalMs = env.WEBHOOK_DISPATCH_INTERVAL_MS;
  dispatchTimer = setInterval(() => {
    container.webhookDispatchService.tick().catch((err) => {
      console.error(JSON.stringify({ level: 'error', event: 'webhook.dispatch_failed', error: err instanceof Error ? err.message : String(err) }));
    });
  }, intervalMs);
  dispatchTimer.unref?.(); // don't keep the process alive just for this
  console.log(JSON.stringify({ level: 'info', event: 'webhook.dispatcher_started', intervalMs }));
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log(JSON.stringify({ level: 'info', event: 'server.shutdown' }));
  if (dispatchTimer) clearInterval(dispatchTimer);
  await container.close();
  server.close();
});
