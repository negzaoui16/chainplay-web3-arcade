import { ethers } from "hardhat";

async function main() {
  console.log("==================================================");
  console.log("🚀 ChainPlay — Hedera Testnet Deployment Script");
  console.log("==================================================\n");

  const [deployer] = await ethers.getSigners();
  if (!deployer) {
    throw new Error(
      "❌ No deployer account configured. Please set HEDERA_OPERATOR_PRIVATE_KEY in contracts/.env"
    );
  }

  const network = await ethers.provider.getNetwork();
  const balance = await ethers.provider.getBalance(deployer.address);

  console.log(`📡 Network: ${network.name} (Chain ID: ${network.chainId})`);
  console.log(`👤 Deployer Address: ${deployer.address}`);
  console.log(`💰 Deployer Balance: ${ethers.formatEther(balance)} HBAR\n`);

  if (balance === 0n) {
    console.warn("⚠️ WARNING: Deployer balance is 0 HBAR.");
    console.warn("Please fund your Hedera Testnet account from https://portal.hedera.com\n");
  }

  // 1. Deploy ChainPlayToken (CPT)
  console.log("1️⃣  Deploying ChainPlayToken (CPT)...");
  const TokenFactory = await ethers.getContractFactory("ChainPlayToken");
  const token = await TokenFactory.deploy(deployer.address);
  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();

  console.log(`   ✅ ChainPlayToken deployed at: ${tokenAddress}`);
  console.log(`   🔗 HashScan: https://hashscan.io/testnet/contract/${tokenAddress}\n`);

  // 2. Deploy TokenManager
  console.log("2️⃣  Deploying TokenManager...");
  const TokenManagerFactory = await ethers.getContractFactory("TokenManager");
  // By default, deployer is both Admin and Operator (can sign vouchers)
  const tokenManager = await TokenManagerFactory.deploy(
    tokenAddress,
    deployer.address,
    deployer.address
  );
  await tokenManager.waitForDeployment();
  const tokenManagerAddress = await tokenManager.getAddress();

  console.log(`   ✅ TokenManager deployed at: ${tokenManagerAddress}`);
  console.log(`   🔗 HashScan: https://hashscan.io/testnet/contract/${tokenManagerAddress}\n`);

  // 3. Fund TokenManager Vault (Option A: 600,000 CPT for player rewards)
  console.log("3️⃣  Funding TokenManager Vault with 600,000 CPT...");
  const vaultAmount = ethers.parseEther("600000");
  const fundTx = await token.transfer(tokenManagerAddress, vaultAmount);
  await fundTx.wait();

  const vaultBalance = await tokenManager.vaultBalance();
  console.log(`   ✅ TokenManager Vault Funded: ${ethers.formatEther(vaultBalance)} CPT\n`);

  // 4. Output Configuration for Frontend
  console.log("==================================================");
  console.log("📋 Configuration for Next.js Frontend (/frontend):");
  console.log("==================================================");
  console.log(`NEXT_PUBLIC_HEDERA_CHAIN_PLAY_TOKEN=${tokenAddress}`);
  console.log(`NEXT_PUBLIC_HEDERA_TOKEN_MANAGER=${tokenManagerAddress}`);
  console.log("==================================================\n");
}

main().catch((error) => {
  console.error("❌ Deployment failed:", error);
  process.exitCode = 1;
});
