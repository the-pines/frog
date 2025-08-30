import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema';
import { DATABASE_URL } from '@/config/constants/envs';

const client = postgres(DATABASE_URL, { prepare: false });

export const db = drizzle(client, { schema });
