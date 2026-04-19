import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const REQUIRED_KEYS = [
  'RHOMBUS_BASE_URL',
  'RHOMBUS_API_URL',
  'RHOMBUS_EMAIL',
  'RHOMBUS_PASSWORD',
] as const;

type EnvKey = (typeof REQUIRED_KEYS)[number];

function loadEnv(): Record<EnvKey, string> {
  const missing: string[] = [];

  for (const key of REQUIRED_KEYS) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
        `Copy .env.example to .env and fill in all values.`,
    );
  }

  return {
    RHOMBUS_BASE_URL: process.env['RHOMBUS_BASE_URL']!,
    RHOMBUS_API_URL: process.env['RHOMBUS_API_URL']!,
    RHOMBUS_EMAIL: process.env['RHOMBUS_EMAIL']!,
    RHOMBUS_PASSWORD: process.env['RHOMBUS_PASSWORD']!,
  };
}

export const env = loadEnv();
