import OpenAI from 'openai'

// LiteLLM proxy configuration
const litellmClient = new OpenAI({
  baseURL: process.env.VITE_LITELLM_BASE_URL || 'http://localhost:8080/v1',
  apiKey: process.env.VITE_LITELLM_API_KEY || 'sk-1234', // LiteLLM master key
  dangerouslyAllowBrowser: true, // Only for development
})

// Types for LiteLLM integration
export interface LiteLLMModel {
  id: string
  name: string
  provider: string
  description?: string
}

export interface LiteLLMResponse {
  id: string
  object: string
  created: number
  model: string
  choices: Array<{
    index: number
    message: {
      role: string
      content: string
    }
    finish_reason: string
  }>
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

export interface LiteLLMOptions {
  model?: string
  max_tokens?: number
  temperature?: number
  top_p?: number
  frequency_penalty?: number
  presence_penalty?: number
}

// Default options
const defaultOptions: LiteLLMOptions = {
  model: 'gpt-3.5-turbo',
  max_tokens: 1000,
  temperature: 0.7,
  top_p: 1,
  frequency_penalty: 0,
  presence_penalty: 0,
}

/**
 * Get available models from LiteLLM proxy
 * @returns Promise with list of available models
 */
export async function getAvailableModels(): Promise<LiteLLMModel[]> {
  try {
    const response = await fetch(
      `${process.env.VITE_LITELLM_BASE_URL || 'http://localhost:8080'}/v1/models`
    )
    const data = await response.json()

    return data.data.map((model: any) => ({
      id: model.id,
      name: model.id,
      provider: model.id.split('/')[0] || 'unknown',
      description: model.description || '',
    }))
  } catch (error) {
    console.error('Error fetching models:', error)
    throw error
  }
}

/**
 * Send a chat completion request through LiteLLM proxy
 * @param messages Array of message objects
 * @param options Optional configuration
 * @returns Promise with the completion response
 */
export async function chatCompletion(
  messages: Array<{ role: string; content: string }>,
  options: LiteLLMOptions = {}
): Promise<LiteLLMResponse> {
  try {
    const mergedOptions = { ...defaultOptions, ...options }

    const response = await litellmClient.chat.completions.create({
      model: mergedOptions.model!,
      messages,
      max_tokens: mergedOptions.max_tokens,
      temperature: mergedOptions.temperature,
      top_p: mergedOptions.top_p,
      frequency_penalty: mergedOptions.frequency_penalty,
      presence_penalty: mergedOptions.presence_penalty,
    })

    return response as LiteLLMResponse
  } catch (error) {
    console.error('Error in chat completion:', error)
    throw error
  }
}

/**
 * Generate text using LiteLLM proxy
 * @param prompt The text prompt
 * @param options Optional configuration
 * @returns Promise with the generated text
 */
export async function generateText(
  prompt: string,
  options: LiteLLMOptions = {}
): Promise<string> {
  try {
    const response = await chatCompletion(
      [{ role: 'user', content: prompt }],
      options
    )

    return response.choices[0]?.message?.content || ''
  } catch (error) {
    console.error('Error generating text:', error)
    throw error
  }
}

/**
 * Check if LiteLLM service is healthy
 * @returns Promise with health status
 */
export async function checkLiteLLMHealth(): Promise<boolean> {
  try {
    const response = await fetch(
      `${process.env.VITE_LITELLM_BASE_URL || 'http://localhost:8080'}/health`
    )
    return response.ok
  } catch (error) {
    console.error('LiteLLM health check failed:', error)
    return false
  }
}

// Available models (these will be populated from the proxy)
export const availableModels = [
  {
    id: 'gpt-3.5-turbo',
    name: 'GPT-3.5 Turbo',
    provider: 'OpenAI',
  },
  {
    id: 'gpt-4',
    name: 'GPT-4',
    provider: 'OpenAI',
  },
  {
    id: 'claude-3-haiku',
    name: 'Claude 3 Haiku',
    provider: 'Anthropic',
  },
  {
    id: 'llama-3.1-8b',
    name: 'Llama 3.1 8B',
    provider: 'Meta',
  },
]
