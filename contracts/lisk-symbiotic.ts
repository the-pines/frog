import "dotenv/config";
import {
  Address,
  createPublicClient,
  createWalletClient,
  defineChain,
  formatEther,
  getAddress,
  getContract,
  http,
  parseEther,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import VaultArtifact from "../assets/SymbioticLiskETHVaultProxy.json";

const {
  PRIVATE_KEY,
  LISK_RPC_URL = "https://rpc.api.lisk.com",
  LIFI_API_KEY,
  VAULT_ADDRESS,
  LISK_WSTETH_ADDRESS = "0x76D8de471F54aAA87784119c60Df1bbFc852C415",
  MELLOW_VAULT_ADDRESS = "0x1b10E2270780858923cdBbC9B5423e29fffD1A44",
  AMOUNT_ETH = "0.001",
  AUTO_ALLOW_ROUTER = "true",
  WITHDRAW_FRACTION_BPS = "5000",
} = process.env as Record<string, string>;

if (!PRIVATE_KEY || !LIFI_API_KEY || !VAULT_ADDRESS) {
  throw new Error("Missing env: PRIVATE_KEY, LIFI_API_KEY, VAULT_ADDRESS");
}

const lisk = defineChain({
  id: 1135,
  name: "Lisk",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: { default: { http: [LISK_RPC_URL] } },
  blockExplorers: {
    default: { name: "Blockscout", url: "https://blockscout.lisk.com" },
  },
});

const VaultABI = (VaultArtifact as any).abi;

const ERC4626_ABI = [
  {
    type: "function",
    name: "previewRedeem",
    stateMutability: "view",
    inputs: [{ name: "shares", type: "uint256" }],
    outputs: [{ type: "uint256" }],
  },
] as const;

const account = privateKeyToAccount(PRIVATE_KEY as `0x${string}`);
const pub = createPublicClient({ chain: lisk, transport: http(LISK_RPC_URL) });
const wallet = createWalletClient({
  account,
  chain: lisk,
  transport: http(LISK_RPC_URL),
});
const VAULT = getAddress(VAULT_ADDRESS as Address);
const WSTETH = getAddress(LISK_WSTETH_ADDRESS as Address);
const MELLOW = getAddress(MELLOW_VAULT_ADDRESS as Address);

const vault = getContract({
  address: VAULT,
  abi: VaultABI,
  client: { public: pub, wallet },
});
const mellow = getContract({
  address: MELLOW,
  abi: ERC4626_ABI,
  client: { public: pub },
});

const NATIVE = "0x0000000000000000000000000000000000000000";
const amountWei = parseEther(AMOUNT_ETH);
const wfrac = Number(WITHDRAW_FRACTION_BPS);

// get quote from lifi
async function getLifiQuote(params: {
  fromToken: string;
  toToken: string;
  fromAmount: bigint;
  fromAddress: Address;
  toAddress: Address;
  slippageBps?: number;
}) {
  const url = new URL("https://li.quest/v1/quote");
  url.searchParams.set("fromChain", String(lisk.id));
  url.searchParams.set("toChain", String(lisk.id));
  url.searchParams.set("fromToken", params.fromToken);
  url.searchParams.set("toToken", params.toToken);
  url.searchParams.set("fromAmount", params.fromAmount.toString());
  url.searchParams.set("fromAddress", params.fromAddress);
  url.searchParams.set("toAddress", params.toAddress);
  url.searchParams.set("slippage", String((params.slippageBps ?? 50) / 10000)); // default 0.5%

  const res = await fetch(url.toString(), {
    headers: { "x-lifi-api-key": LIFI_API_KEY!, accept: "application/json" },
  });
  if (!res.ok)
    throw new Error(`LI.FI quote failed: ${res.status} ${await res.text()}`);
  const data: any = await res.json();
  const tr = data?.transactionRequest;
  const minOut = data?.estimate?.toAmountMin;
  if (!tr?.to || !tr?.data || !tr?.value || !minOut) {
    throw new Error("Bad LI.FI response (missing to/data/value/minOut)");
  }
  return {
    router: getAddress(tr.to),
    data: tr.data as `0x${string}`,
    value: BigInt(tr.value),
    minOut: BigInt(minOut),
    tool: data?.tool as string | undefined,
  };
}

async function ensureRouterAllowed(router: Address) {
  const allowed = await (vault.read.isRouterAllowed as any)([router]);
  if (allowed) return true;
  if (AUTO_ALLOW_ROUTER !== "true") return false;
  try {
    const tx = await (vault.write.setRouterAllowed as any)([router, true]);
    console.log(`setRouterAllowed tx: ${tx}`);
    await pub.waitForTransactionReceipt({ hash: tx });
    return true;
  } catch (e) {
    console.warn("Could not allow router (are you the owner?):", e);
    return false;
  }
}

async function main() {
  console.log(`Signer: ${account.address}`);
  console.log(`Vault : ${VAULT}`);

  // deposit into symbiotic mellow vault via contract
  console.log(
    `\n[1] Getting LI.FI quote: ${AMOUNT_ETH} ETH → wstETH (vault-caller)`
  );
  const dep = await getLifiQuote({
    fromToken: NATIVE,
    toToken: WSTETH,
    fromAmount: amountWei,
    fromAddress: VAULT,
    toAddress: VAULT,
  });
  console.log(
    `Router: ${dep.router} | Tool: ${dep.tool} | minOut(wstETH wei): ${dep.minOut}`
  );

  const can = await ensureRouterAllowed(dep.router);
  if (!can)
    console.log("Router not allowed; proceeding anyway (tx may revert).");

  console.log("[1] Calling depositETHViaRouter...");
  const depTx = await (vault.write.depositETHViaRouter as any)(
    [dep.router, dep.data, dep.minOut],
    { value: dep.value }
  );
  console.log(`deposit tx: ${depTx}`);
  await pub.waitForTransactionReceipt({ hash: depTx });

  const assetsAfter = await (vault.read.currentAssetsOf as any)([
    account.address,
  ]);
  const sharesAfter = await (vault.read.userShares as any)([account.address]);
  console.log(
    `[1] Position — assets≈ ${formatEther(
      assetsAfter
    )} wstETH | shares: ${sharesAfter}`
  );

  //withdraw from symbiotic mellow vault via contract
  if (sharesAfter === 0n) throw new Error("No shares after deposit");

  const sharesToRedeem =
    wfrac >= 10000 ? sharesAfter : (sharesAfter * BigInt(wfrac)) / 10000n;

  const expectedWst = await mellow.read.previewRedeem([sharesToRedeem]);
  console.log(
    `\n[2] Preparing withdraw — redeem shares=${sharesToRedeem} → expect ~${formatEther(
      expectedWst
    )} wstETH`
  );

  console.log("[2] Getting LI.FI quote: wstETH → ETH (vault-caller)");
  const wd = await getLifiQuote({
    fromToken: WSTETH,
    toToken: NATIVE,
    fromAmount: expectedWst,
    fromAddress: VAULT,
    toAddress: VAULT,
  });
  console.log(
    `Router: ${wd.router} | Tool: ${wd.tool} | minOut(ETH wei): ${wd.minOut}`
  );

  const can2 = await ensureRouterAllowed(wd.router);
  if (!can2)
    console.log("Router not allowed; proceeding anyway (tx may revert).");

  console.log("[2] Calling withdrawSplitToETH...");
  const wdTx = await (vault.write.withdrawSplitToETH as any)([
    sharesToRedeem,
    wd.router,
    wd.data,
    wd.minOut,
  ]);
  console.log(`withdraw tx: ${wdTx}`);
  const rcpt = await pub.waitForTransactionReceipt({ hash: wdTx });
  console.log(`[2] Done. Block #${rcpt.blockNumber}`);

  // show result
  const sharesLeft = await (vault.read.userShares as any)([account.address]);
  console.log(`\n[3] Remaining shares: ${sharesLeft}`);
  const balEth = await pub.getBalance({ address: account.address });
  console.log(`[3] Signer ETH balance: ${formatEther(balEth)} ETH`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
