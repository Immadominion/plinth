import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env['DATABASE_URL'] ?? 'postgres://nomba:nomba_dev@localhost:5432/nomba_subs',
  },
  verbose: true,
  strict: true,
});
