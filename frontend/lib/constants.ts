import type { Address } from "viem";

export const SIMPLESWAP_ADDRESS: Address = "0xec94cf35f084b41e0ff196b4a23fd4d7c407afb8";
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
    address: "0x207122a3b190486faed56d870f5b31f09903fe6b",
    decimals: 18,
    logoURI: "https://placehold.co/32/blue/white?text=TTA"
  },
  {
    symbol: "TTB",
    name: "TestTokenB",
    address: "0x9a7a2fb89fd2d24c3d6c9e05eba82d393838a24f",
    decimals: 6,
    logoURI: "https://placehold.co/32/green/white?text=TTB"
  }
] as const;