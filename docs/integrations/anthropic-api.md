# Anthropic Claude API Integration

## Problem

When using Anthropic's Claude API, you need to track user satisfaction with AI responses to optimize your prompts and understand model performance. Without feedback, you can't improve your Claude interactions or know when responses are helpful vs. confusing.

## Installation

```bash
npm install @mocksi/bilan-sdk @anthropic-ai/sdk
```

## Environment Variables

**Required Environment Variables:**
- `ANTHROPIC_API_KEY` - Your Anthropic API key for Claude models
- `BILAN_API_KEY` - Your Bilan API key
- `BILAN_PROJECT_ID` - Your Bilan project identifier
- `BILAN_USER_ID` - Unique identifier for the current user

## Integration

### 1. Initialize Bilan and Anthropic

```typescript
// lib/anthropic.ts
import Anthropic from '@anthropic-ai/sdk'
import { Bilan } from '@mocksi/bilan-sdk'

// Cross-platform UUID generation
function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  // Fallback for environments without crypto.randomUUID
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}

export const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
})

export const bilan = new Bilan({
  apiKey: process.env.BILAN_API_KEY,
  projectId: process.env.BILAN_PROJECT_ID,
  userId: process.env.BILAN_USER_ID || 'anonymous'
})
```

### 2. Create a tracked message function

```typescript
// lib/claude-chat.ts
import { anthropic, bilan } from './anthropic'

// Cross-platform UUID generation
function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  // Fallback for environments without crypto.randomUUID
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}

export interface TrackedClaudeResponse {
  content: string
  turnId: string
  conversationId: string
  model: string
  usage: {
    inputTokens: number
    outputTokens: number
  }
  metadata: Record<string, any>
}

export async function createClaudeMessage(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  options: {
    model?: string
    maxTokens?: number
    temperature?: number
    system?: string
    conversationId?: string
  } = {}
): Promise<TrackedClaudeResponse> {
  const turnId = generateId()
  const conversationId = options.conversationId || generateId()
  const model = options.model || 'claude-3-haiku-20240307'
  
  try {
    // Track turn start
    await bilan.track('turn_started', {
      turn_id: turnId,
      conversation_id: conversationId,
      model,
      provider: 'anthropic',
      input_tokens: messages.reduce((sum, msg) => sum + msg.content.length, 0),
      temperature: options.temperature || 0.7,
      system_prompt: options.system
    })

    const startTime = Date.now()
    const response = await anthropic.messages.create({
      model,
      max_tokens: options.maxTokens || 1000,
      temperature: options.temperature || 0.7,
      system: options.system,
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }))
    })

    const content = response.content[0]
    if (content.type !== 'text') {
      throw new Error('Unexpected response type')
    }

    // Track turn completion
    await bilan.track('turn_completed', {
      turn_id: turnId,
      conversation_id: conversationId,
      model,
      provider: 'anthropic',
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
      total_tokens: response.usage.input_tokens + response.usage.output_tokens,
      stop_reason: response.stop_reason,
      latency: Date.now() - startTime
    })

    return {
      content: content.text,
      turnId,
      conversationId,
      model,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens
      },
      metadata: {
        stopReason: response.stop_reason,
        timestamp: Date.now(),
        temperature: options.temperature || 0.7
      }
    }
  } catch (error) {
    // Track turn failure
    await bilan.track('turn_failed', {
      turn_id: turnId,
      conversation_id: conversationId,
      model,
      provider: 'anthropic',
      error: error.message,
      error_type: error.name
    })
    
    console.error('Claude API error:', error)
    throw error
  }
}
```

### 3. Create a streaming function

