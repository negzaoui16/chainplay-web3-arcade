import { ethers } from "hardhat";

async function main() {
  const token = await ethers.getContractAt("ChainPlayToken", "0x2D0E84d043Ae598F528FE39229e3DC0F8845A98a");
  const user = "0x94DbD1F0843E9A07E173Fdc60540Cb830E053CDE";
  const bal = await token.balanceOf(user);
  console.log("CPT Balance of", user, "is:", ethers.formatEther(bal), "CPT");
}

main().catch(console.error);
