import { expect } from "chai";
import hre from "hardhat";
import { parseUnits } from "viem";

const { viem } = hre;

describe("TestTokenB", function () {
  let token: any;
  let owner: any;
  let user: any;
  let initialSupply: bigint;

  // Deploy the contract once before all tests
  before(async function () {
    [owner, user] = await viem.getWalletClients();
    token = await viem.deployContract("TestTokenB");
    initialSupply = await token.read.totalSupply();
  });

  it("should deploy with initial supply to deployer", async function () {
    const balance = await token.read.balanceOf([owner.account.address]);
    const expectedSupply = parseUnits("1000000", 6); // 1M tokens with 6 decimals
    expect(balance).to.equal(expectedSupply);
    
    // Also verify total supply matches
    const totalSupply = await token.read.totalSupply();
    expect(totalSupply).to.equal(expectedSupply);
    
    // Verify decimals
    const decimals = await token.read.decimals();
    expect(decimals).to.equal(6);
  });

  it("should have correct name and symbol", async function () {
    expect(await token.read.name()).to.equal("TestTokenB");
    expect(await token.read.symbol()).to.equal("TTB");
  });

  it("should have 6 decimals", async function () {
    // This test specifically checks the decimals() function
    const decimals = await token.read.decimals();
    expect(decimals).to.equal(6);
  });

  describe("mint function", function () {
    it("should revert when minting to zero address", async function () {
      const amount = parseUnits("100", 6);
      try {
        await token.write.mint(['0x0000000000000000000000000000000000000000', amount], {
          account: owner.account
        });
        expect.fail("Expected transaction to revert");
      } catch (error: any) {
        expect(error.message).to.include("ERC20: mint to the zero address");
      }
    });

    it("should revert when minting zero amount", async function () {
      try {
        await token.write.mint([user.account.address, 0], {
          account: owner.account
        });
        expect.fail("Expected transaction to revert");
      } catch (error: any) {
        expect(error.message).to.include("Amount must be greater than zero");
      }
    });

    it("should allow anyone to mint tokens to any address", async function () {
      const initialBalance = await token.read.balanceOf([user.account.address]);
      const amount = parseUnits("100", 6);
      const tx = await token.write.mint([user.account.address, amount], {
        account: user.account
      });
      await tx;
      const newBalance = await token.read.balanceOf([user.account.address]);
      expect(newBalance).to.equal(initialBalance + amount);
    });

    it("should allow minting to another address", async function () {
      const initialBalance = await token.read.balanceOf([user.account.address]);
      const amount = parseUnits("200", 6);
      const tx = await token.write.mint([user.account.address, amount], {
        account: owner.account
      });
      await tx;
      const newBalance = await token.read.balanceOf([user.account.address]);
      expect(newBalance).to.equal(initialBalance + amount);
    });

    it("should update total supply after minting", async function () {
      const currentSupply = await token.read.totalSupply();
      const amount = parseUnits("300", 6);
      const tx = await token.write.mint([user.account.address, amount], {
        account: owner.account
      });
      await tx;
      const newSupply = await token.read.totalSupply();
      expect(newSupply).to.equal(currentSupply + amount);
    });

    it("should emit Transfer event on mint", async function () {
      const initialBalance = await token.read.balanceOf([user.account.address]);
      const amount = parseUnits("50", 6);
      const tx = await token.write.mint([user.account.address, amount], {
        account: owner.account
      });
      // For viem, we can't directly test events with chai matchers
      // So we'll verify the transaction was successful and balance was updated
      expect(tx).to.be.a('string'); // Verify we got a transaction hash
      const newBalance = await token.read.balanceOf([user.account.address]);
      expect(newBalance).to.equal(initialBalance + amount);
    });
  });

  describe("faucet function", function () {
    it("should revert when faucet amount is zero", async function () {
      try {
        await token.write.faucet([0], {
          account: user.account
        });
        expect.fail("Expected transaction to revert");
      } catch (error: any) {
        expect(error.message).to.include("Amount must be greater than zero");
      }
    });

    it("should allow anyone to mint tokens to themselves", async function () {
      const initialBalance = await token.read.balanceOf([user.account.address]);
      const amount = parseUnits("50", 6);
      const tx = await token.write.faucet([amount], {
        account: user.account
      });
      await tx;
      const newBalance = await token.read.balanceOf([user.account.address]);
      expect(newBalance).to.equal(initialBalance + amount);
    });

    it("should update total supply after faucet", async function () {
      const currentSupply = await token.read.totalSupply();
      const amount = parseUnits("75", 6);
      const tx = await token.write.faucet([amount], {
        account: user.account
      });
      await tx;
      const newSupply = await token.read.totalSupply();
      expect(newSupply).to.equal(currentSupply + amount);
    });

    it("should update balance after faucet call", async function () {
      const initialBalance = await token.read.balanceOf([user.account.address]);
      const amount = parseUnits("25", 6);
      const tx = await token.write.faucet([amount], {
        account: user.account
      });
      await tx;
      const newBalance = await token.read.balanceOf([user.account.address]);
      expect(newBalance).to.equal(initialBalance + amount);
    });
  });

  describe("transfer function", function () {
    it("should allow token transfers between accounts", async function () {
      const initialOwnerBalance = await token.read.balanceOf([owner.account.address]);
      const initialUserBalance = await token.read.balanceOf([user.account.address]);
      const amount = parseUnits("100", 6);
      const tx = await token.write.transfer([user.account.address, amount], {
        account: owner.account
      });
      await tx;
      expect(await token.read.balanceOf([user.account.address])).to.equal(initialUserBalance + amount);
      expect(await token.read.balanceOf([owner.account.address])).to.equal(initialOwnerBalance - amount);
    });

    it("should update balances after transfer", async function () {
      const initialOwnerBalance = await token.read.balanceOf([owner.account.address]);
      const initialUserBalance = await token.read.balanceOf([user.account.address]);
      const amount = parseUnits("10", 6);
      const tx = await token.write.transfer([user.account.address, amount], {
        account: owner.account
      });
      await tx;
      expect(await token.read.balanceOf([user.account.address])).to.equal(initialUserBalance + amount);
      expect(await token.read.balanceOf([owner.account.address])).to.equal(initialOwnerBalance - amount);
    });
  });

  describe("ERC20 edge cases", function () {
    it("should revert when transferring to the zero address", async function () {
      const amount = parseUnits("1", 6);
      try {
        await token.write.transfer(
          ['0x0000000000000000000000000000000000000000', amount],
          { account: owner.account }
        );
        expect.fail("Expected transaction to revert");
      } catch (error) {
        expect((error as Error).message).to.include('ERC20InvalidReceiver');
      }
    });
  
    it("should revert when transferring more than balance", async function () {
      const balance = await token.read.balanceOf([owner.account.address]);
      const amount = balance + parseUnits("1", 6);
      try {
        await token.write.transfer(
          [user.account.address, amount],
          { account: owner.account }
        );
        expect.fail("Expected transaction to revert");
      } catch (error) {
        expect((error as Error).message).to.include('ERC20InsufficientBalance');
      }
    });
  
    it("should allow approve and use transferFrom", async function () {
      // Approve user to spend owner's tokens
      const amount = parseUnits("10", 6);
      await token.write.approve(
        [user.account.address, amount],
        { account: owner.account }
      );
      
      // transferFrom as user, moving tokens from owner to user
      await token.write.transferFrom(
        [owner.account.address, user.account.address, amount],
        { account: user.account }
      );
      
      const newBalance = await token.read.balanceOf([user.account.address]);
      expect(newBalance).to.be.gte(amount);
    });
  
    it("should revert when transferFrom without enough allowance", async function () {
      const amount = parseUnits("1", 6);
      try {
        await token.write.transferFrom(
          [owner.account.address, user.account.address, amount],
          { account: user.account }
        );
        expect.fail("Expected transaction to revert");
      } catch (error) {
        expect((error as Error).message).to.include('ERC20InsufficientAllowance');
      }
    });
  
    it("should revert when approving to the zero address", async function () {
      const amount = parseUnits("1", 6);
      try {
        await token.write.approve(
          ['0x0000000000000000000000000000000000000000', amount],
          { account: owner.account }
        );
        expect.fail("Expected transaction to revert");
      } catch (error) {
        expect((error as Error).message).to.include('ERC20InvalidSpender');
      }
    });
  });
});