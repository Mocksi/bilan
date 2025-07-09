# OpenAI API Integration

## Problem

When using OpenAI's API directly, you need to capture user feedback on AI responses to understand model performance and improve your prompts. Without feedback tracking, you can't optimize your AI interactions or identify when to switch models.

## Installation

```bash
npm install @mocksi/bilan-sdk openai
```

## Integration

### 1. Initialize Bilan and OpenAI

```typescript
// lib/openai.ts
import OpenAI from 'openai'
import { init } from '@mocksi/bilan-sdk'

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export const bilan = await init({
  mode: process.env.BILAN_MODE || 'local', // 'local' or 'server'
  apiKey: process.env.BILAN_API_KEY, // Required for server mode
  userId: process.env.USER_ID || 'anonymous', // Your user identifier
  telemetry: { 
    enabled: process.env.BILAN_TELEMETRY !== 'false' // opt-in to usage analytics
  }
})
```

**Required Environment Variables:**
- `OPENAI_API_KEY` - Your OpenAI API key for authentication
- `BILAN_MODE` - Set to 'server' for production, 'local' for development
- `BILAN_API_KEY` - Your Bilan API key (required for server mode)
- `USER_ID` - Unique identifier for the current user
- `BILAN_TELEMETRY` - Set to 'false' to disable telemetry (optional)

### 2. Create a tracked chat completion function

```typescript
// lib/chat.ts
import { openai } from './openai'
import { randomUUID } from 'crypto'

export interface TrackedChatResponse {
  content: string
  promptId: string
  model: string
  usage: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
  metadata: Record<string, any>
}

export async function createChatCompletion(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  options: {
    model?: string
    temperature?: number
    maxTokens?: number
  } = {}
): Promise<TrackedChatResponse> {
  const promptId = randomUUID()
  const model = options.model || 'gpt-3.5-turbo'
  
  try {
    const completion = await openai.chat.completions.create({
      model,
      messages,
      temperature: options.temperature || 0.7,
      max_tokens: options.maxTokens || 1000
    })

    const response = completion.choices[0]
    
    if (!response.message.content) {
      throw new Error('No content in response')
    }

    return {
      content: response.message.content,
      promptId,
      model,
      usage: {
        promptTokens: completion.usage?.prompt_tokens || 0,
        completionTokens: completion.usage?.completion_tokens || 0,
        totalTokens: completion.usage?.total_tokens || 0
      },
      metadata: {
        finishReason: response.finish_reason,
        timestamp: Date.now(),
        temperature: options.temperature || 0.7
      }
    }
  } catch (error) {
    console.error('OpenAI API error:', error)
    throw error
  }
}
```

### 3. Create a streaming chat function

```typescript
// lib/streaming-chat.ts
import { openai } from './openai'
import { randomUUID } from 'crypto'

export interface StreamingChatResponse {
  promptId: string
  model: string
  stream: AsyncIterable<string>
  metadata: Record<string, any>
}

export async function createStreamingChat(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  options: {
    model?: string
    temperature?: number
    maxTokens?: number
  } = {}
): Promise<StreamingChatResponse> {
  const promptId = randomUUID()
  const model = options.model || 'gpt-3.5-turbo'
  
  const stream = await openai.chat.completions.create({
    model,
    messages,
    temperature: options.temperature || 0.7,
    max_tokens: options.maxTokens || 1000,
    stream: true
  })

  async function* streamContent() {
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content
      if (content) {
        yield content
      }
    }
  }

  return {
    promptId,
    model,
    stream: streamContent(),
    metadata: {
      timestamp: Date.now(),
      temperature: options.temperature || 0.7
    }
  }
}
```

### 4. Create a chat component

