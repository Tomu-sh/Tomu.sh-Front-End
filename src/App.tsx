import {
  Authenticated,
  Unauthenticated,
  useQuery,
  useMutation,
} from 'convex/react'
import { api } from '../convex/_generated/api'
import { SignInForm } from './SignInForm'
import { SignOutButton } from './SignOutButton'
import { Toaster, toast } from 'sonner'
import { useState, useEffect } from 'react'
import ThemeToggle from './lib/ThemeToggle'
import { WalletButton } from './components/WalletButton'

// Import integration services
import { getCostEstimate, payWithX402, type X402Quote } from './services/x402'
import { useWallet, deductFromWallet } from './services/wallet'
import {
  logTransaction,
  updateTransactionStatus,
} from './services/transactions'

export default function App() {
  return (
    <div className='min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950 text-gray-900 dark:text-gray-100'>
      <header className='sticky top-0 z-10 bg-white/70 dark:bg-gray-950/60 backdrop-blur supports-[backdrop-filter]:bg-white/50 dark:supports-[backdrop-filter]:bg-gray-950/40 h-16 flex justify-between items-center border-b border-gray-200 dark:border-gray-800 shadow-sm px-4'>
        <h2 className='text-xl font-semibold tracking-tight'>Tomu Gen App</h2>
        <div className='flex items-center gap-3'>
          <ThemeToggle />
          <Authenticated>
            <WalletButton />
          </Authenticated>
          <SignOutButton />
        </div>
      </header>
      <main className='flex-1 flex items-center justify-center p-6 sm:p-8'>
        <div className='w-full max-w-3xl mx-auto'>
          <Content />
        </div>
      </main>
      <Toaster richColors theme='system' position='top-right' closeButton />
    </div>
  )
}

function WalletBalance() {
  const { balance, isConnected } = useWallet()

  if (!isConnected) {
    return (
      <div className='bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-lg px-3 py-2'>
        <span className='text-sm font-medium text-gray-600 dark:text-gray-300'>
          Wallet not connected
        </span>
      </div>
    )
  }

  return (
    <div className='bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded-lg px-3 py-2'>
      <span className='text-sm font-medium text-emerald-800 dark:text-emerald-300'>
        Balance: ${((balance || 0) / 100).toFixed(2)}
      </span>
    </div>
  )
}

function Content() {
  const loggedInUser = useQuery(api.auth.loggedInUser)

  if (loggedInUser === undefined) {
    return (
      <div className='flex justify-center items-center'>
        <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600'></div>
      </div>
    )
  }

  return (
    <div className='flex flex-col gap-8'>
      <div className='text-center'>
        <h1 className='text-4xl font-semibold tracking-tight mb-3'>
          AI Pay‑per‑Generation
        </h1>
        <Authenticated>
          <p className='text-base sm:text-lg text-gray-600 dark:text-gray-300'>
            Generate AI content with transparent, per-use pricing via x402
            protocol
          </p>
        </Authenticated>
        <Unauthenticated>
          <p className='text-base sm:text-lg text-gray-600 dark:text-gray-300'>
            Sign in to start generating
          </p>
        </Unauthenticated>
      </div>

      <Authenticated>
        <GenerationInterface />
      </Authenticated>

      <Unauthenticated>
        <div className='bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6 sm:p-8'>
          <SignInForm />
        </div>
      </Unauthenticated>
    </div>
  )
}

