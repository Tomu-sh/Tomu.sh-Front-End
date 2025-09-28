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
import { useChainId } from 'wagmi'
import {
  getCostEstimate,
  type X402Quote,
  useFetchWithPayment,
  generateImagePaidWithFetcher,
} from '../services/x402'
import { useWallet } from '../services/wallet'
import { updateTransactionStatus } from '../services/transactions'
// already imported api above
// Removed direct LiteLLM image URL generation in favor of x402 endpoint

export default function Dashboard() {
  return (
    <div className='min-h-screen flex flex-col noir text-white relative'>
      <div className='starfield twinkle' />
      <motion.header
        className='sticky top-0 z-20 h-16 flex justify-between items-center border-b silver-border/60 px-4 md:px-8 bg-black/60 backdrop-blur-md'
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
      >
        <div className='flex items-center gap-2'>
          <div className='w-8 h-8 rounded-md bg-white/10 ring-1 ring-white/20 flex items-center justify-center font-bold'>
            ✦
          </div>
          <h2 className='text-xl font-semibold tracking-tight silver-text'>
            Tomu<span className='text-white/60'>.sh</span>
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
          <Link
            to='/'
            className='btn px-3 py-2 bg-transparent border border-white/20 hover:bg-white/10'
          >
            Home
          </Link>
        </div>
      </motion.header>
      <main className='flex-1 flex flex-col relative overflow-hidden'>
        <div className='container-custom py-6 relative z-10'>
          <Content />
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
  // direct test state removed
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
    usdcBalance,
    sendTransactionAsync,
    refetchBalance,
  } = useWallet()
  const chainId = useChainId()
  const polygonscanBase =
    chainId === 80002
      ? 'https://amoy.polygonscan.com'
      : 'https://polygonscan.com'
  const loggedInUser = useQuery(api.auth.loggedInUser)
  const processGeneration = useAction(api.generation.processGeneration)
  const addClientTransaction = useMutation(api.generation.addClientTransaction)
  const fetchWithPayment = useFetchWithPayment()

  useEffect(() => {
    if (prompt.trim()) {
      // Demo mode: show step increases roughly per token (~4 chars)
      getCostEstimate(prompt, imageOptions.size, undefined, {
        demo: true,
        perTokenUsd: 0.001, // $0.001 per token for demo visibility
        baseFeeUsd: 0, // no base fee in demo so increments are clearer
      }).then(setQuote)
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

  // direct test handler removed

  const handleGenerate = async () => {
    if (!prompt.trim() || !quote) return
    setIsGenerating(true)
    setResult(null)
    try {
      // Ensure an authenticated session (anonymous) so we can log transactions
      if (loggedInUser === null) {
        try {
          await signIn('anonymous')
        } catch {}
      }
      toast.info(`Processing x402 payment & generating ${generationType}...`)
      if (generationType === 'image') {
        const f: any = fetchWithPayment as any
        if (!f || !f.__x402) {
          toast.error('Connect your wallet to enable x402 payments')
          return
        }
        const data: any = await generateImagePaidWithFetcher(
          f,
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
        if (data?.x402Payment?.txHash) {
          await addClientTransaction({
            txHash: data.x402Payment.txHash,
            amount: data.x402Payment.amountCents ?? quote.estimatedCost,
            prompt: prompt.trim(),
            generationType: 'image',
            result: JSON.stringify({
              url: imageUrl,
              model: 'gemini-2.5-flash-image',
            }),
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
        `${
          generationType.charAt(0).toUpperCase() + generationType.slice(1)
        } generated! Cost: $${formatUsd(quote.estimatedCost)}`
      )
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Generation failed')
      if (result?.txHash) {
        await updateTransactionStatus(result.txHash, 'failed')
      }
    } finally {
      setIsGenerating(false)
      try {
        await refetchBalance?.()
      } catch {}
    }
  }

  const canGenerate = prompt.trim() && quote && !isGenerating

  const formatUsd = (cents: number) => {
    const dollars = cents / 100
    return dollars < 0.01 ? dollars.toFixed(4) : dollars.toFixed(2)
  }

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
        className='card-noir p-6'
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
          <div className='mt-4 live-border'>
            <div className='live-inner p-4 rounded-[14px]'>
              <div className='flex justify-between items-center'>
                <p className='text-lg text-blue-300'>
                  <span className='font-extrabold'>x402 Quote:</span>
                </p>
                <div className='text-xl font-bold text-blue-300'>
                  ${formatUsd(quote.estimatedCost)}
                </div>
              </div>
              <div className='mt-1 text-xs text-blue-300/80'>
                After payment balance: $
                {formatUsd(
                  Math.max((usdcBalance || 0) - quote.estimatedCost, 0)
                )}
              </div>
            </div>
          </div>
        )}

        <motion.button
          onClick={handleGenerate}
          disabled={!canGenerate as any}
          className='mt-3 w-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-medium py-3 px-6 rounded-lg'
        >
          {isGenerating
            ? 'Processing x402 Payment & Generation...'
            : `Generate ${generationType === 'image' ? 'Image' : 'Text'} with x402`}
        </motion.button>
      </motion.div>

      {result && (
        <motion.div
          className='card-noir p-6'
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
          {isGenerating ? (
            <div className='mb-6 flex justify-center'>
              <div className='relative rounded-lg overflow-hidden shadow-lg w-full max-w-3xl h-[420px] skeleton' />
            </div>
          ) : result.imageUrl ? (
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
            <div className='card-noir p-4 mb-4'>
              <p className='text-gray-800 dark:text-gray-100'>
                {result.result}
              </p>
            </div>
          )}
          <div className='flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-800'>
            <span className='text-sm text-gray-600 dark:text-gray-400'>
              x402 payment completed
            </span>
            {result.txHash && result.txHash.startsWith('0x') ? (
              <a
                href={`${polygonscanBase}/tx/${result.txHash}`}
                target='_blank'
                rel='noopener noreferrer'
                className='text-indigo-600 hover:text-indigo-800 dark:text-violet-400 dark:hover:text-violet-300 text-sm font-medium'
              >
                View onchain receipt
              </a>
            ) : (
              <span className='text-xs text-gray-500'>Receipt pending</span>
            )}
          </div>
        </motion.div>
      )}

      {loggedInUser ? <TransactionHistory /> : null}
    </div>
  )
}

function TransactionHistory() {
  const transactions = useQuery(api.generation.getTransactionHistory)
  const chainId = useChainId()
  const polygonscanBase =
    chainId === 80002
      ? 'https://amoy.polygonscan.com'
      : 'https://polygonscan.com'

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

  if (transactions === undefined) {
    return (
      <div className='card-noir p-6'>
        <h3 className='text-lg font-semibold mb-4'>Recent Transactions</h3>
        <p className='text-gray-500 dark:text-gray-400 text-sm'>
          Loading recent transactions...
        </p>
      </div>
    )
  }

  if (!transactions || transactions.length === 0) {
    return (
      <div className='card-noir p-6'>
        <h3 className='text-lg font-semibold mb-4'>Recent Transactions</h3>
        <p className='text-gray-500 dark:text-gray-400 text-sm'>
          No transactions yet. Start generating to see your history!
        </p>
      </div>
    )
  }

  return (
    <div className='card-noir p-6'>
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
                  {tx.txHash?.startsWith('0x') && (
                    <a
                      href={`${polygonscanBase}/tx/${tx.txHash}`}
                      target='_blank'
                      rel='noopener noreferrer'
                      className='text-xs text-indigo-600 hover:text-indigo-800 dark:text-violet-400 dark:hover:text-violet-300 block mt-1'
                    >
                      View onchain receipt
                    </a>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
