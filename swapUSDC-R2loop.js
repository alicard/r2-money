import { ethers } from "ethers";
import dotenv from "dotenv";
dotenv.config();

const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const wallet   = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

// ── Router Uniswap V2 (Sepolia) ───────────────────────────────────────────────
const routerAddr = "0xeE567Fe1712Faf6149d80dA1E6934E354124CfE3";
const routerAbi = [
  "function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory)",
  "function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory)"
];
const router = new ethers.Contract(routerAddr, routerAbi, wallet);

// ── Token info ────────────────────────────────────────────────────────────────
const USDC = { addr: "0x8bebfcbe5468f146533c182df3dfbf5ff9be00e2", dec: 6  };
const R2   = { addr: "0xb816bb88f836ea75ca4071b46ff285f690c43bb7", dec: 18 };

// ── Param — ubah sesuka hati ─────────────────────────────────────────────────
const TARGET_VOL   = 40000;   // total volume USDC
const SLIPPAGE_PCT = 2;       // %
const DEADLINE_SEC = 600;     // 10 mnt
const GAS_LIMIT    = 200000; // perkiraan gas

// ── util random delay 2‑5 s ────────────────────────────────
function randomDelay() {
  const ms = 1000 + Math.random() * 2000; // 2000‑5000 ms
  return new Promise(r => setTimeout(r, ms));
}
 
// ── Helper: approve once per token ───────────────────────────────────────────
async function approveIfNeeded(tokenAddr) {
  const erc20 = new ethers.Contract(
    tokenAddr,
    ["function allowance(address,address) view returns (uint256)",
     "function approve(address,uint256) returns (bool)"],
    wallet
  );
  if ((await erc20.allowance(wallet.address, routerAddr)) === 0n) {
    console.log("Approving", tokenAddr.slice(0, 6), "...");
    const tx = await erc20.approve(routerAddr, ethers.MaxUint256);
    await tx.wait();
  }
}

async function balanceOf(tokenAddr) {
  const erc20 = new ethers.Contract(
    tokenAddr,
    ["function balanceOf(address) view returns (uint256)"],
    provider
  );
  return await erc20.balanceOf(wallet.address);
}

async function main() {
  await approveIfNeeded(USDC.addr);
  await approveIfNeeded(R2.addr);

  let volumeDone = 0;

  while (volumeDone < TARGET_VOL) {
    // refresh saldo
    const balUSDC = await balanceOf(USDC.addr);
    const balR2   = await balanceOf(R2.addr);

    // pilih arah swap berdasarkan token yang tersedia
    let input, output, amountIn;
    if (balUSDC > 0n) {
      input  = USDC;
      output = R2;
      amountIn = balUSDC;
    } else if (balR2 > 0n) {
      input  = R2;
      output = USDC;
      amountIn = balR2;
    } else {
      console.log("💤 Kedua token habis. Loop dihentikan.");
      break;
    }

    const path      = [input.addr, output.addr];
    const amounts   = await router.getAmountsOut(amountIn, path);
    const minOut    = amounts[1] * BigInt(100 - SLIPPAGE_PCT) / 100n;
    const deadline  = Math.floor(Date.now() / 1000) + DEADLINE_SEC;

    // ── random delay BEFORE sending tx ──
    await randomDelay();

    // nonce “pending” agar tidak bentrok
    const nextNonce = await provider.getTransactionCount(wallet.address, "pending");

    console.log(`→ Swapping ${ethers.formatUnits(amountIn, input.dec)} ${input === USDC ? "USDC" : "R2"}`);

    try {
      const tx = await router.swapExactTokensForTokens(
        amountIn,
        minOut,
        path,
        wallet.address,
        deadline,
        { gasLimit: GAS_LIMIT}
      );
      console.log("   tx:", tx.hash);
      await tx.wait();

    } catch (e) {
      console.error("Swap failed, stop loop:", e.reason || e);
      break;
    }

    // Update volume dalam USDC notional
    const delta = input === USDC
      ? parseFloat(ethers.formatUnits(amountIn, USDC.dec))
      : parseFloat(ethers.formatUnits(minOut, USDC.dec)); // out‑token USDC
    volumeDone += delta;

    console.log(`   Volume so far: ${volumeDone.toFixed(2)} / ${TARGET_VOL} USDC\n`);
  }

  console.log("🎯 Loop selesai. Total volume:", volumeDone.toFixed(2), "USDC");
}

main().catch(console.error);

