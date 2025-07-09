# Custom LLM Integration

## Problem

When using custom LLM providers, local models, or proprietary AI services, you need a flexible way to track user feedback regardless of the underlying model architecture. This guide shows how to integrate Bilan with any LLM provider.

## Installation

```bash
npm install @mocksi/bilan-sdk
```

## Integration Patterns

### 1. Basic LLM Wrapper

```typescript
// lib/llm-wrapper.ts
import { init } from '@mocksi/bilan-sdk'
import { generateId } from 'crypto'

export interface LLMProvider {
  name: string
  generateResponse(prompt: string, options?: any): Promise<string>
  generateStreamingResponse?(prompt: string, options?: any): AsyncIterable<string>
}

export interface TrackedLLMResponse {
  content: string
  promptId: string
  provider: string
  metadata: Record<string, any>
}

export class TrackedLLM {
  private provider: LLMProvider
  private bilan: any

  constructor(provider: LLMProvider) {
    this.provider = provider
    this.initBilan()
  }

  private async initBilan() {
    this.bilan = await init({
      mode: 'local',
      userId: 'user-123',
      telemetry: { enabled: true }
    })
  }

  async generateResponse(
    prompt: string,
    options: any = {}
  ): Promise<TrackedLLMResponse> {
    const promptId = generateId()
    const startTime = Date.now()

    try {
      const content = await this.provider.generateResponse(prompt, options)
      const endTime = Date.now()

      return {
        content,
        promptId,
        provider: this.provider.name,
        metadata: {
          prompt: prompt.substring(0, 100), // First 100 chars for context
          responseTime: endTime - startTime,
          timestamp: startTime,
          options
        }
      }
    } catch (error) {
      console.error(`${this.provider.name} error:`, error)
      throw error
    }
  }

  async generateStreamingResponse(
    prompt: string,
    options: any = {}
  ): Promise<{
    promptId: string
    provider: string
    stream: AsyncIterable<string>
    metadata: Record<string, any>
  }> {
    if (!this.provider.generateStreamingResponse) {
      throw new Error(`${this.provider.name} does not support streaming`)
    }

    const promptId = generateId()
    const startTime = Date.now()

    const stream = this.provider.generateStreamingResponse(prompt, options)

    return {
      promptId,
      provider: this.provider.name,
      stream,
      metadata: {
        prompt: prompt.substring(0, 100),
        timestamp: startTime,
        options,
        streaming: true
      }
    }
  }

  async submitFeedback(promptId: string, value: 1 | -1, comment?: string) {
    const { vote } = await import('@mocksi/bilan-sdk')
    return vote(promptId, value, comment)
  }
}
```

### 2. Ollama Integration

```typescript
// lib/providers/ollama.ts
import { LLMProvider } from '../llm-wrapper'

export class OllamaProvider implements LLMProvider {
  name = 'ollama'
  private baseUrl: string
  private model: string

  constructor(baseUrl = 'http://localhost:11434', model = 'llama2') {
    this.baseUrl = baseUrl
    this.model = model
  }

  async generateResponse(prompt: string, options: any = {}): Promise<string> {
    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.model,
        prompt,
        stream: false,
        options: {
          temperature: options.temperature || 0.7,
          top_p: options.top_p || 0.9,
          ...options
        }
      })
    })

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`)
    }

    const data = await response.json()
    return data.response
  }

  async* generateStreamingResponse(prompt: string, options: any = {}): AsyncIterable<string> {
    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.model,
        prompt,
        stream: true,
        options: {
          temperature: options.temperature || 0.7,
          top_p: options.top_p || 0.9,
          ...options
        }
      })
    })

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`)
    }

    const reader = response.body?.getReader()
    if (!reader) throw new Error('No response body')

    const decoder = new TextDecoder()
    let buffer = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.trim()) {
            try {
              const data = JSON.parse(line)
              if (data.response) {
                yield data.response
              }
            } catch (e) {
              console.warn('Failed to parse streaming response:', line)
            }
          }
        }
      }
    } finally {
      reader.releaseLock()
    }
  }
}
```

### 3. Hugging Face Integration

