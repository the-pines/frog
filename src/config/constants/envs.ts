/** PUBLIC **/
export const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || '';
export const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || '';
export const BLOCKSCOUT_URL = process.env.NEXT_PUBLIC_BLOCKSCOUT_URL || '';
export const REOWN_PROJECT_ID = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID || '';
export const POINTS_TOKEN_ADDRESS = ('0xa886e30c7e759f3E39cE2cdcDFC0341E6b65f0bc') as `0x${string}`;
export const ADMIN_LEADERBOARD_ADDRESS = ('0xD9FdCaE3E93f9b2DAcc543262Cf4f98A2F615cdD') as `0x${string}`;

/** SECRET **/
export const DATABASE_URL = process.env.DATABASE_URL || '';
export const EXECUTOR_PK = (process.env.EXECUTOR_PRIVATE_KEY || '') as `0x${string}`;
export const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
export const STRIPE_WEBHOOK_SECRET_KEY = process.env.STRIPE_WEBHOOK_SECRET_KEY || '';
