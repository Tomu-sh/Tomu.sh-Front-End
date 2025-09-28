// X402 Integration Service - HUSK for future integration
// This is a placeholder that can be replaced with actual x402 SDK integration

export interface X402Quote {
  estimatedCost: number // in cents
  quoteId: string
  expiresAt: number
}

export interface X402Payment {
  txHash: string
  status: 'pending' | 'completed' | 'failed'
  amount: number
}

// x402-fetch wrapper for client
import { wrapFetchWithPayment, decodeXPaymentResponse } from 'x402-fetch'
import { useWalletClient } from 'wagmi'

export function useFetchWithPayment() {
  const { data: walletClient } = useWalletClient()

  if (!walletClient) {
    console.warn('No wagmi wallet connected. Using window.fetch (no payments).')
    return window.fetch.bind(window)
  }

  const wrapped = wrapFetchWithPayment(fetch as any, walletClient as any) as any
  try {
    ;(wrapped as any).__x402 = true
  } catch {}
  return wrapped
}

export async function generateImagePaid(prompt: string, size = '1024x1024') {
  const f = useFetchWithPayment()!
  // Hit x402-protected server endpoint which proxies to LiteLLM
  const resp = await f('/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gemini-2.5-flash-image',
      messages: [
        {
          role: 'user',
          content: `Generate an image with size ${size} for prompt: ${prompt}`,
        },
      ],
      max_tokens: 50,
    }),
  })
  if (!resp.ok) throw new Error(`Failed: ${resp.status}`)

  const data = await resp.json()

  // Normalize to previous expected shapes used by the Dashboard UI
  // Try to extract a base64 image URL from LiteLLM/OpenRouter-style response
  const choice = data?.choices?.[0]
  const imageData = choice?.message?.images?.[0]?.image_url?.url || ''
  const base64Content = imageData.startsWith('data:image/')
    ? imageData
    : imageData.startsWith('data:image/png;base64,')
      ? imageData
      : imageData

  const url = base64Content || data?.url || data?.data?.[0]?.url || ''

  return url ? { url, model: 'gemini-2.5-flash-image', data: [{ url }] } : data
}

// Non-hook variant: accepts a prepared fetcher from useFetchWithPayment()
export async function generateImagePaidWithFetcher(
  fetcher: (input: RequestInfo, init?: RequestInit) => Promise<Response>,
  prompt: string,
  size = '1024x1024'
) {
  const resp = await fetcher('/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gemini-2.5-flash-image',
      messages: [
        {
          role: 'user',
          content: `Generate an image with size ${size} for prompt: ${prompt}`,
        },
      ],
      max_tokens: 50,
    }),
  })
  if (!resp.ok) throw new Error(`Failed: ${resp.status}`)

  const data = await resp.json()

  const choice = data?.choices?.[0]
  const imageData = choice?.message?.images?.[0]?.image_url?.url || ''
  const base64Content = imageData.startsWith('data:image/')
    ? imageData
    : imageData.startsWith('data:image/png;base64,')
      ? imageData
      : imageData

  const url = base64Content || data?.url || data?.data?.[0]?.url || ''

  // Attach x402 payment metadata if present
  let payment: any = undefined
  try {
    const header = resp.headers.get('x-payment-response')
    if (header) {
      const decoded: any = decodeXPaymentResponse(header as any)
      const amountCents =
        decoded?.amountUsd != null ? Number(decoded.amountUsd) * 100 : undefined
      payment = { txHash: decoded?.txHash, amountCents }
    }
  } catch {}

  if (url) {
    const result: any = {
      url,
      model: 'gemini-2.5-flash-image',
      data: [{ url }],
    }
    if (payment) result.x402Payment = payment
    return result
  }
  if (payment && typeof data === 'object' && data) {
    ;(data as any).x402Payment = payment
  }
  return data
}

// Free preview (no x402 payment) using Convex HTTP route
export async function generateImagePreview(
  prompt: string,
  size = '1024x1024'
): Promise<{ url: string; model: string }> {
  const resp = await fetch('/api/openrouter/generate-image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, options: { size } }),
  })
  if (!resp.ok) throw new Error(`Preview failed: ${resp.status}`)
  const data = await resp.json()
  const url = data?.url || data?.data?.[0]?.url || ''
  if (!url) throw new Error('No image URL returned in preview')
  return { url, model: data?.model || 'gemini-2.5-flash-image' }
}

/**
 * Get cost estimate for a generation request
 * HUSK: Replace with actual x402 quote API integration
 */
export async function getCostEstimate(
  prompt: string,
  size = '1024x1024'
): Promise<X402Quote> {
  // Use server's configured price from x402 middleware: $0.002 = 0.2 cents
  // Adjustments per size/model could be added later if needed
  const estimatedCost = 0.2
  return {
    estimatedCost,
    quoteId: `quote_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    expiresAt: Date.now() + 300000,
  }
}

/**
 * HUSK: Process payment through x402 protocol
 * This is a placeholder - replace with actual x402 SDK integration
 */
export async function payWithX402(
  prompt: string,
  quote: X402Quote
): Promise<X402Payment> {
  // Execute a minimal paid request via x402 to trigger payment flow.
  // Note: If you also call generateImagePaid*, avoid double-charging by not calling this separately.
  const f = useFetchWithPayment()!
  const resp = await f('/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt || 'Payment authorization' }],
      max_tokens: 1,
    }),
  })

  let txHash = `paid_${Date.now()}`
  let amount = quote.estimatedCost
  let status: X402Payment['status'] = resp.ok ? 'completed' : 'failed'

  try {
    const header = resp.headers.get('x-payment-response')
    if (header) {
      const decoded: any = decodeXPaymentResponse(header as any)
      txHash = decoded?.txHash || txHash
      // If amount is available in USD, convert to cents
      if (decoded?.amountUsd != null) {
        amount = Number(decoded.amountUsd) * 100
      }
    }
  } catch (_) {
    // ignore header parsing issues and fall back to defaults
  }

  return { txHash, status, amount }
}

/**
 * HUSK: Verify payment status on-chain
 * This is a placeholder - replace with actual x402 verification
 */
export async function verifyPayment(txHash: string): Promise<boolean> {
  // Minimal stub: assume success when a tx hash-like string is present.
  // Real verification would query chain or a server endpoint.
  return Boolean(txHash && txHash.length > 0)
}
