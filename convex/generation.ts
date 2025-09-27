import { mutation, query, action, internalMutation } from './_generated/server'
import { v } from 'convex/values'
import { getAuthUserId } from '@convex-dev/auth/server'
import { internal } from './_generated/api'
;('use node')
// Internal mutation to upsert a transaction row
export const logTransaction = internalMutation({
  args: {
    txHash: v.string(),
    amount: v.number(),
    prompt: v.string(),
    status: v.union(
      v.literal('pending'),
      v.literal('completed'),
      v.literal('failed')
    ),
    generationType: v.optional(v.union(v.literal('text'), v.literal('image'))),
    options: v.optional(v.any()),
    result: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      return
    }
    // Try find an existing tx by txHash
    const existing = await ctx.db
      .query('transactions')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .collect()
    const match = existing.find((t) => t.txHash === args.txHash)
    if (match) {
      await ctx.db.patch(match._id, {
        amount: args.amount,
        prompt: args.prompt,
        status: args.status,
        generationType: args.generationType,
        options: args.options,
        result: args.result,
      })
      return
    }
    await ctx.db.insert('transactions', {
      userId,
      txHash: args.txHash,
      amount: args.amount,
      prompt: args.prompt,
      status: args.status,
      generationType: args.generationType,
      options: args.options as any,
      result: args.result,
    })
  },
})
export const processGeneration = action({
  args: {
    prompt: v.string(),
    estimatedCost: v.number(),
    generationType: v.union(v.literal('text'), v.literal('image')),
    options: v.optional(
      v.object({
        model: v.optional(v.string()),
        size: v.optional(
          v.union(
            v.literal('256x256'),
            v.literal('512x512'),
            v.literal('1024x1024'),
            v.literal('1792x1024'),
            v.literal('1024x1792')
          )
        ),
        quality: v.optional(v.union(v.literal('standard'), v.literal('hd'))),
        style: v.optional(v.union(v.literal('vivid'), v.literal('natural'))),
      })
    ),
    txHash: v.optional(v.string()),
  },
  returns: v.object({
    txHash: v.string(),
    result: v.string(),
    newBalance: v.number(),
  }),
  handler: async (ctx, args) => {
    // Use provided txHash (from on-chain payment) or synthesize one
    const txHash =
      args.txHash ?? '0x' + Math.random().toString(16).substring(2, 66)

    // Create a pending transaction record
    await ctx.runMutation(internal.generation.logTransaction, {
      txHash,
      amount: args.estimatedCost,
      prompt: args.prompt,
      status: 'pending',
      generationType: args.generationType,
      options: args.options || {},
      result: undefined,
    })

    // Generate content based on type
    let result

    if (args.generationType === 'image') {
      // Call OpenRouter API directly for image generation
      try {
        console.log('=== STARTING IMAGE GENERATION ===')
        console.log('Generation type:', args.generationType)
        console.log('Prompt:', args.prompt)
        console.log('Options:', args.options)

        // Use raw fetch against OpenRouter to avoid SDK type friction
        const apiKey = process.env.OPENROUTER_API_KEY || ''
        console.log('API Key exists:', !!apiKey)
        if (!apiKey) throw new Error('OPENROUTER_API_KEY not set')

        // Use a model that supports image generation on OpenRouter
        const model =
          args.options?.model || 'google/gemini-2.5-flash-image-preview'

        // Use chat completions API for Gemini models, images API for others
        const isGeminiModel = model.includes('gemini')

        console.log('Generating image with prompt:', args.prompt)
        console.log('Using model:', model)
        console.log('Is Gemini model:', isGeminiModel)
        const endpoint = isGeminiModel
          ? 'https://openrouter.ai/api/v1/chat/completions'
          : 'https://openrouter.ai/api/v1/images/generations'

        const requestBody = isGeminiModel
          ? {
              model,
              messages: [
                {
                  role: 'user',
                  content: [
                    {
                      type: 'text',
                      text: `Generate an image: ${args.prompt}`,
                    },
                  ],
                },
              ],
              max_tokens: 1000,
            }
          : {
              model,
              prompt: args.prompt,
              n: 1,
              size: args.options?.size || '1024x1024',
              quality: args.options?.quality || 'standard',
              style: args.options?.style || 'vivid',
            }

        console.log('About to make API call...')
        console.log('Endpoint:', endpoint)
        console.log('Request body:', JSON.stringify(requestBody, null, 2))

        const responseRaw = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${apiKey}`,
            // Optional but recommended headers per OpenRouter docs
            'HTTP-Referer':
              process.env.CONVEX_SITE_URL || 'http://localhost:3000',
            'X-Title': 'Tomu Gen App',
          },
          body: JSON.stringify(requestBody),
        })

        console.log('API call completed, status:', responseRaw.status)

        console.log('Response status:', responseRaw.status)
        console.log('Response headers:', responseRaw.headers)

        if (!responseRaw.ok) {
          const errTxt = await responseRaw.text()
          console.error('API Error Response:', errTxt)
          throw new Error(`OpenRouter error ${responseRaw.status}: ${errTxt}`)
        }

        const response = (await responseRaw.json()) as any
        console.log('Full API Response:', JSON.stringify(response, null, 2))

        // Extract the image URL from the response
        let imageUrl: string | null = null

        if (isGeminiModel) {
          // Parse Gemini chat completion response
          console.log('Parsing Gemini response...')
          const message = response?.choices?.[0]?.message
          console.log('Message:', JSON.stringify(message, null, 2))

          if (!message) {
            throw new Error('No message returned from Gemini API')
          }

          // Check for images array first (Gemini 2.5 Flash Image format)
          if (
            message.images &&
            Array.isArray(message.images) &&
            message.images.length > 0
          ) {
            console.log('Found images array:', message.images)
            const imageData = message.images[0]
            if (imageData?.image_url?.url) {
              imageUrl = imageData.image_url.url
              console.log('Found image in images array:', imageUrl)
            }
          } else {
            // Fallback to content parsing
            const contentAny: any = message.content
            console.log('Content:', JSON.stringify(contentAny, null, 2))

            if (Array.isArray(contentAny)) {
              for (const part of contentAny) {
                console.log('Processing part:', JSON.stringify(part, null, 2))
                // Look for image_url pattern
                if (part?.type === 'image_url' && part?.image_url?.url) {
                  imageUrl = part.image_url.url
                  console.log('Found image_url:', imageUrl)
                  break
                }
                // Some providers return { type: 'image', image_url: '...' }
                if (
                  part?.type === 'image' &&
                  typeof part?.image_url === 'string'
                ) {
                  imageUrl = part.image_url
                  console.log('Found image string:', imageUrl)
                  break
                }
                // Base64 image fallback
                if (
                  part?.type === 'image' &&
                  typeof part?.image_base64 === 'string'
                ) {
                  imageUrl = `data:image/png;base64,${part.image_base64}`
                  console.log('Found base64 image')
                  break
                }
              }
            } else if (typeof contentAny === 'string') {
              // Handle case where content is a direct base64 string
              console.log('Content is string, checking for base64...')
              if (
                contentAny.startsWith('data:image/') ||
                contentAny.includes('base64')
              ) {
                imageUrl = contentAny
                console.log('Found direct base64 string')
              } else if (contentAny.length > 1000) {
                // Very long string is likely base64 image data
                imageUrl = `data:image/png;base64,${contentAny}`
                console.log('Found long base64 string, converting to data URL')
              }
            }
          }
        } else {
          // Parse standard images API response
          if (
            !response.data ||
            !Array.isArray(response.data) ||
            response.data.length === 0
          ) {
            throw new Error('No image data returned from OpenRouter API')
          }

          const image = response.data[0]
          if (!image || !image.url) {
            throw new Error('No image URL found in OpenRouter response')
          }
          imageUrl = image.url
        }

        console.log('Final imageUrl:', imageUrl)

        if (!imageUrl) {
          throw new Error('No image returned from OpenRouter response')
        }

        // Store the full image data for display in transaction history
        result = JSON.stringify({
          url: imageUrl,
          model,
          promptId:
            response.created?.toString() ||
            response.id?.toString() ||
            Date.now().toString(),
          isBase64: imageUrl && imageUrl.startsWith('data:image/'),
        })

        console.log('Final result:', result)
      } catch (error) {
        console.error('Error generating image:', error)
        console.error('Error details:', {
          message: error instanceof Error ? error.message : 'Unknown error',
          stack: error instanceof Error ? error.stack : undefined,
          prompt: args.prompt,
          options: args.options,
        })

        // Fall back to a placeholder image if the API call fails
        result = JSON.stringify({
          url: 'https://placehold.co/1024x1024/EEE/31343C?text=Generated+Image',
          model: args.options?.model || 'openai/dall-e-3',
          promptId: Date.now().toString(),
        })
      }
    } else {
      // Text generation (mock for now)
      await new Promise((resolve) => setTimeout(resolve, 2000))
      result = `Generated result for: "${args.prompt}" - A beautiful AI-generated creation based on your prompt!`
    }

    // Store the full result in the database
    // The full base64 image data will be stored for transaction history display
    await ctx.runMutation(internal.generation.logTransaction, {
      txHash,
      amount: args.estimatedCost,
      prompt: args.prompt,
      status: 'completed',
      generationType: args.generationType,
      options: args.options || {},
      result,
    })

    return {
      txHash,
      result,
      newBalance: 0, // Balance is managed by RainbowKit wallet, not Convex
    }
  },
})

// Action to generate an image using OpenRouter API
;('use node')
export const generateImage = action({
  args: {
    prompt: v.string(),
    options: v.optional(
      v.object({
        model: v.optional(v.string()),
        size: v.optional(
          v.union(
            v.literal('256x256'),
            v.literal('512x512'),
            v.literal('1024x1024'),
            v.literal('1792x1024'),
            v.literal('1024x1792')
          )
        ),
        quality: v.optional(v.union(v.literal('standard'), v.literal('hd'))),
        style: v.optional(v.union(v.literal('vivid'), v.literal('natural'))),
      })
    ),
  },
  returns: v.object({
    url: v.string(),
    model: v.string(),
    promptId: v.string(),
  }),
  handler: async (ctx, args) => {
    try {
      // Import OpenAI at the top of the function to avoid issues
      const OpenAI = (await import('openai')).default

      // Initialize OpenRouter client
      const openRouter = new OpenAI({
        baseURL: 'https://openrouter.ai/api/v1',
        apiKey: process.env.OPENROUTER_API_KEY || 'placeholder_key',
      })

      // Merge options with defaults
      const mergedOptions = {
        model: 'google/gemini-2.5-flash-image-preview',
        size: '1024x1024',
        quality: 'standard',
        style: 'vivid',
        n: 1,
        ...args.options,
      }

      // Call OpenRouter API directly
      const response = await openRouter.images.generate({
        model: mergedOptions.model,
        prompt: args.prompt,
        n: mergedOptions.n,
        size: mergedOptions.size as
          | '256x256'
          | '512x512'
          | '1024x1024'
          | '1792x1024'
          | '1024x1792',
        quality: mergedOptions.quality as 'standard' | 'hd',
        style: mergedOptions.style as 'vivid' | 'natural',
      })

      // Extract the image URL from the response with proper null checks
      if (
        !response.data ||
        !Array.isArray(response.data) ||
        response.data.length === 0
      ) {
        throw new Error('No image data returned from OpenRouter API')
      }

      const image = response.data[0]

      if (!image || !image.url) {
        throw new Error('No image URL found in OpenRouter response')
      }

      return {
        url: image.url,
        model: mergedOptions.model,
        promptId: response.created.toString(),
      }
    } catch (error) {
      console.error('Error generating image:', error)

      // Fall back to a placeholder image if the API call fails
      return {
        url: 'https://placehold.co/1024x1024/EEE/31343C?text=Generated+Image',
        model: args.options?.model || 'stability.stable-diffusion-xl-1024-v1-0',
        promptId: Date.now().toString(),
      }
    }
  },
})

export const getTransactionHistory = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx)
    if (!userId) {
      return []
    }

    return await ctx.db
      .query('transactions')
      .withIndex('by_user', (q) => q.eq('userId', userId))
      .order('desc')
      .take(10)
  },
})
