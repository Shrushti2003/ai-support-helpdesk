import 'dotenv/config';
import { z } from 'zod';
export const env = z.object({ DATABASE_URL: z.string().min(1), SESSION_SECRET: z.string().min(16), PORT: z.coerce.number().default(4000), CORS_ORIGIN: z.string().default('http://localhost:3000'), SLA_HOURS: z.coerce.number().positive().default(4), GEMINI_API_KEY: z.string().optional(), GEMINI_MODEL: z.string().default('gemini-2.0-flash'), NODE_ENV: z.enum(['development','test','production']).default('development') }).parse(process.env);
