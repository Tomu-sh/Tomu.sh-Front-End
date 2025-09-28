import { createRoot } from 'react-dom/client'
import { ConvexAuthProvider } from '@convex-dev/auth/react'
import { ConvexReactClient } from 'convex/react'
import './index.css'
import AppRouter from './router/AppRouter'
import { Toaster } from 'sonner'
import { WalletProvider } from './providers/WalletProvider'

const convex = new ConvexReactClient(import.meta.env.VITE_CONVEX_URL as string)

createRoot(document.getElementById('root')!).render(
  <ConvexAuthProvider client={convex}>
    <WalletProvider>
      <AppRouter />
      <Toaster richColors theme='system' position='top-right' closeButton />
    </WalletProvider>
  </ConvexAuthProvider>
)
