import OpenAI from 'openai'

// Utility function to compress base64 image for Convex storage
export function compressBase64Image(
  base64String: string,
  maxSizeKB: number = 500
): string {
  // Remove data URL prefix if present
  const base64Data = base64String.replace(/^data:image\/[a-z]+;base64,/, '')

  // Calculate current size in KB
  const currentSizeKB = (base64Data.length * 0.75) / 1024 // Base64 is ~33% larger than binary

  console.log('Image size check:', {
    originalLength: base64String.length,
    base64Length: base64Data.length,
    currentSizeKB: currentSizeKB.toFixed(2),
    maxSizeKB,
    withinLimits: currentSizeKB <= maxSizeKB,
  })

  if (currentSizeKB <= maxSizeKB) {
    console.log('Image is within limits, returning original')
    return base64String
  }

  console.log('Image is too large, attempting compression...')

  // For now, let's just return the original image and handle compression differently
  // TODO: Implement proper image compression
  console.warn(
    'Image is too large for Convex storage, but returning original for now'
  )
  return base64String
}

// Utility function to check if base64 image is within Convex limits
export function isImageWithinLimits(
  base64String: string,
  maxSizeKB: number = 500
): boolean {
  const base64Data = base64String.replace(/^data:image\/[a-z]+;base64,/, '')
  const currentSizeKB = (base64Data.length * 0.75) / 1024
  return currentSizeKB <= maxSizeKB
}

// LiteLLM proxy configuration
const getEnvVar = (key: string, defaultValue: string): string => {
  if (typeof window !== 'undefined' && (window as any).import?.meta?.env) {
    return (window as any).import.meta.env[key] || defaultValue
  }
  return defaultValue
}

// Use proxy in development to avoid CORS issues
const getBaseUrl = (): string => {
  const envUrl = getEnvVar('VITE_LITELLM_BASE_URL', '')
  if (envUrl) return envUrl

  // In development, use proxy to avoid CORS
  if (
    typeof window !== 'undefined' &&
    window.location.hostname === 'localhost'
  ) {
    return '/api/litellm'
  }

  return 'https://api.tomu.sh/litellm'
}

const litellmClient = new OpenAI({
  baseURL: getBaseUrl() + '/v1',
  apiKey: getEnvVar('VITE_LITELLM_API_KEY', ''),
  dangerouslyAllowBrowser: true, // Only for development
})

// Types for LiteLLM image generation
export interface LiteLLMImageModel {
  id: string
  name: string
  provider: string
  description?: string
  supportsImageGeneration?: boolean
}

export interface LiteLLMImageResponse {
  id: string
  object: string
  created: number
  model: string
  data: Array<{
    url: string
    revised_prompt?: string
    originalSize?: number
    compressed?: boolean
    withinLimits?: boolean
    note?: string
  }>
}

export interface LiteLLMImageOptions {
  model?: string
  size?: '256x256' | '512x512' | '1024x1024' | '1792x1024' | '1024x1792'
  quality?: 'standard' | 'hd'
  style?: 'vivid' | 'natural'
  n?: number
}

// Default options for image generation
const defaultImageOptions: LiteLLMImageOptions = {
  model: 'gemini-2.5-flash-image',
  size: '1024x1024',
  quality: 'standard',
  style: 'vivid',
  n: 1,
}

/**
 * Get available image generation models from LiteLLM proxy
 * @returns Promise with list of available image models
 */
export async function getAvailableImageModels(): Promise<LiteLLMImageModel[]> {
  try {
    const baseUrl = getBaseUrl()
    const response = await fetch(`${baseUrl}/v1/models`)
    const data = await response.json()

    // Filter for image generation models
    return data.data
      .filter(
        (model: any) =>
          model.id.includes('dall-e') ||
          model.id.includes('midjourney') ||
          model.id.includes('stable-diffusion') ||
          model.id.includes('image')
      )
      .map((model: any) => ({
        id: model.id,
        name: model.id,
        provider: model.id.split('/')[0] || 'unknown',
        description: model.description || '',
        supportsImageGeneration: true,
      }))
  } catch (error) {
    console.error('Error fetching image models:', error)
    throw error
  }
}

