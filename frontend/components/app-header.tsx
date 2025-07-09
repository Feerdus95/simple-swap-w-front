'use client'

import { ThemeToggle } from './theme-toggle'
import { WalletConnect } from './wallet-connect'

export function AppHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="relative flex items-center justify-between w-full h-20 px-4">
        {/* Espacio izquierdo para balancear */}
        <div className="w-20" />
        {/* Centro absolutamente centrado */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center text-center">
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
            Simple<span style={{ color: '#00ADB5' }}>Swap</span>
          </h1>
          <p className="text-sm md:text-base text-muted-foreground mt-1">Decentralized Exchange on Ethereum Sepolia</p>
        </div>
        {/* Derecha: botones SIEMPRE visibles */}
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <WalletConnect />
        </div>
      </div>
    </header>
  )
}