```typescript
// lib/claude-streaming.ts
import { anthropic } from './anthropic'
// Use the generateId function defined above instead of importing randomUUID

export interface StreamingClaudeResponse {
  promptId: string
  model: string
  stream: AsyncIterable<string>
  metadata: Record<string, any>
}

export async function createStreamingClaudeMessage(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  options: {
    model?: string
    maxTokens?: number
    temperature?: number
    system?: string
  } = {}
): Promise<StreamingClaudeResponse> {
  const promptId = generateId()
  const model = options.model || 'claude-3-haiku-20240307'
  
  const stream = anthropic.messages.stream({
    model,
    max_tokens: options.maxTokens || 1000,
    temperature: options.temperature || 0.7,
    system: options.system,
    messages: messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }))
  })

  async function* streamContent() {
    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
        yield chunk.delta.text
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
// components/ClaudeChat.tsx
'use client'

import { useState } from 'react'
import { createClaudeMessage, TrackedClaudeResponse } from '@/lib/claude-chat'
import { bilan } from '@/lib/anthropic'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  turnId?: string
  conversationId?: string
  model?: string
  usage?: TrackedClaudeResponse['usage']
}

export default function ClaudeChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Hello! I\'m Claude, an AI assistant created by Anthropic. How can I help you today?'
    }
  ])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [feedbackStates, setFeedbackStates] = useState<Record<string, 1 | -1>>({})
  const [selectedModel, setSelectedModel] = useState<string>('claude-3-haiku-20240307')
  const [systemPrompt, setSystemPrompt] = useState('')
  const [currentConversationId, setCurrentConversationId] = useState<string>('')

  const modelOptions = [
    { value: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku' },
    { value: 'claude-3-sonnet-20240229', label: 'Claude 3 Sonnet' },
    { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus' }
  ]

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
      // Prepare conversation history (exclude welcome message)
      const conversationHistory = messages
        .filter(msg => msg.id !== 'welcome')
        .map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content
        }))

      // Add the new user message
      conversationHistory.push({
        role: 'user',
        content: input
      })

      const response = await createClaudeMessage(conversationHistory, {
        model: selectedModel,
        system: systemPrompt || undefined,
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
      {/* Configuration */}
      <div className="mb-4 space-y-2">
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium">Model:</label>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="px-3 py-1 border rounded text-sm"
            disabled={isLoading}
          >
            {modelOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium">System Prompt:</label>
          <input
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            placeholder="Optional system prompt..."
            className="flex-1 px-3 py-1 border rounded text-sm"
            disabled={isLoading}
          />
        </div>
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
                    <span>
                      Tokens: {message.usage.inputTokens + message.usage.outputTokens} 
                      ({message.usage.inputTokens} in, {message.usage.outputTokens} out)
                    </span>
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
                Claude is thinking...
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

### 5. Document analysis with feedback

```typescript
// lib/claude-analysis.ts
import { anthropic } from './anthropic'
// Use the generateId function defined above instead of importing randomUUID

export interface DocumentAnalysis {
  summary: string
  keyPoints: string[]
  sentiment: 'positive' | 'negative' | 'neutral'
  promptId: string
  metadata: Record<string, any>
}

export async function analyzeDocument(
  document: string,
  analysisType: 'summary' | 'sentiment' | 'key_points' | 'comprehensive' = 'comprehensive'
): Promise<DocumentAnalysis> {
  const promptId = generateId()
  
  const systemPrompt = `You are an expert document analyzer. Provide clear, structured analysis of the given document.`
  
  let userPrompt = ''
  
  switch (analysisType) {
    case 'summary':
      userPrompt = `Please provide a concise summary of this document:\n\n${document}`
      break
    case 'sentiment':
      userPrompt = `Analyze the sentiment of this document and explain your reasoning:\n\n${document}`
      break
    case 'key_points':
      userPrompt = `Extract the key points from this document in bullet format:\n\n${document}`
      break
    case 'comprehensive':
      userPrompt = `Provide a comprehensive analysis of this document including:
1. A brief summary
2. Key points (as bullet points)
3. Overall sentiment (positive/negative/neutral)
4. Any important insights or recommendations

Document:
${document}`
      break
  }

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }]
    })

    const content = response.content[0]
    if (content.type !== 'text') {
      throw new Error('Unexpected response type')
    }

    // Parse the response (simplified - you might want more sophisticated parsing)
    const analysisText = content.text
    
    return {
      summary: analysisText,
      keyPoints: analysisText.split('\n').filter(line => line.trim().startsWith('•') || line.trim().startsWith('-')),
      sentiment: analysisText.toLowerCase().includes('positive') ? 'positive' : 
                analysisText.toLowerCase().includes('negative') ? 'negative' : 'neutral',
      promptId,
      metadata: {
        analysisType,
        documentLength: document.length,
        timestamp: Date.now(),
        model: 'claude-3-sonnet-20240229'
      }
    }
  } catch (error) {
    console.error('Document analysis failed:', error)
    throw error
  }
}
```

### 6. Multi-turn conversation with context

```typescript
// lib/claude-conversation.ts
import { anthropic } from './anthropic'
// Use the generateId function defined above instead of importing randomUUID

export interface ConversationContext {
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
  systemPrompt?: string
  metadata: Record<string, any>
}

export class ClaudeConversation {
  private context: ConversationContext
  private model: string

  constructor(systemPrompt?: string, model = 'claude-3-haiku-20240307') {
    this.context = {
      messages: [],
      systemPrompt,
      metadata: {
        createdAt: Date.now(),
        model
      }
    }
    this.model = model
  }

