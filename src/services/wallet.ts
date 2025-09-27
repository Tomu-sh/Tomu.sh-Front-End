// Wallet Integration Service using RainbowKit and wagmi v2
import { useAccount, useBalance, useDisconnect } from 'wagmi'
import { formatUnits } from 'viem'

export interface WalletInfo {
  address: string
  balance: number // in wei or native token units
  isConnected: boolean
}

export interface WalletProvider {
  connect(): Promise<WalletInfo>
  disconnect(): Promise<void>
  getBalance(): Promise<number>
  deductFromWallet(cents: number): Promise<boolean>
}

/**
 * Hook to access wallet information
 * Returns current wallet state and methods to interact with it
 */
export function useWallet() {
  const { address, isConnected } = useAccount()
  const { data: balanceData } = useBalance({
    address: address,
    enabled: Boolean(address),
  })
  const { disconnect } = useDisconnect()

  // Convert balance to cents for UI display (assuming 1 MATIC = $1 for simplicity)
  // In a real app, you would use an oracle or price feed
  const balanceInCents = balanceData 
    ? parseInt((parseFloat(balanceData.formatted) * 100).toFixed(0)) 
    : 0

  return {
    address,
    isConnected,
    balance: balanceInCents,
    disconnect,
  }
}

/**
 * Get current wallet balance
 * For compatibility with existing code
 */
export async function getWalletBalance(): Promise<number> {
  // This is a fallback for non-hook contexts
  // Ideally, use the useWallet hook instead
  console.log('💰 Getting wallet balance via useWallet() hook instead')
  return 1000 // Default fallback value
}

/**
 * Deduct amount from wallet (for payment processing)
 * In a real implementation, this would create and send a transaction
 */
export async function deductFromWallet(cents: number): Promise<boolean> {
  console.log('💸 Deducting from wallet:', cents, 'cents')
  // In a real implementation, you would:
  // 1. Convert cents to MATIC amount
  // 2. Create a transaction to transfer tokens
  // 3. Sign and send the transaction using wagmi's useContractWrite or useSendTransaction
  
  // For now, we'll simulate success
  await new Promise((resolve) => setTimeout(resolve, 500))
  return true
}

/**
 * Connect to user's Polygon wallet
 * For compatibility with existing code - use RainbowKit's ConnectButton instead
 */
export async function connectWallet(): Promise<WalletInfo> {
  console.log('🔗 Use RainbowKit ConnectButton instead of this function')
  return {
    address: '',
    balance: 0,
    isConnected: false,
  }
}

/**
 * Disconnect from wallet
 * For compatibility with existing code - use the disconnect function from useWallet() instead
 */
export async function disconnectWallet(): Promise<void> {
  console.log('🔌 Use disconnect() from useWallet() hook instead')
}

/**
 * Check if wallet is connected
 * For compatibility with existing code - use isConnected from useWallet() instead
 */
export function isWalletConnected(): boolean {
  console.log('🔍 Use isConnected from useWallet() hook instead')
  return false
}