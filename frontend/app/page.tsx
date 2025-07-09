"use client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { WalletConnect } from "@/components/wallet-connect"
import { SwapInterface } from "@/components/swap-interface"
import { LiquidityInterface } from "@/components/liquidity-interface"
import { PriceDisplay } from "@/components/price-display"
import { TokenFaucet } from "@/components/token-faucet"
import { Providers } from "@/components/providers"
import { ArrowLeftRight, Droplets, TrendingUp, Coins } from "lucide-react"

export default function Home() {
  return (
    <Providers>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-foreground mb-2">
              Simple<span className="text-primary">Swap</span>
            </h1>
            <p className="text-lg text-muted-foreground mb-6">Decentralized Exchange on Ethereum Sepolia</p>
            <WalletConnect />
          </div>

          {/* Main Interface */}
          <div className="max-w-2xl mx-auto">
            <Tabs defaultValue="swap" className="w-full">
              <TabsList className="grid w-full grid-cols-4 mb-6 bg-card border border-border">
                <TabsTrigger
                  value="swap"
                  className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-200"
                >
                  <ArrowLeftRight className="w-4 h-4" />
                  Swap
                </TabsTrigger>
                <TabsTrigger
                  value="liquidity"
                  className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-200"
                >
                  <Droplets className="w-4 h-4" />
                  Liquidity
                </TabsTrigger>
                <TabsTrigger
                  value="prices"
                  className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-200"
                >
                  <TrendingUp className="w-4 h-4" />
                  Prices
                </TabsTrigger>
                <TabsTrigger
                  value="faucet"
                  className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all duration-200"
                >
                  <Coins className="w-4 h-4" />
                  Faucet
                </TabsTrigger>
              </TabsList>

              <TabsContent value="swap">
                <Card className="bg-card border border-border shadow-xl">
                  <CardHeader className="border-b border-border">
                    <CardTitle className="text-foreground">Swap Tokens</CardTitle>
                    <CardDescription className="text-muted-foreground">
                      Trade tokens instantly with our automated market maker
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-6">
                    <SwapInterface />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="liquidity">
                <Card className="bg-card border border-border shadow-xl">
                  <CardHeader className="border-b border-border">
                    <CardTitle className="text-foreground">Liquidity Pools</CardTitle>
                    <CardDescription className="text-muted-foreground">
                      Provide liquidity and earn fees from trades
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-6">
                    <LiquidityInterface />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="prices">
                <Card className="bg-card border border-border shadow-xl">
                  <CardHeader className="border-b border-border">
                    <CardTitle className="text-foreground">Market Data</CardTitle>
                    <CardDescription className="text-muted-foreground">
                      View real-time prices and pool statistics
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-6">
                    <PriceDisplay />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="faucet">
                <Card className="bg-card border border-border shadow-xl">
                  <CardHeader className="border-b border-border">
                    <CardTitle className="text-foreground">Test Token Faucet</CardTitle>
                    <CardDescription className="text-muted-foreground">
                      Get free test tokens to try the DEX functionality
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-6">
                    <TokenFaucet />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </Providers>
  )
}
