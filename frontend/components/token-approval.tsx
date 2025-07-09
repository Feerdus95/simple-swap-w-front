"use client"

import { useState } from "react"
import { useAccount, useWriteContract, useReadContract, usePublicClient } from "wagmi"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Check } from "lucide-react"
import { SIMPLESWAP_ADDRESS, SUPPORTED_TOKENS, type TokenInfo } from "@/lib/constants"

// ERC20 ABI for approval functions
const ERC20_ABI = [
  {
    constant: false,
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" }
    ],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    constant: true,
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" }
    ],
    name: "allowance",
    outputs: [{ name: "", type: "uint256" }],
    payable: false,
    stateMutability: "view",
    type: "function"
  }
] as const;

interface TokenApprovalProps {
  tokenAddress: `0x${string}`
  spenderAddress: `0x${string}`
  amount: bigint
  onSuccess?: () => void
  onError?: (error: Error) => void
  isApproved?: boolean
  className?: string
}

export function TokenApproval({
  tokenAddress,
  spenderAddress,
  amount,
  onSuccess = () => {},
  onError = () => {},
  isApproved = false,
  className = ''
}: TokenApprovalProps): JSX.Element {
  const [isLoading, setIsLoading] = useState(false);
  const { address } = useAccount();
  const publicClient = usePublicClient();
  
  const { writeContractAsync, isPending } = useWriteContract({
    mutation: {
      onSuccess: (data) => {
        console.log('Approval transaction sent, waiting for confirmation...', { hash: data })
      },
      onError: (error) => {
        console.error('Approval transaction failed:', error);
        onError?.(error);
      }
    }
  });
  
  const { data: currentAllowance, refetch: refetchAllowance } = useReadContract({
    address: tokenAddress,
    abi: ERC20_ABI,
    functionName: 'allowance',
    args: tokenAddress && spenderAddress && address ? [address, spenderAddress] : undefined,
    query: {
      enabled: !!tokenAddress && !!spenderAddress && !!address,
      refetchInterval: publicClient ? 2000 : false
    }
  });

  // Early return after all hooks have been called
  if (!tokenAddress || !spenderAddress) {
    return (
      <Button disabled className={className}>
        Invalid Token
      </Button>
    );
  }

  if (!publicClient) {
    return (
      <Button disabled className={className}>
        No Client Available
      </Button>
    );
  }

  const handleApprove = async () => {
    if (!tokenAddress || !spenderAddress || !amount) {
      const error = new Error('Missing required parameters for approval');
      console.error(error.message);
      onError?.(error);
      return;
    }

    setIsLoading(true);

    try {
      console.log('Sending approval transaction...', { 
        token: tokenAddress, 
        spender: spenderAddress,
        amount: amount.toString()
      });
      
      const hash = await writeContractAsync({
        address: tokenAddress,
        abi: ERC20_ABI,
        functionName: 'approve',
        args: [spenderAddress, amount],
      });

      // Wait for the transaction to be mined
      const receipt = await publicClient.waitForTransactionReceipt({
        hash,
        confirmations: 1,
        timeout: 60_000, // 1 minute timeout
      });

      console.log('Approval transaction confirmed:', receipt);
      
      // Refetch the allowance to ensure UI updates
      await refetchAllowance();
      
      // Notify parent component
      onSuccess();
    } catch (error) {
      console.error('Approval failed:', error);
      onError(error instanceof Error ? error : new Error('Failed to approve token'));
    } finally {
      setIsLoading(false);
    }
  };

          // If no specific amount, show disabled button
  if (amount === 0n) {
    return (
      <Button disabled className={className}>
        Enter amount first
      </Button>
    );
  }

  const isTokenApproved = isApproved || (currentAllowance !== undefined && currentAllowance >= amount);
  const isButtonDisabled = isLoading || isPending || isTokenApproved;

  if (isLoading || isPending) {
    return (
      <Button disabled className={className}>
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Approving...
      </Button>
    );
  }

  if (isTokenApproved) {
    return (
      <Button disabled className={`${className} bg-green-600 hover:bg-green-700`}>
        <Check className="mr-2 h-4 w-4" />
        Approved
      </Button>
    );
  }

  return (
    <Button
      onClick={handleApprove}
      className={`${className} bg-blue-600 hover:bg-blue-700`}
      disabled={isButtonDisabled}
    >
      Approve {tokenAddress === '0x207122a3b190486faed56d870f5b31f09903fe6b' ? 'TTA' : 'Token'}
    </Button>
  );
}

interface TokenApprovalCardProps {
  tokenAddress?: string;
  spenderAddress?: `0x${string}`;
  amount?: bigint;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  isApproved?: boolean;
  className?: string;
}

export function TokenApprovalCard({
  tokenAddress,
  spenderAddress = SIMPLESWAP_ADDRESS,
  amount = 0n,
  onSuccess = () => {},
  onError = () => {},
  isApproved = false,
  className = ''
}: TokenApprovalCardProps) {
  
  const tokenInfo = tokenAddress ? SUPPORTED_TOKENS.find(
    (token: TokenInfo) => token.address.toLowerCase() === tokenAddress.toLowerCase()
  ) : undefined

  if (!tokenInfo || !tokenAddress) {
    return null;
  }

  // Ensure tokenAddress is properly typed as 0x${string}
  const safeTokenAddress = tokenAddress.toLowerCase().startsWith('0x') 
    ? tokenAddress as `0x${string}`
    : `0x${tokenAddress}` as `0x${string}`;

  return (
    <Card className={`bg-card/50 border-border/50 ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">
          {isApproved ? `${tokenInfo.symbol} Approved` : `Approve ${tokenInfo.symbol}`}
        </CardTitle>
        <CardDescription className="text-xs text-muted-foreground">
          {isApproved 
            ? `You can now swap ${tokenInfo.symbol}` 
            : `Allow the contract to spend your ${tokenInfo.symbol}`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <TokenApproval
          tokenAddress={safeTokenAddress}
          spenderAddress={spenderAddress || SIMPLESWAP_ADDRESS}
          amount={amount}
          onSuccess={onSuccess}
          onError={onError}
          isApproved={isApproved}
          className="w-full"
        />
      </CardContent>
    </Card>
  );
}