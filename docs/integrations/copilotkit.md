# CopilotKit Integration

CopilotKit provides React components and hooks for building AI chat interfaces. This guide shows how to add user feedback analytics to your CopilotKit implementation to monitor trust and improve AI interactions.

## Why Track CopilotKit with Bilan?

- **User Trust Insights** - See how users actually feel about AI responses
- **Performance Monitoring** - Track response times and model performance
- **Conversation Analytics** - Understand usage patterns and pain points
- **Auto-Context Capture** - Automatically collect model, tokens, and timing data
- **Zero Config Feedback** - Add thumbs up/down with minimal code changes

## Installation

```bash
npm install @mocksi/bilan-sdk
```

## Environment Variables

**Required Environment Variables:**
- `BILAN_MODE` - Set to 'server' for production, 'local' for development
- `BILAN_API_KEY` - Your Bilan API key (required for server mode)
- `BILAN_USER_ID` - Unique identifier for the current user
- `BILAN_TELEMETRY` - Set to 'false' to disable telemetry (optional)

## Integration

### 1. Basic Hook Integration

```typescript
// lib/copilot-bilan.ts
import { useCopilotChat } from '@copilotkit/react-core'
import { init, vote } from '@mocksi/bilan-sdk'
import { useEffect, useState } from 'react'

// Cross-platform UUID generation
function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  // Fallback for environments without crypto.randomUUID
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}

export function useCopilotChatWithBilan(options: any) {
  const [bilan, setBilan] = useState<any>(null)
  const [messagePromptIds, setMessagePromptIds] = useState<Record<string, string>>({})

  // Initialize Bilan
  useEffect(() => {
    const initBilan = async () => {
      const bilanInstance = await init({
        mode: process.env.BILAN_MODE || 'local',
        apiKey: process.env.BILAN_API_KEY,
        userId: process.env.BILAN_USER_ID || 'anonymous',
        telemetry: { enabled: process.env.BILAN_TELEMETRY !== 'false' }
      })
      setBilan(bilanInstance)
    }
    initBilan()
  }, [])

  const chat = useCopilotChat({
    ...options,
    onMessage: (message: any) => {
      // Auto-capture context when AI responds
      if (message.role === 'assistant' && bilan) {
        const promptId = generateId()
        
        // Store promptId for feedback
        setMessagePromptIds(prev => ({
          ...prev,
          [message.id]: promptId
        }))

        // Track AI response automatically
        console.log('AI Response tracked:', {
          promptId,
          messageId: message.id,
          model: message.model || 'unknown',
          responseTime: message.duration,
          tokenCount: message.tokens
        })
      }
      
      // Call original onMessage if provided
      options.onMessage?.(message)
    }
  })

  const recordFeedback = async (messageId: string, feedback: { type: 'thumbs_up' | 'thumbs_down', comment?: string }) => {
    const promptId = messagePromptIds[messageId]
    if (!promptId || !bilan) return

    try {
      const value = feedback.type === 'thumbs_up' ? 1 : -1
      await vote(promptId, value, feedback.comment)
    } catch (error) {
      console.error('Failed to record feedback:', error)
    }
  }

  return {
    ...chat,
    recordFeedback,
    messagePromptIds
  }
}
```

### 2. Chat Component with Feedback

