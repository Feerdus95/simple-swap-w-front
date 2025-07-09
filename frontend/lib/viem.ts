import { createPublicClient, http } from 'viem';
import { sepolia } from 'viem/chains';

// Create a public client for Sepolia
export const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(process.env.NEXT_PUBLIC_INFURA_API_KEY 
    ? `https://sepolia.infura.io/v3/${process.env.NEXT_PUBLIC_INFURA_API_KEY}`
    : 'https://rpc.sepolia.org'
  ),
});
