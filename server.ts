import express from 'express'
// Node 18+ has global fetch; no need for node-fetch
import { paymentMiddleware } from 'x402-express'

// Env
const LITELLM_BASE = process.env.LITELLM_BASE || ''
const OPENROUTER_MODEL =
  process.env.OPENROUTER_MODEL || 'openrouter/google/gemini-image'
const RECEIVING_WALLET = process.env.PAY_TO_ADDRESS || ''

const app = express()
app.use(express.json())

// x402 paywall: protect the generation endpoint
app.use(
  paymentMiddleware(
    RECEIVING_WALLET,
    {
      'POST /generate-image': {
        price: '$0.015',
        network: 'base-sepolia',
        config: {
          description: 'AI image generation (per request)',
        },
      },
    },
    {
      url: 'https://x402.org/facilitator',
    }
  )
)

// Dynamic quote endpoint (returns cents and formatted price)
app.post('/quote', async (req, res) => {
  try {
    const { size } = req.body || {}
    const sizeStr = String(size || '1024x1024')
    const sizeToCents: Record<string, number> = {
      '256x256': 1,
      '512x512': 2,
      '1024x1024': 3,
      '1792x1024': 4,
      '1024x1792': 4,
    }
    const cents = sizeToCents[sizeStr] ?? 3
    return res.json({
      cents,
      price: `$${(cents / 100).toFixed(2)}`,
      size: sizeStr,
    })
  } catch (err: any) {
    res.status(500).json({ error: 'Quote error', detail: err?.message })
  }
})

// Paid route: forwards to LiteLLM after payment
app.post('/generate-image', async (req, res) => {
  try {
    const { prompt, size } = req.body || {}

    if (!LITELLM_BASE || !RECEIVING_WALLET) {
      return res.status(500).json({ error: 'Server not configured' })
    }

    const resp = await fetch(`${LITELLM_BASE}/v1/images/generations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: OPENROUTER_MODEL,
        prompt,
        size: size ?? '1024x1024',
      }),
    })

    if (!resp.ok) {
      const text = await resp.text()
      return res.status(500).json({ error: 'Generation failed', detail: text })
    }

    const data = await resp.json()
    res.json(data)
  } catch (err: any) {
    res.status(500).json({ error: 'Server error', detail: err?.message })
  }
})

const port = Number(process.env.PORT || 4021)
app.listen(port, () => console.log(`API with x402 at http://localhost:${port}`))
