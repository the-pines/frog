/** PUBLIC **/
export const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL;
export const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || '';
export const REOWN_PROJECT_ID = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID || '';

/** SECRET **/
export const DATABASE_URL = process.env.DATABASE_URL || '';
export const EXECUTOR_PK = (process.env.EXECUTOR_PRIVATE_KEY || '') as `0x${string}`;
export const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
export const STRIPE_WEBHOOK_SECRET_KEY = process.env.STRIPE_WEBHOOK_SECRET_KEY || '';