  async sendMessage(content: string): Promise<{
    response: string
    promptId: string
    usage: { inputTokens: number; outputTokens: number }
  }> {
    const promptId = generateId()
    
    // Add user message to context
    this.context.messages.push({ role: 'user', content })

    try {
      const response = await anthropic.messages.create({
        model: this.model,
        max_tokens: 1000,
        system: this.context.systemPrompt,
        messages: this.context.messages
      })

      const responseContent = response.content[0]
      if (responseContent.type !== 'text') {
        throw new Error('Unexpected response type')
      }

      // Add assistant response to context
      this.context.messages.push({ 
        role: 'assistant', 
        content: responseContent.text 
      })

      return {
        response: responseContent.text,
        promptId,
        usage: {
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens
        }
      }
    } catch (error) {
      console.error('Conversation error:', error)
      throw error
    }
  }

  getContext(): ConversationContext {
    return { ...this.context }
  }

  clearContext(): void {
    this.context.messages = []
  }

  setSystemPrompt(prompt: string): void {
    this.context.systemPrompt = prompt
  }
}
```

## Testing

### 1. Test basic message

```typescript
// Test in your browser console
import { createClaudeMessage } from '@/lib/claude-chat'

const response = await createClaudeMessage([
  { role: 'user', content: 'Hello Claude!' }
])
console.log('Response:', response)
```

### 2. Test document analysis

```typescript
import { analyzeDocument } from '@/lib/claude-analysis'

const analysis = await analyzeDocument('Your document text here', 'comprehensive')
console.log('Analysis:', analysis)
```

### 3. Test conversation

```typescript
import { ClaudeConversation } from '@/lib/claude-conversation'

const conversation = new ClaudeConversation('You are a helpful assistant')
const response1 = await conversation.sendMessage('What is the capital of France?')
const response2 = await conversation.sendMessage('What is its population?')

console.log('Context:', conversation.getContext())
```

### 4. Test feedback

```typescript
import { bilan } from '@/lib/anthropic'

await bilan.track('vote', {
  turn_id: 'turn-123',
  conversation_id: 'conv-456',
  vote_type: 'up',
  value: 1,
  comment: 'Claude gave a very helpful response!'
})

const analytics = await bilan.getAnalytics()
console.log('Analytics:', analytics)
```

## Migration from v0.3.1 to v0.4.0

### Before (v0.3.1) - Conversation-Centric

```typescript
// Old initialization
import { init, vote } from '@mocksi/bilan-sdk'

const bilan = await init({
  mode: 'local',
  userId: 'user-123',
  telemetry: { enabled: true }
})

// Old voting
await vote('prompt-id-123', 1, 'Great Claude response!')
```

### After (v0.4.0) - Event-Driven

```typescript
// New initialization
import { Bilan } from '@mocksi/bilan-sdk'

const bilan = new Bilan({
  apiKey: 'your-api-key',
  projectId: 'your-project',
  userId: 'user-123'
})

// New event tracking
await bilan.track('vote', {
  turn_id: 'turn-123',
  conversation_id: 'conv-456',
  vote_type: 'up',
  value: 1,
  comment: 'Great Claude response!'
})

// Track full conversation lifecycle
await bilan.track('conversation_started', {
  conversation_id: 'conv-456',
  title: 'Claude Chat Session'
})

await bilan.track('turn_started', {
  turn_id: 'turn-123',
  conversation_id: 'conv-456',
  model: 'claude-3-haiku-20240307',
  provider: 'anthropic'
})

await bilan.track('turn_completed', {
  turn_id: 'turn-123',
  conversation_id: 'conv-456',
  model: 'claude-3-haiku-20240307',
  provider: 'anthropic',
  input_tokens: 50,
  output_tokens: 100
})
```

### Key Changes

1. **Initialization**: `init()` → `new Bilan()`
2. **Feedback**: `vote()` → `track('vote', properties)`
3. **Provider Tracking**: Automatic provider='anthropic' tracking
4. **Turn Management**: Full turn lifecycle tracking
5. **Analytics**: `getStats()` → `getAnalytics()`

## Advanced Features

### Tool use with Claude

```typescript
// lib/claude-tools.ts
import { anthropic } from './anthropic'
// Use the generateId function defined above instead of importing randomUUID

const tools = [
  {
    name: 'get_weather',
    description: 'Get current weather for a location',
    input_schema: {
      type: 'object',
      properties: {
        location: {
          type: 'string',
          description: 'The city and state, e.g. San Francisco, CA'
        }
      },
      required: ['location']
    }
  },
  {
    name: 'calculate',
    description: 'Perform mathematical calculations',
    input_schema: {
      type: 'object',
      properties: {
        expression: {
          type: 'string',
          description: 'Mathematical expression to evaluate'
        }
      },
      required: ['expression']
    }
  }
]

