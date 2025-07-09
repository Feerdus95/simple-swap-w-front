"use client"

import { useState, useEffect, useMemo, useCallback } from "react"
import { useAccount, usePublicClient, useWalletClient, useReadContract } from "wagmi"
import { getAddress, parseEther, formatEther, type Address } from "viem"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowDown, Loader2 } from "lucide-react"
import { SIMPLESWAP_ABI, SIMPLESWAP_ADDRESS, SUPPORTED_TOKENS, type TokenInfo } from "@/lib/constants"
import { TokenApproval } from "@/components/token-approval"



export function SwapInterface() {
  // ALL HOOKS MUST BE CALLED FIRST - NO EARLY RETURNS ABOVE THIS LINE
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const { isConnected, address } = useAccount();
  
  // State variables
  const [tokenIn, setTokenIn] = useState("");
  const [tokenOut, setTokenOut] = useState("");
  const [amountIn, setAmountIn] = useState("");
  const [isApproved, setIsApproved] = useState(false);
  const [needsApproval, setNeedsApproval] = useState(false);
  const [poolExists, setPoolExists] = useState<boolean | null>(null);
  const [isSwapping, setIsSwapping] = useState(false);
  const [isClientReady, setIsClientReady] = useState(false);
  const [showPoolWarning, setShowPoolWarning] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Initialize client ready state after mount
  useEffect(() => {
    setIsClientReady(true);
  }, []);

  // Constants
  const tokens = useMemo(() => SUPPORTED_TOKENS, []);

  // Parse amount safely
  const parsedAmountIn = useMemo(() => {
    try {
      return amountIn && !isNaN(Number(amountIn)) && Number(amountIn) > 0 
        ? parseEther(amountIn.toString()) 
        : undefined;
    } catch (error) {
      console.error('Error parsing amount:', error);
      return undefined;
    }
  }, [amountIn]);

  // Check token balance
  const { data: tokenBalance } = useReadContract({
    address: tokenIn as Address,
    abi: [
      {
        inputs: [{ name: "account", type: "address" }],
        name: "balanceOf",
        outputs: [{ name: "", type: "uint256" }],
        stateMutability: "view",
        type: "function",
      },
    ],
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: {
      enabled: !!(tokenIn && address),
    },
  });

  // Function to check if pool exists
  const checkPoolExists = useCallback(async (tokenA: string, tokenB: string): Promise<boolean> => {
    if (!tokenA || !tokenB || tokenA === tokenB || !publicClient) return false;
    
    try {
      const reserves = await publicClient.readContract({
        address: SIMPLESWAP_ADDRESS,
        abi: SIMPLESWAP_ABI,
        functionName: "getReserves",
        args: [tokenA as Address, tokenB as Address],
      }) as [bigint, bigint];
      
      return reserves[0] > 0n && reserves[1] > 0n;
    } catch (error) {
      console.debug('Pool check failed (may not exist yet):', error);
      return false;
    }
  }, [publicClient]);

  // Get reserves for the token pair
  const {
    data: reservesData,
    error: reservesError,
    isError: isReservesError,
    isLoading: isReservesLoading
  } = useReadContract({
    address: SIMPLESWAP_ADDRESS,
    abi: SIMPLESWAP_ABI,
    functionName: "getReserves",
    args: tokenIn && tokenOut ? [tokenIn as Address, tokenOut as Address] : undefined,
    query: {
      enabled: !!(tokenIn && tokenOut && parsedAmountIn !== undefined && parsedAmountIn > 0n && publicClient),
      retry: 2,
      retryDelay: 1000,
    },
  });

  const reserves = useMemo(() => {
    if (!reservesData) return undefined;
    return reservesData as [bigint, bigint];
  }, [reservesData]);

  // Prepare arguments for getAmountOut
  const getAmountOutArgs = useMemo(() => {
    if (!parsedAmountIn || !tokenIn || !tokenOut || !reserves) return undefined;
    return [parsedAmountIn, reserves[0], reserves[1]] as const;
  }, [parsedAmountIn, tokenIn, tokenOut, reserves]);

  // Get expected output amount
  const {
    data: expectedOutput,
    error: expectedOutputError,
    isError: isExpectedOutputError,
    isLoading: isExpectedOutputLoading
  } = useReadContract({
    address: SIMPLESWAP_ADDRESS,
    abi: SIMPLESWAP_ABI,
    functionName: "getAmountOut",
    args: getAmountOutArgs,
    query: {
      enabled: !!getAmountOutArgs,
      retry: 3,
      retryDelay: 1000,
    },
  });

  // Update pool existence when tokens change
  useEffect(() => {
    const updatePoolExists = async () => {
      if (tokenIn && tokenOut && tokenIn !== tokenOut) {
        setPoolExists(null);
        const exists = await checkPoolExists(tokenIn, tokenOut);
        setPoolExists(exists);
      } else {
        setPoolExists(null);
      }
    };
    updatePoolExists();
  }, [tokenIn, tokenOut, checkPoolExists]);

  // Check allowance
  useEffect(() => {
    const checkAllowance = async () => {
      if (!address || !tokenIn || !parsedAmountIn || !publicClient) return;
      
      try {
        const currentAllowance = await publicClient.readContract({
          address: tokenIn as Address,
          abi: [
            {
              inputs: [
                { name: "owner", type: "address" },
                { name: "spender", type: "address" }
              ],
              name: "allowance",
              outputs: [{ name: "", type: "uint256" }],
              stateMutability: "view",
              type: "function",
            }
          ],
          functionName: "allowance",
          args: [address, SIMPLESWAP_ADDRESS],
        }) as bigint;

        setNeedsApproval(currentAllowance < parsedAmountIn);
        setIsApproved(currentAllowance >= parsedAmountIn);
      } catch (error) {
        console.error('Error checking allowance:', error);
        setNeedsApproval(true);
        setIsApproved(false);
      }
    };

    checkAllowance();
  }, [address, tokenIn, parsedAmountIn, publicClient]);

  const handleApprovalSuccess = useCallback(() => {
    setIsApproved(true);
    setNeedsApproval(false);
    toast.success('Token approved successfully!');
  }, []);

  const handleApprovalError = useCallback((error: Error) => {
    console.error('Approval error:', error);
    setIsApproved(false);
    setNeedsApproval(true);
    toast.error(error.message || 'Failed to approve token');
  }, []);

  // Handle swap execution
  const handleSwap = useCallback(async () => {
    console.log('=== SWAP ATTEMPT ===');
    console.log('Current state:', {
      isConnected,
      tokenIn,
      tokenOut,
      amountIn: parsedAmountIn?.toString(),
      expectedOutput: expectedOutput?.toString(),
      contractAddress: SIMPLESWAP_ADDRESS,
      chainId: publicClient?.chain?.id
    });

    // Enhanced validation
    if (!isConnected) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (!tokenIn || !tokenOut) {
      toast.error('Please select both input and output tokens');
      return;
    }

    if (tokenIn === tokenOut) {
      toast.error('Input and output tokens cannot be the same');
      return;
    }

    if (!parsedAmountIn || parsedAmountIn <= 0n) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (!expectedOutput || expectedOutput <= 0n) {
      toast.error('Cannot calculate expected output. Pool might not exist.');
      return;
    }

    // Check if reserves exist (pool exists)
    if (!reserves || reserves[0] <= 0n || reserves[1] <= 0n) {
      toast.error('Liquidity pool does not exist for this token pair');
      return;
    }

    // Check token balance
    if (tokenBalance && parsedAmountIn && tokenBalance < parsedAmountIn) {
      toast.error(`Insufficient ${tokens.find(t => t.address === tokenIn)?.symbol} balance`);
      return;
    }

    if (!walletClient) {
      toast.error('Wallet client not available');
      return;
    }

    // Double-check approval state before proceeding with swap
    try {
      const currentAllowance = await publicClient?.readContract({
        address: tokenIn as Address,
        abi: [
          {
            inputs: [
              { name: "owner", type: "address" },
              { name: "spender", type: "address" },
            ],
            name: "allowance",
            outputs: [{ name: "", type: "uint256" }],
            stateMutability: "view",
            type: "function",
          }
        ],
        functionName: "allowance",
        args: [address as Address, SIMPLESWAP_ADDRESS],
      }) as bigint;

      if (currentAllowance < parsedAmountIn) {
        toast.error('Token not approved. Please approve first.');
        return;
      }

      setIsSwapping(true);
      
      console.log('Initiating swap with params:', {
        tokenIn,
        tokenOut,
        amountIn: parsedAmountIn.toString(),
        amountOut: expectedOutput.toString(),
        to: address
      });

      // Early return if publicClient or walletClient is not available
      if (!publicClient || !walletClient) {
        toast.error('Wallet client not available');
        return;
      }

      // Simulate the transaction first
      const { request } = await publicClient.simulateContract({
        address: SIMPLESWAP_ADDRESS,
        abi: SIMPLESWAP_ABI,
        functionName: 'swapExactTokensForTokens',
        args: [
          parsedAmountIn,
          0n, // minAmountOut (handled by slippage)
          [tokenIn as Address, tokenOut as Address],
          address as Address,
          BigInt(Math.floor(Date.now() / 1000) + 1200) // 20 minutes from now
        ],
        account: address as Address,
      });

      // Execute the transaction
      const hash = await walletClient.writeContract(request);
      
      // Show loading toast
      const toastId = toast.loading("Processing swap...");
      
      // Wait for transaction receipt
      const receipt = await publicClient.waitForTransactionReceipt({
        hash,
        confirmations: 1,
        timeout: 120_000 // 2 minute timeout
      });

      if (receipt.status === 'success') {
        console.log('Swap successful:', receipt);
        toast.success('Swap completed successfully!', { id: toastId });
        
        // Reset form
        setAmountIn("");
        
      } else {
        throw new Error('Transaction reverted');
      }
      
    } catch (error: any) {
      console.error('Swap failed:', error);
      
      // More specific error messages
      let errorMessage = 'Swap failed';
      if (error.message?.includes('INSUFFICIENT_LIQUIDITY')) {
        errorMessage = 'Insufficient liquidity for this trade';
      } else if (error.message?.includes('INSUFFICIENT_OUTPUT_AMOUNT')) {
        errorMessage = 'Insufficient output amount';
      } else if (error.message?.includes('INSUFFICIENT_INPUT_AMOUNT')) {
        errorMessage = 'Insufficient input amount';
      } else if (error.message) {
        errorMessage = `Swap failed: ${error.message}`;
      }
      
      toast.error(errorMessage);
    } finally {
      setIsSwapping(false);
    }
  }, [tokenIn, tokenOut, parsedAmountIn, expectedOutput, address, publicClient, walletClient, reserves, tokenBalance, tokens, isConnected]);

  // Debug constants on mount
  useEffect(() => {
    console.log('=== DEBUG CONSTANTS ===');
    console.log('SIMPLESWAP_ADDRESS:', SIMPLESWAP_ADDRESS);
    console.log('SUPPORTED_TOKENS:', SUPPORTED_TOKENS);
    console.log('Current network:', publicClient?.chain?.id);
    console.log('Wallet connected:', isConnected);
    console.log('Wallet address:', address);
    console.log('=======================');
  }, [isConnected, publicClient, address]);

  // Update UI state based on conditions
  useEffect(() => {
    if (!isClientReady) {
      setIsLoading(true);
      return;
    }

    if (!publicClient) {
      setShowError(true);
      setErrorMessage('Public client not available. Please check your wallet connection.');
      setIsLoading(false);
      return;
    }

    if (poolExists === false) {
      setShowPoolWarning(true);
      setIsLoading(false);
      return;
    }

    if (isReservesError || isExpectedOutputError) {
      setShowError(true);
      setErrorMessage(`Error fetching pool data. ${reservesError?.message || expectedOutputError?.message || 'Please try again.'}`);
      setIsLoading(false);
      return;
    }

    // If we get here, everything is loaded and there are no errors
    setShowPoolWarning(false);
    setShowError(false);
    setIsLoading(false);
  }, [isClientReady, publicClient, poolExists, isReservesError, isExpectedOutputError, reservesError, expectedOutputError]);

  // Disable swap button conditions with pool existence check
  const isSwapDisabled = useMemo(() => {
    return (
      isSwapping ||
      !tokenIn ||
      !tokenOut ||
      !parsedAmountIn ||
      !expectedOutput ||
      parsedAmountIn <= 0n ||
      expectedOutput <= 0n ||
      (needsApproval && !isApproved) ||
      poolExists !== true  // Only enable if pool definitely exists
    );
  }, [isSwapping, tokenIn, tokenOut, parsedAmountIn, expectedOutput, needsApproval, isApproved, poolExists]);

  // Show loading state
  if (isLoading) {
    return <div className="p-4 text-center">Loading...</div>;
  }

  // Show error state
  if (showError) {
    return (
      <div className="p-4 text-center text-red-500">
        <p>{errorMessage}</p>
        <Button 
          variant="outline" 
          onClick={() => window.location.reload()}
          className="mt-2"
        >
          Retry
        </Button>
      </div>
    );
  }

  // Show pool warning state
  if (showPoolWarning) {
    return (
      <div className="p-4 text-center">
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                Liquidity pool doesn't exist for this token pair.
                <br />
                You need to add liquidity first before swapping.
              </p>
            </div>
          </div>
        </div>
        <Button 
          onClick={() => window.location.hash = '#liquidity'}
          className="mt-2"
        >
          Go to Liquidity
        </Button>
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          {/* Input Token */}
          <div className="space-y-2">
            <Label>Input Token</Label>
            <Select value={tokenIn} onValueChange={(value) => setTokenIn(value)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select token">
                  {tokenIn ? tokens.find(t => t.address === tokenIn)?.symbol : 'Select token'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {tokens.map((token) => (
                  <SelectItem key={token.address} value={token.address}>
                    <div className="flex items-center gap-2">
                      <span>{token.symbol}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Output Token */}
          <div className="space-y-2">
            <Label>Output Token</Label>
            <Select value={tokenOut} onValueChange={(value) => setTokenOut(value)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select token">
                  {tokenOut ? tokens.find(t => t.address === tokenOut)?.symbol : 'Select token'}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {tokens.map((token) => (
                  <SelectItem key={token.address} value={token.address}>
                    <div className="flex items-center gap-2">
                      <span>{token.symbol}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Amount Input */}
          <div className="space-y-2">
            <Label>Amount</Label>
            <Input
              type="number"
              min="0"
              step="0.000001"
              placeholder="0.0"
              value={amountIn}
              onChange={(e) => {
                const value = e.target.value;
                // Only allow positive numbers
                if (value === '' || (parseFloat(value) >= 0 && !isNaN(parseFloat(value)))) {
                  setAmountIn(value);
                }
              }}
              disabled={!tokenIn || !tokenOut}
            />
            {tokenIn && (
              <div className="text-sm text-muted-foreground">
                Balance: {tokenBalance ? formatEther(tokenBalance) : '0.0'} {tokens.find(t => t.address === tokenIn)?.symbol}
                {amountIn && tokenBalance && parsedAmountIn && parsedAmountIn > tokenBalance && (
                  <div className="text-red-500 text-xs mt-1">
                    ⚠️ Amount exceeds balance
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Pool Status */}
          {tokenIn && tokenOut && (
            <>
              {!poolExists && poolExists !== null && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                  <p className="text-sm text-yellow-800">
                    ⚠️ Liquidity pool doesn't exist for this token pair. 
                    <br />
                    You need to add liquidity first before swapping.
                  </p>
                </div>
              )}
              
              {poolExists === null && tokenIn !== tokenOut && (
                <div className="text-sm text-gray-500">
                  Checking if liquidity pool exists...
                </div>
              )}
            </>
          )}

          {/* Expected Output */}
          {expectedOutput !== undefined && (
            <div className="text-sm text-muted-foreground">
              Expected Output: {formatEther(expectedOutput)} {tokens.find(t => t.address === tokenOut)?.symbol}
            </div>
          )}

          {/* Errors */}
          {isReservesError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-800">
                ⚠️ No liquidity pool exists for this token pair.
                <br />
                <span className="text-xs">You need to add liquidity first in the "Liquidity" tab.</span>
              </p>
            </div>
          )}

          {isExpectedOutputError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-800">
                ⚠️ Cannot calculate expected output.
                <br />
                <span className="text-xs">Verify that the pool has sufficient liquidity.</span>
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-4">
            {needsApproval && tokenIn && !isApproved ? (
              <TokenApproval
                tokenAddress={tokenIn as Address}
                spenderAddress={SIMPLESWAP_ADDRESS}
                amount={parsedAmountIn || 0n}
                onSuccess={handleApprovalSuccess}
                onError={handleApprovalError}
                isApproved={isApproved}
                className="w-full"
              />
            ) : (
              <Button
                onClick={handleSwap}
                disabled={isSwapDisabled}
                className="w-full bg-primary"
              >
                {isSwapping ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Swapping...
                  </>
                ) : isReservesLoading || isExpectedOutputLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  'Swap'
                )}
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}