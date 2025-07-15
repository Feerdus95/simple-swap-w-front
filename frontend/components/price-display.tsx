"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { useReadContract } from "wagmi"
import { formatEther, type Address } from "viem"
import { SIMPLESWAP_ABI, SIMPLESWAP_ADDRESS, SUPPORTED_TOKENS } from "@/lib/constants"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"

export function PriceDisplay() {
  const [tokenA, setTokenA] = useState("")
  const [tokenB, setTokenB] = useState("")

  // Get pool reserves
  const { data: reserves } = useReadContract({
    address: SIMPLESWAP_ADDRESS,
    abi: SIMPLESWAP_ABI,
    functionName: "getReserves",
    args: tokenA && tokenB ? [tokenA as Address, tokenB as Address] : undefined,
    query: {
      enabled: !!(tokenA && tokenB),
    },
  })

  // Prepare arguments for getAmountOut (always 1 unit, 18 decimales)
  const parsedAmountIn = reserves && tokenA && tokenB ? BigInt(1e18) : undefined;
  const getAmountOutArgs = tokenA && tokenB && reserves && parsedAmountIn && parsedAmountIn > 0n
    ? [parsedAmountIn, reserves[0], reserves[1]] as const
    : undefined;

  // Get expected output amount for 1 unit
  const { data: expectedOutput } = useReadContract({
    address: SIMPLESWAP_ADDRESS,
    abi: SIMPLESWAP_ABI,
    functionName: "getAmountOut",
    args: getAmountOutArgs,
    query: {
      enabled: !!getAmountOutArgs,
    },
  })

  const getTokenSymbol = (address: string) => {
    return SUPPORTED_TOKENS.find((token) => token.address === address)?.symbol || "Unknown"
  }

  const formatPrice = (priceValue: bigint) => {
    const formatted = formatEther(priceValue)
    return Number.parseFloat(formatted).toFixed(6)
  }

  return (
    <div className="space-y-6">
      {/* Token Pair Selection */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label className="text-muted-foreground">Base Token</Label>
          <Select value={tokenA} onValueChange={setTokenA}>
            <SelectTrigger className="bg-secondary border-border">
              <SelectValue placeholder="Select Base Token" />
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
          <Label className="text-muted-foreground">Quote Token</Label>
          <Select value={tokenB} onValueChange={setTokenB}>
            <SelectTrigger className="bg-secondary border-border">
              <SelectValue placeholder="Select Quote Token" />
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

      {/* Price Information */}
      {tokenA && tokenB && (
        <div className="grid gap-4">
          {/* Current Price using getAmountOut */}
          <Card className="bg-card border border-border">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-foreground">
                <span>Current Price</span>
                <Badge
                  variant="outline"
                  className=""
                  style={{
                    border: '1px solid #00ADB5',
                    color: '#00ADB5',
                    background: 'rgba(0, 173, 181, 0.10)'
                  }}
                >
                  {getTokenSymbol(tokenA)}/{getTokenSymbol(tokenB)}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {expectedOutput !== undefined ? (
                <div className="text-center">
                  <div className="text-4xl font-bold mb-2" style={{ color: '#00ADB5' }}>{Number(formatEther(expectedOutput)).toLocaleString()}</div>
                  <span className="text-lg text-muted-foreground">{getTokenSymbol(tokenB)}</span>
                  <div className="text-sm text-muted-foreground mt-2">
                    This is the actual output you would receive for swapping 1 {getTokenSymbol(tokenA)} to {getTokenSymbol(tokenB)}, including the 0.3% fee.
                  </div>
                </div>
              ) : (
                <div className="text-center text-muted-foreground">
                  <Minus className="w-8 h-8 mx-auto mb-2" />
                  <p>Pool not found or no liquidity</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Pool Reserves */}
          {reserves && Array.isArray(reserves) && reserves.length >= 2 ? (
            <Card className="bg-card border border-border">
              <CardHeader>
                <CardTitle className="text-foreground">Pool Reserves</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center bg-background p-4 rounded-lg border border-border">
                    <div className="text-2xl font-semibold" style={{ color: '#00ADB5' }}>
                      {Number.parseFloat(formatEther(reserves[0] as bigint)).toLocaleString()}
                    </div>
                    <div className="text-sm text-muted-foreground">{getTokenSymbol(tokenA)}</div>
                  </div>
                  <div className="text-center bg-background p-4 rounded-lg border border-border">
                    <div className="text-2xl font-semibold" style={{ color: '#00ADB5' }}>
                      {Number.parseFloat(formatEther(reserves[1] as bigint)).toLocaleString()}
                    </div>
                    <div className="text-sm text-muted-foreground">{getTokenSymbol(tokenB)}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {/* Trading Stats */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="bg-card border border-border hover:border-primary/50 transition-colors">
              <CardContent className="pt-6">
                <div className="text-center">
                  <TrendingUp className="w-8 h-8 mx-auto mb-2" style={{ color: '#00ADB5' }} />
                  <div className="text-sm text-muted-foreground">24h High</div>
                  <div className="text-lg font-semibold text-foreground">-</div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border border-border hover:border-destructive/50 transition-colors">
              <CardContent className="pt-6">
                <div className="text-center">
                  <TrendingDown className="w-8 h-8 mx-auto mb-2 text-destructive" />
                  <div className="text-sm text-muted-foreground">24h Low</div>
                  <div className="text-lg font-semibold text-foreground">-</div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card border border-border hover:border-primary/50 transition-colors">
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="w-8 h-8 mx-auto mb-2 rounded-full flex items-center justify-center" style={{ background: 'rgba(0, 173, 181, 0.20)' }}>
                    <span style={{ color: '#00ADB5' }} className="font-bold">%</span>
                  </div>
                  <div className="text-sm text-muted-foreground">24h Change</div>
                  <div className="text-lg font-semibold text-foreground">-</div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {!tokenA || !tokenB ? (
        <Card className="bg-card border-border">
          <CardContent className="pt-6">
            <div className="text-center text-muted-foreground">
              <p>Select both tokens to view price information</p>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}