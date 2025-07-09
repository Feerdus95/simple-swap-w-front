"use client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { motion } from "framer-motion"
import { ArrowLeftRight, Droplets, TrendingUp, Coins } from "lucide-react"
import { useState } from "react"
import { Providers } from "@/components/providers"
import { SwapInterface } from "@/components/swap-interface"
import { LiquidityInterface } from "@/components/liquidity-interface"
import { PriceDisplay } from "@/components/price-display"
import { TokenFaucet } from "@/components/token-faucet"

const navItems = [
  {
    label: "Swap",
    icon: <ArrowLeftRight className="w-5 h-5" />,
    gradient: "radial-gradient(circle, rgba(16,185,129,0.15) 0%, rgba(5,150,105,0.06) 50%, rgba(4,120,87,0) 100%)",
    iconColor: "text-emerald-500",
    value: "swap",
  },
  {
    label: "Liquidity",
    icon: <Droplets className="w-5 h-5" />,
    gradient: "radial-gradient(circle, rgba(59,130,246,0.15) 0%, rgba(37,99,235,0.06) 50%, rgba(29,78,216,0) 100%)",
    iconColor: "text-blue-500",
    value: "liquidity",
  },
  {
    label: "Prices",
    icon: <TrendingUp className="w-5 h-5" />,
    gradient: "radial-gradient(circle, rgba(251,191,36,0.15) 0%, rgba(202,138,4,0.06) 50%, rgba(161,98,7,0) 100%)",
    iconColor: "text-yellow-500",
    value: "prices",
  },
  {
    label: "Faucet",
    icon: <Coins className="w-5 h-5" />,
    gradient: "radial-gradient(circle, rgba(236,72,153,0.15) 0%, rgba(219,39,119,0.06) 50%, rgba(190,24,93,0) 100%)",
    iconColor: "text-pink-500",
    value: "faucet",
  },
]

function AnimatedNavBar({ active, setActive }: { active: string, setActive: (v: string) => void }) {
  return (
    <motion.nav
      className="p-2 rounded-2xl bg-card border border-border/40 shadow-lg relative overflow-hidden mb-8"
      initial="initial"
      whileHover="hover"
    >
      <ul className="flex items-center gap-2 justify-evenly w-full relative z-10">
        {navItems.map((item) => (
          <motion.li key={item.value} className="relative">
            <motion.button
              type="button"
              onClick={() => setActive(item.value)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-colors duration-300 group relative z-10 bg-transparent text-foreground group-hover:text-foreground focus:outline-none ${active === item.value ? 'bg-accent text-foreground font-semibold' : ''}`}
              style={{ position: 'relative', zIndex: 2 }}
            >
              <span className={`transition-colors duration-300 ${item.iconColor} text-foreground group-hover:${item.iconColor}`}>{item.icon}</span>
              <span>{item.label}</span>
            </motion.button>
            {active === item.value && (
              <motion.div
                layoutId="nav-underline"
                className="absolute inset-0 rounded-xl pointer-events-none"
                style={{ background: item.gradient, zIndex: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
            )}
          </motion.li>
        ))}
      </ul>
    </motion.nav>
  )
}

export default function Home() {
  const [activeTab, setActiveTab] = useState("swap")
  return (
    <Providers>
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          {/* Header eliminado, ya está en el layout global */}

          {/* Main Interface */}
          <div className="max-w-2xl mx-auto">
            <AnimatedNavBar active={activeTab} setActive={setActiveTab} />
            {activeTab === "swap" && (
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
            )}
            {activeTab === "liquidity" && (
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
            )}
            {activeTab === "prices" && (
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
            )}
            {activeTab === "faucet" && (
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
            )}
          </div>
        </div>
      </div>
    </Providers>
  )
}