```typescript
// components/CopilotChatWithBilan.tsx
'use client'

import { useCopilotChatWithBilan } from '@/lib/copilot-bilan'
import { useState } from 'react'

interface FeedbackState {
  [messageId: string]: 'thumbs_up' | 'thumbs_down'
}

export default function CopilotChatWithBilan() {
  const { messages, sendMessage, recordFeedback, messagePromptIds } = useCopilotChatWithBilan({
    instructions: "You are a helpful AI assistant.",
  })
  
  const [feedbackStates, setFeedbackStates] = useState<FeedbackState>({})
  const [input, setInput] = useState('')

  const handleFeedback = async (messageId: string, type: 'thumbs_up' | 'thumbs_down') => {
    await recordFeedback(messageId, { type })
    setFeedbackStates(prev => ({ ...prev, [messageId]: type }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return
    
    sendMessage(input)
    setInput('')
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
              
              {/* Feedback buttons for AI responses */}
              {message.role === 'assistant' && messagePromptIds[message.id] && (
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => handleFeedback(message.id, 'thumbs_up')}
                    className={`text-sm px-2 py-1 rounded ${
                      feedbackStates[message.id] === 'thumbs_up'
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    👍 Helpful
                  </button>
                  <button
                    onClick={() => handleFeedback(message.id, 'thumbs_down')}
                    className={`text-sm px-2 py-1 rounded ${
                      feedbackStates[message.id] === 'thumbs_down'
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
        />
        <button
          type="submit"
          disabled={!input.trim()}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  )
}
```

## Auto-Context Capture

The Bilan integration automatically captures:

### Message Context
- **Message ID** - Unique identifier for each AI response
- **Model Information** - Which AI model generated the response
- **Response Time** - How long the AI took to respond
- **Token Count** - Number of tokens used (if available)
- **Timestamp** - When the interaction occurred

### Performance Metrics
- **Response Quality** - Based on user feedback
- **Conversation Success** - Multi-turn conversation effectiveness
- **Error Tracking** - Failed requests and issues

## Testing

### 1. Start your development server

```bash
npm run dev
```

### 2. Test the integration

1. **Send a message** - Type a question and send it
2. **Wait for AI response** - CopilotKit will generate a response
3. **Click feedback buttons** - Try both thumbs up and thumbs down
4. **Check console** - Look for tracking events in browser devtools

### 3. Verify analytics

```typescript
// In your browser console
import { getStats } from '@mocksi/bilan-sdk'
const stats = await getStats()
console.log('Trust score:', stats.trustScore)
```

## Migration from Basic CopilotKit

### Before (Basic CopilotKit)
```typescript
import { useCopilotChat } from '@copilotkit/react-core'

function MyChat() {
  const { messages, sendMessage } = useCopilotChat({
    instructions: "You are helpful."
  })
  
  return (
    <div>
      {messages.map(msg => (
        <div key={msg.id}>{msg.content}</div>
      ))}
    </div>
  )
}
```

### After (With Bilan Analytics)
```typescript
import { useCopilotChatWithBilan } from '@/lib/copilot-bilan'

function MyChat() {
  const { messages, sendMessage, recordFeedback } = useCopilotChatWithBilan({
    instructions: "You are helpful."
  })
  
  return (
    <div>
      {messages.map(msg => (
        <div key={msg.id}>
          {msg.content}
          {msg.role === 'assistant' && (
            <button onClick={() => recordFeedback(msg.id, { type: 'thumbs_up' })}>
              👍
            </button>
          )}
        </div>
      ))}
    </div>
  )
}
```

## Roadmap

### Phase 1: Documentation (Current)
- Integration guide and examples
- Basic hook pattern
- Manual feedback collection

### Phase 2: Official Adapter Package
- `@bilan/copilotkit` npm package
- Zero-config components
- Automatic context capture

### Phase 3: Advanced Features
- Advanced analytics dashboard
- A/B testing framework
- Performance optimization

## Next Steps

- **[Server Mode](../server-mode.md)** - Scale for production
- **[Advanced Analytics](../advanced-analytics.md)** - Deep dive into metrics
- **[A/B Testing](../ab-testing.md)** - Optimize AI performance

## Common Issues

**Q: CopilotKit messages don't have IDs?**
A: Ensure you're using CopilotKit v0.32+ which includes message IDs.

**Q: Feedback not being recorded?**
A: Check that Bilan is initialized before the first AI response.

**Q: Performance issues with large conversations?**
A: Consider implementing conversation truncation or pagination.

---

**Need help?** Join our [Discord community](https://discord.gg/bilan) or [open an issue](https://github.com/mocksi/bilan/issues). 