```typescript
// components/OpenAIChat.tsx
'use client'

import { useState, useRef } from 'react'
import { createChatCompletion, TrackedChatResponse } from '@/lib/chat'
import { vote } from '@mocksi/bilan-sdk'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  promptId?: string
  model?: string
  usage?: TrackedChatResponse['usage']
}

export default function OpenAIChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'system',
      role: 'assistant',
      content: 'Hello! I\'m an AI assistant. How can I help you today?'
    }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [feedbackStates, setFeedbackStates] = useState<Record<string, 1 | -1>>({})
  const [selectedModel, setSelectedModel] = useState<string>('gpt-3.5-turbo')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      // Prepare conversation history
      const conversationHistory = messages
        .filter(msg => msg.role !== 'system' || msg.id === 'system')
        .map(msg => ({
          role: msg.role as 'system' | 'user' | 'assistant',
          content: msg.content
        }))

      // Add the new user message
      conversationHistory.push({
        role: 'user',
        content: input
      })

      const response = await createChatCompletion(conversationHistory, {
        model: selectedModel,
        temperature: 0.7
      })

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response.content,
        promptId: response.promptId,
        model: response.model,
        usage: response.usage
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error('Failed to get response:', error)
      
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.'
      }
      
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleFeedback = async (promptId: string, value: 1 | -1, comment?: string) => {
    try {
      await vote(promptId, value, comment)
      setFeedbackStates(prev => ({ ...prev, [promptId]: value }))
    } catch (error) {
      console.error('Failed to submit feedback:', error)
    }
  }

  const handleDetailedFeedback = (promptId: string, value: 1 | -1) => {
    const comment = window.prompt(
      value === 1 
        ? 'What made this response helpful?' 
        : 'How could this response be improved?'
    )
    
    if (comment) {
      handleFeedback(promptId, value, comment)
    }
  }

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto p-4">
      {/* Model selector */}
      <div className="mb-4 flex items-center gap-4">
        <label className="text-sm font-medium">Model:</label>
        <select
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
          className="px-3 py-1 border rounded text-sm"
          disabled={isLoading}
        >
          <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
          <option value="gpt-4">GPT-4</option>
          <option value="gpt-4-turbo-preview">GPT-4 Turbo</option>
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
              
              {/* Message metadata */}
              {message.role === 'assistant' && message.model && (
                <div className="mt-2 text-xs text-gray-500 flex items-center gap-2">
                  <span>Model: {message.model}</span>
                  {message.usage && (
                    <span>Tokens: {message.usage.totalTokens}</span>
                  )}
                </div>
              )}
              
              {/* Feedback buttons */}
              {message.role === 'assistant' && message.promptId && (
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => handleFeedback(message.promptId!, 1)}
                    onDoubleClick={() => handleDetailedFeedback(message.promptId!, 1)}
                    className={`text-sm px-2 py-1 rounded ${
                      feedbackStates[message.promptId] === 1
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                    title="Click for quick feedback, double-click for detailed"
                  >
                    👍 Helpful
                  </button>
                  <button
                    onClick={() => handleFeedback(message.promptId!, -1)}
                    onDoubleClick={() => handleDetailedFeedback(message.promptId!, -1)}
                    className={`text-sm px-2 py-1 rounded ${
                      feedbackStates[message.promptId] === -1
                        ? 'bg-red-500 text-white'
                        : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                    title="Click for quick feedback, double-click for detailed"
                  >
                    👎 Not helpful
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
                Thinking...
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
          disabled={isLoading || !input.trim()}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  )
}
```

### 5. Add streaming support

```typescript
// components/StreamingChat.tsx
'use client'

import { useState, useRef } from 'react'
import { createStreamingChat } from '@/lib/streaming-chat'
import { vote } from '@mocksi/bilan-sdk'

export default function StreamingChat() {
  const [messages, setMessages] = useState<Array<{
    id: string
    role: 'user' | 'assistant'
    content: string
    promptId?: string
    isStreaming?: boolean
  }>>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [feedbackStates, setFeedbackStates] = useState<Record<string, 1 | -1>>({})
  const abortControllerRef = useRef<AbortController | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage = {
      id: `user-${Date.now()}`,
      role: 'user' as const,
      content: input
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    // Create abort controller for cancellation
    abortControllerRef.current = new AbortController()

    try {
      const conversationHistory = messages.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      }))

      conversationHistory.push({
        role: 'user',
        content: input
      })

      const response = await createStreamingChat(conversationHistory)
      
      // Create streaming message
      const streamingMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant' as const,
        content: '',
        promptId: response.promptId,
        isStreaming: true
      }

      setMessages(prev => [...prev, streamingMessage])

      // Stream the response
      let fullContent = ''
      for await (const chunk of response.stream) {
        if (abortControllerRef.current?.signal.aborted) {
          break
        }
        
        fullContent += chunk
        setMessages(prev => prev.map(msg => 
          msg.id === streamingMessage.id 
            ? { ...msg, content: fullContent }
            : msg
        ))
      }

      // Mark streaming as complete
      setMessages(prev => prev.map(msg => 
        msg.id === streamingMessage.id 
          ? { ...msg, isStreaming: false }
          : msg
      ))

    } catch (error) {
      console.error('Streaming error:', error)
      
      const errorMessage = {
        id: `error-${Date.now()}`,
        role: 'assistant' as const,
        content: 'Sorry, I encountered an error. Please try again.'
      }
      
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
      abortControllerRef.current = null
    }
  }

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      setIsLoading(false)
    }
  }

  const handleFeedback = async (promptId: string, value: 1 | -1) => {
    try {
      await vote(promptId, value)
      setFeedbackStates(prev => ({ ...prev, [promptId]: value }))
    } catch (error) {
      console.error('Failed to submit feedback:', error)
    }
  }

  return (
    <div className="flex flex-col h-screen max-w-2xl mx-auto p-4">
      <div className="flex-1 overflow-y-auto space-y-4 mb-4">
        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
              message.role === 'user' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-200 text-gray-900'
            }`}>
              <p className="whitespace-pre-wrap">{message.content}</p>
              
              {/* Streaming indicator */}
              {message.isStreaming && (
                <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                  <div className="animate-pulse h-2 w-2 bg-blue-500 rounded-full"></div>
                  Streaming...
                </div>
              )}
              
              {/* Feedback buttons */}
              {message.role === 'assistant' && message.promptId && !message.isStreaming && (
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => handleFeedback(message.promptId!, 1)}
                    className={`text-sm px-2 py-1 rounded ${
                      feedbackStates[message.promptId] === 1
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    👍 Helpful
                  </button>
                  <button
                    onClick={() => handleFeedback(message.promptId!, -1)}
                    className={`text-sm px-2 py-1 rounded ${
                      feedbackStates[message.promptId] === -1
                        ? 'bg-red-500 text-white'
                        : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    👎 Not helpful
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message..."
          className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isLoading}
        />
        {isLoading ? (
          <button
            type="button"
            onClick={handleStop}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
          >
            Stop
          </button>
        ) : (
          <button
            type="submit"
            disabled={!input.trim()}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
          >
            Send
          </button>
        )}
      </form>
    </div>
  )
}
```

## Testing

### 1. Test basic completion

```typescript
// Test in your browser console
import { createChatCompletion } from '@/lib/chat'

const response = await createChatCompletion([
  { role: 'user', content: 'Hello, how are you?' }
])
console.log('Response:', response)
```

### 2. Test streaming

```typescript
import { createStreamingChat } from '@/lib/streaming-chat'

const response = await createStreamingChat([
  { role: 'user', content: 'Tell me a story' }
])

for await (const chunk of response.stream) {
  console.log('Chunk:', chunk)
}
```

### 3. Test feedback

```typescript
import { vote, getStats } from '@mocksi/bilan-sdk'

await vote('prompt-id-123', 1, 'Great response!')
const stats = await getStats()
console.log('Trust score:', stats.trustScore)
```

## Advanced Features

### Function calling with feedback

```typescript
// lib/function-calling.ts
import { openai } from './openai'
import { randomUUID } from 'crypto'

const functions = [
  {
    name: 'get_weather',
    description: 'Get current weather for a location',
    parameters: {
      type: 'object',
      properties: {
        location: {
          type: 'string',
          description: 'The city and state, e.g. San Francisco, CA'
        }
      },
      required: ['location']
    }
  }
]

export async function createFunctionCall(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>
) {
  const promptId = randomUUID()
  
  const response = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages,
    functions,
    function_call: 'auto'
  })

  const message = response.choices[0].message
  
  if (message.function_call) {
    // Execute function
    const functionName = message.function_call.name
    const functionArgs = JSON.parse(message.function_call.arguments)
    
    let functionResult = ''
    if (functionName === 'get_weather') {
      functionResult = `The weather in ${functionArgs.location} is sunny and 72°F`
    }
    
    // Get final response
    const finalResponse = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        ...messages,
        {
          role: 'assistant',
          content: null,
          function_call: message.function_call
        },
        {
          role: 'function',
          name: functionName,
          content: functionResult
        }
      ]
    })

    return {
      content: finalResponse.choices[0].message.content,
      promptId,
      functionUsed: functionName,
      functionArgs,
      functionResult,
      metadata: {
        timestamp: Date.now(),
        model: 'gpt-3.5-turbo'
      }
    }
  }

  return {
    content: message.content,
    promptId,
    functionUsed: null,
    metadata: {
      timestamp: Date.now(),
      model: 'gpt-3.5-turbo'
    }
  }
}
```

### Adaptive model selection

```typescript
// lib/adaptive-model.ts
import { getStats } from '@mocksi/bilan-sdk'
import { createChatCompletion } from './chat'

