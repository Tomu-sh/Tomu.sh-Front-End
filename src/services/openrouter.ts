import OpenAI from 'openai'

// Configuration for API client
const useLiteLLM = process.env.VITE_USE_LITELLM === 'true'
const baseURL = useLiteLLM
  ? process.env.VITE_LITELLM_BASE_URL || 'http://localhost:8080/v1'
  : 'https://openrouter.ai/api/v1'
const apiKey = useLiteLLM
  ? process.env.VITE_LITELLM_API_KEY || 'sk-1234'
  : process.env.OPENROUTER_API_KEY || 'placeholder_key'

// OpenRouter API configuration
const openRouter = new OpenAI({
  baseURL,
  apiKey,
  dangerouslyAllowBrowser: true, // Only for development, use server-side in production
})

// Types
export interface ImageGenerationResult {
  url: string
  model: string
  promptId: string
}

export interface ImageGenerationOptions {
  model?: string
  size?: '256x256' | '512x512' | '1024x1024' | '1792x1024' | '1024x1792'
  quality?: 'standard' | 'hd'
  style?: 'vivid' | 'natural'
  n?: number
}

// Default options
const defaultOptions: ImageGenerationOptions = {
  model: 'openai/dall-e-3', // Default model
  size: '1024x1024',
  quality: 'standard',
  style: 'vivid',
  n: 1,
}

/**
 * Generate an image using OpenRouter API
 * @param prompt The text prompt to generate an image from
 * @param options Optional configuration for the image generation
 * @returns Promise with the generated image URL and metadata
 */
export async function generateImage(
  prompt: string,
  options: ImageGenerationOptions = {}
): Promise<ImageGenerationResult> {
  try {
    // Merge default options with provided options
    const mergedOptions = { ...defaultOptions, ...options }

    // Call OpenRouter API (via OpenAI SDK)
    const response = await openRouter.images.generate({
      model: mergedOptions.model,
      prompt,
      n: mergedOptions.n,
      size: mergedOptions.size,
      quality: mergedOptions.quality,
      style: mergedOptions.style,
    })

    // Extract the image URL from the response
    const image = response.data[0]

    if (!image || !image.url) {
      throw new Error('No image was generated')
    }

    return {
      url: image.url,
      model: mergedOptions.model || '',
      promptId: response.created.toString(),
    }
  } catch (error) {
    console.error('Error generating image:', error)
    throw error
  }
}

/**
 * Get cost estimate for image generation
 * @param prompt The text prompt to generate an image from
 * @param options Optional configuration for the image generation
 * @returns Estimated cost in cents
 */
export function getImageGenerationCostEstimate(
  prompt: string,
  options: ImageGenerationOptions = {}
): number {
  // Merge default options with provided options
  const mergedOptions = { ...defaultOptions, ...options }

  // Base cost in cents
  let baseCost = 1

  // Adjust cost based on model
  if (mergedOptions.model?.includes('stable-diffusion-xl')) {
    baseCost = 2
  } else if (mergedOptions.model?.includes('dall-e-3')) {
    baseCost = 4
  }

  // Adjust cost based on size
  if (
    mergedOptions.size === '1024x1024' ||
    mergedOptions.size === '1792x1024' ||
    mergedOptions.size === '1024x1792'
  ) {
    baseCost *= 1.5
  }

  // Adjust cost based on quality
  if (mergedOptions.quality === 'hd') {
    baseCost *= 1.2
  }

  // Adjust cost based on number of images
  baseCost *= mergedOptions.n || 1

  // Return the estimated cost in cents (rounded to nearest cent)
  return Math.round(baseCost * 100)
}

// Available models for image generation
export const availableImageModels = [
  {
    id: 'google/gemini-2.5-flash-image-preview',
    name: 'Gemini 2.5 Flash Image',
    provider: 'Google',
  },
]
