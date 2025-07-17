# Vercel AI SDK Integration

## Problem

When using Vercel AI SDK for streaming AI responses, you need to capture user feedback to understand which responses are helpful vs. frustrating. Without feedback, you can't improve your AI's performance or route to better models.

## Installation

```bash
npm install @mocksi/bilan-sdk ai
```

## Integration

### 1. Initialize Bilan in your app

```typescript
// lib/bilan.ts
import { Bilan } from '@mocksi/bilan-sdk'

export const bilan = new Bilan({
  apiKey: process.env.BILAN_API_KEY,
  projectId: process.env.BILAN_PROJECT_ID,
  userId: process.env.BILAN_USER_ID || 'anonymous'
})
```

**Required Environment Variables:**
- `BILAN_API_KEY` - Your Bilan API key
- `BILAN_PROJECT_ID` - Your Bilan project identifier
- `BILAN_USER_ID` - Unique identifier for the current user

### 2. Create your AI chat route with feedback tracking

```typescript
// app/api/chat/route.ts
import { openai } from '@ai-sdk/openai'
import { streamText } from 'ai'
import { bilan } from '@/lib/bilan'

// Cross-platform UUID generation
function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  // Fallback for environments without crypto.randomUUID
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}

export async function POST(req: Request) {
  const { messages, conversationId } = await req.json()
  
  // Generate unique IDs for this turn and conversation
  const turnId = generateId()
  const actualConversationId = conversationId || generateId()
  const model = 'gpt-4'
  
  try {
    // Track turn start
    await bilan.track('turn_started', {
      turn_id: turnId,
      conversation_id: actualConversationId,
      model,
      provider: 'openai',
      input_tokens: messages.reduce((sum, msg) => sum + msg.content.length, 0),
      temperature: 0.7
    })

    const startTime = Date.now()
    const result = await streamText({
      model: openai(model),
      messages,
      onFinish: async (completion) => {
        // Track turn completion
        await bilan.track('turn_completed', {
          turn_id: turnId,
          conversation_id: actualConversationId,
          model,
          provider: 'openai',
          input_tokens: completion.usage?.promptTokens || 0,
          output_tokens: completion.usage?.completionTokens || 0,
          total_tokens: completion.usage?.totalTokens || 0,
          finish_reason: completion.finishReason,
          latency: Date.now() - startTime
        })
      }
    })
    
    // Add turn and conversation IDs to response headers
    return result.toDataStreamResponse({
      headers: {
        'X-Turn-ID': turnId,
        'X-Conversation-ID': actualConversationId
      }
    })
  } catch (error) {
    // Track turn failure
    await bilan.track('turn_failed', {
      turn_id: turnId,
      conversation_id: actualConversationId,
      model,
      provider: 'openai',
      error: error.message,
      error_type: error.name
    })
    
    throw error
  }
}
```

**Required Environment Variables:**
- `OPENAI_API_KEY` - Your OpenAI API key for authentication
- Set in `.env.local` for development: `OPENAI_API_KEY=sk-...`
- For production deployment (Vercel): Add to environment variables in dashboard

### 3. Create a chat component with feedback

