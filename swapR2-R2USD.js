import { ethers } from "ethers";
import dotenv from "dotenv";

dotenv.config();

const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

// Router UniswapV2 address on Sepolia
const routerAddress = "0xeE567Fe1712Faf6149d80dA1E6934E354124CfE3";
const routerAbi = [
  "function getAmountsOut(uint amountIn, address[] calldata path) external view returns (uint[] memory)",
  "function swapExactTokensForTokens(uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory)"
];
const erc20Abi = [
  "function balanceOf(address owner) view returns (uint256)",
  "function allowance(address owner,address spender) view returns (uint256)",
  "function approve(address spender,uint256 amount) returns (bool)"
];

// Token info
const R2_ADDRESS   = "0xb816bb88f836ea75ca4071b46ff285f690c43bb7";
const R2USD_ADDRESS = "0x9e8FF356D35a2Da385C546d6Bf1D77ff85133365";
const RECIPIENT    = wallet.address;

// Swap settings
const R2_DECIMALS = 18;
const R2USD_DECIMALS = 18;
//const AMOUNT_IN_R2 = "2850"; // Ganti ini
const SLIPPAGE_PERCENT = 2;
const DEADLINE = Math.floor(Date.now() / 1000) + 60 * 10; // 10 menit dari sekarang

const router = new ethers.Contract(routerAddress, routerAbi, wallet);
const R2     = new ethers.Contract(R2_ADDRESS, erc20Abi, wallet);

async function main() {
  // Ambil saldo R2 wallet
  const rawBalance = await R2.balanceOf(wallet.address);   // uint256 (wei)
  if (rawBalance === 0n) {
    console.error("❌ Saldo R2 = 0, tidak ada yang bisa di‑swap");
    return;
  }

  // Hitung 50 % dari saldo
  const amountIn = rawBalance / 2n;                        // BigInt, langsung separuh
  const humanBalance = ethers.formatUnits(rawBalance, R2_DECIMALS);
  const humanIn      = ethers.formatUnits(amountIn,  R2_DECIMALS);
  console.log(`Saldo R2         : ${humanBalance}`);
  console.log(`Akan di‑swap (50%): ${humanIn}`);

  // Pastikan allowance cukup
  const allowance = await R2.allowance(wallet.address, routerAddress);
  if (allowance < amountIn) {
    console.log(`Approve router untuk pakai ${humanIn} R2…`);
    const txApprove = await R2.approve(routerAddress, ethers.MaxUint256);
    await txApprove.wait();
  }

  //const amountIn = ethers.parseUnits(AMOUNT_IN_R2, R2_DECIMALS);
  const path = [R2_ADDRESS, R2USD_ADDRESS];

  // --- 1. Get rate ---
  const amountsOut = await router.getAmountsOut(amountIn, path);
  const estimatedR2 = amountsOut[1];
  const ratePerR2 = parseFloat(ethers.formatUnits(estimatedR2, R2_DECIMALS)) / parseFloat(amountIn);
  console.log(`\nEstimated Rate: 1 R2 ≈ ${ratePerR2.toFixed(6)} R2`);

  // --- 2. Apply slippage ---
  const amountOutMin = estimatedR2 * BigInt(100 - SLIPPAGE_PERCENT) / 100n;
  console.log(`Swapping ${humanIn} R2`);
  console.log(`Min. R2 to receive (after ${SLIPPAGE_PERCENT}% slippage): ${ethers.formatUnits(amountOutMin, R2_DECIMALS)}\n`);

  // --- 3. Swap ---
  try {
    const tx = await router.swapExactTokensForTokens(
      amountIn,
      amountOutMin,
      path,
      RECIPIENT,
      DEADLINE,
      {
        gasLimit: 200000
      }
    );
    console.log("🚀 Transaction sent:", tx.hash);
    const receipt = await tx.wait();
    console.log("✅ Confirmed in tx:", receipt.hash);
  } catch (err) {
    console.error("❌ Swap failed:", err.reason || err);
  }
}

main();

