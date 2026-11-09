import { expect } from "chai";
import { ethers } from "hardhat";
import { ChainPlayToken } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("ChainPlayToken (CPT)", function () {
  let token: ChainPlayToken;
  let owner: HardhatEthersSigner;
  let alice: HardhatEthersSigner;
  let bob: HardhatEthersSigner;

  const INITIAL_SUPPLY = ethers.parseEther("1000000"); // 1,000,000 CPT

  beforeEach(async function () {
    [owner, alice, bob] = await ethers.getSigners();

    const TokenFactory = await ethers.getContractFactory("ChainPlayToken");
    token = (await TokenFactory.deploy(owner.address)) as ChainPlayToken;
    await token.waitForDeployment();
  });

  describe("Deployment & Metadata", function () {
    it("should set the correct token name, symbol and decimals", async function () {
      expect(await token.name()).to.equal("ChainPlay Token");
      expect(await token.symbol()).to.equal("CPT");
      expect(await token.decimals()).to.equal(18);
    });

    it("should mint initial supply of 1,000,000 CPT to the initial owner", async function () {
      expect(await token.totalSupply()).to.equal(INITIAL_SUPPLY);
      expect(await token.balanceOf(owner.address)).to.equal(INITIAL_SUPPLY);
    });

    it("should grant initial owner admin, minter and pauser roles", async function () {
      const DEFAULT_ADMIN_ROLE = await token.DEFAULT_ADMIN_ROLE();
      const MINTER_ROLE = await token.MINTER_ROLE();
      const PAUSER_ROLE = await token.PAUSER_ROLE();

      expect(await token.hasRole(DEFAULT_ADMIN_ROLE, owner.address)).to.be.true;
      expect(await token.hasRole(MINTER_ROLE, owner.address)).to.be.true;
      expect(await token.hasRole(PAUSER_ROLE, owner.address)).to.be.true;
    });

    it("should revert if initial owner is zero address", async function () {
      const TokenFactory = await ethers.getContractFactory("ChainPlayToken");
      await expect(TokenFactory.deploy(ethers.ZeroAddress)).to.be.revertedWith(
        "ChainPlayToken: initialOwner is zero address"
      );
    });
  });

  describe("Controlled Minting", function () {
    it("should allow minter to mint additional tokens", async function () {
      const mintAmount = ethers.parseEther("5000");
      await expect(token.connect(owner).mint(alice.address, mintAmount))
        .to.emit(token, "TokensMinted")
        .withArgs(alice.address, mintAmount, owner.address);

      expect(await token.balanceOf(alice.address)).to.equal(mintAmount);
      expect(await token.totalSupply()).to.equal(INITIAL_SUPPLY + mintAmount);
    });

    it("should revert if non-minter attempts to mint", async function () {
      const mintAmount = ethers.parseEther("100");
      await expect(
        token.connect(alice).mint(alice.address, mintAmount)
      ).to.be.revertedWithCustomError(token, "AccessControlUnauthorizedAccount");
    });

    it("should revert when minting to zero address", async function () {
      await expect(
        token.connect(owner).mint(ethers.ZeroAddress, ethers.parseEther("100"))
      ).to.be.revertedWith("ChainPlayToken: cannot mint to zero address");
    });

    it("should revert when minting zero amount", async function () {
      await expect(
        token.connect(owner).mint(alice.address, 0)
      ).to.be.revertedWith("ChainPlayToken: mint amount must be greater than zero");
    });
  });

  describe("Burning", function () {
    it("should allow a token holder to burn their tokens", async function () {
      const burnAmount = ethers.parseEther("1000");
      await token.connect(owner).burn(burnAmount);

      expect(await token.totalSupply()).to.equal(INITIAL_SUPPLY - burnAmount);
      expect(await token.balanceOf(owner.address)).to.equal(INITIAL_SUPPLY - burnAmount);
    });

    it("should allow approved spender to burnFrom", async function () {
      const transferAmount = ethers.parseEther("500");
      await token.connect(owner).transfer(alice.address, transferAmount);

      await token.connect(alice).approve(bob.address, transferAmount);
      await token.connect(bob).burnFrom(alice.address, transferAmount);

      expect(await token.balanceOf(alice.address)).to.equal(0);
    });
  });

  describe("Pausable Controls", function () {
    it("should allow pauser to pause and unpause transfers", async function () {
      await token.connect(owner).pause();
      expect(await token.paused()).to.be.true;

      await expect(
        token.connect(owner).transfer(alice.address, ethers.parseEther("100"))
      ).to.be.revertedWithCustomError(token, "EnforcedPause");

      await token.connect(owner).unpause();
      expect(await token.paused()).to.be.false;

      await expect(
        token.connect(owner).transfer(alice.address, ethers.parseEther("100"))
      ).to.not.be.reverted;
      expect(await token.balanceOf(alice.address)).to.equal(ethers.parseEther("100"));
    });

    it("should revert if non-pauser attempts to pause", async function () {
      await expect(token.connect(alice).pause()).to.be.revertedWithCustomError(
        token,
        "AccessControlUnauthorizedAccount"
      );
    });
  });
});
