import { ethers } from "hardhat";

async function main() {
  const tokenAddress = "0x2D0E84d043Ae598F528FE39229e3DC0F8845A98a";
  const tokenManagerAddress = "0x6D22E4bCF8ab77E13FEB5F59E2C7C404aDe610A9";
  const deployerAddress = "0x55780AA34B4CCd8CC97968b98fE88571406dB03B";

  const token = await ethers.getContractAt("ChainPlayToken", tokenAddress);
  const tokenManager = await ethers.getContractAt("TokenManager", tokenManagerAddress);

  console.log("--- Token Verification ---");
  const name = await token.name();
  const symbol = await token.symbol();
  const totalSupply = await token.totalSupply();
  const deployerBalance = await token.balanceOf(deployerAddress);
  const vaultBalance = await token.balanceOf(tokenManagerAddress);

  console.log(`Name: ${name}`);
  console.log(`Symbol: ${symbol}`);
  console.log(`Total Supply: ${ethers.formatEther(totalSupply)} CPT`);
  console.log(`Deployer Balance: ${ethers.formatEther(deployerBalance)} CPT`);
  console.log(`TokenManager Balance: ${ethers.formatEther(vaultBalance)} CPT`);

  console.log("\n--- TokenManager Verification ---");
  const managerVaultBal = await tokenManager.vaultBalance();
  const operatorRole = await tokenManager.OPERATOR_ROLE();
  const hasOperatorRole = await tokenManager.hasRole(operatorRole, deployerAddress);

  console.log(`vaultBalance(): ${ethers.formatEther(managerVaultBal)} CPT`);
  console.log(`Deployer has OPERATOR_ROLE: ${hasOperatorRole}`);
}

main().catch(console.error);
