"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Minus, Loader2 } from "lucide-react"
import { useAccount, useWriteContract, useReadContract } from "wagmi"
import { parseEther, formatEther, type Address } from "viem"
import { toast } from "sonner"
import { SIMPLESWAP_ABI, SIMPLESWAP_ADDRESS, SUPPORTED_TOKENS } from "@/lib/constants"
import { TokenApproval } from "./token-approval"

export function LiquidityInterface() {
  const [tokenA, setTokenA] = useState<`0x${string}` | ''>('')
  const [tokenB, setTokenB] = useState<`0x${string}` | ''>('')
  const [amountA, setAmountA] = useState('')
  const [amountB, setAmountB] = useState('')
  const [isTokenAApproved, setIsTokenAApproved] = useState(false)
  const [isTokenBApproved, setIsTokenBApproved] = useState(false)
  const [liquidityAmount, setLiquidityAmount] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [needsApproval, setNeedsApproval] = useState({ tokenA: false, tokenB: false })

  const { isConnected, address } = useAccount()
  const { writeContract } = useWriteContract()

  // Get reserves for the token pair
  const { data: reservesData } = useReadContract({
    address: SIMPLESWAP_ADDRESS,
    abi: SIMPLESWAP_ABI,
    functionName: 'getReserves',
    args: tokenA && tokenB ? [tokenA, tokenB] as const : undefined,
    query: {
      enabled: !!(tokenA && tokenB),
    },
  })
  
  // Parse reserves data into a more usable format
  const reserves = useMemo(() => {
    if (!reservesData) return null;
    // Handle case where reserves might be in different formats
    if (Array.isArray(reservesData) && reservesData.length >= 2) {
      return {
        reserveA: reservesData[0],
        reserveB: reservesData[1]
      };
    }
    return null;
  }, [reservesData]);

  // Calculate user's share of liquidity based on reserves
  const userLiquidity = useMemo(() => {
    if (!reserves || !amountA || !amountB) return 0n;
    
    try {
      const { reserveA, reserveB } = reserves;
      const amountABigInt = parseEther(amountA);
      const amountBBigInt = parseEther(amountB);
      
      // Simple calculation - in a real DEX, this would use the actual LP token calculation
      if (reserveA > 0n && reserveB > 0n) {
        const liquidityA = (amountABigInt * 1000n) / reserveA;
        const liquidityB = (amountBBigInt * 1000n) / reserveB;
        return liquidityA < liquidityB ? liquidityA : liquidityB;
      }
      
      return 0n;
    } catch (error) {
      console.error('Error calculating liquidity:', error);
      return 0n;
    }
  }, [reserves, amountA, amountB]);

  // Check token allowances when tokens or address changes
  const { data: allowanceA } = useReadContract({
    address: tokenA as `0x${string}`,
    abi: [
      {
        constant: true,
        inputs: [
          { name: 'owner', type: 'address' },
          { name: 'spender', type: 'address' }
        ],
        name: 'allowance',
        outputs: [{ name: '', type: 'uint256' }],
        payable: false,
        stateMutability: 'view',
        type: 'function'
      }
    ],
    functionName: 'allowance',
    args: [address!, SIMPLESWAP_ADDRESS],
    query: {
      enabled: !!(tokenA && address),
      refetchInterval: 2000 // Check every 2 seconds
    }
  })

  const { data: allowanceB } = useReadContract({
    address: tokenB as `0x${string}`,
    abi: [
      {
        constant: true,
        inputs: [
          { name: 'owner', type: 'address' },
          { name: 'spender', type: 'address' }
        ],
        name: 'allowance',
        outputs: [{ name: '', type: 'uint256' }],
        payable: false,
        stateMutability: 'view',
        type: 'function'
      }
    ],
    functionName: 'allowance',
    args: [address!, SIMPLESWAP_ADDRESS],
    query: {
      enabled: !!(tokenB && address),
      refetchInterval: 2000 // Check every 2 seconds
    }
  })

  // Get token balances
  const { data: tokenBalanceA } = useReadContract({
    address: tokenA as `0x${string}`,
    abi: [
      {
        constant: true,
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
      enabled: !!(tokenA && address),
    },
  })

  const { data: tokenBalanceB } = useReadContract({
    address: tokenB as `0x${string}`,
    abi: [
      {
        constant: true,
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
      enabled: !!(tokenB && address),
    },
  })

  // Update approval status when allowances change
  useEffect(() => {
    if (tokenA && tokenB && allowanceA !== undefined && allowanceB !== undefined) {
      const amountABigInt = amountA ? parseEther(amountA) : 0n
      const amountBBigInt = amountB ? parseEther(amountB) : 0n
      
      setNeedsApproval({
        tokenA: allowanceA < amountABigInt,
        tokenB: allowanceB < amountBBigInt
      })
    }
  }, [tokenA, tokenB, allowanceA, allowanceB, amountA, amountB])

  const handleAddLiquidity = async () => {
    if (!isConnected || !tokenA || !tokenB || !amountA || !amountB) {
      toast.error("Please connect wallet and fill all fields")
      return
    }

    // Check if both tokens are approved
    if (needsApproval.tokenA || needsApproval.tokenB) {
      toast.error("Please approve both tokens before adding liquidity")
      return
    }

    // Check if amounts are valid
    const amountABigInt = parseEther(amountA)
    const amountBBigInt = parseEther(amountB)
    
    if (amountABigInt <= 0n || amountBBigInt <= 0n) {
      toast.error("Please enter valid amounts greater than 0")
      return
    }

    // Check if user has sufficient balance
    if (tokenBalanceA && amountABigInt > tokenBalanceA) {
      toast.error(`Insufficient ${SUPPORTED_TOKENS.find(t => t.address === tokenA)?.symbol} balance`)
      return
    }

    if (tokenBalanceB && amountBBigInt > tokenBalanceB) {
      toast.error(`Insufficient ${SUPPORTED_TOKENS.find(t => t.address === tokenB)?.symbol} balance`)
      return
    }

    setIsLoading(true)
    try {
      console.log("Adding liquidity with params:", {
        tokenA,
        tokenB,
        amountA: amountABigInt.toString(),
        amountB: amountBBigInt.toString(),
        amountAMin: parseEther((Number.parseFloat(amountA) * 0.95).toString()).toString(),
        amountBMin: parseEther((Number.parseFloat(amountB) * 0.95).toString()).toString(),
        to: address,
        deadline: BigInt(Math.floor(Date.now() / 1000) + 1200).toString()
      })

      const result = await writeContract({
        address: SIMPLESWAP_ADDRESS,
        abi: SIMPLESWAP_ABI,
        functionName: "addLiquidity",
        args: [
          tokenA as Address,
          tokenB as Address,
          amountABigInt,
          amountBBigInt,
          parseEther((Number.parseFloat(amountA) * 0.95).toString()), // 5% slippage
          parseEther((Number.parseFloat(amountB) * 0.95).toString()), // 5% slippage
          address!,
          BigInt(Math.floor(Date.now() / 1000) + 1200), // 20 minutes deadline
        ],
      })

      console.log("Add liquidity transaction sent:", result)
      toast.success("Liquidity added successfully!")
      setAmountA("")
      setAmountB("")
    } catch (error: any) {
      console.error("Add liquidity failed:", error)
      
      // Provide more specific error messages
      if (error.message?.includes("SS:INA")) {
        toast.error("Invalid amounts provided")
      } else if (error.message?.includes("SS:IZA")) {
        toast.error("Invalid token addresses")
      } else if (error.message?.includes("SS:IR")) {
        toast.error("Invalid recipient address")
      } else if (error.message?.includes("SS:EXP")) {
        toast.error("Transaction deadline expired")
      } else if (error.message?.includes("insufficient allowance")) {
        toast.error("Please approve tokens first")
      } else if (error.message?.includes("insufficient balance")) {
        toast.error("Insufficient token balance")
      } else {
        toast.error(`Failed to add liquidity: ${error.message || "Unknown error"}`)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemoveLiquidity = async () => {
    if (!isConnected || !tokenA || !tokenB || !liquidityAmount) {
      toast.error("Please connect wallet and fill all fields")
      return
    }

    // Validate liquidity amount
    const liquidityAmountBigInt = parseEther(liquidityAmount)
    if (liquidityAmountBigInt <= 0n) {
      toast.error("Please enter a valid liquidity amount")
      return
    }

    // Check if user has sufficient liquidity
    if (userLiquidity && liquidityAmountBigInt > userLiquidity) {
      toast.error("Insufficient liquidity balance")
      return
    }

    setIsLoading(true)
    try {
      await writeContract({
        address: SIMPLESWAP_ADDRESS,
        abi: SIMPLESWAP_ABI,
        functionName: "removeLiquidity",
        args: [
          tokenA as Address,
          tokenB as Address,
          parseEther(liquidityAmount),
          BigInt(0), // Min amount A
          BigInt(0), // Min amount B
          address!,
          BigInt(Math.floor(Date.now() / 1000) + 1200), // 20 minutes deadline
        ],
      })

      toast.success("Liquidity removed successfully!")
      setLiquidityAmount("")
    } catch (error) {
      console.error("Remove liquidity failed:", error)
      toast.error("Failed to remove liquidity. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleTokenAApprovalSuccess = () => {
    setIsTokenAApproved(true)
    const tokenSymbol = SUPPORTED_TOKENS.find(t => t.address.toLowerCase() === tokenA?.toLowerCase())?.symbol || 'Token A'
    toast.success(`${tokenSymbol} approved`)
    // Force a refetch of the allowance
    if (allowanceA !== undefined) {
      // This will trigger a refetch due to the refetchInterval
    }
  }

  const handleTokenBApprovalSuccess = () => {
    setIsTokenBApproved(true)
    const tokenSymbol = SUPPORTED_TOKENS.find(t => t.address.toLowerCase() === tokenB?.toLowerCase())?.symbol || 'Token B'
    toast.success(`${tokenSymbol} approved`)
    // Force a refetch of the allowance
    if (allowanceB !== undefined) {
      // This will trigger a refetch due to the refetchInterval
    }
  }

  const handleTokenAChange = (value: string) => {
    setTokenA(value as `0x${string}`);
    if (value === tokenB) {
      setTokenB('' as `0x${string}`);
    }
  };

  const handleTokenBChange = (value: string) => {
    setTokenB(value as `0x${string}`);
    if (value === tokenA) {
      setTokenA('' as `0x${string}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Token Pair Selection */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-muted-foreground">Token A</Label>
          <Select value={tokenA} onValueChange={handleTokenAChange}>
            <SelectTrigger className="bg-secondary border-border">
              <SelectValue placeholder="Select Token A" />
            </SelectTrigger>
            <SelectContent>
              {SUPPORTED_TOKENS.map((token) => (
                <SelectItem key={token.address} value={token.address}>
                  {token.symbol}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-muted-foreground">Token B</Label>
          <Select value={tokenB} onValueChange={handleTokenBChange}>
            <SelectTrigger className="bg-secondary border-border">
              <SelectValue placeholder="Select Token B" />
            </SelectTrigger>
            <SelectContent>
              {SUPPORTED_TOKENS.map((token) => (
                <SelectItem key={token.address} value={token.address}>
                  {token.symbol}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Token Approvals */}
      {isConnected && tokenA && tokenB && (
        <div className="grid grid-cols-2 gap-4">
          {tokenA && (
            <div>
              <TokenApproval 
                tokenAddress={tokenA}
                spenderAddress={SIMPLESWAP_ADDRESS}
                amount={amountA ? parseEther(amountA) : 0n}
                onSuccess={handleTokenAApprovalSuccess}
                onError={(error) => console.error('Token A approval error:', error)}
                isApproved={isTokenAApproved}
                className="w-full"
              />
              <div className="text-sm text-muted-foreground mt-1">
                {SUPPORTED_TOKENS.find(t => t.address === tokenA)?.symbol} Approval
              </div>
            </div>
          )}
          {tokenB && (
            <div>
              <TokenApproval 
                tokenAddress={tokenB}
                spenderAddress={SIMPLESWAP_ADDRESS}
                amount={amountB ? parseEther(amountB) : 0n}
                onSuccess={handleTokenBApprovalSuccess}
                onError={(error) => console.error('Token B approval error:', error)}
                isApproved={isTokenBApproved}
                className="w-full"
              />
              <div className="text-sm text-muted-foreground mt-1">
                {SUPPORTED_TOKENS.find(t => t.address === tokenB)?.symbol} Approval
              </div>
            </div>
          )}
        </div>
      )}

      {/* Pool Information */}
      {reserves && (
        <Card className="bg-card border border-border">
          <CardHeader>
            <CardTitle className="text-lg text-foreground flex items-center gap-2">
              <div className="w-2 h-2 bg-primary rounded-full"></div>
              Pool Statistics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="bg-background p-3 rounded-lg border border-border">
                <span className="text-muted-foreground">Reserve A:</span>
                <div className="font-semibold text-foreground text-lg">
                  {reserves ? formatEther(reserves.reserveA) : '0'}
                </div>
              </div>
              <div className="bg-background p-3 rounded-lg border border-border">
                <span className="text-muted-foreground">Reserve B:</span>
                <div className="font-semibold text-foreground text-lg">
                  {reserves ? formatEther(reserves.reserveB) : '0'}
                </div>
              </div>
            </div>
            {userLiquidity && (
              <div className="mt-4 pt-4 border-t border-border">
                <div className="bg-primary/10 p-3 rounded-lg border border-primary/20">
                  <span className="text-muted-foreground">Your Liquidity:</span>
                  <div className="font-semibold text-primary text-lg">
                    {userLiquidity !== undefined ? formatEther(userLiquidity) : '0'}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="add" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-card border border-border">
          <TabsTrigger
            value="add"
            className="flex items-center gap-2 data-[state=active]:!bg-[#00ADB5] data-[state=active]:!text-white data-[state=active]:!border-[#00ADB5] data-[state=active]:!border"
          >
            <Plus className="w-4 h-4" />
            Add Liquidity
          </TabsTrigger>
          <TabsTrigger
            value="remove"
            className="flex items-center gap-2 data-[state=active]:bg-destructive data-[state=active]:text-destructive-foreground"
          >
            <Minus className="w-4 h-4" />
            Remove Liquidity
          </TabsTrigger>
        </TabsList>

        <TabsContent value="add" className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount-a" className="text-muted-foreground">
                Amount A
              </Label>
              <Input
                id="amount-a"
                type="number"
                min="0"
                step="0.000001"
                placeholder="0.0"
                value={amountA}
                              onChange={(e) => {
                const value = e.target.value;
                // Only allow positive numbers
                if (value === '' || (parseFloat(value) >= 0 && !isNaN(parseFloat(value)))) {
                  setAmountA(value);
                }
              }}
                className="bg-background border-border focus:border-primary transition-colors"
              />
              {tokenA && (
                <div className="text-sm text-muted-foreground">
                  Balance: {tokenBalanceA ? formatEther(tokenBalanceA) : '0.0'} {SUPPORTED_TOKENS.find(t => t.address === tokenA)?.symbol}
                  {amountA && tokenBalanceA && parseEther(amountA) > tokenBalanceA && (
                    <div className="text-red-500 text-xs mt-1">
                      ⚠️ Amount exceeds balance
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount-b" className="text-muted-foreground">
                Amount B
              </Label>
              <Input
                id="amount-b"
                type="number"
                min="0"
                step="0.000001"
                placeholder="0.0"
                value={amountB}
                              onChange={(e) => {
                const value = e.target.value;
                // Only allow positive numbers
                if (value === '' || (parseFloat(value) >= 0 && !isNaN(parseFloat(value)))) {
                  setAmountB(value);
                }
              }}
                className="bg-secondary border-border"
              />
              {tokenB && (
                <div className="text-sm text-muted-foreground">
                  Balance: {tokenBalanceB ? formatEther(tokenBalanceB) : '0.0'} {SUPPORTED_TOKENS.find(t => t.address === tokenB)?.symbol}
                  {amountB && tokenBalanceB && parseEther(amountB) > tokenBalanceB && (
                    <div className="text-red-500 text-xs mt-1">
                      ⚠️ Amount exceeds balance
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <Button
            onClick={handleAddLiquidity}
            disabled={
              !isConnected || 
              !tokenA || 
              !tokenB || 
              !amountA || 
              !amountB || 
              isLoading || 
              needsApproval.tokenA || 
              needsApproval.tokenB ||
              Boolean(tokenBalanceA && amountA && parseEther(amountA) > tokenBalanceA) ||
              Boolean(tokenBalanceB && amountB && parseEther(amountB) > tokenBalanceB)
            }
            className="w-full shadow-lg hover:shadow-primary/25 transition-all duration-200"
            size="lg"
            style={{
              background: '#00ADB5',
              border: '1px solid #00ADB5',
              color: '#fff'
            }}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Adding Liquidity...
              </>
            ) : needsApproval.tokenA || needsApproval.tokenB ? (
              "Approve Tokens First"
            ) : (
              "Add Liquidity"
            )}
          </Button>
        </TabsContent>

        <TabsContent value="remove" className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="liquidity-amount" className="text-muted-foreground">
              Liquidity Amount
            </Label>
            <Input
              id="liquidity-amount"
              type="number"
              min="0"
              step="0.000001"
              placeholder="0.0"
              value={liquidityAmount}
              onChange={(e) => {
                const value = e.target.value;
                // Only allow positive numbers
                if (value === '' || (parseFloat(value) >= 0 && !isNaN(parseFloat(value)))) {
                  setLiquidityAmount(value);
                }
              }}
              className="bg-secondary border-border"
            />
            {userLiquidity && <p className="text-sm text-muted-foreground">Available: {formatEther(userLiquidity)}</p>}
          </div>

          <Button
            onClick={handleRemoveLiquidity}
            disabled={
              !isConnected || 
              !tokenA || 
              !tokenB || 
              !liquidityAmount || 
              isLoading ||
              Boolean(userLiquidity && liquidityAmount && parseEther(liquidityAmount) > userLiquidity)
            }
            className="w-full bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Removing Liquidity...
              </>
            ) : (
              "Remove Liquidity"
            )}
          </Button>
        </TabsContent>
      </Tabs>
    </div>
  )
}