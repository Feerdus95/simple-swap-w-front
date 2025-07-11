// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title SimpleSwap
 * @author Feerdus95
 * @notice A simple decentralized exchange implementing constant product AMM (Automated Market Maker)
 * @dev Implements core AMM functionality with reentrancy protection.
 * Features include:
 * - Add/remove liquidity with ERC20 tokens
 * - Swap between token pairs
 * - Price calculation based on constant product formula
 * - Reentrancy protection for all external functions
 * - Sorted token pairs to prevent duplicates
 */
contract SimpleSwap is ReentrancyGuard {
    using SafeERC20 for IERC20;

    /**
     * @notice Emitted when liquidity is added to a pool
     * @param tokenA Address of the first token in the pair
     * @param tokenB Address of the second token in the pair
     * @param amountA Amount of tokenA added to the pool
     * @param amountB Amount of tokenB added to the pool
     * @param liquidity Amount of LP (Liquidity Provider) tokens minted
     * @param to Address that received the LP tokens
     */
    event LiquidityAdded(
        address indexed tokenA,
        address indexed tokenB,
        uint256 amountA,
        uint256 amountB,
        uint256 liquidity,
        address indexed to
    );

    /**
     * @notice Emitted when liquidity is removed from a pool
     * @param tokenA Address of the first token in the pair
     * @param tokenB Address of the second token in the pair
     * @param amountA Amount of tokenA received
     * @param amountB Amount of tokenB received
     * @param liquidity Amount of LP tokens burned
     * @param to Address that received the underlying tokens
     */
    event LiquidityRemoved(
        address indexed tokenA,
        address indexed tokenB,
        uint256 amountA,
        uint256 amountB,
        uint256 liquidity,
        address indexed to
    );

    /**
     * @notice Emitted when a token swap occurs
     * @param sender Address that initiated the swap
     * @param tokenIn Address of the input token
     * @param tokenOut Address of the output token
     * @param amountIn Amount of input tokens swapped
     * @param amountOut Amount of output tokens received
     * @param to Address that received the output tokens
     */
    event Swap(
        address indexed sender,
        address indexed tokenIn,
        address indexed tokenOut,
        uint256 amountIn,
        uint256 amountOut,
        address to
    );

    /**
     * @dev Pool structure to store reserve and liquidity information
     * @param reserveA Reserve amount of tokenA in the pool
     * @param reserveB Reserve amount of tokenB in the pool
     * @param totalLiquidity Total supply of LP tokens for this pool
     */
    struct Pool {
        uint112 reserveA;
        uint112 reserveB;
        uint112 totalLiquidity;
    }

    /// @dev Mapping from tokenA to tokenB to Pool data structure
    mapping(address => mapping(address => Pool)) internal pools;
    
    /// @dev Mapping from tokenA to tokenB to user address to LP token balance
    mapping(address => mapping(address => mapping(address => uint112))) internal liquidity;

    /**
     * @dev Parameters for adding liquidity to a pool
     * @param tokenA Address of the first token in the pair
     * @param tokenB Address of the second token in the pair
     * @param amountADesired Desired amount of tokenA to add
     * @param amountBDesired Desired amount of tokenB to add
     * @param amountAMin Minimum amount of tokenA that must be added (slippage protection)
     * @param amountBMin Minimum amount of tokenB that must be added (slippage protection)
     * @param to Address that will receive the LP tokens
     * @param deadline Unix timestamp after which the transaction will revert
     */
    struct AddLiquidityParams {
        address tokenA;
        address tokenB;
        uint256 amountADesired;
        uint256 amountBDesired;
        uint256 amountAMin;
        uint256 amountBMin;
        address to;
        uint256 deadline;
    }

    /**
     * @dev Parameters for removing liquidity from a pool
     * @param tokenA Address of the first token in the pair
     * @param tokenB Address of the second token in the pair
     * @param liquidityAmt Amount of LP tokens to burn
     * @param amountAMin Minimum amount of tokenA that must be received (slippage protection)
     * @param amountBMin Minimum amount of tokenB that must be received (slippage protection)
     * @param to Address that will receive the underlying tokens
     * @param deadline Unix timestamp after which the transaction will revert
     */
    struct RemoveLiquidityParams {
        address tokenA;
        address tokenB;
        uint256 liquidityAmt;
        uint256 amountAMin;
        uint256 amountBMin;
        address to;
        uint256 deadline;
    }

    // --- External Functions ---

    /**
     * @notice Add liquidity to a pool for a token pair
     * @dev Tokens should be approved to be transferred by this contract
     * @param tokenA Address of the first token in the pair
     * @param tokenB Address of the second token in the pair
     * @param amountADesired Desired amount of tokenA to add
     * @param amountBDesired Desired amount of tokenB to add
     * @param amountAMin Minimum amount of tokenA that must be added (slippage protection)
     * @param amountBMin Minimum amount of tokenB that must be added (slippage protection)
     * @param to Address that will receive the LP tokens
     * @param deadline Unix timestamp after which the transaction will revert
     * @return amountA Amount of tokenA actually added
     * @return amountB Amount of tokenB actually added
     * @return liquidityMinted Amount of LP tokens minted to the 'to' address
     * @notice Reverts if:
     * - Token addresses are zero or identical
     * - 'to' address is zero
     * - Amounts are zero
     * - Deadline has passed
     * - Slippage is too high (amounts are below minimums)
     */
    function addLiquidity(
        address tokenA,
        address tokenB,
        uint256 amountADesired,
        uint256 amountBDesired,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    ) external nonReentrant returns (uint256 amountA, uint256 amountB, uint256 liquidityMinted) {
        require(tokenA != address(0) && tokenB != address(0), "SS:IZA");
        require(to != address(0), "SS:IR");
        require(amountADesired > 0 && amountBDesired > 0, "SS:INA");
        require(deadline >= block.timestamp, "SS:EXP");

        AddLiquidityParams memory params = AddLiquidityParams({
            tokenA: tokenA,
            tokenB: tokenB,
            amountADesired: amountADesired,
            amountBDesired: amountBDesired,
            amountAMin: amountAMin,
            amountBMin: amountBMin,
            to: to,
            deadline: deadline
        });

        return _addLiquidity(params);
    }

    /**
     * @notice Remove liquidity from a pool for a token pair
     * @dev LP tokens should be approved to be transferred by this contract
     * @param tokenA Address of the first token in the pair
     * @param tokenB Address of the second token in the pair
     * @param liquidityAmt Amount of LP tokens to burn
     * @param amountAMin Minimum amount of tokenA that must be received (slippage protection)
     * @param amountBMin Minimum amount of tokenB that must be received (slippage protection)
     * @param to Address that will receive the underlying tokens
     * @param deadline Unix timestamp after which the transaction will revert
     * @return amountA Amount of tokenA received
     * @return amountB Amount of tokenB received
     * @notice Reverts if:
     * - Token addresses are zero or identical
     * - 'to' address is zero
     * - Liquidity amount is zero
     * - Deadline has passed
     * - Slippage is too high (amounts are below minimums)
     * - Insufficient LP token balance
     */
    function removeLiquidity(
        address tokenA,
        address tokenB,
        uint256 liquidityAmt,
        uint256 amountAMin,
        uint256 amountBMin,
        address to,
        uint256 deadline
    ) external nonReentrant returns (uint256 amountA, uint256 amountB) {
        require(tokenA != address(0) && tokenB != address(0), "SS:IZA");
        require(to != address(0), "SS:IR");
        require(liquidityAmt > 0, "SS:IL");
        require(deadline >= block.timestamp, "SS:EXP");

        RemoveLiquidityParams memory params = RemoveLiquidityParams({
            tokenA: tokenA,
            tokenB: tokenB,
            liquidityAmt: liquidityAmt,
            amountAMin: amountAMin,
            amountBMin: amountBMin,
            to: to,
            deadline: deadline
        });

        return _removeLiquidity(params);
    }

    /**
     * @notice Swap an exact amount of input tokens for as many output tokens as possible
     * @dev The first element of path is the input token, the second is the output token
     * @param amountIn Exact amount of input tokens to swap
     * @param amountOutMin Minimum amount of output tokens that must be received (slippage protection)
     * @param path Array with 2 elements: [inputToken, outputToken]
     * @param to Address that will receive the output tokens
     * @param deadline Unix timestamp after which the transaction will revert
     * @notice Reverts if:
     * - Path length is not exactly 2
     * - 'to' address is zero
     * - Input and output tokens are the same
     * - Input amount is zero
     * - Deadline has passed
     * - Insufficient output amount (slippage protection)
     * - Insufficient input token balance or allowance
     */
    function swapExactTokensForTokens(
        uint256 amountIn,
        uint256 amountOutMin,
        address[] calldata path,
        address to,
        uint256 deadline
    ) external nonReentrant returns (uint256[] memory amounts) {
        require(path.length == 2, "SS:IPL");
        require(to != address(0), "SS:IR");
        require(path[0] != path[1], "SS:IA");
        require(amountIn > 0, "SS:INA");
        require(deadline >= block.timestamp, "SS:EXP");

        (address input, address output) = (path[0], path[1]);
        (uint112 reserveIn, uint112 reserveOut) = getReserves(input, output);

        uint256 amountOut = getAmountOut(amountIn, reserveIn, reserveOut);
        require(amountOut >= amountOutMin, "SS:IOA");

        _update(input, output, reserveIn + amountIn, reserveOut - amountOut);

        IERC20(input).safeTransferFrom(msg.sender, address(this), amountIn);
        IERC20(output).safeTransfer(to, amountOut);

        emit Swap(msg.sender, input, output, amountIn, amountOut, to);

        amounts = new uint256[](2);
        amounts[0] = amountIn;
        amounts[1] = amountOut;
    }

    /**
    * @notice Returns the liquidity token balance of a user for a given token pair
    * @param tokenA The address of the first token in the pair
    * @param tokenB The address of the second token in the pair
    * @param user The address of the user whose liquidity balance is being queried
    * @return The amount of LP tokens owned by the user for the tokenA-tokenB pair
    */
    function getLiquidity(
        address tokenA, 
        address tokenB, 
        address user
    ) external view returns (uint256) {
        (address t0, address t1) = sortTokens(tokenA, tokenB);
        return liquidity[t0][t1][user];
    }

    // --- Internal Functions ---

    /**
     * @dev Internal function to add liquidity to a pool
     * @param p AddLiquidityParams struct containing token addresses, amounts, and other parameters
     * @return amountA Amount of tokenA actually added
     * @return amountB Amount of tokenB actually added
     * @return liquidityMinted Amount of LP tokens minted
     * @notice This function:
     * - Sorts tokens to ensure consistent ordering
     * - Calculates optimal token amounts based on current reserves
     * - Updates reserves and total liquidity
     * - Mints LP tokens to the specified address
     * - Emits LiquidityAdded event
     */
    function _addLiquidity(
    AddLiquidityParams memory p
) internal returns (uint256 amountA, uint256 amountB, uint256 liquidityMinted) {
    require(p.tokenA != p.tokenB, 'SS:IA');
    require(p.amountADesired > 0 && p.amountBDesired > 0, 'SS:INA');
    require(block.timestamp <= p.deadline, "SS:EXP");
    require(p.to != address(0), "SS:IR");

    // Sort tokens to ensure consistent ordering
    (address t0, address t1) = sortTokens(p.tokenA, p.tokenB);

    // Cache storage variables to minimize state reads
    Pool storage pool = pools[t0][t1];
    uint112 reserve0 = pool.reserveA;
    uint112 reserve1 = pool.reserveB;
    uint112 totalLiquidity = pool.totalLiquidity;

    uint256 amount0;
    uint256 amount1;

    if (reserve0 == 0 && reserve1 == 0) {
        (amount0, amount1) = p.tokenA == t0
            ? (p.amountADesired, p.amountBDesired)
            : (p.amountBDesired, p.amountADesired);
    } else {
        uint256 amount1Optimal = (p.amountADesired * reserve1) / reserve0;
        if (amount1Optimal <= p.amountBDesired) {
            require(amount1Optimal >= p.amountBMin, 'SS:INB');
            amount0 = p.amountADesired;
            amount1 = amount1Optimal;
        } else {
            uint256 amount0Optimal = (p.amountBDesired * reserve0) / reserve1;
            require(amount0Optimal <= p.amountADesired, 'SS:INA');
            require(amount0Optimal >= p.amountAMin, 'SS:INA');
            amount0 = amount0Optimal;
            amount1 = p.amountBDesired;
        }
    }

    // Transfer tokens from user to contract
    IERC20(t0).safeTransferFrom(msg.sender, address(this), amount0);
    IERC20(t1).safeTransferFrom(msg.sender, address(this), amount1);

    // Calculate new liquidity
    uint256 newLiquidityMinted;
    if (totalLiquidity == 0) {
        // Initial liquidity is the geometric mean of amounts
        newLiquidityMinted = sqrt(amount0 * amount1);
        require(newLiquidityMinted > 0, "SS:ILM");
    } else {
        // Calculate liquidity based on share of reserves
        uint256 liquidity0 = (amount0 * totalLiquidity) / reserve0;
        uint256 liquidity1 = (amount1 * totalLiquidity) / reserve1;
        newLiquidityMinted = liquidity0 < liquidity1 ? liquidity0 : liquidity1;
        require(newLiquidityMinted > 0, "SS:ILM");
    }

    // Update state once at the end
    pool.reserveA = uint112(reserve0 + amount0);
    pool.reserveB = uint112(reserve1 + amount1);
    pool.totalLiquidity = uint112(totalLiquidity + newLiquidityMinted);
    
    // Update user's liquidity balance
    liquidity[t0][t1][p.to] += uint112(newLiquidityMinted);

    // Return amounts in the original token order
    (amountA, amountB) = p.tokenA == t0 ? (amount0, amount1) : (amount1, amount0);
    liquidityMinted = newLiquidityMinted;

    emit LiquidityAdded(p.tokenA, p.tokenB, amountA, amountB, liquidityMinted, p.to);
}

    /**
     * @dev Internal function to remove liquidity from a pool
     * @param p RemoveLiquidityParams struct containing token addresses, LP amount, and other parameters
     * @return amountA Amount of tokenA received
     * @return amountB Amount of tokenB received
     * @notice This function:
     * - Sorts tokens to ensure consistent ordering
     * - Calculates token amounts based on LP share
     * - Burns LP tokens from the sender
     * - Updates reserves and total liquidity
     * - Transfers tokens to the specified address
     * - Emits LiquidityRemoved event
     */
    function _removeLiquidity(RemoveLiquidityParams memory p) internal returns (uint256 amountA, uint256 amountB) {
        // Sort tokens to ensure consistent ordering
        (address t0, address t1) = sortTokens(p.tokenA, p.tokenB);
        
        // Cache storage variables to minimize state reads
        Pool storage pool = pools[t0][t1];
        uint112 reserve0 = pool.reserveA;
        uint112 reserve1 = pool.reserveB;
        uint112 totalLiquidity = pool.totalLiquidity;
        uint112 userLiquidity = liquidity[t0][t1][msg.sender];

        // Validate pool and user liquidity
        require(totalLiquidity > 0, "SS:ITL");
        require(userLiquidity >= p.liquidityAmt, "SS:ILB");

        // Calculate amounts to withdraw based on share of liquidity
        uint256 amount0 = (p.liquidityAmt * reserve0) / totalLiquidity;
        uint256 amount1 = (p.liquidityAmt * reserve1) / totalLiquidity;

        // Validate minimum amounts
        require(amount0 >= p.amountAMin, "SS:INA");
        require(amount1 >= p.amountBMin, "SS:INB");

        // Update state once at the end
        pool.reserveA = uint112(reserve0 - amount0);
        pool.reserveB = uint112(reserve1 - amount1);
        pool.totalLiquidity = uint112(totalLiquidity - p.liquidityAmt);
        liquidity[t0][t1][msg.sender] = userLiquidity - uint112(p.liquidityAmt);

        // Transfer tokens to user
        IERC20(t0).safeTransfer(p.to, amount0);
        IERC20(t1).safeTransfer(p.to, amount1);

        // Return amounts in the original token order
        (amountA, amountB) = p.tokenA == t0 ? (amount0, amount1) : (amount1, amount0);

        emit LiquidityRemoved(p.tokenA, p.tokenB, amountA, amountB, p.liquidityAmt, p.to);
    }

    // --- View Functions ---

    /**
     * @notice Get the reserves for a token pair
     * @param tokenA Address of the first token in the pair
     * @param tokenB Address of the second token in the pair
     * @return reserveA Reserve amount of tokenA
     * @return reserveB Reserve amount of tokenB
     * @notice Reverts if reserves are not initialized (pool doesn't exist)
     */
    function getReserves(address tokenA, address tokenB) public view returns (uint112 reserveA, uint112 reserveB) {
        // Sort tokens to ensure consistent ordering
        (address t0, address t1) = sortTokens(tokenA, tokenB);
        
        // Cache storage variables to minimize state reads
        Pool storage pool = pools[t0][t1];
        uint112 reserve0 = pool.reserveA;
        uint112 reserve1 = pool.reserveB;
        
        // Validate reserves
        require(reserve0 > 0 && reserve1 > 0, "SS:RNI");
        
        // Return reserves in the original token order
        return tokenA == t0 ? (reserve0, reserve1) : (reserve1, reserve0);
    }

    /**
     * @notice Calculate the output amount for a given input amount and reserves
     * @param amountIn Amount of input tokens
     * @param reserveIn Reserve amount of input token
     * @param reserveOut Reserve amount of output token
     * @return amountOut Amount of output tokens that will be received
     * @notice Reverts if:
     * - Input amount is zero
     * - Reserves are zero
     * @dev Uses constant product formula with 0.3% fee:
     * amountOut = (amountIn * 997 * reserveOut) / (reserveIn * 1000 + amountIn * 997)
     */
    function getAmountOut(uint256 amountIn, uint256 reserveIn, uint256 reserveOut) public pure returns (uint256 amountOut) {
        require(amountIn > 0, "SS:INA");
        require(reserveIn > 0 && reserveOut > 0, "SS:IL");
        
        // Apply 0.3% fee (997/1000)
        uint256 amountInWithFee = amountIn * 997;
        uint256 numerator = amountInWithFee * reserveOut;
        uint256 denominator = (reserveIn * 1000) + amountInWithFee;
        
        amountOut = numerator / denominator;
    }

    /**
     * @notice Get the current price ratio between two tokens
     * @param tokenA Address of the first token in the pair
     * @param tokenB Address of the second token in the pair
     * @return price Price of tokenA in terms of tokenB, scaled by 1e18
     * @notice Reverts if reserves are not initialized (pool doesn't exist)
     * @dev Price is calculated as (reserveB * 1e18) / reserveA when tokenA is token0
     */
    function getPrice(address tokenA, address tokenB) external view returns (uint256 price) {
        (address t0, address t1) = sortTokens(tokenA, tokenB);
        Pool storage pool = pools[t0][t1];
        
        // Cache storage variables to minimize state reads
        uint112 reserveA = pool.reserveA;
        uint112 reserveB = pool.reserveB;
        
        require(reserveA > 0 && reserveB > 0, "SS:RNI");

        price = tokenA == t0
            ? (uint256(reserveB) * 1e18) / reserveA
            : (uint256(reserveA) * 1e18) / reserveB;
    }

    // --- Internal Helpers ---

    /**
     * @dev Calculate the square root of a number using the Babylonian method
     * @param y The number to calculate the square root of
     * @return z The square root of y
     * @notice Returns 0 if y is 0, 1 if y is between 1 and 3
     */
    function sqrt(uint256 y) internal pure returns (uint256 z) {
        if (y > 3) {
            z = y;
            uint256 x = y / 2 + 1;
            while (x < z) {
                z = x;
                x = (y / x + x) / 2;
            }
        } else if (y != 0) {
            z = 1;
        }
    }

    /**
     * @dev Sorts two tokens to ensure consistent ordering
     * @param tokenA Address of the first token
     * @param tokenB Address of the second token
     * @return token0 The smaller token address
     * @return token1 The larger token address
     * @notice Reverts if:
     * - Token addresses are the same
     * - Either token address is zero
     */
    function sortTokens(address tokenA, address tokenB) internal pure returns (address token0, address token1) {
        require(tokenA != tokenB, "SS:IA");
        (token0, token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        require(token0 != address(0), "SS:IZA");
    }

    /**
     * @dev Internal function to update the reserves for a token pair
     * @param tokenA Address of the first token in the pair
     * @param tokenB Address of the second token in the pair
     * @param reserveA New reserve amount for tokenA
     * @param reserveB New reserve amount for tokenB
     * @notice This function:
     * - Sorts tokens to ensure consistent ordering
     * - Updates the reserves in storage
     * - Performs overflow checks
     */
    function _update(address tokenA, address tokenB, uint256 reserveA, uint256 reserveB) private {
        // Sort tokens to ensure consistent ordering
        (address token0, address token1) = sortTokens(tokenA, tokenB);
        
        // Cache storage reference to minimize state reads
        Pool storage pool = pools[token0][token1];
        
        // Check for overflow before updating reserves
        require(reserveA <= type(uint112).max && reserveB <= type(uint112).max, "SS:OVERFLOW");
        
        // Cache the values to write
        uint112 newReserveA = uint112(tokenA == token0 ? reserveA : reserveB);
        uint112 newReserveB = uint112(tokenA == token0 ? reserveB : reserveA);
        
        // Single SSTORE operation for each reserve
        pool.reserveA = newReserveA;
        pool.reserveB = newReserveB;
    }
}
