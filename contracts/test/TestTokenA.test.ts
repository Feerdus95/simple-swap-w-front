import { expect } from "chai";
import { ethers } from "hardhat";

describe("TestTokenA", function () {
  it("should deploy with initial supply to deployer", async function () {
    const [owner] = await ethers.getSigners();
    const TestTokenA = await ethers.getContractFactory("TestTokenA");
    const token = await TestTokenA.deploy() as any;
    const balance = await token.balanceOf(owner.address);
    expect(balance).to.equal(ethers.parseUnits("1000000", 18));
  });

  it("should allow anyone to mint tokens", async function () {
    const [_, user] = await ethers.getSigners();
    const TestTokenA = await ethers.getContractFactory("TestTokenA");
    const token = await TestTokenA.deploy() as any;
    await token.connect(user).mint(user.address, ethers.parseUnits("100", 18));
    const balance = await token.balanceOf(user.address);
    expect(balance).to.equal(ethers.parseUnits("100", 18));
  });

  it("should allow faucet to mint tokens to msg.sender", async function () {
    const [_, user] = await ethers.getSigners();
    const TestTokenA = await ethers.getContractFactory("TestTokenA");
    const token = await TestTokenA.deploy() as any;
    await token.connect(user).faucet(ethers.parseUnits("50", 18));
    const balance = await token.balanceOf(user.address);
    expect(balance).to.equal(ethers.parseUnits("50", 18));
  });

  it("should have 18 decimals", async function () {
    const TestTokenA = await ethers.getContractFactory("TestTokenA");
    const token = await TestTokenA.deploy();
    expect(await token.decimals()).to.equal(18);
  });
}); 