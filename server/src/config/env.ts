import 'dotenv/config';
import { z } from 'zod';

const bool = z
  .string()
  .optional()
  .transform((v) => v === 'true');

const nodeEnv = process.env.NODE_ENV ?? 'development';
const isProdEnv = nodeEnv === 'production';

/**
 * Development/test get deterministic fallback secrets so `npm run dev` works on a
 * fresh clone. Production must provide real secrets — the schema rejects it otherwise.
 */
const secret = (devFallback: string) =>
  isProdEnv ? z.string().min(32, 'must be at least 32 characters in production') : z.string().min(16).default(devFallback);

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  CLIENT_URL: z.string().url().default('http://localhost:5173'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),

  MONGO_URI: z.string().min(1).default('mongodb://127.0.0.1:27018/stocksense?directConnection=true'),

  JWT_ACCESS_SECRET: secret('dev-only-access-secret-change-me-0000'),
  JWT_REFRESH_SECRET: secret('dev-only-refresh-secret-change-me-000'),
  ACCESS_TOKEN_TTL: z.string().default('15m'),
  REFRESH_TOKEN_TTL: z.string().default('7d'),
  COOKIE_SECURE: bool,

  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  MAIL_FROM: z.string().default('StockSense <no-reply@stocksense.io>'),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues.map((i) => `  • ${i.path.join('.')}: ${i.message}`).join('\n');
  // The logger depends on env, so fail loudly with plain console output.
  console.error(`\n✖ Invalid environment configuration:\n${issues}\n\nCopy server/.env.example to server/.env and fill it in.\n`);
  process.exit(1);
}

export const env = parsed.data;
export const isProd = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';
