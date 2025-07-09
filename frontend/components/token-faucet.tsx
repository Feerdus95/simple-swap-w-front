"use client"

import { useState } from "react"
import { useAccount, useWriteContract } from "wagmi"
import { parseEther } from "viem"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Loader2, Coins } from "lucide-react"
import { toast } from "sonner"
import { SUPPORTED_TOKENS } from "@/lib/constants"

// ERC20 ABI for mint function
const ERC20_MINT_ABI = [
  {
    constant: false,
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" }
    ],
    name: "mint",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  },
  {
    constant: false,
    inputs: [
      { name: "amount", type: "uint256" }
    ],
    name: "faucet",
    outputs: [],
    payable: false,
    stateMutability: "nonpayable",
    type: "function"
  }
] as const

export function TokenFaucet() {
  const [isLoading, setIsLoading] = useState(false)
  const { isConnected, address } = useAccount()
  const { writeContract } = useWriteContract()

  const handleMintToken = async (tokenAddress: string, symbol: string, amount: string) => {
    if (!isConnected || !address) {
      toast.error("Please connect your wallet first")
      return
    }

    setIsLoading(true)
    try {
      console.log(`Minting ${amount} ${symbol} to ${address}`)
      
      await writeContract({
        address: tokenAddress as `0x${string}`,
        abi: ERC20_MINT_ABI,
        functionName: "mint",
        args: [address, parseEther(amount)],
      })

      toast.success(`Successfully minted ${amount} ${symbol}!`)
    } catch (error: any) {
      console.error(`Failed to mint ${symbol}:`, error)
      
      // Try faucet function as fallback
      try {
        console.log(`Trying faucet function for ${symbol}`)
        await writeContract({
          address: tokenAddress as `0x${string}`,
          abi: ERC20_MINT_ABI,
          functionName: "faucet",
          args: [parseEther(amount)],
        })
        toast.success(`Successfully obtained ${amount} ${symbol} via faucet!`)
      } catch (faucetError: any) {
        console.error(`Faucet also failed for ${symbol}:`, faucetError)
        toast.error(`Failed to get ${symbol}: ${faucetError.message || "Unknown error"}`)
      }
    } finally {
      setIsLoading(false)
    }
  }

  if (!isConnected) {
    return (
      <Card className="bg-card border border-border">
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            <Coins className="w-8 h-8 mx-auto mb-2" />
            <p>Connect your wallet to get test tokens</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="bg-card border border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Coins className="w-5 h-5" />
          Test Token Faucet
        </CardTitle>
        <CardDescription>
          Get free test tokens to try the DEX functionality
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          {SUPPORTED_TOKENS.map((token) => (
            <div key={token.address} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium">{token.symbol}</span>
                <Badge variant="outline" className="text-xs">
                  {token.decimals} decimals
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground break-all">
                {token.address}
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => handleMintToken(token.address, token.symbol, "10")}
                  disabled={isLoading}
                  className="flex-1"
                  style={{
                    background: '#00ADB5',
                    border: '1px solid #00ADB5',
                    color: '#fff'
                  }}
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Get 10"
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleMintToken(token.address, token.symbol, "100")}
                  disabled={isLoading}
                  className="flex-1"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Get 100"
                  )}
                </Button>
              </div>
            </div>
          ))}
        </div>
        
        <div className="text-xs text-muted-foreground bg-background p-3 rounded-lg border border-border">
          <p className="font-medium mb-1">💡 How to use:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Get test tokens using the buttons above</li>
            <li>Go to "Liquidity" tab and add liquidity to create a pool</li>
            <li>Then you can swap tokens in the "Swap" tab</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  )
} 