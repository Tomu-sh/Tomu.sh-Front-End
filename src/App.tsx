import {
  Authenticated,
  Unauthenticated,
  useQuery,
  useMutation,
  useAction,
} from 'convex/react'
import { api } from '../convex/_generated/api'
import { SignInForm } from './SignInForm'
import { SignOutButton } from './SignOutButton'
import { Toaster, toast } from 'sonner'
import { useState, useEffect } from 'react'
import ThemeToggle from './lib/ThemeToggle'
import { WalletButton } from './components/WalletButton'

// Import integration services
import {
  getCostEstimate,
  type X402Quote,
  generateImagePaid,
} from './services/x402'
import { useWallet, deductFromWallet } from './services/wallet'
import {
  logTransaction,
  updateTransactionStatus,
} from './services/transactions'
import { generateImageURL } from './services/litellm'

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
        <div className='mt-8'></div>
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
  const processGenerationAction = useAction(api.generation.processGeneration)
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

  // Use our wallet hook to get real wallet data
  const {
    balance: walletBalance,
    sendTransactionAsync,
    refetchBalance,
  } = useWallet()

  const loggedInUser = useQuery(api.auth.loggedInUser)

  // Use action hook for processGeneration (it's now an action, not a mutation)
  const processGeneration = useAction(api.generation.processGeneration)

  // Get cost estimate when prompt changes
  useEffect(() => {
    if (prompt.trim()) {
      getCostEstimate(prompt, imageOptions.size).then(setQuote)
    } else {
      setQuote(null)
    }
  }, [prompt, imageOptions.size])

  // Process the result string to extract image data if it's JSON
  const processResult = (resultString: string) => {
    try {
      // Try to parse as JSON (for image results)
      const parsedResult = JSON.parse(resultString)
      if (parsedResult.url) {
        return {
          imageUrl: parsedResult.url,
          model: parsedResult.model || 'Unknown model',
          text: `Image generated with ${parsedResult.model || 'AI'} model`,
        }
      }
      // If no URL found, return the string as is
      return { text: resultString }
    } catch (e) {
      // If not valid JSON, return the string as is
      return { text: resultString }
    }
  }

  const handleDirectTest = async () => {
    if (!prompt.trim()) return

    setIsGenerating(true)
    setResult(null)
    setIsDirectTest(true)

    try {
      toast.info('Testing direct image generation (no payment required)...')

      const imageUrl = await generateImageURL(prompt, {
        model: 'gemini-2.5-flash-image',
        size: imageOptions.size,
        quality: imageOptions.quality,
        style: imageOptions.style,
      })

      console.log('Direct test - Image URL received:', imageUrl)
      console.log('Direct test - Image URL length:', imageUrl?.length)
      console.log(
        'Direct test - Image URL starts with data:',
        imageUrl?.startsWith('data:')
      )

      // Log the transaction for history tracking
      const resultData = JSON.stringify({
        url: imageUrl,
        model: 'gemini-2.5-flash-image',
        promptId: `direct_${Date.now()}`,
        note: 'Direct test - no payment required',
      })

      // Log transaction using processGeneration action
      await processGenerationAction({
        txHash: `direct-test-${Date.now()}`,
        prompt,
        estimatedCost: 0, // No cost for direct test
        generationType: 'image',
        options: {
          model: 'gemini-2.5-flash-image',
          size: imageOptions.size,
          quality: imageOptions.quality,
          style: imageOptions.style,
        },
      })

      setResult({
        txHash: 'direct-test',
        result: 'Direct test completed',
        imageUrl,
        model: 'gemini-2.5-flash-image',
      })

      toast.success('Direct test completed!')
    } catch (error) {
      console.error('Direct test failed:', error)
      toast.error('Direct test failed: ' + (error as Error).message)
    } finally {
      setIsGenerating(false)
      setIsDirectTest(false)
    }
  }

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
      // Step 1: Process payment through MetaMask transaction
      toast.info('Processing payment via MetaMask...')

      const paymentResult = await deductFromWallet(
        quote.estimatedCost,
        sendTransactionAsync
      )

      if (!paymentResult.success) {
        throw new Error(paymentResult.error || 'Payment failed')
      }

      // Step 2: Refresh wallet balance to reflect the deduction
      await refetchBalance()

      // Step 3: Log transaction
      await logTransaction(
        loggedInUser._id,
        paymentResult.txHash!,
        quote.estimatedCost,
        prompt.trim()
      )

      // Step 4: Call paid API (x402) which forwards to LiteLLM after payment
      toast.info(`Generating AI ${generationType} via x402...`)

      if (generationType === 'image') {
        const data = await generateImagePaid(prompt.trim(), imageOptions.size)
        // Try common shapes: { data: [{ b64_json }]} or { url }
        let imageUrl = ''
        if (data?.data?.[0]?.b64_json) {
          imageUrl = `data:image/png;base64,${data.data[0].b64_json}`
        } else if (data?.url) {
          imageUrl = data.url
        } else if (data?.data?.[0]?.url) {
          imageUrl = data.data[0].url
        }

        setResult({
          txHash: paymentResult.txHash!,
          result: 'Image generated',
          imageUrl,
          model: 'gemini-2.5-flash-image',
        })
      } else {
        // fallback to existing Convex text flow if needed
        const generationResult = await processGeneration({
          prompt: prompt.trim(),
          estimatedCost: quote.estimatedCost,
          generationType,
          txHash: paymentResult.txHash,
        })
        const processedResult = processResult(generationResult.result)
        setResult({
          txHash: paymentResult.txHash!,
          result: processedResult.text,
          model: processedResult.model,
        })
      }

      toast.success(
        `${generationType.charAt(0).toUpperCase() + generationType.slice(1)} generated! Cost: $${(quote.estimatedCost / 100).toFixed(2)}`
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
        <div className='flex items-center justify-between mb-4'>
          <label
            htmlFor='prompt'
            className='block text-sm font-medium text-gray-700 dark:text-gray-300'
          >
            Generation Prompt
          </label>

          {/* Generation Type Toggle */}
          <div className='flex items-center space-x-2 bg-gray-100 dark:bg-gray-800 rounded-lg p-1'>
            <button
              onClick={() => setGenerationType('text')}
              className={`px-3 py-1 text-xs font-medium rounded-md ${
                generationType === 'text'
                  ? 'bg-white dark:bg-gray-700 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              Text
            </button>
            <button
              onClick={() => setGenerationType('image')}
              className={`px-3 py-1 text-xs font-medium rounded-md ${
                generationType === 'image'
                  ? 'bg-white dark:bg-gray-700 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400'
              }`}
            >
              Image
            </button>
          </div>
        </div>

        <textarea
          id='prompt'
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={
            generationType === 'image'
              ? 'Generate an image of a cat astronaut floating in space...'
              : 'Generate a short story about a space adventure...'
          }
          className='w-full px-4 py-3 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-violet-500 focus:border-transparent resize-none text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500'
          rows={3}
        />

        {/* Image Options */}
        {generationType === 'image' && (
          <div className='mt-4 grid grid-cols-2 gap-4'>
            <div>
              <label className='block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1'>
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
              <label className='block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1'>
                Size
              </label>
              <select
                value={imageOptions.size}
                onChange={(e) =>
                  setImageOptions({
                    ...imageOptions,
                    size: e.target.value as
                      | '256x256'
                      | '512x512'
                      | '1024x1024'
                      | '1792x1024'
                      | '1024x1792',
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
              <label className='block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1'>
                Quality
              </label>
              <select
                value={imageOptions.quality}
                onChange={(e) =>
                  setImageOptions({
                    ...imageOptions,
                    quality: e.target.value as 'standard' | 'hd',
                  })
                }
                className='w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-950 rounded-lg'
              >
                <option value='standard'>Standard</option>
                <option value='hd'>HD</option>
              </select>
            </div>
            <div>
              <label className='block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1'>
                Style
              </label>
              <select
                value={imageOptions.style}
                onChange={(e) =>
                  setImageOptions({
                    ...imageOptions,
                    style: e.target.value as 'vivid' | 'natural',
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

        {/* Direct Test Button */}
        <button
          onClick={handleDirectTest}
          disabled={!prompt.trim() || isGenerating}
          className='mt-4 w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-colors shadow-sm hover:shadow-md flex items-center justify-center gap-2'
        >
          {isGenerating && isDirectTest ? (
            <>
              <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-white'></div>
              Testing Direct Generation...
            </>
          ) : (
            '🧪 Test Direct (No Payment Required)'
          )}
        </button>

        {/* Action Button */}
        <button
          onClick={handleGenerate}
          disabled={!canGenerate}
          className='mt-2 w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition-colors shadow-sm hover:shadow-md flex items-center justify-center gap-2 dark:bg-violet-600 dark:hover:bg-violet-500'
        >
          {isGenerating && !isDirectTest ? (
            <>
              <div className='animate-spin rounded-full h-4 w-4 border-b-2 border-white'></div>
              Processing x402 Payment & Generation...
            </>
          ) : (
            `Generate ${generationType.charAt(0).toUpperCase() + generationType.slice(1)} with x402`
          )}
        </button>
      </div>

      {/* Result Section */}
      {result && (
        <div className='bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-6'>
          <h3 className='text-lg font-semibold mb-4'>Generation Result</h3>

          {/* Display Image if available */}
          {result.imageUrl && (
            <div className='mb-4 flex justify-center'>
              <img
                src={result.imageUrl}
                alt={prompt}
                className='rounded-lg max-h-[500px] object-contain shadow-md'
                onLoad={() => console.log('Image loaded successfully')}
                onError={(e) => console.error('Image failed to load:', e)}
              />
            </div>
          )}

          {/* Display text result */}
          <div className='bg-gray-50 dark:bg-gray-950 rounded-lg p-4 mb-4'>
            <p className='text-gray-800 dark:text-gray-100'>
              {result.imageUrl
                ? `Generated using ${result.model || 'AI'}`
                : result.result}
            </p>
            {result.imageUrl && (
              <div className='mt-2 text-xs text-gray-500'>
                <p>Image URL length: {result.imageUrl.length}</p>
                <p>
                  Starts with data:{' '}
                  {result.imageUrl.startsWith('data:') ? 'Yes' : 'No'}
                </p>
                <p>Preview: {result.imageUrl.substring(0, 50)}...</p>
              </div>
            )}
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

      {/* Transaction History */}
      <TransactionHistory />
    </div>
  )
}

// // Component to handle image thumbnails with Convex references
// function ImageThumbnail({ imageUrl, alt }: { imageUrl: string; alt: string }) {
//   // Since we're not storing images in Convex anymore, just use the URL directly
//   if (!imageUrl) {
//     return (
//       <div className='h-20 w-20 bg-gray-200 dark:bg-gray-700 rounded-md flex items-center justify-center'>
//         <span className='text-xs text-gray-500'>No image</span>
//       </div>
//     )
//   }

//   return (
//     <img
//       src={imageUrl}
//       alt={alt}
//       className='h-20 w-20 object-cover rounded-md shadow-sm'
//     />
//   )
// }

function TransactionHistory() {
  const transactions = useQuery(api.generation.getTransactionHistory)

  // Function to extract image URL from result if it's an image generation
  const extractImageUrl = (result: string | undefined): string | null => {
    if (!result) return null

    try {
      const parsed = JSON.parse(result)
      // Since we're not storing images in Convex anymore, return the direct URL
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

              {/* Show image thumbnail if it's an image generation */}
              {/* {imageUrl && tx.status === 'completed' && (
                <div className='mt-2 flex justify-start'>
                  <ImageThumbnail imageUrl={imageUrl} alt={tx.prompt} />
                </div>
              )} */}
            </div>
          )
        })}
      </div>
    </div>
  )
}
