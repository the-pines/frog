import { Address } from "viem";

/** WALLET ADDRESSES **/
export const TREASURY_ADDRESS = '0x6CB7f088fc3D07E145dC0418F12F74268D0D0309' as Address;

/** TOKEN ADDRESSES **/
export const BASE_USDC_ADDRESS = '' as Address;
export const LISK_USDC_ADDRESS = '0xF242275d3a6527d877f2c927a82D9b057609cc71' as Address;
export const LISK_ETH_RESTAKE_FACTORY_ADDRESS = '0xE805bB943E0171670C2D61C93a8Bed8C459F2f7c' as Address; // LiskETHRestakeVaultFactory
export const ROUTER_ADDRESS = '0x1231DEB6f5749EF6cE6943a275A1D3E7486F4EaE' as Address; // lifi router on lisk
export const POINTS_TOKEN_ADDRESS = '0xa886e30c7e759f3E39cE2cdcDFC0341E6b65f0bc' as Address;
export const ADMIN_LEADERBOARD_ADDRESS = '0xD9FdCaE3E93f9b2DAcc543262Cf4f98A2F615cdD' as Address;

// Hidden vault addresses 
export const HIDDEN_VAULT_ADDRESSES: ReadonlyArray<Address> = [
  '0x762dfdb311bbb52cb6b3b52477a1cee4989d67b6',
  '0xb90a486b3111eb2e74e39b95e51a6d3791957ba2',
  '0x8c450638794439b67ef54163250c56b534bb959d',
  '0xfe74131b17b068f8b7bcdf93175b1f2b9325449a',
  '0x19ea13A78466D3d6F988c2AEb672E9aDeD282CD3',
];
