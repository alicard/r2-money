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

// Token info
const USDC_ADDRESS = "0x8bebfcbe5468f146533c182df3dfbf5ff9be00e2";
const R2_ADDRESS   = "0xb816bb88f836ea75ca4071b46ff285f690c43bb7";
const RECIPIENT    = wallet.address;

// Swap settings
const USDC_DECIMALS = 6;
const R2_DECIMALS = 18;
const AMOUNT_IN_USDC = "1400"; // Ganti ini
const SLIPPAGE_PERCENT = 2;
const DEADLINE = Math.floor(Date.now() / 1000) + 60 * 10; // 10 menit dari sekarang

const router = new ethers.Contract(routerAddress, routerAbi, wallet);

async function main() {
  const amountIn = ethers.parseUnits(AMOUNT_IN_USDC, USDC_DECIMALS);
  const path = [USDC_ADDRESS, R2_ADDRESS];

  // --- 1. Get rate ---
  const amountsOut = await router.getAmountsOut(amountIn, path);
  const estimatedR2 = amountsOut[1];
  const ratePerUSDC = parseFloat(ethers.formatUnits(estimatedR2, R2_DECIMALS)) / parseFloat(AMOUNT_IN_USDC);
  console.log(`\nEstimated Rate: 1 USDC ≈ ${ratePerUSDC.toFixed(6)} R2`);

  // --- 2. Apply slippage ---
  const amountOutMin = estimatedR2 * BigInt(100 - SLIPPAGE_PERCENT) / 100n;
  console.log(`Swapping ${AMOUNT_IN_USDC} USDC`);
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