export async function createAdaptiveCompletion(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>
) {
  const stats = await getStats()
  
  // Use better model if trust score is low
  const model = stats.trustScore < 0.7 ? 'gpt-4' : 'gpt-3.5-turbo'
  
  return createChatCompletion(messages, { model })
}
```

### Batch processing with feedback

```typescript
// lib/batch-processing.ts
import { openai } from './openai'
import { randomUUID } from 'crypto'

export async function processBatch(
  prompts: string[],
  options: { model?: string; temperature?: number } = {}
) {
  const results = []
  
  for (const prompt of prompts) {
    const promptId = randomUUID()
    
    try {
      const response = await openai.chat.completions.create({
        model: options.model || 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: prompt }],
        temperature: options.temperature || 0.7
      })

      results.push({
        prompt,
        response: response.choices[0].message.content,
        promptId,
        success: true,
        metadata: {
          model: options.model || 'gpt-3.5-turbo',
          timestamp: Date.now()
        }
      })
    } catch (error) {
      results.push({
        prompt,
        response: null,
        promptId,
        success: false,
        error: error.message,
        metadata: {
          timestamp: Date.now()
        }
      })
    }
  }
  
  return results
}
```

## Next Steps

- **[Server Mode](../server-mode.md)** - Scale for production
- **[Advanced Analytics](../advanced-analytics.md)** - Track model performance
- **[A/B Testing](../ab-testing.md)** - Compare different models
- **[Custom Storage](../custom-storage.md)** - Store conversation history

## Common Issues

**Q: API key not working?**
A: Check that `OPENAI_API_KEY` is set in your environment variables.

**Q: Streaming not working?**
A: Ensure you're using the latest OpenAI SDK version.

**Q: High token usage?**
A: Monitor usage in responses and implement token limits.

**Q: Rate limiting errors?**
A: Implement exponential backoff and request queuing.

## Example Repository

See complete examples at: [bilan-openai-examples](https://github.com/mocksi/bilan-openai-examples) 