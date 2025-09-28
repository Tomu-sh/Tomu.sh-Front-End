import {
  Authenticated,
  Unauthenticated,
  useQuery,
  useAction,
  useMutation,
} from 'convex/react'
import { useAuthActions } from '@convex-dev/auth/react'
import { api } from '../../convex/_generated/api'
import ThemeToggle from '../lib/ThemeToggle'
import { WalletButton } from '../components/WalletButton'
import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Link } from 'react-router-dom'
import { SignOutButton } from '../SignOutButton'
import {
  getCostEstimate,
  type X402Quote,
  useFetchWithPayment,
  generateImagePaidWithFetcher,
  generateImagePreview,
} from '../services/x402'
import { useWallet } from '../services/wallet'
import { updateTransactionStatus } from '../services/transactions'
// already imported api above
// Removed direct LiteLLM image URL generation in favor of x402 endpoint

export default function Dashboard() {
  return (
    <div className='min-h-screen flex flex-col bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900 text-gray-900 dark:text-gray-100'>
      <motion.header
        className='sticky top-0 z-20 glass h-16 flex justify-between items-center border-b border-gray-200/30 dark:border-gray-800/30 shadow-sm px-4 md:px-8'
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        <div className='flex items-center gap-2'>
          <div className='w-8 h-8 rounded-md bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold'>
            T
          </div>
          <h2 className='text-xl font-semibold tracking-tight'>
            Tomu<span className='gradient-text'>.sh</span>
          </h2>
        </div>
        <div className='flex items-center gap-3'>
          <ThemeToggle />
          <Authenticated>
            <WalletButton />
          </Authenticated>
          <Authenticated>
            <SignOutButton />
          </Authenticated>
          <Link to='/' className='btn btn-secondary'>
            Home
          </Link>
        </div>
      </motion.header>
      <main className='flex-1 flex flex-col'>
        <div className='bg-gradient-to-br from-gray-900 to-gray-950 dark:from-gray-900 dark:to-black text-white relative overflow-hidden'>
          <div className='container-custom py-6'>
            <Content />
          </div>
        </div>
      </main>
    </div>
  )
}