export async function createToolMessage(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
) {
  const promptId = generateId()
  
  const response = await anthropic.messages.create({
    model: 'claude-3-sonnet-20240229',
    max_tokens: 1000,
    tools,
    messages
  })

  const content = response.content[0]
  
  if (content.type === 'tool_use') {
    // Execute the tool
    let toolResult = ''
    
    if (content.name === 'get_weather') {
      const args = content.input as { location: string }
      toolResult = `The weather in ${args.location} is sunny and 72°F`
    } else if (content.name === 'calculate') {
      const args = content.input as { expression: string }
      try {
        // Safe calculator implementation - only allow basic math operations
        const sanitized = args.expression.replace(/[^0-9+\-*/().\s]/g, '')
        
        // Simple validation for basic math expressions
        if (!/^[0-9+\-*/().\s]+$/.test(sanitized)) {
          toolResult = 'Invalid mathematical expression'
        } else {
          // ⚠️ SECURITY WARNING: The Function constructor below is UNSAFE and vulnerable to 
          // remote code execution attacks. This is for demonstration purposes only.
          // 
          // 🔒 FOR PRODUCTION USE: Replace this with a vetted math expression parser 
          // like mathjs (https://mathjs.org/) which safely evaluates mathematical expressions:
          // 
          // import { evaluate } from 'mathjs'
          // const result = evaluate(sanitized)
          // toolResult = result.toString()
          
          // UNSAFE - DO NOT USE IN PRODUCTION
          const result = Function(`"use strict"; return (${sanitized})`)()
          toolResult = result.toString()
        }
      } catch {
        toolResult = 'Invalid calculation'
      }
    }

    // Get final response with tool result
    const finalResponse = await anthropic.messages.create({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 1000,
      messages: [
        ...messages,
        { role: 'assistant', content: response.content },
        {
          role: 'user',
          content: [
            {
              type: 'tool_result',
              tool_use_id: content.id,
              content: toolResult
            }
          ]
        }
      ]
    })

    const finalContent = finalResponse.content[0]
    if (finalContent.type !== 'text') {
      throw new Error('Unexpected final response type')
    }

    return {
      content: finalContent.text,
      promptId,
      toolUsed: content.name,
      toolInput: content.input,
      toolResult,
      metadata: {
        timestamp: Date.now(),
        model: 'claude-3-sonnet-20240229'
      }
    }
  }

  if (content.type === 'text') {
    return {
      content: content.text,
      promptId,
      toolUsed: null,
      metadata: {
        timestamp: Date.now(),
        model: 'claude-3-sonnet-20240229'
      }
    }
  }

  throw new Error('Unexpected response type')
}
```

### Vision capabilities

```typescript
// lib/claude-vision.ts
import { anthropic } from './anthropic'
// Use the generateId function defined above instead of importing randomUUID

export async function analyzeImage(
  imageBase64: string,
  prompt: string = 'Describe this image in detail'
): Promise<{
  description: string
  promptId: string
  metadata: Record<string, any>
}> {
  const promptId = generateId()
  
  const response = await anthropic.messages.create({
    model: 'claude-3-sonnet-20240229',
    max_tokens: 1000,
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: 'image/jpeg',
              data: imageBase64
            }
          },
          {
            type: 'text',
            text: prompt
          }
        ]
      }
    ]
  })

  const content = response.content[0]
  if (content.type !== 'text') {
    throw new Error('Unexpected response type')
  }

  return {
    description: content.text,
    promptId,
    metadata: {
      timestamp: Date.now(),
      model: 'claude-3-sonnet-20240229',
      imageAnalysis: true
    }
  }
}
```

## Next Steps

- **[Server Mode](../server-mode.md)** - Scale for production
- **[Advanced Analytics](../advanced-analytics.md)** - Track Claude performance
- **[A/B Testing](../ab-testing.md)** - Compare different Claude models
- **[Custom Storage](../custom-storage.md)** - Store conversation history

## Common Issues

**Q: API key not working?**
A: Check that `ANTHROPIC_API_KEY` is set in your environment variables.

**Q: Model not found error?**
A: Ensure you're using the correct model name and have access to it.

**Q: Token limit exceeded?**
A: Monitor token usage and implement conversation truncation.

**Q: Streaming not working?**
A: Make sure you're using the latest Anthropic SDK version.

## Example Repository

See complete examples at: [bilan-claude-examples](https://github.com/mocksi/bilan-claude-examples) 