```typescript
// lib/providers/huggingface.ts
import { LLMProvider } from '../llm-wrapper'

export class HuggingFaceProvider implements LLMProvider {
  name = 'huggingface'
  private apiKey: string
  private model: string

  constructor(apiKey: string, model = 'microsoft/DialoGPT-large') {
    this.apiKey = apiKey
    this.model = model
  }

  async generateResponse(prompt: string, options: any = {}): Promise<string> {
    const response = await fetch(
      `https://api-inference.huggingface.co/models/${this.model}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            temperature: options.temperature || 0.7,
            max_new_tokens: options.max_tokens || 100,
            top_p: options.top_p || 0.9,
            ...options
          }
        })
      }
    )

    if (!response.ok) {
      throw new Error(`Hugging Face API error: ${response.statusText}`)
    }

    const data = await response.json()
    
    // Handle different response formats
    if (Array.isArray(data)) {
      return data[0]?.generated_text || data[0]?.text || ''
    }
    
    return data.generated_text || data.text || ''
  }
}
```

### 4. Local Model Integration (via Python API)

```typescript
// lib/providers/local-model.ts
import { LLMProvider } from '../llm-wrapper'

export class LocalModelProvider implements LLMProvider {
  name = 'local-model'
  private apiUrl: string

  constructor(apiUrl = 'http://localhost:8000') {
    this.apiUrl = apiUrl
  }

  async generateResponse(prompt: string, options: any = {}): Promise<string> {
    const response = await fetch(`${this.apiUrl}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt,
        temperature: options.temperature || 0.7,
        max_tokens: options.max_tokens || 100,
        ...options
      })
    })

    if (!response.ok) {
      throw new Error(`Local model API error: ${response.statusText}`)
    }

    const data = await response.json()
    return data.response
  }

  async* generateStreamingResponse(prompt: string, options: any = {}): AsyncIterable<string> {
    const response = await fetch(`${this.apiUrl}/generate_stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt,
        temperature: options.temperature || 0.7,
        max_tokens: options.max_tokens || 100,
        ...options
      })
    })

    if (!response.ok) {
      throw new Error(`Local model API error: ${response.statusText}`)
    }

    const reader = response.body?.getReader()
    if (!reader) throw new Error('No response body')

    const decoder = new TextDecoder()

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data.trim() === '[DONE]') return
            
            try {
              const parsed = JSON.parse(data)
              if (parsed.token) {
                yield parsed.token
              }
            } catch (e) {
              console.warn('Failed to parse streaming data:', data)
            }
          }
        }
      }
    } finally {
      reader.releaseLock()
    }
  }
}
```

### 5. Multi-Provider Chat Component

```typescript
// components/CustomLLMChat.tsx
'use client'

import { useState, useEffect } from 'react'
import { TrackedLLM } from '@/lib/llm-wrapper'
import { OllamaProvider } from '@/lib/providers/ollama'
import { HuggingFaceProvider } from '@/lib/providers/huggingface'
import { LocalModelProvider } from '@/lib/providers/local-model'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  promptId?: string
  provider?: string
  metadata?: Record<string, any>
}