function Content() {
  const loggedInUser = useQuery(api.auth.loggedInUser)

  if (loggedInUser === undefined) {
    return (
      <div className='flex justify-center items-center py-20'>
        <motion.div
          className='relative w-12 h-12'
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
        >
          <div className='absolute w-full h-full rounded-full border-4 border-indigo-600/20 dark:border-violet-600/20'></div>
          <div className='absolute w-full h-full rounded-full border-t-4 border-indigo-600 dark:border-violet-500'></div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className='flex flex-col gap-8'>
      <GenerationInterface />
      <div className='mt-8'></div>
    </div>
  )
}

function GenerationInterface() {
  const processGenerationAction = useAction(api.generation.processGeneration)
  const { signIn } = useAuthActions()
  const [prompt, setPrompt] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [result, setResult] = useState<{
    txHash: string
    result: string
    imageUrl?: string
    model?: string
  } | null>(null)
  const [isDirectTest, setIsDirectTest] = useState(false)
  const [quote, setQuote] = useState<X402Quote | null>(null)
  const [generationType, setGenerationType] = useState<'text' | 'image'>(
    'image'
  )
  const [imageOptions, setImageOptions] = useState({
    model: 'gemini-2.5-flash-image',
    size: '1024x1024' as
      | '256x256'
      | '512x512'
      | '1024x1024'
      | '1792x1024'
      | '1024x1792',
    quality: 'standard' as 'standard' | 'hd',
    style: 'vivid' as 'vivid' | 'natural',
  })

  const {
    balance: walletBalance,
    sendTransactionAsync,
    refetchBalance,
  } = useWallet()
  const loggedInUser = useQuery(api.auth.loggedInUser)
  const processGeneration = useAction(api.generation.processGeneration)
  const addClientTransaction = useMutation(api.generation.addClientTransaction)
  const fetchWithPayment = useFetchWithPayment()

  useEffect(() => {
    if (prompt.trim()) {
      getCostEstimate(prompt, imageOptions.size).then(setQuote)
    } else {
      setQuote(null)
    }
  }, [prompt, imageOptions.size])

  const processResult = (resultString: string) => {
    try {
      const parsedResult = JSON.parse(resultString)
      if (parsedResult.url) {
        return {
          imageUrl: parsedResult.url,
          model: parsedResult.model || 'Unknown model',
          text: `Image generated with ${parsedResult.model || 'AI'} model`,
        }
      }
      return { text: resultString }
    } catch (e) {
      return { text: resultString }
    }
  }

  const handleDirectTest = async () => {
    if (!prompt.trim()) return
    setIsGenerating(true)
    setResult(null)
    setIsDirectTest(true)
    try {
      toast.info('Generating preview (no payment)...')
      const preview = await generateImagePreview(prompt, imageOptions.size)
      let imageUrl = ''
      imageUrl = preview.url
      setResult({
        txHash: 'direct-test',
        result: 'Preview generated',
        imageUrl,
        model: preview.model,
      })
      toast.success('Preview ready!')
    } catch (error) {
      console.error('Direct test failed:', error)
      toast.error('Direct test failed: ' + (error as Error).message)
    } finally {
      setIsGenerating(false)
      setIsDirectTest(false)
    }
  }

  const handleGenerate = async () => {
    if (!prompt.trim() || !quote) return
    setIsGenerating(true)
    setResult(null)
    try {
      toast.info(`Processing x402 payment & generating ${generationType}...`)
      if (generationType === 'image') {
        if (!(fetchWithPayment as any)) {
          throw new Error(
            'Wallet not connected. Connect wallet to pay via x402.'
          )
        }
        const data: any = await generateImagePaidWithFetcher(
          fetchWithPayment as any,
          prompt.trim(),
          imageOptions.size
        )
        let imageUrl = ''
        if (data?.data?.[0]?.b64_json) {
          imageUrl = `data:image/png;base64,${data.data[0].b64_json}`
        } else if (data?.url) {
          imageUrl = data.url
        } else if (data?.data?.[0]?.url) {
          imageUrl = data.data[0].url
        }
        // Log x402 tx if available
        if (loggedInUser && data?.x402Payment?.txHash) {
          await addClientTransaction({
            txHash: data.x402Payment.txHash,
            amount: data.x402Payment.amountCents ?? quote.estimatedCost,
            prompt: prompt.trim(),
            generationType: 'image',
            result: JSON.stringify({ url: imageUrl, model: 'gemini-2.5-flash-image' }),
          })
        }
        setResult({
          txHash: data?.x402Payment?.txHash || 'unknown',
          result: 'Image generated',
          imageUrl,
          model: 'gemini-2.5-flash-image',
        })
      } else {
        const generationResult = await processGeneration({
          prompt: prompt.trim(),
          estimatedCost: quote.estimatedCost,
          generationType,
          txHash: undefined,
        })
        const processedResult = processResult(generationResult.result)
        setResult({
          txHash: 'unknown',
          result: processedResult.text,
          model: processedResult.model,
        })
      }
      toast.success(
        `${generationType.charAt(0).toUpperCase() + generationType.slice(1)} generated! Cost: $${(quote.estimatedCost / 100).toFixed(2)}`
      )
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Generation failed')
      if (result?.txHash) {
        await updateTransactionStatus(result.txHash, 'failed')
      }
    } finally {
      setIsGenerating(false)
    }
  }

  const canGenerate = prompt.trim() && quote && !isGenerating

  return (
    <div className='space-y-6'>
      <Unauthenticated>
        <div className='p-4 rounded-md border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 flex items-center justify-between'>
          <div className='text-sm text-gray-700 dark:text-gray-300'>
            Continue as guest to save your generations to public history.
          </div>
          <button
            className='btn btn-primary'
            onClick={() => void signIn('anonymous')}
          >
            Continue as guest
          </button>
        </div>
      </Unauthenticated>
      <motion.div
        className='card p-6'
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className='flex items-center justify-between mb-4'>
          <motion.label
            htmlFor='prompt'
            className='flex items-center gap-1 text-sm font-medium text-gray-700 dark:text-gray-300'
            whileHover={{ scale: 1.02 }}
          >
            Generation Prompt
          </motion.label>
          <div className='flex items-center space-x-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1'>
            <motion.button
              onClick={() => setGenerationType('text')}
              className={`px-3 py-1 text-xs font-medium rounded-md ${generationType === 'text' ? 'bg-white dark:bg-gray-700 shadow-sm' : 'text-gray-600 dark:text-gray-400'}`}
            >
              Text
            </motion.button>
            <motion.button
              onClick={() => setGenerationType('image')}
              className={`px-3 py-1 text-xs font-medium rounded-md ${generationType === 'image' ? 'bg-white dark:bg-gray-700 shadow-sm' : 'text-gray-600 dark:text-gray-400'}`}
            >
              Image
            </motion.button>
          </div>
        </div>

        <motion.textarea
          id='prompt'
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={
            generationType === 'image'
              ? 'Generate an image of a cat astronaut floating in space...'
              : 'Generate a short story about a space adventure...'
          }
          className='w-full px-4 py-3 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 rounded-lg focus:ring-2 focus:ring-indigo-500/30 dark:focus:ring-violet-500/30 focus:border-indigo-500 dark:focus:border-violet-500 resize-none text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 transition-all duration-200 shadow-sm focus:shadow-md'
          rows={3}
        />

        {generationType === 'image' && (
          <div className='mt-4 grid grid-cols-2 gap-4'>
            <div>
              <label className='flex items-center gap-1 text-xs font-medium text-gray-700 dark:text-gray-300 mb-1'>
                Model
              </label>
              <select
                value={imageOptions.model}
                onChange={(e) =>
                  setImageOptions({ ...imageOptions, model: e.target.value })
                }
                className='w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 rounded-lg'
              >
                <option value='gemini-2.5-flash-image'>
                  Gemini 2.5 Flash Image
                </option>
              </select>
            </div>
            <div>
              <label className='flex items-center gap-1 text-xs font-medium text-gray-700 dark:text-gray-300 mb-1'>
                Size
              </label>
              <select
                value={imageOptions.size}
                onChange={(e) =>
                  setImageOptions({
                    ...imageOptions,
                    size: e.target.value as any,
                  })
                }
                className='w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 rounded-lg'
              >
                <option value='256x256'>Small (256x256)</option>
                <option value='512x512'>Medium (512x512)</option>
                <option value='1024x1024'>Large (1024x1024)</option>
                <option value='1792x1024'>Wide (1792x1024)</option>
                <option value='1024x1792'>Tall (1024x1792)</option>
              </select>
            </div>
            <div>
              <label className='flex items-center gap-1 text-xs font-medium text-gray-700 dark:text-gray-300 mb-1'>
                Quality
              </label>
              <select
                value={imageOptions.quality}
                onChange={(e) =>
                  setImageOptions({
                    ...imageOptions,
                    quality: e.target.value as any,
                  })
                }
                className='w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 rounded-lg'
              >
                <option value='standard'>Standard</option>
                <option value='hd'>HD</option>
              </select>
            </div>
            <div>
              <label className='flex items-center gap-1 text-xs font-medium text-gray-700 dark:text-gray-300 mb-1'>
                Style
              </label>
              <select
                value={imageOptions.style}
                onChange={(e) =>
                  setImageOptions({
                    ...imageOptions,
                    style: e.target.value as any,
                  })
                }
                className='w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 rounded-lg'
              >
                <option value='vivid'>Vivid</option>
                <option value='natural'>Natural</option>
              </select>
            </div>
          </div>
        )}

        {prompt && quote && (
          <div className='mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200 dark:border-blue-900 rounded-lg shadow-sm'>
            <div className='flex justify-between items-center'>
              <p className='text-sm text-blue-800 dark:text-blue-300'>
                <span className='font-medium'>x402 Quote:</span>
              </p>
              <div className='text-lg font-bold text-blue-800 dark:text-blue-300'>
                ${(quote.estimatedCost / 100).toFixed(2)}
              </div>
            </div>
          </div>
        )}

        <motion.button
          onClick={handleDirectTest}
          disabled={!prompt.trim() || isGenerating}
          className='mt-4 w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white font-medium py-3 px-6 rounded-lg'
        >
          {isGenerating && isDirectTest
            ? 'Testing Direct Generation...'
            : 'Test Direct (No Payment Required)'}
        </motion.button>
        <motion.button
          onClick={handleGenerate}
          disabled={!canGenerate as any}
          className='mt-3 w-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-medium py-3 px-6 rounded-lg'
        >
          {isGenerating && !isDirectTest
            ? 'Processing x402 Payment & Generation...'
            : `Generate ${generationType === 'image' ? 'Image' : 'Text'} with x402`}
        </motion.button>
      </motion.div>

      {result && (
        <motion.div
          className='card p-6'
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className='flex items-center justify-between mb-4'>
            <h3 className='text-lg font-semibold'>Generation Result</h3>
            <div className='px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 text-xs font-medium rounded-full'>
              Success
            </div>
          </div>
          {result.imageUrl ? (
            <div className='mb-6 flex justify-center'>
              <div className='relative rounded-lg overflow-hidden shadow-lg'>
                <img
                  src={result.imageUrl}
                  alt={prompt}
                  className='max-h-[500px] object-contain'
                />
                <div className='absolute bottom-0 left-0 right-0 bg-black/60 backdrop-blur-sm text-white p-3 text-sm'>
                  <p className='font-medium'>
                    Generated using {result.model || 'AI'}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className='bg-gray-50 dark:bg-gray-950 rounded-lg p-4 mb-4 border border-gray-200 dark:border-gray-800'>
              <p className='text-gray-800 dark:text-gray-100'>
                {result.result}
              </p>
            </div>
          )}
          <div className='flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-800'>
            <span className='text-sm text-gray-600 dark:text-gray-400'>
              x402 payment completed
            </span>
            <a
              href={`https://amoy.polygonscan.com/tx/${result.txHash}`}
              target='_blank'
              rel='noopener noreferrer'
              className='text-indigo-600 hover:text-indigo-800 dark:text-violet-400 dark:hover:text-violet-300 text-sm font-medium'
            >
              View onchain receipt
            </a>
          </div>
        </motion.div>
      )}

      <TransactionHistory />
    </div>
  )
}

function TransactionHistory() {
  const transactions = useQuery(api.generation.getTransactionHistory)

  const extractImageUrl = (result: string | undefined): string | null => {
    if (!result) return null
    try {
      const parsed = JSON.parse(result)
      if (
        parsed.url &&
        (parsed.url.startsWith('data:image/') || parsed.url.startsWith('http'))
      ) {
        return parsed.url
      }
      return null
    } catch (e) {
      return null
    }
  }

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
      <div className='space-y-4'>
        {transactions.slice(0, 5).map((tx) => {
          const imageUrl =
            tx.generationType === 'image' ? extractImageUrl(tx.result) : null
          return (
            <div
              key={tx._id}
              className='flex flex-col py-3 border-b border-gray-100 dark:border-gray-800 last:border-b-0'
            >
              <div className='flex items-center justify-between'>
                <div className='flex-1'>
                  <p className='text-sm font-medium truncate'>
                    {tx.prompt.length > 50
                      ? tx.prompt.substring(0, 50) + '...'
                      : tx.prompt}
                  </p>
                  <p className='text-xs text-gray-500 dark:text-gray-400'>
                    {new Date(tx._creationTime).toLocaleDateString()} •
                    {tx.generationType === 'image' ? ' Image' : ' Text'} • x402
                    Protocol
                  </p>
                </div>
                <div className='text-right ml-4'>
                  <p className='text-sm font-medium'>
                    ${(tx.amount / 100).toFixed(2)}
                  </p>
                  <span
                    className={`text-xs px-2 py-1 rounded-full ${tx.status === 'completed' ? 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300' : tx.status === 'pending' ? 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-300' : 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300'}`}
                  >
                    {tx.status}
                  </span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
