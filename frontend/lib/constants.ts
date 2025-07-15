import type { Address } from "viem";

export const SIMPLESWAP_ADDRESS: Address = "0xC5fd570BFF105Ec45b0817c86a4d4525ced25bE4";
export const SIMPLESWAP_ABI = [
  // Events
  {
    "type": "event",
    "name": "LiquidityAdded",
    "inputs": [
      { "name": "tokenA", "type": "address", "indexed": true },
      { "name": "tokenB", "type": "address", "indexed": true },
      { "name": "amountA", "type": "uint256" },
      { "name": "amountB", "type": "uint256" },
      { "name": "liquidity", "type": "uint256" },
      { "name": "to", "type": "address", "indexed": true }
    ]
  },
  {
    "type": "event",
    "name": "LiquidityRemoved",
    "inputs": [
      { "name": "tokenA", "type": "address", "indexed": true },
      { "name": "tokenB", "type": "address", "indexed": true },
      { "name": "amountA", "type": "uint256" },
      { "name": "amountB", "type": "uint256" },
      { "name": "liquidity", "type": "uint256" },
      { "name": "to", "type": "address", "indexed": true }
    ]
  },
  {
    "type": "event",
    "name": "Swap",
    "inputs": [
      { "name": "sender", "type": "address", "indexed": true },
      { "name": "tokenIn", "type": "address" },
      { "name": "tokenOut", "type": "address" },
      { "name": "amountIn", "type": "uint256" },
      { "name": "amountOut", "type": "uint256" },
      { "name": "to", "type": "address", "indexed": true }
    ]
  },
  
  // Functions
  {
    "type": "function",
    "name": "addLiquidity",
    "stateMutability": "nonpayable",
    "inputs": [
      { "name": "tokenA", "type": "address" },
      { "name": "tokenB", "type": "address" },
      { "name": "amountADesired", "type": "uint256" },
      { "name": "amountBDesired", "type": "uint256" },
      { "name": "amountAMin", "type": "uint256" },
      { "name": "amountBMin", "type": "uint256" },
      { "name": "to", "type": "address" },
      { "name": "deadline", "type": "uint256" }
    ],
    "outputs": [
      { "name": "amountA", "type": "uint256" },
      { "name": "amountB", "type": "uint256" },
      { "name": "liquidity", "type": "uint256" }
    ]
  },
  {
    "type": "function",
    "name": "removeLiquidity",
    "stateMutability": "nonpayable",
    "inputs": [
      { "name": "tokenA", "type": "address" },
      { "name": "tokenB", "type": "address" },
      { "name": "liquidity", "type": "uint256" },
      { "name": "amountAMin", "type": "uint256" },
      { "name": "amountBMin", "type": "uint256" },
      { "name": "to", "type": "address" },
      { "name": "deadline", "type": "uint256" }
    ],
    "outputs": [
      { "name": "amountA", "type": "uint256" },
      { "name": "amountB", "type": "uint256" }
    ]
  },
  {
    "type": "function",
    "name": "swapExactTokensForTokens",
    "stateMutability": "nonpayable",
    "inputs": [
      { "name": "amountIn", "type": "uint256" },
      { "name": "amountOutMin", "type": "uint256" },
      { "name": "path", "type": "address[]" },
      { "name": "to", "type": "address" },
      { "name": "deadline", "type": "uint256" }
    ],
    "outputs": [
      { "name": "amounts", "type": "uint256[]" }
    ]
  },
  {
    "type": "function",
    "name": "getAmountOut",
    "stateMutability": "pure",
    "inputs": [
      { "name": "amountIn", "type": "uint256" },
      { "name": "reserveIn", "type": "uint256" },
      { "name": "reserveOut", "type": "uint256" }
    ],
    "outputs": [
      { "name": "amountOut", "type": "uint256" }
    ]
  },
  {
    "type": "function",
    "name": "getReserves",
    "stateMutability": "view",
    "inputs": [
      { "name": "tokenA", "type": "address" },
      { "name": "tokenB", "type": "address" }
    ],
    "outputs": [
      { "name": "reserveA", "type": "uint112" },
      { "name": "reserveB", "type": "uint112" }
    ]
  },
  {
    "type": "function",
    "name": "getPrice",
    "stateMutability": "view",
    "inputs": [
      { "name": "tokenA", "type": "address" },
      { "name": "tokenB", "type": "address" }
    ],
    "outputs": [
      { "name": "price", "type": "uint256" }
    ]
  }
] as const;

// Token interface
export interface TokenInfo {
  symbol: string;
  name: string;
  address: `0x${string}`;
  decimals: number;
  logoURI: string;
  balance?: string;
  formattedBalance?: string;
}

// Supported Tokens
export const SUPPORTED_TOKENS: TokenInfo[] = [
  {
    symbol: "TTA",
    name: "TestTokenA",
    address: "0xd6ae949f6405c366d23cc30422d684b6e76551ca",
    decimals: 18,
    logoURI: "https://placehold.co/32/blue/white?text=TTA"
  },
  {
    symbol: "TTB",
    name: "TestTokenB",
    address: "0xd35dad90ed974961c5299654def0a87478d82a15",
    decimals: 6,
    logoURI: "https://placehold.co/32/green/white?text=TTB"
  }
] as const;