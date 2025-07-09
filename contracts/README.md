y# SimpleSwap DEX

A gas-optimized, Uniswap v2-style DEX implementation in Solidity. This contract enables permissionless ERC-20 token swaps and liquidity provision using the constant product AMM ("x \* y = k") model. The implementation includes comprehensive input validation, reentrancy protection, and efficient storage usage.

**Note:** This is an educational reference implementation. The contract includes safety features but has not been audited for production use.

---

## Features

- 🚀 Gas-optimized implementation with efficient storage usage
- 🔄 ERC-20 token swapping with slippage protection
- 💧 Add/remove liquidity with internal LP token tracking
- 📊 Constant product formula (x \* y = k)
- 🛡️ Reentrancy protection (OpenZeppelin's ReentrancyGuard)
- 🔒 Safe token transfers using OpenZeppelin's SafeERC20
- 🧠 Parameter structs for better code organization
- ✅ Comprehensive input validation with descriptive error codes
- 📈 View functions for price and reserve information
- 🔍 Internal helper functions for gas efficiency

---

## Usage

### Data Structures

#### AddLiquidityParams

```solidity
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
```

#### RemoveLiquidityParams

```solidity
struct RemoveLiquidityParams {
    address tokenA;
    address tokenB;
    uint256 liquidityAmt;
    uint256 amountAMin;
    uint256 amountBMin;
    address to;
    uint256 deadline;
}
```

### Core Functions

#### addLiquidity

Adds liquidity to a pool for a token pair.

```solidity
function addLiquidity(
    address tokenA,
    address tokenB,
    uint256 amountADesired,
    uint256 amountBDesired,
    uint256 amountAMin,
    uint256 amountBMin,
    address to,
    uint256 deadline
) external nonReentrant returns (uint256 amountA, uint256 amountB, uint256 liquidityMinted);
```

#### removeLiquidity

Removes liquidity from a pool and receives the underlying tokens.

```solidity
function removeLiquidity(
    address tokenA,
    address tokenB,
    uint256 liquidityAmt,
    uint256 amountAMin,
    uint256 amountBMin,
    address to,
    uint256 deadline
) external nonReentrant returns (uint256 amountA, uint256 amountB);
```

#### swapExactTokensForTokens

Swaps an exact amount of input tokens for as many output tokens as possible.

```solidity
function swapExactTokensForTokens(
    uint256 amountIn,
    uint256 amountOutMin,
    address[] calldata path,
    address to,
    uint256 deadline
) external nonReentrant returns (uint256[] memory amounts);
```

### View Functions

#### getReserves

Gets the reserves for a token pair.

```solidity
function getReserves(address tokenA, address tokenB) external view returns (uint112 reserveA, uint112 reserveB);
```

#### getAmountOut

Calculates the output amount for a given input amount and reserves.

```solidity
function getAmountOut(uint256 amountIn, uint256 reserveIn, uint256 reserveOut) external pure returns (uint256 amountOut);
```

#### getPrice

Gets the current price ratio between two tokens.

```solidity
function getPrice(address tokenA, address tokenB) external view returns (uint256 price);
```

#### getLiquidity

Gets the liquidity token balance of a user for a given token pair.

```solidity
function getLiquidity(address tokenA, address tokenB, address user) external view returns (uint256);
```

### Events

#### LiquidityAdded

```solidity
event LiquidityAdded(
    address indexed tokenA,
    address indexed tokenB,
    uint256 amountA,
    uint256 amountB,
    uint256 liquidity,
    address indexed to
);
```

#### LiquidityRemoved

```solidity
event LiquidityRemoved(
    address indexed tokenA,
    address indexed tokenB,
    uint256 amountA,
    uint256 amountB,
    uint256 liquidity,
    address indexed to
);
```

#### Swap

```solidity
event Swap(
    address indexed sender,
    address indexed tokenIn,
    address indexed tokenOut,
    uint256 amountIn,
    uint256 amountOut,
    address to
);
```

---

## Security

- **ReentrancyGuard**: All state-changing functions are protected against reentrancy attacks
- **SafeERC20**: Uses OpenZeppelin's SafeERC20 for secure token transfers
- **Input Validations**: Comprehensive checks with descriptive error codes
- **Overflow Protection**: Uses Solidity 0.8.x built-in overflow checks
- **Deadline Checks**: All transactions include deadline validation
- **Slippage Protection**: Minimum output amounts required for swaps and liquidity operations
- **Token Ordering**: Automatic sorting of token pairs to prevent duplicates
- **Zero-Address Checks**: Prevents accidental loss of funds

---

## Error Codes

| Code   | Description                     |
| ------ | ------------------------------- |
| SS:EXP | Transaction expired             |
| SS:IR  | Invalid recipient               |
| SS:INA | Insufficient amount of token A  |
| SS:INB | Insufficient amount of token B  |
| SS:IL  | Insufficient liquidity          |
| SS:IPL | Invalid path length (must be 2) |
| SS:IA  | Identical addresses             |
| SS:IOA | Insufficient output amount      |
| SS:ILM | Insufficient liquidity minted   |
| SS:ILB | Insufficient liquidity balance  |
| SS:ITL | Insufficient total liquidity    |
| SS:IZA | Invalid zero address            |
| SS:RNI | Reserves not initialized        |

---

## Gas Optimization

- **Unchecked Arithmetic**: Safe arithmetic operations use `unchecked` blocks
- **Storage Types**: Uses `uint112` for reserves and liquidity to optimize storage
- **Caching**: Caches storage variables to minimize SLOAD operations
- **Parameter Structs**: Reduces stack usage and gas costs
- **Efficient Conditionals**: Optimized conditionals and comparisons

---

## Design Notes

- **No Protocol Fees**: 100% educational implementation without fees
- **Direct Swaps Only**: No multi-hop routing implemented
- **LP Token Tracking**: Uses internal mappings instead of ERC20 tokens for LP tracking
- **No Admin Controls**: No owner or admin functions
- **No Oracles**: Price is determined solely by the constant product formula
- **Parameter Structs**: Used to avoid "stack too deep" compiler errors
- **Safe Token Handling**: Implements OpenZeppelin's SafeERC20 for secure transfers

---

## License

MIT

---

**Disclaimer:**  
This contract is for educational purposes only. It has not been audited and should not be used in production environments. Use at your own risk.
