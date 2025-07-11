import { expect } from "chai";
import { ethers } from "hardhat";

describe("TestTokenA", function () {
  let token: any;
  let owner: any;
  let user: any;
  let initialSupply: bigint;

  // Deploy the contract once before all tests
  before(async function () {
    [owner, user] = await ethers.getSigners();
    const TestTokenA = await ethers.getContractFactory("TestTokenA");
    token = await TestTokenA.deploy();
    initialSupply = await token.totalSupply();
  });

  it("should deploy with initial supply to deployer", async function () {
    expect(await token.balanceOf(owner.address)).to.equal(initialSupply);
  });

  it("should have correct name and symbol", async function () {
    expect(await token.name()).to.equal("TestTokenA");
    expect(await token.symbol()).to.equal("TTA");
  });

  it("should have 18 decimals", async function () {
    // This test specifically checks the decimals() function
    const decimals = await token.decimals();
    expect(decimals).to.equal(18);
  });

  describe("mint function", function () {
    it("should revert when minting to zero address", async function () {
      const amount = ethers.parseUnits("100", 18);
      await expect(
        token.mint(ethers.ZeroAddress, amount)
      ).to.be.revertedWith("ERC20: mint to the zero address");
    });

    it("should revert when minting zero amount", async function () {
      await expect(
        token.mint(user.address, 0)
      ).to.be.revertedWith("Amount must be greater than zero");
    });

    it("should allow anyone to mint tokens to any address", async function () {
      const initialBalance = await token.balanceOf(user.address);
      const amount = ethers.parseUnits("100", 18);
      const tx = await token.connect(user).mint(user.address, amount);
      await tx.wait();
      expect(await token.balanceOf(user.address)).to.equal(initialBalance + amount);
    });

    it("should allow minting to another address", async function () {
      const initialBalance = await token.balanceOf(user.address);
      const amount = ethers.parseUnits("200", 18);
      const tx = await token.connect(owner).mint(user.address, amount);
      await tx.wait();
      expect(await token.balanceOf(user.address)).to.equal(initialBalance + amount);
    });

    it("should update total supply after minting", async function () {
      const currentSupply = await token.totalSupply();
      const amount = ethers.parseUnits("300", 18);
      const tx = await token.mint(user.address, amount);
      await tx.wait();
      expect(await token.totalSupply()).to.equal(currentSupply + amount);
    });

    it("should emit Transfer event on mint", async function () {
      const amount = ethers.parseUnits("50", 18);
      const tx = await token.mint(user.address, amount);
      await expect(tx)
        .to.emit(token, "Transfer")
        .withArgs(ethers.ZeroAddress, user.address, amount);
    });
  });

  describe("faucet function", function () {
    it("should revert when faucet amount is zero", async function () {
      await expect(
        token.connect(user).faucet(0)
      ).to.be.revertedWith("Amount must be greater than zero");
    });

    it("should allow anyone to mint tokens to themselves", async function () {
      const initialBalance = await token.balanceOf(user.address);
      const amount = ethers.parseUnits("50", 18);
      const tx = await token.connect(user).faucet(amount);
      await tx.wait();
      expect(await token.balanceOf(user.address)).to.equal(initialBalance + amount);
    });

    it("should update total supply after faucet", async function () {
      const currentSupply = await token.totalSupply();
      const amount = ethers.parseUnits("75", 18);
      const tx = await token.connect(user).faucet(amount);
      await tx.wait();
      expect(await token.totalSupply()).to.equal(currentSupply + amount);
    });

    it("should emit Transfer event on faucet", async function () {
      const amount = ethers.parseUnits("25", 18);
      const tx = await token.connect(user).faucet(amount);
      await expect(tx)
        .to.emit(token, "Transfer")
        .withArgs(ethers.ZeroAddress, user.address, amount);
    });
  });

  describe("transfer function", function () {
    it("should allow token transfers between accounts", async function () {
      const initialOwnerBalance = await token.balanceOf(owner.address);
      const initialUserBalance = await token.balanceOf(user.address);
      const amount = ethers.parseUnits("100", 18);
      const tx = await token.transfer(user.address, amount);
      await tx.wait();
      expect(await token.balanceOf(user.address)).to.equal(initialUserBalance + amount);
      expect(await token.balanceOf(owner.address)).to.equal(initialOwnerBalance - amount);
    });

    it("should emit Transfer event on transfer", async function () {
      const amount = ethers.parseUnits("10", 18);
      await expect(token.transfer(user.address, amount))
        .to.emit(token, "Transfer")
        .withArgs(owner.address, user.address, amount);
    });
  });
});