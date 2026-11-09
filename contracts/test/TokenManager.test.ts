import { expect } from "chai";
import { ethers } from "hardhat";
import { ChainPlayToken, TokenManager } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("TokenManager", function () {
  let token: ChainPlayToken;
  let tokenManager: TokenManager;
  let admin: HardhatEthersSigner;
  let operator: HardhatEthersSigner;
  let unauthorizedSigner: HardhatEthersSigner;
  let player1: HardhatEthersSigner;
  let player2: HardhatEthersSigner;

  const INITIAL_SUPPLY = ethers.parseEther("1000000"); // 1,000,000 CPT
  const VAULT_FUNDING = ethers.parseEther("600000");   // 600,000 CPT for rewards

  // Helper to construct EIP-712 domain
  async function getDomain(contractAddress: string) {
    const { chainId } = await ethers.provider.getNetwork();
    return {
      name: "ChainPlay TokenManager",
      version: "1",
      chainId: chainId,
      verifyingContract: contractAddress,
    };
  }

  // EIP-712 types definition matching TokenManager.sol
  const voucherTypes = {
    RewardVoucher: [
      { name: "gameId", type: "bytes32" },
      { name: "gameType", type: "uint8" },
      { name: "player", type: "address" },
      { name: "winAmount", type: "uint256" },
      { name: "participationAmount", type: "uint256" },
      { name: "nonce", type: "uint256" },
      { name: "deadline", type: "uint256" },
    ],
  };

  beforeEach(async function () {
    [admin, operator, unauthorizedSigner, player1, player2] = await ethers.getSigners();

    // 1. Deploy ChainPlayToken
    const TokenFactory = await ethers.getContractFactory("ChainPlayToken");
    token = (await TokenFactory.deploy(admin.address)) as ChainPlayToken;
    await token.waitForDeployment();

    // 2. Deploy TokenManager
    const TokenManagerFactory = await ethers.getContractFactory("TokenManager");
    tokenManager = (await TokenManagerFactory.deploy(
      await token.getAddress(),
      admin.address,
      operator.address
    )) as TokenManager;
    await tokenManager.waitForDeployment();

    // 3. Fund TokenManager vault with 600,000 CPT (Option A: Pre-Funded Vault)
    await token.connect(admin).transfer(await tokenManager.getAddress(), VAULT_FUNDING);
  });

  describe("Deployment & Vault State", function () {
    it("should set correct token, admin, and operator roles", async function () {
      expect(await tokenManager.token()).to.equal(await token.getAddress());

      const DEFAULT_ADMIN_ROLE = await tokenManager.DEFAULT_ADMIN_ROLE();
      const OPERATOR_ROLE = await tokenManager.OPERATOR_ROLE();

      expect(await tokenManager.hasRole(DEFAULT_ADMIN_ROLE, admin.address)).to.be.true;
      expect(await tokenManager.hasRole(OPERATOR_ROLE, operator.address)).to.be.true;
      expect(await tokenManager.hasRole(OPERATOR_ROLE, unauthorizedSigner.address)).to.be.false;
    });

    it("should hold the pre-funded vault balance of 600,000 CPT", async function () {
      expect(await tokenManager.vaultBalance()).to.equal(VAULT_FUNDING);
      expect(await token.balanceOf(await tokenManager.getAddress())).to.equal(VAULT_FUNDING);
    });

    it("should revert if initialized with zero addresses", async function () {
      const Factory = await ethers.getContractFactory("TokenManager");
      await expect(
        Factory.deploy(ethers.ZeroAddress, admin.address, operator.address)
      ).to.be.revertedWith("TokenManager: token is zero address");

      await expect(
        Factory.deploy(await token.getAddress(), ethers.ZeroAddress, operator.address)
      ).to.be.revertedWith("TokenManager: admin is zero address");

      await expect(
        Factory.deploy(await token.getAddress(), admin.address, ethers.ZeroAddress)
      ).to.be.revertedWith("TokenManager: operator is zero address");
    });
  });

  describe("Claiming Rewards via EIP-712 Vouchers", function () {
    it("should successfully claim reward with valid operator signature", async function () {
      const gameId = ethers.keccak256(ethers.toUtf8Bytes("match_ttt_001"));
      const winAmount = ethers.parseEther("50");          // 50 CPT win reward
      const participationAmount = ethers.parseEther("10"); // 10 CPT participation
      const totalExpected = ethers.parseEther("60");
      const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
      const nonce = 1;

      const voucher = {
        gameId,
        gameType: 0, // TicTacToe
        player: player1.address,
        winAmount,
        participationAmount,
        nonce,
        deadline,
      };

      const domain = await getDomain(await tokenManager.getAddress());
      const signature = await operator.signTypedData(domain, voucherTypes, voucher);

      // Player 1 claims their reward
      await expect(
        tokenManager.connect(player1).claimRewardWithVoucher(voucher, signature)
      )
        .to.emit(tokenManager, "RewardClaimed")
        .withArgs(gameId, player1.address, 0, winAmount, participationAmount, totalExpected);

      // Verify balances & state
      expect(await token.balanceOf(player1.address)).to.equal(totalExpected);
      expect(await tokenManager.vaultBalance()).to.equal(VAULT_FUNDING - totalExpected);
      expect(await tokenManager.totalDistributed()).to.equal(totalExpected);
      expect(await tokenManager.isGameRewarded(gameId)).to.be.true;

      const [claimed, wins] = await tokenManager.getPlayerStats(player1.address);
      expect(claimed).to.equal(totalExpected);
      expect(wins).to.equal(1);
    });

    it("should prevent double-claiming the same game (Anti-Replay)", async function () {
      const gameId = ethers.keccak256(ethers.toUtf8Bytes("match_battleship_002"));
      const winAmount = ethers.parseEther("100");
      const participationAmount = ethers.parseEther("10");
      const deadline = Math.floor(Date.now() / 1000) + 3600;

      const voucher = {
        gameId,
        gameType: 1, // Battleship
        player: player1.address,
        winAmount,
        participationAmount,
        nonce: 42,
        deadline,
      };

      const domain = await getDomain(await tokenManager.getAddress());
      const signature = await operator.signTypedData(domain, voucherTypes, voucher);

      // First claim succeeds
      await tokenManager.connect(player1).claimRewardWithVoucher(voucher, signature);

      // Second claim with identical gameId MUST revert
      await expect(
        tokenManager.connect(player1).claimRewardWithVoucher(voucher, signature)
      ).to.be.revertedWith("TokenManager: game already rewarded");
    });

    it("should revert if claimant is not the voucher player (Front-running / Theft protection)", async function () {
      const gameId = ethers.keccak256(ethers.toUtf8Bytes("match_memory_003"));
      const voucher = {
        gameId,
        gameType: 2, // MemoryDuel
        player: player1.address, // Intended for Player 1
        winAmount: ethers.parseEther("25"),
        participationAmount: 0,
        nonce: 100,
        deadline: Math.floor(Date.now() / 1000) + 3600,
      };

      const domain = await getDomain(await tokenManager.getAddress());
      const signature = await operator.signTypedData(domain, voucherTypes, voucher);

      // Malicious player 2 attempts to frontrun and claim Player 1's voucher
      await expect(
        tokenManager.connect(player2).claimRewardWithVoucher(voucher, signature)
      ).to.be.revertedWith("TokenManager: claimant must be voucher player");
    });

    it("should revert if signature is forged or signed by unauthorized account", async function () {
      const gameId = ethers.keccak256(ethers.toUtf8Bytes("match_forged_004"));
      const voucher = {
        gameId,
        gameType: 0,
        player: player1.address,
        winAmount: ethers.parseEther("1000"),
        participationAmount: 0,
        nonce: 777,
        deadline: Math.floor(Date.now() / 1000) + 3600,
      };

      const domain = await getDomain(await tokenManager.getAddress());
      // Signed by attacker instead of authorized operator
      const forgedSignature = await unauthorizedSigner.signTypedData(domain, voucherTypes, voucher);

      await expect(
        tokenManager.connect(player1).claimRewardWithVoucher(voucher, forgedSignature)
      ).to.be.revertedWith("TokenManager: invalid operator signature");
    });

    it("should revert if voucher has expired", async function () {
      const gameId = ethers.keccak256(ethers.toUtf8Bytes("match_expired_005"));
      const expiredDeadline = Math.floor(Date.now() / 1000) - 60; // 60s in the past

      const voucher = {
        gameId,
        gameType: 0,
        player: player1.address,
        winAmount: ethers.parseEther("10"),
        participationAmount: 0,
        nonce: 99,
        deadline: expiredDeadline,
      };

      const domain = await getDomain(await tokenManager.getAddress());
      const signature = await operator.signTypedData(domain, voucherTypes, voucher);

      await expect(
        tokenManager.connect(player1).claimRewardWithVoucher(voucher, signature)
      ).to.be.revertedWith("TokenManager: voucher expired");
    });

    it("should revert if total reward is zero", async function () {
      const gameId = ethers.keccak256(ethers.toUtf8Bytes("match_zero_006"));
      const voucher = {
        gameId,
        gameType: 0,
        player: player1.address,
        winAmount: 0,
        participationAmount: 0,
        nonce: 55,
        deadline: Math.floor(Date.now() / 1000) + 3600,
      };

      const domain = await getDomain(await tokenManager.getAddress());
      const signature = await operator.signTypedData(domain, voucherTypes, voucher);

      await expect(
        tokenManager.connect(player1).claimRewardWithVoucher(voucher, signature)
      ).to.be.revertedWith("TokenManager: total reward must be greater than zero");
    });
  });

  describe("Batch Distribution (Operator)", function () {
    it("should allow operator to batch distribute rewards", async function () {
      const gId1 = ethers.keccak256(ethers.toUtf8Bytes("batch_match_1"));
      const gId2 = ethers.keccak256(ethers.toUtf8Bytes("batch_match_2"));
      const amt1 = ethers.parseEther("40");
      const amt2 = ethers.parseEther("60");

      await expect(
        tokenManager.connect(operator).batchDistributeRewards(
          [gId1, gId2],
          [player1.address, player2.address],
          [amt1, amt2]
        )
      )
        .to.emit(tokenManager, "BatchRewardsDistributed")
        .withArgs(2, amt1 + amt2);

      expect(await token.balanceOf(player1.address)).to.equal(amt1);
      expect(await token.balanceOf(player2.address)).to.equal(amt2);
      expect(await tokenManager.isGameRewarded(gId1)).to.be.true;
      expect(await tokenManager.isGameRewarded(gId2)).to.be.true;
    });

    it("should revert batch distribution if non-operator calls", async function () {
      await expect(
        tokenManager.connect(player1).batchDistributeRewards([], [], [])
      ).to.be.revertedWithCustomError(tokenManager, "AccessControlUnauthorizedAccount");
    });
  });

  describe("Emergency & Administration", function () {
    it("should allow pauser to pause and block reward claims", async function () {
      await tokenManager.connect(admin).pause();

      const gameId = ethers.keccak256(ethers.toUtf8Bytes("paused_match"));
      const voucher = {
        gameId,
        gameType: 0,
        player: player1.address,
        winAmount: ethers.parseEther("10"),
        participationAmount: 0,
        nonce: 123,
        deadline: Math.floor(Date.now() / 1000) + 3600,
      };

      const domain = await getDomain(await tokenManager.getAddress());
      const signature = await operator.signTypedData(domain, voucherTypes, voucher);

      await expect(
        tokenManager.connect(player1).claimRewardWithVoucher(voucher, signature)
      ).to.be.revertedWithCustomError(tokenManager, "EnforcedPause");

      await tokenManager.connect(admin).unpause();
      await expect(
        tokenManager.connect(player1).claimRewardWithVoucher(voucher, signature)
      ).to.not.be.reverted;
    });

    it("should allow admin to emergency withdraw vault tokens", async function () {
      const withdrawAmount = ethers.parseEther("100000");
      await expect(
        tokenManager.connect(admin).emergencyWithdraw(
          await token.getAddress(),
          admin.address,
          withdrawAmount
        )
      )
        .to.emit(tokenManager, "EmergencyWithdrawn")
        .withArgs(await token.getAddress(), admin.address, withdrawAmount);

      expect(await tokenManager.vaultBalance()).to.equal(VAULT_FUNDING - withdrawAmount);
    });

    it("should revert if non-admin attempts emergency withdraw", async function () {
      await expect(
        tokenManager.connect(player1).emergencyWithdraw(
          await token.getAddress(),
          player1.address,
          ethers.parseEther("1000")
        )
      ).to.be.revertedWithCustomError(tokenManager, "AccessControlUnauthorizedAccount");
    });
  });
});
