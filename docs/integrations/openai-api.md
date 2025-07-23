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
import { Bilan } from '@mocksi/bilan-sdk'

// Cross-platform UUID generation
function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  // Fallback for environments without crypto.randomUUID
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
})

export const bilan = new Bilan({
  apiKey: process.env.BILAN_API_KEY,
  projectId: process.env.BILAN_PROJECT_ID,
  userId: process.env.BILAN_USER_ID || 'anonymous'
})
```

**Required Environment Variables:**
- `OPENAI_API_KEY` - Your OpenAI API key for authentication
- `BILAN_API_KEY` - Your Bilan API key
- `BILAN_PROJECT_ID` - Your Bilan project identifier
- `BILAN_USER_ID` - Unique identifier for the current user

### 2. Create a tracked chat completion function (v0.4.1)

```typescript
// lib/chat.ts
import { openai } from './openai'
import { trackTurn, vote } from '@mocksi/bilan-sdk'

export interface TrackedChatResponse {
  content: string
  turnId: string
  conversationId: string
  model: string
  completion: any
  // Helper method for user feedback
  submitFeedback: (value: 1 | -1, comment?: string) => Promise<void>
}

export async function createChatCompletion(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  options: {
    model?: string
    temperature?: number
    maxTokens?: number
    conversationId?: string
    turnSequence?: number
  } = {}
): Promise<TrackedChatResponse> {
  const conversationId = options.conversationId || `conv_${Date.now()}`
  const model = options.model || 'gpt-4'
  
  // ✅ v0.4.1: Industry-standard event correlation with trackTurn
  const { result: completion, turnId } = await trackTurn(
    messages[messages.length - 1]?.content || 'OpenAI Chat Completion',
    () => openai.chat.completions.create({
      model,
      messages,
      temperature: options.temperature || 0.7,
      max_tokens: options.maxTokens
    }),
    {
      // Optional context for advanced analytics
      conversation_id: conversationId,
      turn_sequence: options.turnSequence || 1,
      model,
      provider: 'openai',
      temperature: options.temperature || 0.7
    }
  )

    const content = completion.choices[0]?.message?.content || ''

  return {
    content,
    turnId,
    conversationId,
    model,
    completion,
    // Helper method for feedback using the turnId
    async submitFeedback(value: 1 | -1, comment?: string) {
      await vote(turnId, value, comment)
    }
  }
}

// Example usage with automatic correlation
export async function handleUserQuery(
  userMessage: string, 
  conversationId?: string
): Promise<string> {
  const messages = [{ role: 'user', content: userMessage }]
  
  const response = await createChatCompletion(messages, { 
    conversationId,
    model: 'gpt-4'
  })
  
  console.log('AI Response:', response.content)
  
  // User feedback automatically correlated to the turn
  await response.submitFeedback(1, 'Helpful OpenAI response!')
  
    return response.content
  }
}
```

### 3. Create a streaming chat function

```typescript
// lib/streaming-chat.ts
import { openai } from './openai'
import { trackTurn } from '@mocksi/bilan-sdk'

// Cross-platform UUID generation
function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  // Fallback for environments without crypto.randomUUID
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}