function GenerationInterface() {
  const [prompt, setPrompt] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [result, setResult] = useState<{
    txHash: string
    result: string
  } | null>(null)
  const [quote, setQuote] = useState<X402Quote | null>(null)

  // Use our wallet hook to get real wallet data
  const { balance: walletBalance } = useWallet()

  const loggedInUser = useQuery(api.auth.loggedInUser)

  // Get cost estimate when prompt changes
  useEffect(() => {
    if (prompt.trim()) {
      getCostEstimate(prompt).then(setQuote)
    } else {
      setQuote(null)
    }
  }, [prompt])

  const handleGenerate = async () => {
    if (!prompt.trim() || !quote || !loggedInUser) return

    if (walletBalance < quote.estimatedCost) {
      toast.error(
        'Insufficient wallet balance. Please add funds to your wallet.'
      )
      return
    }

    setIsGenerating(true)
    setResult(null)

    try {
      // Step 1: Process payment through x402
      toast.info('Processing payment via x402 protocol...')
      const payment = await payWithX402(prompt.trim(), quote)

      // Step 2: Deduct from wallet (mock)
      await deductFromWallet(quote.estimatedCost)
      // No need to manually update balance, it will update via the useWallet hook

      // Step 3: Log transaction
      await logTransaction(
        loggedInUser._id,
        payment.txHash,
        payment.amount,
        prompt.trim()
      )

      // Step 4: Simulate AI generation (replace with actual API call)
      toast.info('Generating AI content...')
      await new Promise((resolve) => setTimeout(resolve, 2000))

      const generatedResult = `Generated result for: "${prompt.trim()}" - A beautiful AI-generated creation based on your prompt! This content was paid for via x402 protocol.`

      // Step 5: Update transaction status
      await updateTransactionStatus(payment.txHash, 'completed')

      setResult({
        txHash: payment.txHash,
        result: generatedResult,
      })

      toast.success(
        `Generation completed! Cost: $${(quote.estimatedCost / 100).toFixed(2)}`
      )
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Generation failed')

      // If we have a transaction hash, mark it as failed
      if (result?.txHash) {
        await updateTransactionStatus(result.txHash, 'failed')
      }
    } finally {
      setIsGenerating(false)
    }
  }

  const canGenerate =
    prompt.trim() &&
    quote &&
    walletBalance >= quote.estimatedCost &&
    !isGenerating

  return (
    <div className='space-y-6'>
      {/* Input Section */}
      <div className='bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6'>
        <label
          htmlFor='prompt'
          className='block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3'
        >
          Generation Prompt
        </label>
        <textarea
          id='prompt'
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder='Generate an image of a cat astronaut floating in space...'
          className='w-full px-4 py-3 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-violet-500 focus:border-transparent resize-none text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500'
          rows={3}
        />

        {/* Cost Estimate */}
        {prompt && quote && (
          <div className='mt-4 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-lg'>
            <p className='text-sm text-blue-800 dark:text-blue-300'>
              <span className='font-medium'>x402 Quote:</span> $
              {(quote.estimatedCost / 100).toFixed(2)}
            </p>
            <p className='text-xs text-blue-600 dark:text-blue-400 mt-1'>
              Quote ID: {quote.quoteId} • Expires:{' '}
              {new Date(quote.expiresAt).toLocaleTimeString()}
            </p>
            {walletBalance < quote.estimatedCost && (
              <p className='text-sm text-red-600 dark:text-red-400 mt-1'>
                ⚠️ Insufficient balance (${(walletBalance / 100).toFixed(2)}{' '}
                available)
              </p>
            )}
          </div>
        )}

        {/* Action Button */}
        <button
          onClick={handleGenerate}
          disabled={!canGenerate}
          className='mt-4 w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-colors shadow-sm hover:shadow-md flex items-center justify-center gap-2 dark:bg-violet-600 dark:hover:bg-violet-500'
        >
          {isGenerating ? (
            <>
              <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-white'></div>
              Processing x402 Payment & Generation...
            </>
          ) : (
            'Confirm + Pay via x402'
          )}
        </button>
      </div>

      {/* Result Section */}
      {result && (
        <div className='bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6'>
          <h3 className='text-lg font-semibold mb-4'>Generation Result</h3>

          <div className='bg-gray-50 dark:bg-gray-950 rounded-lg p-4 mb-4'>
            <p className='text-gray-800 dark:text-gray-100'>{result.result}</p>
          </div>

          <div className='flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-800'>
            <span className='text-sm text-gray-600 dark:text-gray-400'>
              x402 payment completed
            </span>
            <a
              href={`https://amoy.polygonscan.com/tx/${result.txHash}`}
              target='_blank'
              rel='noopener noreferrer'
              className='text-blue-600 hover:text-blue-800 dark:text-violet-400 dark:hover:text-violet-300 text-sm font-medium underline'
            >
              View onchain receipt →
            </a>
          </div>
        </div>
      )}

      {/* Integration Status */}
      <div className='bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-900 rounded-lg p-4'>
        <h4 className='text-sm font-medium text-yellow-800 dark:text-yellow-300 mb-2'>
          🚧 Integration Status
        </h4>
        <ul className='text-xs text-yellow-700 dark:text-yellow-400 space-y-1'>
          <li>
            • x402 Protocol: Mock implementation (ready for SDK integration)
          </li>
          <li>
            • Polygon Wallet: Mock connection (ready for MetaMask/WalletConnect)
          </li>
          <li>
            • Transaction Logging: Console only (ready for Convex backend)
          </li>
          <li>• On-chain Verification: Mock (ready for Polygonscan API)</li>
        </ul>
      </div>

      {/* Transaction History */}
      <TransactionHistory />
    </div>
  )
}

function TransactionHistory() {
  const transactions = useQuery(api.generation.getTransactionHistory)

  if (!transactions || transactions.length === 0) {
    return (
      <div className='bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6'>
        <h3 className='text-lg font-semibold mb-4'>Recent Transactions</h3>
        <p className='text-gray-500 dark:text-gray-400 text-sm'>
          No transactions yet. Start generating to see your history!
        </p>
      </div>
    )
  }

  return (
    <div className='bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6'>
      <h3 className='text-lg font-semibold mb-4'>Recent Transactions</h3>

      <div className='space-y-3'>
        {transactions.slice(0, 5).map((tx) => (
          <div
            key={tx._id}
            className='flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-800 last:border-b-0'
          >
            <div className='flex-1'>
              <p className='text-sm font-medium truncate'>
                {tx.prompt.length > 50
                  ? tx.prompt.substring(0, 50) + '...'
                  : tx.prompt}
              </p>
              <p className='text-xs text-gray-500 dark:text-gray-400'>
                {new Date(tx._creationTime).toLocaleDateString()} • x402
                Protocol
              </p>
            </div>
            <div className='text-right ml-4'>
              <p className='text-sm font-medium'>
                ${(tx.amount / 100).toFixed(2)}
              </p>
              <span
                className={`text-xs px-2 py-1 rounded-full ${
                  tx.status === 'completed'
                    ? 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300'
                    : tx.status === 'pending'
                      ? 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300'
                      : 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300'
                }`}
              >
                {tx.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
