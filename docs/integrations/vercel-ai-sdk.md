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
import { init } from '@mocksi/bilan-sdk'

export const bilan = await init({
  mode: 'local', // or 'server' with your API key
  userId: 'user-123', // your user identifier
  telemetry: {
    enabled: true // opt-in to usage analytics
  }
})
```

### 2. Create your AI chat route with feedback tracking

```typescript
// app/api/chat/route.ts
import { openai } from '@ai-sdk/openai'
import { streamText } from 'ai'
import { generateId } from 'ai'

export async function POST(req: Request) {
  const { messages } = await req.json()
  
  // Generate unique ID for this AI response
  const promptId = generateId()
  
  const result = await streamText({
    model: openai('gpt-4'),
    messages,
    onFinish: async (completion) => {
      // Optional: Log completion for analytics
      console.log(`AI response completed for prompt ${promptId}`)
    }
  })
  
  // Add promptId to the response headers so frontend can track it
  return result.toDataStreamResponse({
    headers: {
      'X-Prompt-ID': promptId
    }
  })
}
```

### 3. Create a chat component with feedback

```typescript
// components/Chat.tsx
'use client'

import { useChat } from 'ai/react'
import { vote } from '@mocksi/bilan-sdk'
import { useState } from 'react'

interface MessageWithFeedback {
  id: string
  role: 'user' | 'assistant'
  content: string
  promptId?: string
  feedback?: 1 | -1
}

export default function Chat() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    onResponse: (response) => {
      // Extract promptId from response headers
      const promptId = response.headers.get('X-Prompt-ID')
      if (promptId) {
        // Store promptId with the message for feedback
        setMessagePromptIds(prev => ({
          ...prev,
          [messages.length]: promptId
        }))
      }
    }
  })
  
  const [messagePromptIds, setMessagePromptIds] = useState<Record<number, string>>({})
  const [feedbackStates, setFeedbackStates] = useState<Record<string, 1 | -1>>({})

  const handleFeedback = async (messageIndex: number, value: 1 | -1, comment?: string) => {
    const promptId = messagePromptIds[messageIndex]
    if (!promptId) return

    try {
      await vote(promptId, value, comment)
      setFeedbackStates(prev => ({ ...prev, [promptId]: value }))
    } catch (error) {
      console.error('Failed to submit feedback:', error)
    }
  }

  return (
    <div className="flex flex-col h-screen max-w-2xl mx-auto p-4">
      <div className="flex-1 overflow-y-auto space-y-4">
        {messages.map((message, index) => (
          <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
              message.role === 'user' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-200 text-gray-900'
            }`}>
              <p>{message.content}</p>
              
              {/* Feedback buttons for AI responses */}
              {message.role === 'assistant' && messagePromptIds[index] && (
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => handleFeedback(index, 1)}
                    className={`text-sm px-2 py-1 rounded ${
                      feedbackStates[messagePromptIds[index]] === 1
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    👍 Helpful
                  </button>
                  <button
                    onClick={() => handleFeedback(index, -1)}
                    className={`text-sm px-2 py-1 rounded ${
                      feedbackStates[messagePromptIds[index]] === -1
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

### 4. Add trust score display

```typescript
// components/TrustScore.tsx
'use client'

import { getStats } from '@mocksi/bilan-sdk'
import { useEffect, useState } from 'react'

export default function TrustScore() {
  const [trustScore, setTrustScore] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const stats = await getStats()
        setTrustScore(stats.trustScore)
      } catch (error) {
        console.error('Failed to fetch trust score:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
    
    // Update every 30 seconds
    const interval = setInterval(fetchStats, 30000)
    return () => clearInterval(interval)
  }, [])

  if (loading) return <div className="text-sm text-gray-500">Loading...</div>

  if (trustScore === null) return null

  const scoreColor = trustScore >= 0.8 ? 'text-green-600' : 
                    trustScore >= 0.6 ? 'text-yellow-600' : 'text-red-600'

  return (
    <div className="flex items-center gap-2 text-sm">
      <span className="text-gray-600">Trust Score:</span>
      <span className={`font-medium ${scoreColor}`}>
        {Math.round(trustScore * 100)}%
      </span>
    </div>
  )
}
```

### 5. Put it all together in your main page

```typescript
// app/page.tsx
import Chat from '@/components/Chat'
import TrustScore from '@/components/TrustScore'

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-2xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-semibold">AI Chat with Trust Analytics</h1>
          <TrustScore />
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
import { getStats } from '@mocksi/bilan-sdk'
const stats = await getStats()
console.log('Current stats:', stats)
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

### Conditional model routing based on trust score

```typescript
// app/api/chat/route.ts
import { getStats } from '@mocksi/bilan-sdk'

export async function POST(req: Request) {
  const { messages } = await req.json()
  
  // Get current trust score
  const stats = await getStats()
  
  // Use better model if trust score is low
  const model = stats.trustScore < 0.7 ? 'gpt-4' : 'gpt-3.5-turbo'
  
  const result = await streamText({
    model: openai(model),
    messages
  })
  
  return result.toDataStreamResponse()
}
```

### Real-time trust score updates

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