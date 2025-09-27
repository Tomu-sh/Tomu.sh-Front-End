import React, { useState } from 'react'
import {
  chatCompletion,
  generateText,
  testLiteLLMIntegration,
  checkLiteLLMHealth,
  getAvailableModels,
} from '../services/litellm'

export default function LiteLLMTest() {
  const [message, setMessage] = useState('')
  const [response, setResponse] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [models, setModels] = useState<any[]>([])
  const [selectedModel, setSelectedModel] = useState('gpt-3.5-turbo')

  const handleTest = async () => {
    setLoading(true)
    setError('')

    try {
      const result = await testLiteLLMIntegration()
      if (result.success) {
        setResponse(result.response || 'Test successful!')
      } else {
        setError(result.error || 'Test failed')
      }
    } catch (err) {
      setError('Test failed: ' + (err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const handleSendMessage = async () => {
    if (!message.trim()) return

    setLoading(true)
    setError('')

    try {
      const result = await generateText(message, {
        model: selectedModel,
        max_tokens: 1000,
      })
      setResponse(result)
    } catch (err) {
      setError('Error: ' + (err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const handleHealthCheck = async () => {
    setLoading(true)
    try {
      const isHealthy = await checkLiteLLMHealth()
      setResponse(
        isHealthy
          ? 'LiteLLM service is healthy!'
          : 'LiteLLM service is not responding'
      )
    } catch (err) {
      setError('Health check failed: ' + (err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const handleLoadModels = async () => {
    setLoading(true)
    try {
      const availableModels = await getAvailableModels()
      setModels(availableModels)
      setResponse(`Loaded ${availableModels.length} models`)
    } catch (err) {
      setError('Failed to load models: ' + (err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className='max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg'>
      <h2 className='text-2xl font-bold mb-6 text-gray-800'>
        LiteLLM Integration Test
      </h2>

      {/* Test Integration Button */}
      <div className='mb-6'>
        <button
          onClick={handleTest}
          disabled={loading}
          className='bg-blue-500 hover:bg-blue-600 disabled:bg-gray-400 text-white px-4 py-2 rounded mr-2'
        >
          {loading ? 'Testing...' : 'Test Integration'}
        </button>

        <button
          onClick={handleHealthCheck}
          disabled={loading}
          className='bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white px-4 py-2 rounded mr-2'
        >
          Health Check
        </button>

        <button
          onClick={handleLoadModels}
          disabled={loading}
          className='bg-purple-500 hover:bg-purple-600 disabled:bg-gray-400 text-white px-4 py-2 rounded'
        >
          Load Models
        </button>
      </div>

      {/* Model Selection */}
      {models.length > 0 && (
        <div className='mb-4'>
          <label className='block text-sm font-medium text-gray-700 mb-2'>
            Select Model:
          </label>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className='w-full p-2 border border-gray-300 rounded-md'
          >
            {models.map((model) => (
              <option key={model.id} value={model.id}>
                {model.name} ({model.provider})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Message Input */}
      <div className='mb-4'>
        <label className='block text-sm font-medium text-gray-700 mb-2'>
          Message:
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder='Enter your message here...'
          className='w-full p-3 border border-gray-300 rounded-md h-24 resize-none'
        />
      </div>

      {/* Send Button */}
      <div className='mb-6'>
        <button
          onClick={handleSendMessage}
          disabled={loading || !message.trim()}
          className='bg-indigo-500 hover:bg-indigo-600 disabled:bg-gray-400 text-white px-6 py-2 rounded'
        >
          {loading ? 'Sending...' : 'Send Message'}
        </button>
      </div>

      {/* Response */}
      {response && (
        <div className='mb-4'>
          <h3 className='text-lg font-semibold text-gray-800 mb-2'>
            Response:
          </h3>
          <div className='bg-gray-100 p-4 rounded-md'>
            <pre className='whitespace-pre-wrap'>{response}</pre>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className='mb-4'>
          <h3 className='text-lg font-semibold text-red-600 mb-2'>Error:</h3>
          <div className='bg-red-100 p-4 rounded-md text-red-700'>{error}</div>
        </div>
      )}

      {/* Available Models List */}
      {models.length > 0 && (
        <div>
          <h3 className='text-lg font-semibold text-gray-800 mb-2'>
            Available Models:
          </h3>
          <div className='bg-gray-50 p-4 rounded-md max-h-40 overflow-y-auto'>
            {models.map((model) => (
              <div key={model.id} className='text-sm text-gray-600 mb-1'>
                <strong>{model.name}</strong> ({model.provider})
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