export interface StreamingChatResponse {
  turnId: string
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
    signal?: AbortSignal
  } = {}
): Promise<StreamingChatResponse> {
  const model = options.model || 'gpt-3.5-turbo'
  
  // ✅ v0.4.1: Use trackTurn for automatic correlation
  const { result: stream, turnId } = await trackTurn(
    messages[messages.length - 1]?.content || 'OpenAI Streaming Chat',
    () => openai.chat.completions.create({
      model,
      messages,
      temperature: options.temperature || 0.7,
      max_tokens: options.maxTokens || 1000,
      stream: true,
      signal: options.signal // Pass the abort signal to OpenAI request
    })
  )

  async function* streamContent() {
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content
      if (content) {
        yield content
      }
    }
  }

  return {
    turnId,
    model,
    stream: streamContent(),
    metadata: {
      timestamp: Date.now(),
      temperature: options.temperature || 0.7,
      maxTokens: options.maxTokens || 1000
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
import { bilan } from '@/lib/openai'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  turnId?: string
  conversationId?: string
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
  const [currentConversationId, setCurrentConversationId] = useState<string>('')

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
        temperature: 0.7,
        conversationId: currentConversationId
      })

      // Set conversation ID for future messages
      if (!currentConversationId) {
        setCurrentConversationId(response.conversationId)
      }

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response.content,
        turnId: response.turnId,
        conversationId: response.conversationId,
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

  const handleFeedback = async (turnId: string, conversationId: string, value: 1 | -1, comment?: string) => {
    try {
      await bilan.track('vote', {
        turn_id: turnId,
        conversation_id: conversationId,
        vote_type: value === 1 ? 'up' : 'down',
        value,
        comment
      })
      setFeedbackStates(prev => ({ ...prev, [turnId]: value }))
    } catch (error) {
      console.error('Failed to submit feedback:', error)
    }
  }

  const handleDetailedFeedback = (turnId: string, conversationId: string, value: 1 | -1) => {
    const comment = window.prompt(
      value === 1 
        ? 'What made this response helpful?' 
        : 'How could this response be improved?'
    )
    
    if (comment) {
      handleFeedback(turnId, conversationId, value, comment)
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
              {message.role === 'assistant' && message.turnId && message.conversationId && (
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => handleFeedback(message.turnId!, message.conversationId!, 1)}
                    onDoubleClick={() => handleDetailedFeedback(message.turnId!, message.conversationId!, 1)}
                    className={`text-sm px-2 py-1 rounded ${
                      feedbackStates[message.turnId] === 1
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                    title="Click for quick feedback, double-click for detailed"
                  >
                    👍 Helpful
                  </button>
                  <button
                    onClick={() => handleFeedback(message.turnId!, message.conversationId!, -1)}
                    onDoubleClick={() => handleDetailedFeedback(message.turnId!, message.conversationId!, -1)}
                    className={`text-sm px-2 py-1 rounded ${
                      feedbackStates[message.turnId] === -1
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
    turnId?: string
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

      const response = await createStreamingChat(conversationHistory, {
        signal: abortControllerRef.current.signal
      })
      
      // Create streaming message
      const streamingMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant' as const,
        content: '',
        turnId: response.turnId, // v0.4.1: Use turnId for feedback correlation
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

  const handleFeedback = async (turnId: string, value: 1 | -1) => {
    try {
      await vote(turnId, value)
      setFeedbackStates(prev => ({ ...prev, [turnId]: value }))
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
              {message.role === 'assistant' && message.turnId && !message.isStreaming && (
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => handleFeedback(message.turnId!, 1)}
                    className={`text-sm px-2 py-1 rounded ${
                      feedbackStates[message.turnId] === 1
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    👍 Helpful
                  </button>
                  <button
                    onClick={() => handleFeedback(message.turnId!, -1)}
                    className={`text-sm px-2 py-1 rounded ${
                      feedbackStates[message.turnId] === -1
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
import { bilan } from '@/lib/openai'

await bilan.track('vote', {
  turn_id: 'turn-123',
  conversation_id: 'conv-456',
  vote_type: 'up',
  value: 1,
  comment: 'Great response!'
})

const analytics = await bilan.getAnalytics()
console.log('Analytics:', analytics)
```



## Advanced Features

### Function calling with feedback

```typescript
// lib/function-calling.ts
import { openai } from './openai'
import { trackTurn } from '@mocksi/bilan-sdk'

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
  // ✅ v0.4.1: Use trackTurn for automatic correlation
  const { result: response, turnId } = await trackTurn(
    messages[messages.length - 1]?.content || 'OpenAI Function Call',
    () => openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages,
      functions,
      function_call: 'auto'
    })
  )

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
      turnId, // v0.4.1: Use turnId consistently
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
    turnId,
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
import { bilan } from './openai'
import { createChatCompletion } from './chat'

export async function createAdaptiveCompletion(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  conversationId?: string
) {
  const analytics = await bilan.getAnalytics({
    eventType: 'vote',
    conversationId,
    timeRange: '7d'
  })
  
  // Calculate satisfaction rate from recent votes
  const recentVotes = analytics.events.filter(e => e.event_type === 'vote')
  const positiveVotes = recentVotes.filter(e => e.properties.value === 1).length
  const satisfactionRate = recentVotes.length > 0 ? positiveVotes / recentVotes.length : 0.5
  
  // Use better model if satisfaction rate is low
  const model = satisfactionRate < 0.7 ? 'gpt-4' : 'gpt-3.5-turbo'
  
  return createChatCompletion(messages, { model, conversationId })
}
```

### Batch processing with feedback

```typescript
// lib/batch-processing.ts
import { openai } from './openai'
import { trackTurn } from '@mocksi/bilan-sdk'

export async function processBatch(
  prompts: string[],
  options: { model?: string; temperature?: number } = {}
) {
  const results = []
  
  for (const prompt of prompts) {
    try {
      // ✅ v0.4.1: Use trackTurn for automatic correlation
      const { result: response, turnId } = await trackTurn(
        prompt,
        () => openai.chat.completions.create({
          model: options.model || 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: prompt }],
          temperature: options.temperature || 0.7
        })
      )

      results.push({
        prompt,
        response: response.choices[0].message.content,
        turnId,
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
        turnId: generateId(), // Generate turnId for error tracking
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