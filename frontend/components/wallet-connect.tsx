"use client"

import { useEffect, useState } from 'react'
import { useAccount, useDisconnect } from 'wagmi'
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Wallet, CheckCircle, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
} from "@/components/ui/dropdown-menu"

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
    <div className="flex items-center gap-4">
      {!isConnected ? (
        <Button 
          onClick={handleConnect}
          disabled={isConnecting}
          className="bg-primary hover:bg-primary/90 text-white"
        >
          {isConnecting ? 'Connecting...' : 'Connect MetaMask'}
        </Button>
      ) : (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="relative cursor-pointer">
              <Avatar>
                <AvatarFallback>
                  {/* Avatar genérico, puede ser iniciales o ícono */}
                  <span className="text-lg font-bold">W</span>
                </AvatarFallback>
              </Avatar>
              <span className="absolute bottom-0 right-0 block h-3 w-3 rounded-full ring-2 ring-background bg-green-500" />
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 p-4 bg-card rounded-xl border border-border shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5" style={{ color: '#00ADB5' }} />
                <span className="text-base font-semibold text-foreground">Connected</span>
              </div>
              <CheckCircle className="w-5 h-5" style={{ color: '#00ADB5' }} />
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-foreground">Address:</span>
              <span className="font-mono text-sm text-foreground">{address?.slice(0, 6)}...{address?.slice(-4)}</span>
            </div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-foreground">Network:</span>
              <span
                className="px-3 py-1 rounded-full text-xs"
                style={{
                  border: '1px solid #00ADB5',
                  color: '#00ADB5',
                  background: 'rgba(0, 173, 181, 0.10)'
                }}
              >
                Sepolia
              </span>
            </div>
            <Button 
              variant="outline" 
              onClick={() => disconnect()}
              className="mt-4 w-full text-destructive border-destructive hover:bg-destructive/10"
            >
              Disconnect
            </Button>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  )
}
