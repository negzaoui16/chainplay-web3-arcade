import { ethers } from "hardhat";

async function main() {
  const tokenManagerAddress = "0x6D22E4bCF8ab77E13FEB5F59E2C7C404aDe610A9";
  const tokenManager = await ethers.getContractAt("TokenManager", tokenManagerAddress);

  const voucher = {
    gameId: "0x00bbfa93a0d430bcee8548d101bf3517d3040ca01f4d1bad65173b0daca94d8b",
    gameType: 0,
    player: "0x55780aa34b4ccd8cc97968b98fe88571406db03b",
    winAmount: ethers.parseEther("100"),
    participationAmount: ethers.parseEther("20"),
    nonce: 1793832385796371n,
    deadline: 1793839585n,
  };
  const sig = "0xb91b76f73d582a964b106f79e04d8357df88b1bc89471213d667b0796c89617b365f730baecb4835e11a6ed4a180dd860d74760069d18cca69112bcafda3b7531b";

  console.log("Checking isGameRewarded...");
  const isRewarded = await tokenManager.isGameRewarded(voucher.gameId);
  console.log("isGameRewarded:", isRewarded);

  console.log("Testing staticCall for claimRewardWithVoucher on Hedera Testnet...");
  await tokenManager.claimRewardWithVoucher.staticCall(voucher, sig);
  console.log("🎉 SUCCESS! Hedera Testnet smart contract verified the EIP-712 voucher perfectly without reverting!");
}

main().catch(console.error);