/**
 * Generate an image using LiteLLM proxy
 * @param prompt The text prompt to generate an image from
 * @param options Optional configuration for the image generation
 * @returns Promise with the generated image response
 */
export async function generateImage(
  prompt: string,
  options: LiteLLMImageOptions = {}
): Promise<LiteLLMImageResponse> {
  try {
    // Use direct fetch to avoid CORS issues with OpenAI client headers
    const baseUrl = getBaseUrl()
    const apiKey = getEnvVar('VITE_LITELLM_API_KEY', '')

    const mergedOptions = { ...defaultImageOptions, ...options }

    console.log('Generating image with options:', {
      baseURL: baseUrl,
      model: mergedOptions.model,
      prompt: prompt.substring(0, 50) + '...',
    })

    const response = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: mergedOptions.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 50,
      }),
    })

    console.log('Response status:', response.status, response.statusText)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('API Error:', errorText)
      throw new Error(
        `API Error: ${response.status} ${response.statusText} - ${errorText}`
      )
    }

    const data = await response.json()
    console.log('API Response:', data)

    // Parse the actual response structure
    const choice = data.choices?.[0]
    const imageData = choice?.message?.images?.[0]?.image_url?.url || ''

    // Extract base64 content (remove data:image/png;base64, prefix if present)
    const base64Content = imageData.startsWith('data:image/png;base64,')
      ? imageData.replace('data:image/png;base64,', '')
      : imageData

    const fullImageUrl = base64Content
      ? `data:image/png;base64,${base64Content}`
      : ''

    // Return full image URL without compression (not storing in Convex)
    console.log('Returning full image URL without compression')

    return {
      id: data.id || 'unknown',
      object: data.object || 'image',
      created: data.created || Date.now(),
      model: data.model || mergedOptions.model!,
      data: fullImageUrl
        ? [
            {
              url: fullImageUrl,
              originalSize: fullImageUrl.length,
              compressed: false,
              withinLimits: false,
              note: 'Not stored in Convex due to size limits',
            },
          ]
        : [],
    }
  } catch (error) {
    console.error('Error generating image:', error)
    console.error('Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      name: error instanceof Error ? error.name : 'Unknown',
    })
    throw error
  }
}

/**
 * Generate a single image URL using LiteLLM proxy
 * @param prompt The text prompt
 * @param options Optional configuration
 * @returns Promise with the generated image URL
 */
export async function generateImageURL(
  prompt: string,
  options: LiteLLMImageOptions = {}
): Promise<string> {
  try {
    // Use direct fetch to avoid CORS issues with OpenAI client headers
    const baseUrl = getBaseUrl()
    const apiKey = getEnvVar('VITE_LITELLM_API_KEY', '')

    const mergedOptions = { ...defaultImageOptions, ...options }

    console.log('Direct fetch to:', `${baseUrl}/v1/chat/completions`)
    console.log('Model being sent:', mergedOptions.model)
    console.log('Prompt:', prompt.substring(0, 50) + '...')

    const response = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: mergedOptions.model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 50,
      }),
    })

    console.log('Response status:', response.status, response.statusText)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('API Error:', errorText)
      throw new Error(
        `API Error: ${response.status} ${response.statusText} - ${errorText}`
      )
    }

    const data = await response.json()
    console.log('API Response:', data)

    // Parse the actual response structure
    const choice = data.choices?.[0]
    console.log('Choice:', choice)
    console.log('Message:', choice?.message)
    console.log('Images:', choice?.message?.images)

    const imageData = choice?.message?.images?.[0]?.image_url?.url || ''
    console.log('Image Data:', imageData?.substring(0, 100) + '...')

    // Extract base64 content (remove data:image/png;base64, prefix if present)
    const base64Content = imageData.startsWith('data:image/png;base64,')
      ? imageData.replace('data:image/png;base64,', '')
      : imageData

    const fullImageUrl = base64Content
      ? `data:image/png;base64,${base64Content}`
      : ''

    console.log('Full Image URL length:', fullImageUrl.length)
    console.log(
      'Full Image URL starts with data:',
      fullImageUrl.startsWith('data:')
    )

    // Return the full image URL without compression since we're not storing in Convex
    console.log('Returning full image URL (not stored in Convex)')

    return fullImageUrl
  } catch (error) {
    console.error('Error generating image URL:', error)
    throw error
  }
}

