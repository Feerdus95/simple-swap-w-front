"use client"

import { useEffect, useState } from 'react'
import { useAccount, useDisconnect } from 'wagmi'
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Wallet, CheckCircle, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"

declare global {
  interface Window {
    ethereum?: {
      isMetaMask?: boolean
      request: (request: { method: string; params?: any[] }) => Promise<any>
      on: (event: string, handler: (...args: any[]) => void) => void
      removeListener: (event: string, handler: (...args: any[]) => void) => void
    }
  }
}

export function WalletConnect() {
  const [isMounted, setIsMounted] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const { isConnected, address, chain } = useAccount()
  const { disconnect } = useDisconnect()

  useEffect(() => {
    setIsMounted(true)
    return () => {
      // Cleanup
      setIsMounted(false)
    }
  }, [])

  const handleConnect = async () => {
    if (typeof window.ethereum === 'undefined') {
      window.open('https://metamask.io/download.html', '_blank')
      return
    }

    try {
      setConnectionError(null)
      setIsConnecting(true)
      
      // Request account access
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      })
      
      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found')
      }
      
      console.log('Connected:', accounts[0])
    } catch (error) {
      console.error('Failed to connect to MetaMask:', error)
      setConnectionError(
        error instanceof Error ? error.message : 'Failed to connect to MetaMask'
      )
    } finally {
      if (isMounted) {
        setIsConnecting(false)
      }
    }
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {!isConnected ? (
        <div className="flex flex-col items-center gap-2">
          <Button 
            onClick={handleConnect}
            disabled={isConnecting}
            className="bg-primary hover:bg-primary/90 text-white w-full"
          >
            {isConnecting ? 'Connecting...' : 'Connect MetaMask'}
          </Button>
          
          {connectionError && (
            <div className="text-red-500 text-sm text-center">
              {connectionError}
            </div>
          )}
          
          {!window.ethereum && (
            <div className="text-sm text-muted-foreground text-center">
              Don't have MetaMask?{' '}
              <a 
                href="https://metamask.io/download.html" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                Install it here
              </a>
            </div>
          )}
        </div>
      ) : (
        <Card className="w-full max-w-md bg-card border border-border">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium text-foreground">Connected</span>
              </div>
              <CheckCircle className="w-4 h-4 text-primary" />
            </div>

            <div className="mt-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Address:</span>
                <span className="font-mono text-xs text-foreground">
                  {address?.slice(0, 6)}...{address?.slice(-4)}
                </span>
              </div>

              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Network:</span>
                <Badge variant="outline" className="border-primary text-primary bg-primary/10">
                  {chain?.name || "Unknown"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {connectionError && (
        <div className="text-red-500 text-sm mt-2">
          {connectionError}
        </div>
      )}
      
      {isConnected && (
        <Button 
          variant="outline" 
          onClick={() => disconnect()}
          className="text-destructive border-destructive hover:bg-destructive/10"
        >
          Disconnect
        </Button>
      )}
    </div>
  )
}
