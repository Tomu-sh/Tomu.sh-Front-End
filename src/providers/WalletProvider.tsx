import { ReactNode } from 'react'
import '@rainbow-me/rainbowkit/styles.css'
import { getDefaultConfig, RainbowKitProvider } from '@rainbow-me/rainbowkit'
import { WagmiProvider } from 'wagmi'
import { mainnet, polygon, polygonAmoy } from 'wagmi/chains'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

// Create the wagmi config with RainbowKit's helper
const config = getDefaultConfig({
  appName: 'Tomu AI Generator',
  // Use environment variable or fallback to a placeholder
  // You need to get a project ID from https://cloud.walletconnect.com
  projectId:
    import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'PLEASE_ADD_PROJECT_ID',
  chains: [polygon, polygonAmoy, mainnet],
  ssr: true, // Enable server-side rendering support
})

// Create a query client
const queryClient = new QueryClient()

interface WalletProviderProps {
  children: ReactNode
}

export function WalletProvider({ children }: WalletProviderProps) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <RainbowKitProvider>{children}</RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  )
}
