import z from 'zod';
import { NextRequest, NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { isAddress } from 'viem';

import { db } from '@/db';
import { users, vaults } from '@/db/schema';
import {
  executorAccount,
  publicClient,
  walletClient,
} from '@/config/viem-config';
import { LISK_ETH_RESTAKE_FACTORY_ADDRESS } from '@/config/constants/addresses';
import factoryAbi from '@/lib/contracts/SymbioticLiskETHVaultProxyFactory.sol/LiskETHRestakeVaultFactory.json';
import vaultAbiJson from '@/lib/contracts/SymbioticLiskEthVaultProxy.sol/SymbioticLiskETHVaultProxy.json';
import { decodeEventLog, erc20Abi } from 'viem';
import { ROUTER_ADDRESS } from '@/config/constants/addresses';

const BodySchema = z.object({
  owner: z
    .string()
    .transform((s) => s.trim().toLowerCase())
    .refine((a) => isAddress(a), { message: 'Invalid owner address' }),
  goalWei: z.string().min(1),
  name: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { success, error, data } = BodySchema.safeParse(body);
    if (!success) {
      return NextResponse.json(
        { error: 'Invalid body', details: z.treeifyError(error) },
        { status: 400 }
      );
    }

    if (!LISK_ETH_RESTAKE_FACTORY_ADDRESS) {
      return NextResponse.json(
        { error: 'Factory address not configured' },
        { status: 500 }
      );
    }

    let user = await db.query.users.findFirst({
      where: eq(users.address, data.owner),
    });
    if (!user) {
      // Auto-provision a minimal user for wallet owners
      const inserted = await db
        .insert(users)
        .values({
          name: 'Wallet user',
          address: data.owner,
          provider: 'wallet',
        })
        .returning();
      user = inserted[0]!;
    }

    const abiFactory = (factoryAbi as { abi: unknown })
      .abi as readonly unknown[];
    const txHash = await walletClient.writeContract({
      account: executorAccount,
      address: LISK_ETH_RESTAKE_FACTORY_ADDRESS,
      abi: abiFactory,
      functionName: 'createVault',
      args: [
        data.owner as `0x${string}`,
        executorAccount.address,
        BigInt(Math.floor(Date.now() / 1000)), // unlockTime now, demo
        BigInt(data.goalWei),
        data.name,
      ],
    });
    const receipt = await publicClient.waitForTransactionReceipt({
      hash: txHash,
    });

    let vaultAddress: `0x${string}` =
      '0x0000000000000000000000000000000000000000';
    for (const log of receipt.logs) {
      if (
        log.address.toLowerCase() !==
        LISK_ETH_RESTAKE_FACTORY_ADDRESS.toLowerCase()
      )
        continue;
      try {
        const decoded = decodeEventLog({
          abi: abiFactory,
          data: log.data,
          topics: [
            log.topics[0] as `0x${string}`,
            ...(log.topics.slice(1) as `0x${string}`[]),
          ] as [`0x${string}`, ...`0x${string}`[]],
        });
        if (decoded.eventName === 'VaultCreated') {
          const { vault } = decoded.args as { vault: `0x${string}` };
          if (vault) {
            vaultAddress = vault;
            break;
          }
        }
      } catch {}
    }

    // allow default router once (LIFI)
    if (
      ROUTER_ADDRESS &&
      ROUTER_ADDRESS !== (('0x' + '0'.repeat(40)) as `0x${string}`)
    ) {
      try {
        const abiVault = (vaultAbiJson as { abi: unknown })
          .abi as readonly unknown[];
        await walletClient.writeContract({
          account: executorAccount,
          address: vaultAddress,
          abi: abiVault,
          functionName: 'setRouterAllowed',
          args: [ROUTER_ADDRESS, true],
        });
      } catch (e) {
        console.warn('setRouterAllowed failed (continuing):', e);
      }
    }

    try {
      const abiVault = (vaultAbiJson as { abi: unknown })
        .abi as readonly unknown[];
      const wsteth = (await publicClient.readContract({
        address: vaultAddress,
        abi: abiVault,
        functionName: 'WSTETH',
      })) as `0x${string}`;
      await Promise.all([
        publicClient.readContract({
          address: wsteth,
          abi: erc20Abi,
          functionName: 'symbol',
        }),
        publicClient.readContract({
          address: wsteth,
          abi: erc20Abi,
          functionName: 'decimals',
        }),
      ]);
    } catch {}

    await db.insert(vaults).values({
      userId: user.id,
      collaborators: [],
      address: vaultAddress,
    });

    return NextResponse.json(
      { ok: true, vault: vaultAddress, txHash },
      { status: 200 }
    );
  } catch (e) {
    console.error('[POST /api/vaults/create] error:', e);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
