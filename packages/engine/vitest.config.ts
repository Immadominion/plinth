import { defineConfig } from 'vitest/config';
import { resolve } from 'path';
import { readFileSync } from 'fs';

// Parse a .env file into a Record<string, string>.  Used to inject the
// monorepo-root .env into every Vitest worker so that env.ts can validate it
// before any test module is loaded.
function parseEnvFile(filePath: string): Record<string, string> {
  try {
    const lines = readFileSync(filePath, 'utf-8').split('\n');
    const out: Record<string, string> = {};
    for (const raw of lines) {
      const line = raw.trim();
      if (!line || line.startsWith('#')) continue;
      const idx = line.indexOf('=');
      if (idx < 1) continue;
      out[line.slice(0, idx).trim()] = line.slice(idx + 1).trim();
    }
    return out;
  } catch {
    return {};
  }
}

const rootEnv = parseEnvFile(resolve(__dirname, '../../.env'));

export default defineConfig({
  test: {
    env: rootEnv,
    environment: 'node',
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
  resolve: {
    alias: {
      '@domain': resolve(__dirname, './src/domain'),
      '@ports': resolve(__dirname, './src/ports'),
      '@application': resolve(__dirname, './src/application'),
      '@infrastructure': resolve(__dirname, './src/infrastructure'),
    },
  },
});