export default function CustomLLMChat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [feedbackStates, setFeedbackStates] = useState<Record<string, 1 | -1>>({})
  const [selectedProvider, setSelectedProvider] = useState<string>('ollama')
  const [llmInstance, setLlmInstance] = useState<TrackedLLM | null>(null)

  const providers = [
    { id: 'ollama', name: 'Ollama (Local)', description: 'Local Ollama instance' },
    { id: 'huggingface', name: 'Hugging Face', description: 'Hugging Face Inference API' },
    { id: 'local', name: 'Local Model', description: 'Custom local model API' }
  ]

  useEffect(() => {
    const initProvider = () => {
      let provider
      
      switch (selectedProvider) {
        case 'ollama':
          provider = new OllamaProvider('http://localhost:11434', 'llama2')
          break
        case 'huggingface':
          provider = new HuggingFaceProvider(process.env.NEXT_PUBLIC_HF_API_KEY || '', 'microsoft/DialoGPT-large')
          break
        case 'local':
          provider = new LocalModelProvider('http://localhost:8000')
          break
        default:
          provider = new OllamaProvider()
      }
      
      setLlmInstance(new TrackedLLM(provider))
    }

    initProvider()
  }, [selectedProvider])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading || !llmInstance) return

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const response = await llmInstance.generateResponse(input, {
        temperature: 0.7,
        max_tokens: 200
      })

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response.content,
        promptId: response.promptId,
        provider: response.provider,
        metadata: response.metadata
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error('Failed to get response:', error)
      
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: `Sorry, I encountered an error with ${selectedProvider}. Please try again.`
      }
      
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleFeedback = async (promptId: string, value: 1 | -1, comment?: string) => {
    if (!llmInstance) return

    try {
      await llmInstance.submitFeedback(promptId, value, comment)
      setFeedbackStates(prev => ({ ...prev, [promptId]: value }))
    } catch (error) {
      console.error('Failed to submit feedback:', error)
    }
  }

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto p-4">
      {/* Provider selector */}
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Select LLM Provider:</label>
        <select
          value={selectedProvider}
          onChange={(e) => setSelectedProvider(e.target.value)}
          className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isLoading}
        >
          {providers.map(provider => (
            <option key={provider.id} value={provider.id}>
              {provider.name} - {provider.description}
            </option>
          ))}
        </select>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 mb-4">
        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
              message.role === 'user' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-200 text-gray-900'
            }`}>
              <p className="whitespace-pre-wrap">{message.content}</p>
              
              {/* Provider info */}
              {message.role === 'assistant' && message.provider && (
                <div className="mt-2 text-xs text-gray-500">
                  Provider: {message.provider}
                  {message.metadata?.responseTime && (
                    <span className="ml-2">
                      ({message.metadata.responseTime}ms)
                    </span>
                  )}
                </div>
              )}
              
              {/* Feedback buttons */}
              {message.role === 'assistant' && message.promptId && (
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => handleFeedback(message.promptId!, 1)}
                    className={`text-sm px-2 py-1 rounded ${
                      feedbackStates[message.promptId] === 1
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    👍 Good
                  </button>
                  <button
                    onClick={() => handleFeedback(message.promptId!, -1)}
                    className={`text-sm px-2 py-1 rounded ${
                      feedbackStates[message.promptId] === -1
                        ? 'bg-red-500 text-white'
                        : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    👎 Bad
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-200 text-gray-900 px-4 py-2 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="animate-spin h-4 w-4 border-2 border-gray-600 border-t-transparent rounded-full"></div>
                Generating response with {selectedProvider}...
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input form */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message..."
          className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim() || !llmInstance}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  )
}
```

### 6. Provider Performance Comparison

```typescript
// lib/provider-comparison.ts
import { TrackedLLM } from './llm-wrapper'
import { getStats } from '@mocksi/bilan-sdk'

export interface ProviderMetrics {
  name: string
  averageResponseTime: number
  trustScore: number
  totalRequests: number
  errorRate: number
}

export class ProviderComparison {
  private providers: Map<string, TrackedLLM> = new Map()
  private metrics: Map<string, ProviderMetrics> = new Map()

  addProvider(name: string, llm: TrackedLLM) {
    this.providers.set(name, llm)
    this.metrics.set(name, {
      name,
      averageResponseTime: 0,
      trustScore: 0,
      totalRequests: 0,
      errorRate: 0
    })
  }

  async testProviders(testPrompts: string[]): Promise<ProviderMetrics[]> {
    const results: ProviderMetrics[] = []

    for (const [name, llm] of this.providers) {
      const metrics = await this.testProvider(name, llm, testPrompts)
      results.push(metrics)
    }

    return results.sort((a, b) => b.trustScore - a.trustScore)
  }

  private async testProvider(
    name: string,
    llm: TrackedLLM,
    testPrompts: string[]
  ): Promise<ProviderMetrics> {
    let totalResponseTime = 0
    let successCount = 0
    let errorCount = 0

    for (const prompt of testPrompts) {
      try {
        const startTime = Date.now()
        await llm.generateResponse(prompt)
        const endTime = Date.now()
        
        totalResponseTime += (endTime - startTime)
        successCount++
      } catch (error) {
        errorCount++
      }
    }

    const stats = await getStats()
    
    return {
      name,
      averageResponseTime: totalResponseTime / (successCount || 1),
      trustScore: stats.trustScore,
      totalRequests: successCount + errorCount,
      errorRate: errorCount / (successCount + errorCount || 1)
    }
  }
}
```

## Testing

### 1. Test custom provider

```typescript
// Test your custom provider
import { TrackedLLM } from '@/lib/llm-wrapper'
import { OllamaProvider } from '@/lib/providers/ollama'

const provider = new OllamaProvider()
const llm = new TrackedLLM(provider)

const response = await llm.generateResponse('Hello, how are you?')
console.log('Response:', response)
```

### 2. Test streaming

```typescript
const streamResponse = await llm.generateStreamingResponse('Tell me a story')

for await (const chunk of streamResponse.stream) {
  console.log('Chunk:', chunk)
}
```

### 3. Test feedback

```typescript
await llm.submitFeedback('prompt-id-123', 1, 'Great response from local model!')
```

## Advanced Features

### Model Routing

```typescript
// lib/model-router.ts
import { TrackedLLM } from './llm-wrapper'
import { getStats } from '@mocksi/bilan-sdk'

export class ModelRouter {
  private models: Map<string, TrackedLLM> = new Map()
  private fallbackModel: string

  constructor(fallbackModel: string) {
    this.fallbackModel = fallbackModel
  }

  addModel(name: string, llm: TrackedLLM) {
    this.models.set(name, llm)
  }

  async route(prompt: string, options: any = {}): Promise<any> {
    const stats = await getStats()
    
    // Route based on trust score
    let selectedModel = this.fallbackModel
    
    if (stats.trustScore < 0.6) {
      selectedModel = 'gpt-4' // Use better model for low trust
    } else if (stats.trustScore > 0.8) {
      selectedModel = 'local-model' // Use local model for high trust
    }

    const llm = this.models.get(selectedModel)
    if (!llm) {
      throw new Error(`Model ${selectedModel} not found`)
    }

    return llm.generateResponse(prompt, options)
  }
}
```

### Prompt Engineering Helper

```typescript
// lib/prompt-engineering.ts
import { TrackedLLM } from './llm-wrapper'

export class PromptEngineer {
  private llm: TrackedLLM

  constructor(llm: TrackedLLM) {
    this.llm = llm
  }

  async testPromptVariations(
    basePrompt: string,
    variations: string[],
    testInput: string
  ): Promise<Array<{
    variation: string
    response: string
    promptId: string
  }>> {
    const results = []

    for (const variation of variations) {
      const fullPrompt = `${basePrompt}\n\n${variation}\n\nInput: ${testInput}`
      
      try {
        const response = await this.llm.generateResponse(fullPrompt)
        results.push({
          variation,
          response: response.content,
          promptId: response.promptId
        })
      } catch (error) {
        console.error(`Failed to test variation: ${variation}`, error)
      }
    }

    return results
  }
}
```

## Next Steps

- **[Server Mode](../server-mode.md)** - Scale custom providers
- **[Advanced Analytics](../advanced-analytics.md)** - Compare provider performance
- **[A/B Testing](../ab-testing.md)** - Test different models
- **[Custom Storage](../custom-storage.md)** - Store provider metrics

## Common Issues

**Q: Provider not responding?**
A: Check network connectivity and API endpoints.

**Q: Streaming not working?**
A: Ensure your provider implements the streaming interface correctly.

**Q: High latency?**
A: Consider local model deployment or caching strategies.

**Q: Inconsistent responses?**
A: Implement proper error handling and fallback mechanisms.

## Example Python API Server

```python
# server.py - Simple Flask API for local models
from flask import Flask, request, jsonify, Response
import json
import time

app = Flask(__name__)

# Mock model - replace with your actual model
class MockModel:
    def generate(self, prompt, temperature=0.7, max_tokens=100):
        # Simulate processing time
        time.sleep(0.5)
        return f"Mock response to: {prompt[:50]}..."
    
    def generate_stream(self, prompt, temperature=0.7, max_tokens=100):
        # Simulate streaming
        words = f"Mock streaming response to: {prompt[:50]}...".split()
        for word in words:
            time.sleep(0.1)
            yield word + " "

model = MockModel()

@app.route('/generate', methods=['POST'])
def generate():
    data = request.json
    prompt = data.get('prompt', '')
    temperature = data.get('temperature', 0.7)
    max_tokens = data.get('max_tokens', 100)
    
    try:
        response = model.generate(prompt, temperature, max_tokens)
        return jsonify({'response': response})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/generate_stream', methods=['POST'])
def generate_stream():
    data = request.json
    prompt = data.get('prompt', '')
    temperature = data.get('temperature', 0.7)
    max_tokens = data.get('max_tokens', 100)
    
    def stream():
        try:
            for token in model.generate_stream(prompt, temperature, max_tokens):
                yield f"data: {json.dumps({'token': token})}\n\n"
            yield "data: [DONE]\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
    
    return Response(stream(), mimetype='text/plain')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000)
```

## Example Repository

See complete examples at: [bilan-custom-llm-examples](https://github.com/mocksi/bilan-custom-llm-examples) 