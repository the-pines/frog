import { Abi } from 'viem';
import pointsAbiJson from '@/lib/contracts/PointsToken.sol/PointsToken.json';
import adminAbiJson from '@/lib/contracts/AdminMinterLeaderboard.sol/AdminMinterLeaderboard.json';

export const POINTS_TOKEN_ABI = pointsAbiJson.abi as Abi;
export const ADMIN_LEADERBOARD_ABI = adminAbiJson.abi as Abi;
