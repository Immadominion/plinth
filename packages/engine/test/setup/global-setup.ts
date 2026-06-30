// Reads the monorepo-root .env before any test worker is spawned so that
// process.env.DATABASE_URL etc. are available when env.ts evaluates.
import { readFileSync } from 'fs';
import { resolve } from 'path';

export default function globalSetup(): void {
  const envPath = resolve(__dirname, '../../../.env');
  let content: string;
  try {
    content = readFileSync(envPath, 'utf-8');
  } catch {
    return; // no .env — CI will inject variables directly
  }
  for (const raw of content.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eqIdx = line.indexOf('=');
    if (eqIdx < 1) continue;
    const key = line.slice(0, eqIdx).trim();
    const value = line.slice(eqIdx + 1).trim();
    if (key && !(key in process.env)) {
      process.env[key] = value;
    }
  }
}
