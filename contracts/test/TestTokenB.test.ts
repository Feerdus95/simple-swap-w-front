import { expect } from "chai";
import hre from "hardhat";
import { parseUnits } from "viem";

const { viem } = hre;

describe("TestTokenB", function () {
  it("should deploy with initial supply to deployer", async function () {
    const [owner] = await viem.getWalletClients();
    const token = await viem.deployContract("TestTokenB");
    const balance = await token.read.balanceOf([owner.account.address]);
    
    // TestTokenB has 6 decimals, so use parseUnits with 6 decimals
    // The contract mints 1,000,000 tokens with 6 decimals = 1,000,000 * 10^6
    expect(balance).to.equal(parseUnits("1000000", 6));
  });

  it("should allow anyone to mint tokens", async function () {
    const [_, user] = await viem.getWalletClients();
    const token = await viem.deployContract("TestTokenB");
    
    // Use parseUnits with 6 decimals for TestTokenB
    await token.write.mint([user.account.address, parseUnits("100", 6)], {
      account: user.account
    });
    
    const balance = await token.read.balanceOf([user.account.address]);
    expect(balance).to.equal(parseUnits("100", 6));
  });

  it("should allow faucet to mint tokens to msg.sender", async function () {
    const [_, user] = await viem.getWalletClients();
    const token = await viem.deployContract("TestTokenB");
    
    // Use parseUnits with 6 decimals for TestTokenB
    await token.write.faucet([parseUnits("50", 6)], {
      account: user.account
    });
    
    const balance = await token.read.balanceOf([user.account.address]);
    expect(balance).to.equal(parseUnits("50", 6));
  });

  it("should have 6 decimals", async function () {
    const token = await viem.deployContract("TestTokenB");
    expect(await token.read.decimals()).to.equal(6);
  });
});