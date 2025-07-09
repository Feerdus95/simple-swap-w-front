"use client"

import { useEffect, useState } from "react"
import { createConfig, http, WagmiProvider } from 'wagmi'
import { sepolia } from 'wagmi/chains'
import { metaMask } from 'wagmi/connectors'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { usePathname, useSearchParams } from 'next/navigation'
import { Toaster } from 'sonner'

// Environment variables with fallbacks
const INFURA_API_KEY = process.env.NEXT_PUBLIC_INFURA_API_KEY

if (!INFURA_API_KEY) {
  console.warn('NEXT_PUBLIC_INFURA_API_KEY is not set. Some features may not work correctly.')
}

// Configure the RPC URL
const rpcUrl = INFURA_API_KEY 
  ? `https://sepolia.infura.io/v3/${INFURA_API_KEY}`
  : 'https://rpc.sepolia.org';

// Set up wagmi config
export const config = createConfig({
  chains: [sepolia],
  connectors: [
    metaMask({
      dappMetadata: {
        name: 'SimpleSwap',
        url: typeof window !== 'undefined' ? window.location.origin : ''
      },
      // Disable analytics
      enableAnalytics: false
    })
  ],
  transports: {
    [sepolia.id]: http(rpcUrl, {
      // Add retry logic for failed requests
      retryCount: 3,
      retryDelay: 1000,
    }),
  },
  ssr: true, // Enable server-side rendering
  batch: { multicall: true },
  // Add polling for account/chain changes
  pollingInterval: 5_000,
})

// Create a client with default options
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 60 * 1000, // 1 minute
    },
  },
})

// Component to handle route changes and scroll to top
export function RouteChangeHandler({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  
  useEffect(() => {
    // Scroll to top on route change
    window.scrollTo(0, 0)
  }, [pathname, searchParams])
  
  return <>{children}</>
}

// Check if the code is running on the client side
const isClient = typeof window !== 'undefined'

// Simple MetaMask detection
function isMetaMaskInstalled() {
  if (!isClient) return false
  return Boolean(window.ethereum?.isMetaMask)
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false)
  const [showInstallMetaMask, setShowInstallMetaMask] = useState(false)
  
  // Check for MetaMask on mount
  useEffect(() => {
    setMounted(true)
    if (isClient && !isMetaMaskInstalled()) {
      setShowInstallMetaMask(true)
    }
  }, [])
  
  // Don't render anything until we're on the client
  if (!mounted) {
    return null
  }
  
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {showInstallMetaMask ? (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-card p-6 rounded-lg shadow-lg max-w-md w-full">
              <h2 className="text-xl font-bold mb-4">MetaMask Required</h2>
              <p className="mb-6">Please install MetaMask to use this application.</p>
              <a
                href="https://metamask.io/download/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
              >
                Install MetaMask
              </a>
            </div>
          </div>
        ) : (
          <RouteChangeHandler>
            {children}
            <Toaster position="top-right" richColors />
          </RouteChangeHandler>
        )}
      </QueryClientProvider>
    </WagmiProvider>
  )
}
