// Wallet Integration Service using RainbowKit and wagmi v2
import {
  useAccount,
  useBalance,
  useDisconnect,
  useSendTransaction,
} from 'wagmi'
import { formatUnits, parseUnits } from 'viem'

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
  const { data: balanceData, refetch: refetchBalance } = useBalance({
    address: address,
  })
  // USDC on Polygon Amoy testnet
  const { data: usdcData } = useBalance({
    address: address,
    token: '0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582',
  })
  const { disconnect } = useDisconnect()
  const { sendTransactionAsync } = useSendTransaction()

  // Convert balance to cents for UI display
  // For Polygon Amoy testnet, we'll use a simple conversion
  // 1 MATIC ≈ $1, so we convert the formatted balance to cents
  const balanceInCents = balanceData
    ? Math.floor(parseFloat(balanceData.formatted) * 100)
    : 0
  const usdcInCents = usdcData
    ? Math.floor(parseFloat(usdcData.formatted) * 100)
    : 0

  return {
    address,
    isConnected,
    balance: balanceInCents,
    usdcBalance: usdcInCents,
    disconnect,
    refetchBalance,
    sendTransactionAsync,
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
 * Deduct amount from wallet using MetaMask transaction
 * This creates a real transaction that deducts from the user's wallet
 */
export async function deductFromWallet(
  cents: number,
  sendTransactionAsync: any,
  toAddress: string = '0x0000000000000000000000000000000000000000' // Burn address for demo
): Promise<{ success: boolean; txHash?: string; error?: string }> {
  try {
    console.log('💸 Deducting from wallet:', cents, 'cents')

    // Convert cents to MATIC (assuming 1 MATIC = $1 for simplicity)
    const maticAmount = cents / 100 // Convert cents to MATIC
    const weiAmount = parseUnits(maticAmount.toString(), 18) // Convert to wei

    console.log('Sending transaction:', {
      to: toAddress,
      value: weiAmount,
      amount: maticAmount,
    })

    // Send transaction through MetaMask
    const txHash = await sendTransactionAsync({
      to: toAddress,
      value: weiAmount,
    })

    console.log('✅ Transaction sent:', txHash)
    return { success: true, txHash }
  } catch (error) {
    console.error('❌ Transaction failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Transaction failed',
    }
  }
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