/**
 * Check if LiteLLM service is healthy
 * @returns Promise with health status
 */
export async function checkLiteLLMHealth(): Promise<boolean> {
  try {
    const baseUrl = getBaseUrl()
    const response = await fetch(`${baseUrl}/health`)
    return response.ok
  } catch (error) {
    console.error('LiteLLM health check failed:', error)
    return false
  }
}

/**
 * Test if the LiteLLM endpoint is reachable
 * @returns Promise with connection test result
 */
export async function testLiteLLMConnection(): Promise<{
  success: boolean
  error?: string
}> {
  try {
    const baseUrl = getBaseUrl()
    console.log('Testing connection to:', baseUrl)

    // Try different endpoints
    const endpoints = ['/health', '/v1/models', '/models']

    for (const endpoint of endpoints) {
      try {
        console.log(`Trying endpoint: ${baseUrl}${endpoint}`)
        const response = await fetch(`${baseUrl}${endpoint}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${getEnvVar('VITE_LITELLM_API_KEY', '')}`,
          },
        })

        console.log(
          `Response from ${endpoint}:`,
          response.status,
          response.statusText
        )

        if (response.ok) {
          return { success: true }
        }
      } catch (endpointError) {
        console.log(`Endpoint ${endpoint} failed:`, endpointError)
        continue
      }
    }

    return {
      success: false,
      error: 'All endpoints failed - service may be down or unreachable',
    }
  } catch (error) {
    console.error('Connection test failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Connection test failed',
    }
  }
}

/**
 * Test the LiteLLM image generation integration with direct fetch
 * @returns Promise with test result
 */
export async function testLiteLLMImageIntegration(): Promise<{
  success: boolean
  imageUrl?: string
  error?: string
}> {
  try {
    // Try direct fetch first to bypass potential OpenAI client issues
    const baseUrl = getBaseUrl()
    const apiKey = getEnvVar('VITE_LITELLM_API_KEY', '')

    console.log('Testing direct fetch to:', `${baseUrl}/v1/chat/completions`)

    const response = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gemini-2.5-flash-image',
        messages: [
          {
            role: 'user',
            content: 'A simple red circle on a white background',
          },
        ],
        max_tokens: 50,
      }),
    })

    console.log('Direct fetch response:', response.status, response.statusText)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('API Error:', errorText)
      return {
        success: false,
        error: `API Error: ${response.status} ${response.statusText} - ${errorText}`,
      }
    }

    const data = await response.json()
    console.log('API Response:', data)

    // Parse the actual response structure
    const choice = data.choices?.[0]
    const imageData = choice?.message?.images?.[0]?.image_url?.url || ''

    // Extract base64 content (remove data:image/png;base64, prefix if present)
    const base64Content = imageData.startsWith('data:image/png;base64,')
      ? imageData.replace('data:image/png;base64,', '')
      : imageData

    const fullImageUrl = base64Content
      ? `data:image/png;base64,${base64Content}`
      : ''

    const imageUrl = fullImageUrl || 'No image generated'

    return {
      success: true,
      imageUrl,
    }
  } catch (error) {
    console.error('Direct fetch test failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    }
  }
}

// Available image generation models
export const availableImageModels = [
  {
    id: 'gemini-2.5-flash-image',
    name: 'Google Gemini 2.5 Flash Image',
    provider: 'Google',
    supportsImageGeneration: true,
  },
  {
    id: 'dall-e-3',
    name: 'DALL-E 3',
    provider: 'OpenAI',
    supportsImageGeneration: true,
  },
  {
    id: 'dall-e-2',
    name: 'DALL-E 2',
    provider: 'OpenAI',
    supportsImageGeneration: true,
  },
  {
    id: 'midjourney',
    name: 'Midjourney',
    provider: 'Midjourney',
    supportsImageGeneration: true,
  },
  {
    id: 'stable-diffusion-xl',
    name: 'Stable Diffusion XL',
    provider: 'Stability AI',
    supportsImageGeneration: true,
  },
]
