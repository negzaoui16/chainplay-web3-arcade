import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  const recipient = "0x94DbD1F0843E9A07E173Fdc60540Cb830E053CDE";
  const amount = ethers.parseEther("50"); // 50 HBAR

  console.log(`Sending 50 HBAR from ${deployer.address} to ${recipient}...`);
  const tx = await deployer.sendTransaction({
    to: recipient,
    value: amount,
  });
  console.log(`Transaction submitted! Hash: ${tx.hash}`);
  await tx.wait();
  console.log("✅ 50 HBAR successfully transferred!");

  const newBal = await ethers.provider.getBalance(recipient);
  console.log(`New HBAR Balance of ${recipient}: ${ethers.formatEther(newBal)} HBAR`);
}

main().catch(console.error);
