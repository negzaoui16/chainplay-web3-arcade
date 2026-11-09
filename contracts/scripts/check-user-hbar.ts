import { ethers } from "hardhat";

async function main() {
  const user = "0x94DbD1F0843E9A07E173Fdc60540Cb830E053CDE";
  const hbarBal = await ethers.provider.getBalance(user);
  console.log("HBAR Balance of", user, "is:", ethers.formatEther(hbarBal), "HBAR");
}

main().catch(console.error);