```typescript
// components/Chat.tsx
'use client'

import { useChat } from 'ai/react'
import { bilan } from '@/lib/bilan'
import { useState } from 'react'

interface MessageWithFeedback {
  id: string
  role: 'user' | 'assistant'
  content: string
  turnId?: string
  conversationId?: string
  feedback?: 1 | -1
}

export default function Chat() {
  const [conversationId, setConversationId] = useState<string>('')
  const [messageTurnIds, setMessageTurnIds] = useState<Record<string, string>>({})
  const [feedbackStates, setFeedbackStates] = useState<Record<string, 1 | -1>>({})

  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    body: {
      conversationId
    },
    onResponse: (response) => {
      // Extract turn and conversation IDs from response headers
      const turnId = response.headers.get('X-Turn-ID')
      const responseConversationId = response.headers.get('X-Conversation-ID')
      
      if (turnId && responseConversationId) {
        // Set conversation ID for future requests
        if (!conversationId) {
          setConversationId(responseConversationId)
        }
        
        // Store turnId with the current message's ID for feedback
        const currentMessage = messages[messages.length - 1]
        if (currentMessage) {
          setMessageTurnIds(prev => ({
            ...prev,
            [currentMessage.id]: turnId
          }))
        }
      }
    }
  })

  const handleFeedback = async (messageId: string, value: 1 | -1, comment?: string) => {
    const turnId = messageTurnIds[messageId]
    if (!turnId || !conversationId) return

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

  return (
    <div className="flex flex-col h-screen max-w-2xl mx-auto p-4">
      <div className="flex-1 overflow-y-auto space-y-4">
        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
              message.role === 'user' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-200 text-gray-900'
            }`}>
              <p>{message.content}</p>
              
              {/* Feedback buttons for AI responses */}
              {message.role === 'assistant' && messageTurnIds[message.id] && (
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => handleFeedback(message.id, 1)}
                    className={`text-sm px-2 py-1 rounded ${
                      feedbackStates[messageTurnIds[message.id]] === 1
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    👍 Helpful
                  </button>
                  <button
                    onClick={() => handleFeedback(message.id, -1)}
                    className={`text-sm px-2 py-1 rounded ${
                      feedbackStates[messageTurnIds[message.id]] === -1
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

      <form onSubmit={handleSubmit} className="flex gap-2 mt-4">
        <input
          value={input}
          onChange={handleInputChange}
          placeholder="Ask me anything..."
          className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
        >
          {isLoading ? 'Thinking...' : 'Send'}
        </button>
      </form>
    </div>
  )
}
```

### 4. Add analytics display

```typescript
// components/AnalyticsDisplay.tsx
'use client'

import { bilan } from '@/lib/bilan'
import { useEffect, useState } from 'react'

export default function AnalyticsDisplay() {
  const [satisfactionRate, setSatisfactionRate] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const analytics = await bilan.getAnalytics({
          eventType: 'vote',
          timeRange: '7d'
        })
        
        const votes = analytics.events.filter(e => e.event_type === 'vote')
        const positiveVotes = votes.filter(e => e.properties.value === 1).length
        const rate = votes.length > 0 ? positiveVotes / votes.length : 0
        
        setSatisfactionRate(rate)
      } catch (error) {
        console.error('Failed to fetch analytics:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchAnalytics()
    
    // Update every 30 seconds
    const interval = setInterval(fetchAnalytics, 30000)
    return () => clearInterval(interval)
  }, [])

  if (loading) return <div className="text-sm text-gray-500">Loading...</div>

  if (satisfactionRate === null) return null

  const scoreColor = satisfactionRate >= 0.8 ? 'text-green-600' : 
                    satisfactionRate >= 0.6 ? 'text-yellow-600' : 'text-red-600'

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-gray-600">Satisfaction Rate:</span>
      <span className={`font-medium ${scoreColor}`}>
        {Math.round(satisfactionRate * 100)}%
      </span>
    </div>
  )
}
```

### 5. Put it all together in your main page

```typescript
// app/page.tsx
import Chat from '@/components/Chat'
import AnalyticsDisplay from '@/components/AnalyticsDisplay'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-2xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-semibold">AI Chat with Event Analytics</h1>
          <AnalyticsDisplay />
        </div>
      </header>
      
      <main>
        <Chat />
      </main>
    </div>
  )
}
```

## Testing

### 1. Start your development server

```bash
npm run dev
```

### 2. Test the integration

1. **Send a message** - Type a question and send it
2. **Wait for AI response** - The streaming response should appear
3. **Click feedback buttons** - Try both thumbs up and thumbs down
4. **Check trust score** - Should update in the header after feedback
5. **Open browser devtools** - Check for any console errors

### 3. Verify data persistence

```typescript
// In your browser console
import { bilan } from '@/lib/bilan'
const analytics = await bilan.getAnalytics()
console.log('Current analytics:', analytics)
```

## Advanced Features

### Adding detailed feedback with comments

```typescript
const handleDetailedFeedback = async (promptId: string, value: 1 | -1) => {
  const comment = window.prompt(
    value === 1 ? 'What made this response helpful?' : 'How could this response be improved?'
  )
  
  await vote(promptId, value, comment)
}
```

### Conditional model routing based on satisfaction rate

```typescript
// app/api/chat/route.ts
import { bilan } from '@/lib/bilan'

export async function POST(req: Request) {
  const { messages, conversationId } = await req.json()
  
  // Get current satisfaction rate
  const analytics = await bilan.getAnalytics({
    eventType: 'vote',
    timeRange: '7d'
  })
  
  const votes = analytics.events.filter(e => e.event_type === 'vote')
  const positiveVotes = votes.filter(e => e.properties.value === 1).length
  const satisfactionRate = votes.length > 0 ? positiveVotes / votes.length : 0.5
  
  // Use better model if satisfaction rate is low
  const model = satisfactionRate < 0.7 ? 'gpt-4' : 'gpt-3.5-turbo'
  
  const result = await streamText({
    model: openai(model),
    messages
  })
  
  return result.toDataStreamResponse()
}
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
await vote('prompt-id-123', 1, 'Great response!')

// Old trust score
const stats = await getStats()
console.log('Trust score:', stats.trustScore)
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
  comment: 'Great response!'
})

// New analytics
const analytics = await bilan.getAnalytics({
  eventType: 'vote',
  timeRange: '7d'
})
```

### Key Changes in Vercel AI SDK Integration

1. **Headers**: `X-Prompt-ID` → `X-Turn-ID` + `X-Conversation-ID`
2. **Feedback**: `vote()` → `track('vote', properties)`
3. **Analytics**: `getStats()` → `getAnalytics()`
4. **Turn Tracking**: Automatic start/complete/failed tracking
5. **Conversation Context**: Persistent conversation ID across turns

### Real-time analytics updates

```typescript
// components/TrustScore.tsx - Add real-time updates
useEffect(() => {
  const eventSource = new EventSource('/api/trust-score-stream')
  
  eventSource.onmessage = (event) => {
    const newScore = JSON.parse(event.data).trustScore
    setTrustScore(newScore)
  }
  
  return () => eventSource.close()
}, [])
```

## Next Steps

- **[Dashboard Setup](../dashboard.md)** - View detailed analytics
- **[Server Mode](../server-mode.md)** - Scale beyond local storage
- **[A/B Testing](../ab-testing.md)** - Test different AI models
- **[Custom Storage](../custom-storage.md)** - Integrate with your database

## Common Issues

**Q: Feedback buttons not working?**
A: Make sure you're passing the correct `promptId` from the response headers.

**Q: Trust score not updating?**
A: Check that votes are being recorded with `getStats()` in browser console.

**Q: Streaming responses not tracked?**
A: Ensure you're using the `onResponse` callback to capture the `promptId`.

## Example Repository

See a complete working example at: [bilan-vercel-ai-example](https://github.com/mocksi/bilan-vercel-ai-example)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/mocksi/bilan-vercel-ai-example) 