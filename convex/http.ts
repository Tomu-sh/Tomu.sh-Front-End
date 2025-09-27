import { auth } from './auth'
import router from './router'
import { httpAction } from './_generated/server'
import OpenAI from 'openai'

const http = router

auth.addHttpRoutes(http)

// OpenRouter API endpoint
http.route({
  path: '/api/openrouter/generate-image',
  method: 'POST',
  handler: httpAction(async (ctx, request) => {
    try {
      // Parse request body
      const body = await request.json()
      const { prompt, options } = body

      if (!prompt) {
        return new Response(JSON.stringify({ error: 'Prompt is required' }), {
          status: 400,
        })
      }

      // Initialize OpenRouter client
      const openRouter = new OpenAI({
        baseURL: 'https://openrouter.ai/api/v1',
        apiKey: process.env.OPENROUTER_API_KEY || 'placeholder_key',
      })

      // Merge options with defaults
      const mergedOptions = {
        model: 'stability.stable-diffusion-xl-1024-v1-0',
        size: '1024x1024',
        quality: 'standard',
        style: 'vivid',
        n: 1,
        ...options,
      }

      // Switch to chat.completions with Gemini 2.5 image model
      const model = 'google/gemini-2.5-flash-image-preview'
      const respRaw = await fetch(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.OPENROUTER_API_KEY || ''}`,
            'HTTP-Referer':
              process.env.CONVEX_SITE_URL || 'http://localhost:3000',
            'X-Title': 'Tomu Gen App',
          },
          body: JSON.stringify({
            model,
            messages: [
              {
                role: 'user',
                content: [
                  { type: 'text', text: `Generate an image: ${prompt}` },
                ],
              },
            ],
          }),
        }
      )
      if (!respRaw.ok) {
        const msg = await respRaw.text()
        return new Response(
          JSON.stringify({
            error: `OpenRouter error ${respRaw.status}: ${msg}`,
          }),
          { status: 500 }
        )
      }
      const response: any = await respRaw.json()

      // Extract image robustly
      const message: any = response?.choices?.[0]?.message
      let imageUrl: string | null = null
      if (message && Array.isArray(message.content)) {
        for (const part of message.content) {
          if (part?.type === 'image_url' && part?.image_url?.url) {
            imageUrl = part.image_url.url
            break
          }
          if (part?.type === 'image' && typeof part?.image_url === 'string') {
            imageUrl = part.image_url
            break
          }
          if (
            part?.type === 'image' &&
            typeof part?.image_base64 === 'string'
          ) {
            imageUrl = `data:image/png;base64,${part.image_base64}`
            break
          }
        }
      }
      if (!imageUrl) {
        return new Response(
          JSON.stringify({ error: 'No image returned from API' }),
          { status: 500 }
        )
      }

      // Return the image URL and metadata
      return new Response(
        JSON.stringify({ url: imageUrl, model, promptId: response.id || '' }),
        { status: 200 }
      )
    } catch (error) {
      console.error('Error generating image:', error)
      return new Response(
        JSON.stringify({
          error: error instanceof Error ? error.message : 'Unknown error',
        }),
        { status: 500 }
      )
    }
  }),
})

// Test endpoint for OpenRouter API
http.route({
  path: '/api/test-openrouter',
  method: 'GET',
  handler: httpAction(async (ctx, request) => {
    try {
      const OpenAI = (await import('openai')).default

      const openRouter = new OpenAI({
        baseURL: 'https://openrouter.ai/api/v1',
        apiKey: process.env.OPENROUTER_API_KEY || 'placeholder_key',
      })

      // Test with the chat.completions endpoint
      const respRaw = await fetch(
        'https://openrouter.ai/api/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${process.env.OPENROUTER_API_KEY || ''}`,
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash-image-preview',
            messages: [
              {
                role: 'user',
                content: [{ type: 'text', text: 'a simple red circle' }],
              },
            ],
          }),
        }
      )
      const resp: any = await respRaw.json()
      const msg: any = resp?.choices?.[0]?.message
      let img: string | null = null
      if (msg && Array.isArray(msg.content)) {
        for (const part of msg.content) {
          if (part?.type === 'image_url' && part?.image_url?.url) {
            img = part.image_url.url
            break
          }
          if (part?.type === 'image' && typeof part?.image_url === 'string') {
            img = part.image_url
            break
          }
          if (
            part?.type === 'image' &&
            typeof part?.image_base64 === 'string'
          ) {
            img = `data:image/png;base64,${part.image_base64}`
            break
          }
        }
      }
      return new Response(JSON.stringify({ success: true, imageUrl: img }), {
        status: 200,
      })
    } catch (error) {
      return new Response(
        JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        }),
        { status: 500 }
      )
    }
  }),
})

export default http
