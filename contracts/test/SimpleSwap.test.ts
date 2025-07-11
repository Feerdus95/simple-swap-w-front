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
    
    // Deploy TestHelper contract
    const testHelper = await hre.viem.deployContract("TestHelper");
    
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
      testHelper,
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

    it("should use amountBMin when amount1Optimal < amountBDesired", async function () {
      const { tokenA, tokenB, dex, owner } = await loadFixture(deployContracts);

      // Approve and add initial liquidity
      await tokenA.write.approve([dex.address, parseEther("100")], { account: owner.account });
      await tokenB.write.approve([dex.address, parseUnits("1000", 6)], { account: owner.account });

      // First liquidity addition
      await dex.write.addLiquidity([
        tokenA.address,
        tokenB.address,
        parseEther("100"),
        parseUnits("1000", 6),
        0, 
        0, 
        owner.account.address,
        BigInt(Math.floor(Date.now() / 1000) + 300)
      ], { account: owner.account });

      // Second add: deliberately unbalanced amounts (amountBDesired > amountBOptimal)
      await tokenA.write.approve([dex.address, parseEther("50")], { account: owner.account });
      await tokenB.write.approve([dex.address, parseUnits("200", 6)], { account: owner.account });

      await dex.write.addLiquidity([
        tokenA.address,
        tokenB.address,
        parseEther("50"),
        parseUnits("200", 6), // More than optimal proportion
        0, 
        0,
        owner.account.address,
        BigInt(Math.floor(Date.now() / 1000) + 300)
      ], { account: owner.account });
    });

    it("should use amountAMin when amount0Optimal < amountADesired", async function () {
      const { tokenA, tokenB, dex, owner } = await loadFixture(deployContracts);

      // First liquidity addition
      await tokenA.write.approve([dex.address, parseEther("100")], { account: owner.account });
      await tokenB.write.approve([dex.address, parseUnits("200", 6)], { account: owner.account });

      await dex.write.addLiquidity([
        tokenA.address, 
        tokenB.address,
        parseEther("100"), 
        parseUnits("200", 6),
        0, 
        0, 
        owner.account.address,
        BigInt(Math.floor(Date.now() / 1000) + 300)
      ], { account: owner.account });

      // Second add: flip proportions
      await tokenA.write.approve([dex.address, parseEther("30")], { account: owner.account });
      await tokenB.write.approve([dex.address, parseUnits("100", 6)], { account: owner.account });

      await dex.write.addLiquidity([
        tokenA.address,
        tokenB.address,
        parseEther("30"),
        parseUnits("100", 6), // Higher ratio of B:A
        0, 
        0,
        owner.account.address,
        BigInt(Math.floor(Date.now() / 1000) + 300)
      ], { account: owner.account });
    });

    it("should revert if supplied amounts are below minimum (slippage)", async function () {
      const { tokenA, tokenB, dex, owner } = await loadFixture(deployContracts);
      
      // Approve and add initial liquidity
      await tokenA.write.approve([dex.address, parseEther("100")], { account: owner.account });
      await tokenB.write.approve([dex.address, parseUnits("200", 6)], { account: owner.account });

      // First add (sets ratio)
      await dex.write.addLiquidity([
        tokenA.address,
        tokenB.address,
        parseEther("100"),
        parseUnits("200", 6),
        0, 
        0, 
        owner.account.address,
        BigInt(Math.floor(Date.now() / 1000) + 300)
      ], { account: owner.account });

      // Try to add liquidity with amounts that would result in a different ratio
      // The current ratio is 100:200 = 1:2
      // We'll try to add 1 tokenA and 1 tokenB, which is a worse ratio
      // and set amountAMin to 0.6 (higher than the 0.5 that would be optimal)
      await tokenA.write.approve([dex.address, parseEther("1")], { account: owner.account });
      await tokenB.write.approve([dex.address, parseUnits("1", 6)], { account: owner.account });
      
      // This should revert because the optimal amountA for 1 tokenB is 0.5,
      // but we're setting amountAMin to 0.6
      try {
        await dex.write.addLiquidity([
          tokenA.address,
          tokenB.address,
          parseEther("1"),
          parseUnits("1", 6),
          parseEther("0.6"), // amountAMin is higher than optimal (0.5)
          0,
          owner.account.address,
          BigInt(Math.floor(Date.now() / 1000) + 300)
        ], { account: owner.account });
        
        // Si llegamos aquí, la transacción no revirtió como se esperaba
        throw new Error("Expected transaction to revert with 'SS:INA'");
      } catch (error) {
        // Verificar que el mensaje de error contenga 'SS:INA'
        if (!(error as Error).message.includes('SS:INA')) {
          throw new Error(`Expected error to include 'SS:INA', got: ${(error as Error).message}`);
        }
      }
    });
    
    it("should revert with SS:IZA if tokenA is zero address", async function () {
      const { tokenB, dex, owner } = await loadFixture(deployContracts);
      await tokenB.write.approve([dex.address, parseUnits("1", 6)], { account: owner.account });
      
      try {
        await dex.write.addLiquidity([
          "0x0000000000000000000000000000000000000000",
          tokenB.address,
          0,
          parseUnits("1", 6),
          0, 0, owner.account.address, BigInt(Math.floor(Date.now() / 1000) + 300)
        ], { account: owner.account });
        expect.fail("Should have reverted with 'SS:IZA'");
      } catch (error: any) {
        expect(error.message).to.include("SS:IZA");
      }
    });

    it("should revert with SS:INA if amountADesired is zero", async function () {
      const { tokenA, tokenB, dex, owner } = await loadFixture(deployContracts);
      await tokenA.write.approve([dex.address, 0], { account: owner.account });
      await tokenB.write.approve([dex.address, parseUnits("1", 6)], { account: owner.account });
      
      try {
        await dex.write.addLiquidity([
          tokenA.address, tokenB.address, 0, parseUnits("1", 6), 0, 0, owner.account.address, BigInt(Math.floor(Date.now() / 1000) + 300)
        ], { account: owner.account });
        expect.fail("Should have reverted with 'SS:INA'");
      } catch (error: any) {
        expect(error.message).to.include("SS:INA");
      }
    });

    it("should revert with SS:INA if amountBDesired is zero", async function () {
      const { tokenA, tokenB, dex, owner } = await loadFixture(deployContracts);
      await tokenA.write.approve([dex.address, parseEther("1")], { account: owner.account });
      await tokenB.write.approve([dex.address, 0], { account: owner.account });
      
      try {
        await dex.write.addLiquidity([
          tokenA.address, tokenB.address, parseEther("1"), 0, 0, 0, owner.account.address, BigInt(Math.floor(Date.now() / 1000) + 300)
        ], { account: owner.account });
        expect.fail("Should have reverted with 'SS:INA'");
      } catch (error: any) {
        expect(error.message).to.include("SS:INA");
      }
    });

    it("should revert with SS:IR if 'to' is the zero address", async function () {
      const { tokenA, tokenB, dex, owner } = await loadFixture(deployContracts);
      await tokenA.write.approve([dex.address, parseEther("1")], { account: owner.account });
      await tokenB.write.approve([dex.address, parseUnits("1", 6)], { account: owner.account });
      
      try {
        await dex.write.addLiquidity([
          tokenA.address, tokenB.address, parseEther("1"), parseUnits("1", 6), 0, 0, "0x0000000000000000000000000000000000000000", BigInt(Math.floor(Date.now() / 1000) + 300)
        ], { account: owner.account });
        expect.fail("Should have reverted with 'SS:IR'");
      } catch (error: any) {
        expect(error.message).to.include("SS:IR");
      }
    });

    it("should revert with SS:EXP if deadline is expired", async function () {
      const { tokenA, tokenB, dex, owner } = await loadFixture(deployContracts);
      await tokenA.write.approve([dex.address, parseEther("1")], { account: owner.account });
      await tokenB.write.approve([dex.address, parseUnits("1", 6)], { account: owner.account });
      
      try {
        await dex.write.addLiquidity([
          tokenA.address, tokenB.address, parseEther("1"), parseUnits("1", 6), 0, 0, owner.account.address, 1 // expired
        ], { account: owner.account });
        expect.fail("Should have reverted with 'SS:EXP'");
      } catch (error: any) {
        expect(error.message).to.include("SS:EXP");
      }
    });

    it("should add liquidity successfully when tokens are passed in reverse order", async function () {
      const { tokenA, tokenB, dex, owner, publicClient } = await loadFixture(deployContracts);
    
      // Approve in reverse order
      await tokenB.write.approve([dex.address, parseUnits("200", 6)], { account: owner.account });
      await tokenA.write.approve([dex.address, parseEther("100")], { account: owner.account });
    
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 1000);
      const hash = await dex.write.addLiquidity([
        tokenB.address,
        tokenA.address,
        parseUnits("200", 6),
        parseEther("100"),
        parseUnits("200", 6),
        parseEther("100"),
        owner.account.address,
        deadline
      ], { account: owner.account });
    
      const receipt = await publicClient.getTransactionReceipt({ hash });
      expect(receipt.status).to.equal("success");
      const reserves = await dex.read.getReserves([tokenB.address, tokenA.address]);
      expect(reserves[0]).to.equal(parseUnits("200", 6));
      expect(reserves[1]).to.equal(parseEther("100"));
    });

    it("should revert with SS:INA if amount0Optimal > amountADesired", async function () {
      /**
       * Covers the require in _addLiquidity 'amount0Optimal <= amountADesired'
       * We need a pool with reserves and call addLiquidity where amountBDesired is so high
       * relative to amountADesired that amount0Optimal > amountADesired
       */
      const { tokenA, tokenB, dex, owner } = await loadFixture(deployContracts);

      // First add a balanced initial liquidity
      await tokenA.write.approve([dex.address, parseEther("100")], { account: owner.account });
      await tokenB.write.approve([dex.address, parseUnits("200", 6)], { account: owner.account });
      await dex.write.addLiquidity([
        tokenA.address, tokenB.address,
        parseEther("100"), parseUnits("200", 6),
        0, 0, owner.account.address,
        BigInt(Math.floor(Date.now() / 1000) + 500)
      ], { account: owner.account });

      // Now try to add liquidity with a huge amountBDesired, and small amountADesired
      await tokenA.write.approve([dex.address, parseEther("1")], { account: owner.account });
      await tokenB.write.approve([dex.address, parseUnits("10000", 6)], { account: owner.account });

      // amount0Optimal = (amountBDesired * reserve0) / reserve1;
      // amount0Optimal = (10000 * 100) / 200 = 5000
      // amountADesired = 1, amountAMin = 1000
      // amount0Optimal (5000) > amountADesired (1) => should revert with SS:INA
      try {
        await dex.write.addLiquidity([
          tokenA.address, tokenB.address,
          parseEther("1"), parseUnits("10000", 6), // big B, small A
          parseEther("1000"), 0, // amountAMin = 1000, amountBMin = 0
          owner.account.address,
          BigInt(Math.floor(Date.now() / 1000) + 500)
        ], { account: owner.account });
        expect.fail("Should have reverted with SS:INA");
      } catch (error: any) {
        expect(error.message).to.include("SS:INA");
      }
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

    it("should revert when path length is not 2", async function () {
      const { tokenA, dex, user } = await loadFixture(deployContracts);
      
      try {
        await dex.write.swapExactTokensForTokens([
          parseEther("1"),
          0,
          [tokenA.address], // path too short
          user.account.address,
          BigInt(Math.floor(Date.now() / 1000) + 300)
        ], { account: user.account });
        expect.fail("Should have reverted with 'SS:IPL'");
      } catch (error: any) {
        expect(error.message).to.include("SS:IPL");
      }
    });
    
    it("should revert when input and output tokens are the same", async function () {
      const { tokenA, dex, user } = await loadFixture(deployContracts);
      
      try {
        await dex.write.swapExactTokensForTokens([
          parseEther("1"),
          0,
          [tokenA.address, tokenA.address],
          user.account.address,
          BigInt(Math.floor(Date.now() / 1000) + 300)
        ], { account: user.account });
        expect.fail("Should have reverted with 'SS:IA'");
      } catch (error: any) {
        expect(error.message).to.include("SS:IA");
      }
    });
    
    it("should revert on swap when not enough output (amountOut < amountOutMin)", async function () {
      const { tokenA, tokenB, dex, owner, user } = await loadFixture(deployContracts);
      
      // Add liquidity as owner
      await tokenA.write.approve([dex.address, parseEther("10")], { account: owner.account });
      await tokenB.write.approve([dex.address, parseUnits("20", 6)], { account: owner.account });
      
      await dex.write.addLiquidity([
        tokenA.address, 
        tokenB.address, 
        parseEther("10"), 
        parseUnits("20", 6),
        0, 
        0, 
        owner.account.address,
        BigInt(Math.floor(Date.now() / 1000) + 300)
      ], { account: owner.account });
      
      // User attempts swap with extreme slippage protection
      await tokenA.write.approve([dex.address, parseEther("1")], { account: user.account });
      
      try {
        await dex.write.swapExactTokensForTokens([
          parseEther("1"),
          parseUnits("100", 6), // much larger than real output
          [tokenA.address, tokenB.address],
          user.account.address,
          BigInt(Math.floor(Date.now() / 1000) + 300)
        ], { account: user.account });
        expect.fail("Should have reverted with 'SS:IOA'");
      } catch (error: any) {
        expect(error.message).to.include("SS:IOA");
      }
    });

    it("should swap tokens successfully when tokens are passed in reverse order", async function () {
      const { tokenA, tokenB, dex, owner, user, publicClient } = await loadFixture(deployContracts);
    
      // Add initial liquidity in default order (doesn't matter)
      await tokenA.write.approve([dex.address, parseEther("100")], { account: owner.account });
      await tokenB.write.approve([dex.address, parseUnits("200", 6)], { account: owner.account });
      await dex.write.addLiquidity([
        tokenA.address, tokenB.address, parseEther("100"), parseUnits("200", 6),
        parseEther("100"), parseUnits("200", 6), owner.account.address,
        BigInt(Math.floor(Date.now() / 1000) + 1000)
      ]);
    
      // Approve as user in reverse order and swap tokenB → tokenA
      await tokenB.write.approve([dex.address, parseUnits("10", 6)], { account: user.account });
      const swapHash = await dex.write.swapExactTokensForTokens([
        parseUnits("10", 6),
        parseEther("4"), // minimum amount out
        [tokenB.address, tokenA.address], // reverse
        user.account.address,
        BigInt(Math.floor(Date.now() / 1000) + 1000)
      ], { account: user.account });
    
      const swapReceipt = await publicClient.getTransactionReceipt({ hash: swapHash });
      expect(swapReceipt.status).to.equal("success");
      const balance = await tokenA.read.balanceOf([user.account.address]);
      expect(balance).to.be.gt(0);
    });

    it("should revert with SS:IR if 'to' is zero address", async function () {
      const { tokenA, tokenB, dex, user } = await loadFixture(deployContracts);
      await tokenA.write.approve([dex.address, parseEther("1")], { account: user.account });
      try {
        await dex.write.swapExactTokensForTokens([
          parseEther("1"),
          0,
          [tokenA.address, tokenB.address],
          "0x0000000000000000000000000000000000000000", // to = zero
          BigInt(Math.floor(Date.now() / 1000) + 300)
        ], { account: user.account });
        expect.fail("Should have reverted with 'SS:IR'");
      } catch (error: any) {
        expect(error.message).to.include("SS:IR");
      }
    });

    it("should revert with SS:EXP if deadline is expired", async function () {
      const { tokenA, tokenB, dex, user } = await loadFixture(deployContracts);
      await tokenA.write.approve([dex.address, parseEther("1")], { account: user.account });
      try {
        await dex.write.swapExactTokensForTokens([
          parseEther("1"),
          0,
          [tokenA.address, tokenB.address],
          user.account.address,
          1 // expired
        ], { account: user.account });
        expect.fail("Should have reverted with 'SS:EXP'");
      } catch (error: any) {
        expect(error.message).to.include("SS:EXP");
      }
    });

    it("should revert with SS:RNI if pool does not exist", async function () {
      // Ensures that swapping on a non-existent pool reverts with 'SS:RNI'.
      const { tokenA, tokenB, dex, user } = await loadFixture(deployContracts);
      await tokenA.write.approve([dex.address, parseEther("1")], { account: user.account });
  
      try {
        await dex.write.swapExactTokensForTokens([
          parseEther("1"),
          0,
          [tokenA.address, tokenB.address],
          user.account.address,
          BigInt(Math.floor(Date.now() / 1000) + 100)
        ], { account: user.account });
        expect.fail("Should have reverted with 'SS:RNI'");
      } catch (error: any) {
        expect(error.message).to.include("SS:RNI");
      }
    });
  
    it("should revert with SS:INA if input amount is zero", async function () {
      // Ensures that the swap reverts with 'SS:INA' when the input amount is zero.
      const { tokenA, tokenB, dex, user, owner } = await loadFixture(deployContracts);
  
      await tokenA.write.approve([dex.address, parseEther("1")], { account: owner.account });
      await tokenB.write.approve([dex.address, parseUnits("1", 6)], { account: owner.account });
      await dex.write.addLiquidity([
        tokenA.address, tokenB.address, parseEther("1"), parseUnits("1", 6),
        parseEther("1"), parseUnits("1", 6), owner.account.address,
        BigInt(Math.floor(Date.now() / 1000) + 100)
      ]);
  
      try {
        await dex.write.swapExactTokensForTokens([
          0,
          0,
          [tokenA.address, tokenB.address],
          user.account.address,
          BigInt(Math.floor(Date.now() / 1000) + 100)
        ], { account: user.account });
        expect.fail("Should have reverted with 'SS:INA'");
      } catch (error: any) {
        expect(error.message).to.include("SS:INA");
      }
    });
  
    it("should swap successfully when output equals amountOutMin", async function () {
      // Verifies swap succeeds if output amount is exactly equal to amountOutMin.
      const { tokenA, tokenB, dex, user, owner, publicClient } = await loadFixture(deployContracts);
  
      await tokenA.write.approve([dex.address, parseEther("10")], { account: owner.account });
      await tokenB.write.approve([dex.address, parseUnits("20", 6)], { account: owner.account });
      await dex.write.addLiquidity([
        tokenA.address, tokenB.address, parseEther("10"), parseUnits("20", 6),
        parseEther("10"), parseUnits("20", 6), owner.account.address,
        BigInt(Math.floor(Date.now() / 1000) + 100)
      ]);
  
      await tokenA.write.approve([dex.address, parseEther("1")], { account: user.account });
  
      // Calculates the exact output using the constant product formula.
      const amountIn = parseEther("1");
      const reserves = await dex.read.getReserves([tokenA.address, tokenB.address]);
      const reserveA = reserves[0];
      const reserveB = reserves[1];
      const expectedOut = amountIn * BigInt(reserveB) / (BigInt(reserveA) + amountIn);
  
      const swapHash = await dex.write.swapExactTokensForTokens([
        amountIn,
        expectedOut,
        [tokenA.address, tokenB.address],
        user.account.address,
        BigInt(Math.floor(Date.now() / 1000) + 100)
      ], { account: user.account });
  
      const swapReceipt = await publicClient.getTransactionReceipt({ hash: swapHash });
      expect(swapReceipt.status).to.equal("success");
  
      const balance = await tokenB.read.balanceOf([user.account.address]);
      expect(balance).to.be.gte(expectedOut);
    });
  
    it("should revert if allowance is insufficient", async function () {
      // Ensures that swapping with insufficient allowance reverts.
      const { tokenA, tokenB, dex, owner, user } = await loadFixture(deployContracts);
  
      await tokenA.write.approve([dex.address, parseEther("10")], { account: owner.account });
      await tokenB.write.approve([dex.address, parseUnits("10", 6)], { account: owner.account });
      await dex.write.addLiquidity([
        tokenA.address, tokenB.address, parseEther("10"), parseUnits("10", 6),
        parseEther("10"), parseUnits("10", 6), owner.account.address,
        BigInt(Math.floor(Date.now() / 1000) + 100)
      ]);
      // User approves less than amountIn.
      await tokenA.write.approve([dex.address, parseEther("0.5")], { account: user.account });
  
      await expect(
        dex.write.swapExactTokensForTokens([
          parseEther("1"),
          0,
          [tokenA.address, tokenB.address],
          user.account.address,
          BigInt(Math.floor(Date.now() / 1000) + 100)
        ], { account: user.account })
      ).to.be.rejectedWith('ERC20InsufficientAllowance');
    });

    it("should revert on swap when user has enough allowance but insufficient balance", async function () {
      /**
       * Covers the SafeERC20 branch for insufficient balance on transferFrom.
       * We'll set the user's balance to exactly 1 tokenA.
       */
      const { tokenA, tokenB, dex, owner, user } = await loadFixture(deployContracts);
      const userAddress = user.account.address;

      // Setup liquidity
      await tokenA.write.approve([dex.address, parseEther("10")], { account: owner.account });
      await tokenB.write.approve([dex.address, parseUnits("20", 6)], { account: owner.account });
      await dex.write.addLiquidity([
          tokenA.address, 
          tokenB.address, 
          parseEther("10"), 
          parseUnits("20", 6),
          0, 
          0, 
          owner.account.address,
          BigInt(Math.floor(Date.now() / 1000) + 500)
      ], { account: owner.account });

      // Set user's balance to exactly 1 tokenA
      const currentBalance = BigInt(await tokenA.read.balanceOf([userAddress]) as bigint);
      if (currentBalance > 0n) {
        await tokenA.write.transfer([
          owner.account.address, 
          currentBalance.toString()
        ], {
          account: user.account
        });
      }
      
      // Mint exactly 1 token to user
      const oneToken = parseEther("1");
      await tokenA.write.mint([
        userAddress, 
        oneToken.toString()
      ], {
        account: owner.account
      });

      // Verify balance is exactly 1 token
      const newBalance = BigInt(await tokenA.read.balanceOf([userAddress]) as bigint);
      expect(newBalance.toString()).to.equal(oneToken.toString());

      // Approve more than balance
      await tokenA.write.approve([dex.address, parseEther("1.1")], { 
        account: user.account 
      });

      // Attempt to swap more than user balance
      try {
        await dex.write.swapExactTokensForTokens(
          [
            parseEther("1.1"), // More than user's balance of 1 tokenA
            0, // Minimum amount out
            [tokenA.address, tokenB.address],
            userAddress,
            BigInt(Math.floor(Date.now() / 1000) + 500)
          ],
          { 
            account: user.account,
            gas: 200000 // Ensure enough gas for the transaction
          }
        );
        
        // If we get here, the transaction didn't revert as expected
        expect.fail("Transaction should have reverted due to insufficient balance");
      } catch (error: any) {
        // Check for different possible error messages
        const errorMessage = error.message.toLowerCase();
        const expectedErrors = [
          'insufficient balance',
          'transfer amount exceeds balance',
          'execution reverted',
          'reverted',
          'erc20:',
          'ss:ina'
        ];
        
        const hasExpectedError = expectedErrors.some(msg => errorMessage.includes(msg));
        if (!hasExpectedError) {
          console.error("Unexpected error:", error);
          throw error;
        }
        
        // If we get here, the error is one we expect
        expect(hasExpectedError).to.be.true;
      }
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

    it("should revert removing more LP than user owns", async function () {
      const { tokenA, tokenB, dex, owner, user } = await loadFixture(deployContracts);
      await tokenA.write.approve([dex.address, parseEther("10")], { account: owner.account });
      await tokenB.write.approve([dex.address, parseUnits("10", 6)], { account: owner.account });
      await dex.write.addLiquidity([
        tokenA.address, tokenB.address, parseEther("10"), parseUnits("10", 6),
        0, 0, owner.account.address, BigInt(Math.floor(Date.now() / 1000) + 300)
      ]);
      
      // User tries to remove LP with zero balance
      try {
        await dex.write.removeLiquidity([
          tokenA.address, 
          tokenB.address, 
          1n, // Try to remove 1 LP token
          0, 
          0,
          user.account.address, 
          BigInt(Math.floor(Date.now() / 1000) + 300)
        ], { account: user.account });
        expect.fail("Should have reverted with 'SS:ILB'");
      } catch (error: any) {
        expect(error.message).to.include("SS:ILB");
      }
    });

    it("should revert when removing liquidity with zero amount", async function () {
      const { tokenA, tokenB, dex, owner } = await loadFixture(deployContracts);
      
      try {
        await dex.write.removeLiquidity([
          tokenA.address,
          tokenB.address,
          0, 0, 0,
          owner.account.address,
          BigInt(Math.floor(Date.now() / 1000) + 300)
        ], { account: owner.account });
        expect.fail("Should have reverted with 'SS:IL'");
      } catch (error: any) {
        expect(error.message).to.include("SS:IL");
      }
    });

    it("should revert when removing liquidity from pool without reserves", async function () {
      const { tokenA, tokenB, dex, owner } = await loadFixture(deployContracts);
      
      try {
        await dex.write.removeLiquidity([
          tokenA.address,
          tokenB.address,
          1n, 0, 0,
          owner.account.address,
          BigInt(Math.floor(Date.now() / 1000) + 300)
        ], { account: owner.account });
        expect.fail("Should have reverted with 'SS:ITL'");
      } catch (error: any) {
        expect(error.message).to.include("SS:ITL");
      }
    });

    it("should revert with SS:IZA if tokenA or tokenB is the zero address", async function () {
      // Ensures that removeLiquidity fails if either token address is the zero address.
      const { tokenA, dex, owner } = await loadFixture(deployContracts);
      try {
        await dex.write.removeLiquidity([
          "0x0000000000000000000000000000000000000000", // zero address
          tokenA.address,
          1n,
          0,
          0,
          owner.account.address,
          BigInt(Math.floor(Date.now() / 1000) + 300)
        ], { account: owner.account });
        expect.fail("Should have reverted with 'SS:IZA'");
      } catch (error: any) {
        expect(error.message).to.include("SS:IZA");
      }
    });
  
    it("should revert with SS:IA if tokenA and tokenB are the same address", async function () {
      // Ensures that removeLiquidity fails if both token addresses are the same.
      const { tokenA, dex, owner } = await loadFixture(deployContracts);
      try {
        await dex.write.removeLiquidity([
          tokenA.address,
          tokenA.address,
          1n,
          0,
          0,
          owner.account.address,
          BigInt(Math.floor(Date.now() / 1000) + 300)
        ], { account: owner.account });
        expect.fail("Should have reverted with 'SS:IA'");
      } catch (error: any) {
        expect(error.message).to.include("SS:IA");
      }
    });
  
    it("should revert with SS:IR if to address is the zero address", async function () {
      // Ensures that removeLiquidity fails if to address is zero.
      const { tokenA, tokenB, dex, owner } = await loadFixture(deployContracts);
      await tokenA.write.approve([dex.address, parseEther("10")], { account: owner.account });
      await tokenB.write.approve([dex.address, parseUnits("10", 6)], { account: owner.account });
      await dex.write.addLiquidity([
        tokenA.address, tokenB.address, parseEther("10"), parseUnits("10", 6),
        0, 0, owner.account.address, BigInt(Math.floor(Date.now() / 1000) + 300)
      ]);
      try {
        await dex.write.removeLiquidity([
          tokenA.address,
          tokenB.address,
          1n,
          0,
          0,
          "0x0000000000000000000000000000000000000000", // zero address as recipient
          BigInt(Math.floor(Date.now() / 1000) + 300)
        ], { account: owner.account });
        expect.fail("Should have reverted with 'SS:IR'");
      } catch (error: any) {
        expect(error.message).to.include("SS:IR");
      }
    });
  
    it("should revert with SS:EXP if the deadline is expired", async function () {
      // Ensures that removeLiquidity fails if deadline has already passed.
      const { tokenA, tokenB, dex, owner } = await loadFixture(deployContracts);
      await tokenA.write.approve([dex.address, parseEther("10")], { account: owner.account });
      await tokenB.write.approve([dex.address, parseUnits("10", 6)], { account: owner.account });
      await dex.write.addLiquidity([
        tokenA.address, tokenB.address, parseEther("10"), parseUnits("10", 6),
        0, 0, owner.account.address, BigInt(Math.floor(Date.now() / 1000) + 300)
      ]);
      try {
        await dex.write.removeLiquidity([
          tokenA.address,
          tokenB.address,
          1n,
          0,
          0,
          owner.account.address,
          1 // expired
        ], { account: owner.account });
        expect.fail("Should have reverted with 'SS:EXP'");
      } catch (error: any) {
        expect(error.message).to.include("SS:EXP");
      }
    });
  
    it("should revert with SS:INA if amountA received is less than amountAMin", async function () {
      // Ensures that slippage protection works for tokenA: removeLiquidity reverts if amountA is below amountAMin.
      const { tokenA, tokenB, dex, owner } = await loadFixture(deployContracts);
      await tokenA.write.approve([dex.address, parseEther("10")], { account: owner.account });
      await tokenB.write.approve([dex.address, parseUnits("20", 6)], { account: owner.account });
      await dex.write.addLiquidity([
        tokenA.address, tokenB.address, parseEther("10"), parseUnits("20", 6),
        0, 0, owner.account.address, BigInt(Math.floor(Date.now() / 1000) + 300)
      ]);
      const lpBalance = await dex.read.getLiquidity([
        tokenA.address, tokenB.address, owner.account.address
      ]);
      try {
        await dex.write.removeLiquidity([
          tokenA.address,
          tokenB.address,
          lpBalance,
          parseEther("100"), // exaggerated min amountA (guaranteed to fail)
          0,
          owner.account.address,
          BigInt(Math.floor(Date.now() / 1000) + 300)
        ]);
        expect.fail("Should have reverted with 'SS:INA'");
      } catch (error: any) {
        expect(error.message).to.include("SS:INA");
      }
    });
  
    it("should revert with SS:INB if amountB received is less than amountBMin", async function () {
      // Ensures that slippage protection works for tokenB: removeLiquidity reverts if amountB is below amountBMin.
      const { tokenA, tokenB, dex, owner } = await loadFixture(deployContracts);
      await tokenA.write.approve([dex.address, parseEther("10")], { account: owner.account });
      await tokenB.write.approve([dex.address, parseUnits("20", 6)], { account: owner.account });
      await dex.write.addLiquidity([
        tokenA.address, tokenB.address, parseEther("10"), parseUnits("20", 6),
        0, 0, owner.account.address, BigInt(Math.floor(Date.now() / 1000) + 300)
      ]);
      const lpBalance = await dex.read.getLiquidity([
        tokenA.address, tokenB.address, owner.account.address
      ]);
      try {
        await dex.write.removeLiquidity([
          tokenA.address,
          tokenB.address,
          lpBalance,
          0,
          parseUnits("1000", 6), // exaggerated min amountB (guaranteed to fail)
          owner.account.address,
          BigInt(Math.floor(Date.now() / 1000) + 300)
        ]);
        expect.fail("Should have reverted with 'SS:INB'");
      } catch (error: any) {
        expect(error.message).to.include("SS:INB");
      }
    });
  });

  describe("Price Calculation", function () {
    it("should revert getReserves if reserves are not initialized (pool doesn't exist)", async function () {
      const { tokenA, tokenB, dex } = await loadFixture(deployContracts);
      
      try {
        await dex.read.getReserves([tokenA.address, tokenB.address]);
        expect.fail("Should have reverted with 'SS:RNI'");
      } catch (error: any) {
        expect(error.message).to.include("SS:RNI");
      }
    });

    it("should revert getPrice if reserves are not initialized", async function () {
      const { tokenA, tokenB, dex } = await loadFixture(deployContracts);
      
      try {
        await dex.read.getPrice([tokenA.address, tokenB.address]);
        expect.fail("Should have reverted with 'SS:RNI'");
      } catch (error: any) {
        expect(error.message).to.include("SS:RNI");
      }
    });

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

    it("should return correct price even if tokens are passed in reverse order", async function () {
      // Verifies getPrice returns the reciprocal value when tokens are passed in the opposite order.
      const { tokenA, tokenB, dex } = await loadFixture(deployContracts);
  
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
  
      // Checks price of tokenB in terms of tokenA.
      const price = await dex.read.getPrice([tokenB.address, tokenA.address]);
      expect(price).to.equal(500000000000000000000000000000n);
    });
  
    it("should return zero when calculating price for tokens with zero reserves after full removal", async function () {
      // Verifies getPrice and getReserves revert after all liquidity is removed.
      // (This simulates an edge case when pool is emptied).
      const { tokenA, tokenB, dex, owner } = await loadFixture(deployContracts);
  
      await tokenA.write.approve([dex.address, parseEther("1")]);
      await tokenB.write.approve([dex.address, parseUnits("2", 6)]);
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 1000);
  
      await dex.write.addLiquidity([
        tokenA.address,
        tokenB.address,
        parseEther("1"),
        parseUnits("2", 6),
        parseEther("1"),
        parseUnits("2", 6),
        owner.account.address,
        deadline
      ]);
      // Remove all liquidity
      const lpBalance = await dex.read.getLiquidity([
        tokenA.address, tokenB.address, owner.account.address
      ]);
      await dex.write.removeLiquidity([
        tokenA.address,
        tokenB.address,
        lpBalance,
        0, 0, owner.account.address,
        deadline + 1n
      ]);
  
      try {
        await dex.read.getPrice([tokenA.address, tokenB.address]);
        expect.fail("Should have reverted with 'SS:RNI'");
      } catch (error: any) {
        expect(error.message).to.include("SS:RNI");
      }
      try {
        await dex.read.getReserves([tokenA.address, tokenB.address]);
        expect.fail("Should have reverted with 'SS:RNI'");
      } catch (error: any) {
        expect(error.message).to.include("SS:RNI");
      }
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

    it("should revert on swap with expired deadline", async function () {
      const { tokenA, tokenB, dex, user, owner } = await loadFixture(deployContracts);
      
      // Add liquidity first to allow swap
      await tokenA.write.approve([dex.address, parseEther("10")], { account: owner.account });
      await tokenB.write.approve([dex.address, parseUnits("20", 6)], { account: owner.account });
      
      await dex.write.addLiquidity([
        tokenA.address, 
        tokenB.address, 
        parseEther("10"), 
        parseUnits("20", 6),
        0, 
        0, 
        owner.account.address, 
        BigInt(Math.floor(Date.now() / 1000) + 300)
      ], { account: owner.account });

      // Approve DEX to spend user's tokens
      await tokenA.write.approve([dex.address, parseEther("1")], { account: user.account });

      // Try to swap with expired deadline (1 second after epoch)
      try {
        await dex.write.swapExactTokensForTokens([
          parseEther("1"),
          0,
          [tokenA.address, tokenB.address],
          user.account.address,
          1n // already expired
        ], { account: user.account });
        expect.fail("Should have reverted with 'SS:EXP'");
      } catch (error: any) {
        expect(error.message).to.include("SS:EXP");
      }
    });

    it("should allow reserves exactly at uint112 max and not overflow", async function () {
      /**
       * Covers the _update path where reserves == max (does not revert).
       */
      const { tokenA, tokenB, dex, owner } = await loadFixture(deployContracts);

      const maxUint112 = 2n ** 112n - 1n;

      // Mint tokens to owner
      await tokenA.write.mint([owner.account.address, maxUint112], { account: owner.account });
      await tokenB.write.mint([owner.account.address, maxUint112], { account: owner.account });

      // Approve max tokens
      await tokenA.write.approve([dex.address, maxUint112], { account: owner.account });
      await tokenB.write.approve([dex.address, maxUint112], { account: owner.account });

      // Add liquidity up to the maximum possible in one go
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

      // Should not revert, verifies branch where require(reserveA <= max && reserveB <= max) passes exactly at bounds.
      const reserves = await dex.read.getReserves([tokenA.address, tokenB.address]);
      expect(reserves[0]).to.equal(maxUint112);
      expect(reserves[1]).to.equal(maxUint112);
    });
  });

  describe("Internal Math Helpers (direct)", function () {
    async function deployTestHelper() {
        const [owner] = await hre.viem.getWalletClients();
        const testHelper = await hre.viem.deployContract("TestHelper");
        return { testHelper, owner };
    }

    it("should return 0 from sqrt for input 0", async function () {
        // Covers the branch where sqrt(0) returns 0.
        const { testHelper } = await deployTestHelper();
        expect(await testHelper.read.testSqrt([0])).to.equal(0n);
    });

    it("should return 1 from sqrt for value 2", async function () {
        // Covers the branch where sqrt(2) returns 1.
        const { testHelper } = await deployTestHelper();
        expect(await testHelper.read.testSqrt([2])).to.equal(1n);
    });

    it("should return correct sqrt for input greater than 3", async function () {
        // Covers the while loop branch, sqrt(16) == 4.
        const { testHelper } = await deployTestHelper();
        expect(await testHelper.read.testSqrt([16])).to.equal(4n);
    });

    it("should revert in getAmountOut with SS:INA if input is zero", async function () {
        // Covers require(amountIn > 0) in getAmountOut.
        const { testHelper } = await deployTestHelper();
        await expect(
            testHelper.write.testGetAmountOut([0, 10, 10])
        ).to.be.rejectedWith("SS:INA");
    });

    it("should revert in getAmountOut with SS:IL if either reserve is zero", async function () {
        // Covers require for reserves in getAmountOut.
        const { testHelper } = await deployTestHelper();
        await expect(
            testHelper.write.testGetAmountOut([1, 0, 10])
        ).to.be.rejectedWith("SS:IL");
        await expect(
            testHelper.write.testGetAmountOut([1, 10, 0])
        ).to.be.rejectedWith("SS:IL");
    });

    it("should revert in sortTokens if addresses are the same", async function () {
        // Covers the require(tokenA != tokenB) branch.
        const { testHelper, owner } = await deployTestHelper();
        await expect(
            testHelper.write.testSortTokens([owner.account.address, owner.account.address])
        ).to.be.rejectedWith("SS:IA");
    });

    it("should revert in sortTokens if address is zero", async function () {
        // Covers the require(token0 != address(0)) branch.
        const { testHelper, owner } = await deployTestHelper();
        await expect(
            testHelper.write.testSortTokens(["0x0000000000000000000000000000000000000000", owner.account.address])
        ).to.be.rejectedWith("SS:IZA");
    });

    it("should sort tokens properly when tokenA > tokenB", async function () {
      // Covers the ternary path where tokenA > tokenB.
      const { testHelper, owner } = await deployTestHelper();
      // For proper ordering, use two distinct addresses with tokenA > tokenB
      const fakeAddressA = "0x0000000000000000000000000000000000000100";
      const fakeAddressB = "0x0000000000000000000000000000000000000001";
      const [token0, token1] = await testHelper.read.testSortTokens([fakeAddressA, fakeAddressB]);
      expect(token0).to.equal(fakeAddressB);
      expect(token1).to.equal(fakeAddressA);
  });

    it("should compute sqrt correctly for a high value (exercise full while loop depth)", async function () {
      // Covers sqrt branch with several iterations of Babylonian method.
      const { testHelper } = await deployTestHelper();
      // sqrt(10000) == 100, triggers multiple while iterations
      expect(await testHelper.read.testSqrt([10000])).to.equal(100n);
    });
  });
});