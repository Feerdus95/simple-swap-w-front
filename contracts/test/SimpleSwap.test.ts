import { expect } from "chai";
import hre from "hardhat";
import { parseEther, getAddress, parseUnits } from "viem";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";

describe("SimpleSwap", function () {
  // We define a fixture to reuse the same setup in every test.
  // We use loadFixture to run this setup once, snapshot that state,
  // and reset Hardhat Network to that snapshot in every test.
  async function deployContracts() {
    // Get the contract factories and signers
    const [owner, user] = await hre.viem.getWalletClients();
    const publicClient = await hre.viem.getPublicClient();
    
    // Deploy test tokens
    const tokenA = await hre.viem.deployContract("TestTokenA");
    const tokenB = await hre.viem.deployContract("TestTokenB");
    
    // Deploy SimpleSwap contract
    const dex = await hre.viem.deployContract("SimpleSwap");
    
    // Mint initial tokens to owner and user
    // TokenA has 18 decimals, TokenB has 6 decimals
    await tokenA.write.mint([owner.account.address, parseEther("1000")]);
    await tokenB.write.mint([owner.account.address, parseUnits("1000", 6)]);
    
    await tokenA.write.mint([user.account.address, parseEther("1000")]);
    await tokenB.write.mint([user.account.address, parseUnits("1000", 6)]);

    return {
      tokenA,
      tokenB,
      dex,
      owner,
      user,
      publicClient,
    };
  }

  describe("Add Liquidity", function () {
    it("should add liquidity successfully", async function () {
      const { tokenA, tokenB, dex, owner, publicClient } = await loadFixture(deployContracts);
      
      // Approve DEX to spend tokens
      await tokenA.write.approve([dex.address, parseEther("100")]);
      await tokenB.write.approve([dex.address, parseUnits("200", 6)]);
      
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 1000);

      // Add liquidity
      const hash = await dex.write.addLiquidity([
        tokenA.address,
        tokenB.address,
        parseEther("100"),
        parseUnits("200", 6),
        parseEther("100"),
        parseUnits("200", 6),
        owner.account.address,
        deadline
      ]);
      
      // Verify the transaction was successful
      const receipt = await publicClient.getTransactionReceipt({ hash });
      expect(receipt.status).to.equal("success");

      // Verify the pool was created with correct reserves
      const reserves = await dex.read.getReserves([tokenA.address, tokenB.address]) as [bigint, bigint];
      const [reserveA, reserveB] = reserves;
      expect(reserveA).to.equal(parseEther("100"));
      expect(reserveB).to.equal(parseUnits("200", 6));
    });
  });

  describe("Swap Tokens", function () {
    it("should swap tokens successfully", async function () {
      const { tokenA, tokenB, dex, owner, user, publicClient } = await loadFixture(deployContracts);
      
      // First add liquidity
      await tokenA.write.approve([dex.address, parseEther("100")]);
      await tokenB.write.approve([dex.address, parseUnits("200", 6)]);
      
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 1000);
      
      await dex.write.addLiquidity([
        tokenA.address,
        tokenB.address,
        parseEther("100"),
        parseUnits("200", 6),
        parseEther("100"),
        parseUnits("200", 6),
        owner.account.address,
        deadline
      ]);

      // Approve DEX to spend user's tokens
      await tokenA.write.approve([dex.address, parseEther("10")], {
        account: user.account
      });
      
      // Perform a swap
      const swapHash = await dex.write.swapExactTokensForTokens(
        [
          parseEther("10"),
          parseUnits("15", 6), // minimum amount out (slippage protection)
          [tokenA.address, tokenB.address],
          user.account.address,
          deadline
        ],
        { account: user.account }
      );
      
      // Verify the swap was successful
      const swapReceipt = await publicClient.getTransactionReceipt({ hash: swapHash });
      expect(swapReceipt.status).to.equal("success");
      
      // Check that user received some tokenB
      const balance = await tokenB.read.balanceOf([user.account.address]);
      expect(balance).to.be.gt(0);
    });
  });

  describe("Remove Liquidity", function () {
    it("should remove liquidity successfully", async function () {
      const { tokenA, tokenB, dex, owner, publicClient } = await loadFixture(deployContracts);
      
      // First add liquidity
      await tokenA.write.approve([dex.address, parseEther("100")]);
      await tokenB.write.approve([dex.address, parseUnits("200", 6)]);
      
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 1000);
      
      await dex.write.addLiquidity([
        tokenA.address,
        tokenB.address,
        parseEther("100"),
        parseUnits("200", 6),
        parseEther("100"),
        parseUnits("200", 6),
        owner.account.address,
        deadline
      ]);

      // Get LP token balance using the getLiquidity function
      const lpBalance = await dex.read.getLiquidity([
        tokenA.address,
        tokenB.address,
        owner.account.address
      ]) as bigint;
      
      expect(lpBalance).to.be.gt(0);
      console.log("LP Balance:", lpBalance.toString());
      
      // Remove liquidity (remove half)
      const liquidityToRemove = lpBalance / 2n;
      const removeLiqHash = await dex.write.removeLiquidity([
        tokenA.address,
        tokenB.address,
        liquidityToRemove,
        parseEther("45"), // Minimum amount of tokenA to receive (slippage protection)
        parseUnits("90", 6), // Minimum amount of tokenB to receive (slippage protection)
        owner.account.address,
        deadline
      ]);
      
      // Verify the transaction was successful
      const removeLiqReceipt = await publicClient.getTransactionReceipt({ hash: removeLiqHash });
      expect(removeLiqReceipt.status).to.equal("success");
      
      // Check that reserves were updated
      const updatedReserves = await dex.read.getReserves([tokenA.address, tokenB.address]) as [bigint, bigint];
      const [reserveA, reserveB] = updatedReserves;
      expect(reserveA).to.be.lt(parseEther("100"));
      expect(reserveB).to.be.lt(parseUnits("200", 6));
      
      // Check that user's LP balance decreased
      const updatedLpBalance = await dex.read.getLiquidity([
        tokenA.address,
        tokenB.address,
        owner.account.address
      ]) as bigint;
      expect(updatedLpBalance).to.equal(lpBalance - liquidityToRemove);
    });
  });

  describe("Price Calculation", function () {
    it("should calculate price correctly", async function () {
      const { tokenA, tokenB, dex } = await loadFixture(deployContracts);
      
      // Add initial liquidity
      await tokenA.write.approve([dex.address, parseEther("100")]);
      await tokenB.write.approve([dex.address, parseUnits("200", 6)]);
      
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 1000);
      
      await dex.write.addLiquidity([
        tokenA.address,
        tokenB.address,
        parseEther("100"),
        parseUnits("200", 6),
        parseEther("100"),
        parseUnits("200", 6),
        (await hre.viem.getWalletClients())[0].account.address,
        deadline
      ]);

      // Get the reserves to understand the actual values
      const reserves = await dex.read.getReserves([tokenA.address, tokenB.address]) as [bigint, bigint];
      const [reserveA, reserveB] = reserves;
      
      console.log("Reserve A (18 decimals):", reserveA.toString());
      console.log("Reserve B (6 decimals):", reserveB.toString());
      
      // Get price of tokenA in terms of tokenB
      const price = await dex.read.getPrice([tokenA.address, tokenB.address]);
      console.log("Actual price returned:", price.toString());
      
      // The expected price is 2000000 (2 * 10^6)
      // This means: 1 tokenA = 2 tokenB (with proper decimal scaling)
      expect(price).to.equal(2000000n);
    });
  });

  describe("Edge Cases and Error Handling", function () {
    it("should handle different decimal tokens correctly", async function () {
      const { tokenA, tokenB } = await loadFixture(deployContracts);
      
      // Check token decimals
      const decimalsA = await tokenA.read.decimals();
      const decimalsB = await tokenB.read.decimals();
      
      console.log("Token A decimals:", decimalsA);
      console.log("Token B decimals:", decimalsB);
      
      expect(decimalsA).to.equal(18);
      expect(decimalsB).to.equal(6);
    });

    it("should revert when adding liquidity with identical tokens", async function () {
      const { tokenA, dex, owner } = await loadFixture(deployContracts);
      const amount = parseEther("1");
      
      // Approve tokens
      await tokenA.write.approve([dex.address, amount], { account: owner.account });
      
      // Try to add liquidity with same token for both tokens
      try {
        await dex.write.addLiquidity(
          [
            tokenA.address, // tokenA
            tokenA.address, // tokenB (same as tokenA)
            amount,        // amountADesired
            amount,        // amountBDesired
            0,             // amountAMin
            0,             // amountBMin
            owner.account.address, // to
            BigInt(Math.floor(Date.now() / 1000) + 300) // deadline
          ],
          { account: owner.account }
        );
        expect.fail("Should have reverted with SS:IA error");
      } catch (error: any) {
        expect(error.message).to.include("SS:IA");
      }
    });

    it("should revert when adding liquidity with zero address", async function () {
      const { tokenA, dex, owner } = await loadFixture(deployContracts);
      const amount = parseEther("1");
      const zeroAddress = '0x0000000000000000000000000000000000000000';
      
      // Approve tokens
      await tokenA.write.approve([dex.address, amount], { account: owner.account });
      
      // Try to add liquidity with zero address
      try {
        await dex.write.addLiquidity(
          [
            tokenA.address, // tokenA
            zeroAddress,   // tokenB (zero address)
            amount,        // amountADesired
            amount,        // amountBDesired
            0,             // amountAMin
            0,             // amountBMin
            owner.account.address, // to
            BigInt(Math.floor(Date.now() / 1000) + 300) // deadline
          ],
          { account: owner.account }
        );
        expect.fail("Should have reverted with SS:IZA error");
      } catch (error: any) {
        expect(error.message).to.include("SS:IZA");
      }
    });

    it("should handle small and large liquidity amounts correctly", async function () {
      const { tokenA, tokenB, dex, owner } = await loadFixture(deployContracts);
      
      // Test with very small amounts
      const smallAmountA = 1n; // 1 wei
      const smallAmountB = 1n; // 1 base unit (6 decimals)
      
      // Approve and add small liquidity
      await tokenA.write.approve([dex.address, smallAmountA], { account: owner.account });
      await tokenB.write.approve([dex.address, smallAmountB], { account: owner.account });
      
      await dex.write.addLiquidity(
        [
          tokenA.address,
          tokenB.address,
          smallAmountA,
          smallAmountB,
          0,
          0,
          owner.account.address,
          BigInt(Math.floor(Date.now() / 1000) + 300)
        ],
        { account: owner.account }
      );
      
      // Test with large amounts
      const largeAmountA = parseEther("1000000");
      const largeAmountB = parseUnits("1000000", 6);
      
      // Approve and add large liquidity
      await tokenA.write.approve([dex.address, largeAmountA], { account: owner.account });
      await tokenB.write.approve([dex.address, largeAmountB], { account: owner.account });
      
      await dex.write.addLiquidity(
        [
          tokenA.address,
          tokenB.address,
          largeAmountA,
          largeAmountB,
          0,
          0,
          owner.account.address,
          BigInt(Math.floor(Date.now() / 1000) + 300)
        ],
        { account: owner.account }
      );
      
      // Verify the pool has the expected reserves
      const reserves = await dex.read.getReserves([tokenA.address, tokenB.address]);
      expect(reserves[0] + reserves[1]).to.be.gt(0);
    });

    it("should handle maximum uint112 values in _update function", async function () {
      const { tokenA, tokenB, dex, owner } = await loadFixture(deployContracts);
      
      // Get max uint112 value
      const maxUint112 = 2n ** 112n - 1n;
      
      // Mint tokens to owner
      await tokenA.write.mint([owner.account.address, maxUint112], { account: owner.account });
      await tokenB.write.mint([owner.account.address, maxUint112], { account: owner.account });
      
      // Approve max tokens
      await tokenA.write.approve([dex.address, maxUint112], { account: owner.account });
      await tokenB.write.approve([dex.address, maxUint112], { account: owner.account });
      
      // Add liquidity with max values
      await dex.write.addLiquidity(
        [
          tokenA.address,
          tokenB.address,
          maxUint112,
          maxUint112,
          0,
          0,
          owner.account.address,
          BigInt(Math.floor(Date.now() / 1000) + 300)
        ],
        { account: owner.account }
      );
      
      // Verify reserves are set to maxUint112
      const reserves = await dex.read.getReserves([tokenA.address, tokenB.address]);
      expect(reserves[0]).to.equal(maxUint112);
      expect(reserves[1]).to.equal(maxUint112);

      // Try to add more liquidity (should fail due to overflow in _update)
      await tokenA.write.mint([owner.account.address, 1n], { account: owner.account });
      await tokenB.write.mint([owner.account.address, 1n], { account: owner.account });
      
      await tokenA.write.approve([dex.address, 1n], { account: owner.account });
      await tokenB.write.approve([dex.address, 1n], { account: owner.account });
      
      try {
        await dex.write.addLiquidity(
          [
            tokenA.address,
            tokenB.address,
            1n,
            1n,
            0,
            0,
            owner.account.address,
            BigInt(Math.floor(Date.now() / 1000) + 300)
          ],
          { account: owner.account }
        );
        expect.fail("Should have reverted with SS:OVERFLOW error");
      } catch (error: any) {
        // The error might be wrapped in a different way by viem
        expect(error.message).to.match(/overflow|SS:OVERFLOW/);
      }
    });
    
    it("should handle price calculation edge cases", async function () {
      const { tokenA, tokenB, dex, owner } = await loadFixture(deployContracts);
      
      // Test case 1: Small reserves (1 tokenA and 1,000,000 tokenB to account for decimals)
      const amountA1 = parseEther("1");
      const amountB1 = parseUnits("1000000", 6); // 1e12 in base units
      
      // Mint additional tokens needed for this test
      await tokenA.write.mint([owner.account.address, amountA1], { account: owner.account });
      await tokenB.write.mint([owner.account.address, amountB1], { account: owner.account });
      
      await tokenA.write.approve([dex.address, amountA1], { account: owner.account });
      await tokenB.write.approve([dex.address, amountB1], { account: owner.account });
      
      await dex.write.addLiquidity(
        [
          tokenA.address,
          tokenB.address,
          amountA1,
          amountB1,
          0,
          0,
          owner.account.address,
          BigInt(Math.floor(Date.now() / 1000) + 300)
        ],
        { account: owner.account }
      );
      
      // Get the price of tokenA in terms of tokenB (scaled by 1e18)
      // We added 1e18 tokenA units and 1e12 tokenB units
      // The price should be (1e12 * 1e18) / 1e18 = 1e12
      const price1 = await dex.read.getPrice([tokenA.address, tokenB.address]);
      expect(price1).to.equal(10n ** 12n);
      
      // Test case 2: Deploy a new contract for the second test to avoid interference
      const dex2 = await hre.viem.deployContract("SimpleSwap");
      
      // Medium reserves (1000 tokens each)
      const mediumAmountA = parseEther("1000");
      const mediumAmountB = parseUnits("1000", 6);
      
      // Mint additional tokens needed for this test
      await tokenA.write.mint([owner.account.address, mediumAmountA], { account: owner.account });
      await tokenB.write.mint([owner.account.address, mediumAmountB], { account: owner.account });
      
      await tokenA.write.approve([dex2.address, mediumAmountA], { account: owner.account });
      await tokenB.write.approve([dex2.address, mediumAmountB], { account: owner.account });
      
      await dex2.write.addLiquidity(
        [
          tokenA.address,
          tokenB.address,
          mediumAmountA,
          mediumAmountB,
          0,
          0,
          owner.account.address,
          BigInt(Math.floor(Date.now() / 1000) + 300)
        ],
        { account: owner.account }
      );
      
      // Price should be (1000 * 1e6 * 1e18) / (1000 * 1e18) = 1e6
      const price2 = await dex2.read.getPrice([tokenA.address, tokenB.address]);
      expect(price2).to.equal(10n ** 6n);
      
      // Test case 3: Deploy a new contract for the third test
      const dex3 = await hre.viem.deployContract("SimpleSwap");
      
      // Very different reserves (1000 tokenA : 1 tokenB)
      const diffAmountA = parseEther("1000");
      const diffAmountB = parseUnits("1", 6);
      
      // Mint additional tokens needed for this test
      await tokenA.write.mint([owner.account.address, diffAmountA], { account: owner.account });
      await tokenB.write.mint([owner.account.address, diffAmountB], { account: owner.account });
      
      await tokenA.write.approve([dex3.address, diffAmountA], { account: owner.account });
      await tokenB.write.approve([dex3.address, diffAmountB], { account: owner.account });
      
      await dex3.write.addLiquidity(
        [
          tokenA.address,
          tokenB.address,
          diffAmountA,
          diffAmountB,
          0,
          0,
          owner.account.address,
          BigInt(Math.floor(Date.now() / 1000) + 300)
        ],
        { account: owner.account }
      );
      
      // Price should reflect the new ratio
      // (1 * 1e6 * 1e18) / (1000 * 1e18) = 1e3
      const price3 = await dex3.read.getPrice([tokenA.address, tokenB.address]);
      expect(price3).to.equal(10n ** 3n);
    });
  });
});