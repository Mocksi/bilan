# @mocksi/bilan-sdk

[![NPM Version](https://img.shields.io/npm/v/@mocksi/bilan-sdk?style=flat-square)](https://www.npmjs.com/package/@mocksi/bilan-sdk)
[![Bundle Size](https://img.shields.io/badge/Bundle%20Size-5.1KB%20gzipped-green?style=flat-square)](https://bundlephobia.com/package/@mocksi/bilan-sdk)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue?style=flat-square)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)

**Trust analytics for AI products** - Track user feedback and trust signals for AI features. Self-hostable, TypeScript-first, production-ready.

## Features

- **🚀 Lightweight**: 5.1KB gzipped, zero dependencies
- **🔒 Type Safe**: Full TypeScript support with branded types  
- **📱 Universal**: Works in browsers, Node.js, React Native, and edge environments
- **🛡️ Production Ready**: Comprehensive error handling and graceful degradation
- **🎯 Industry Standard**: Follows proven analytics patterns from Amplitude/Mixpanel
- **🏠 Self-Hostable**: Own your data with optional self-hosted backend

## Quick Start

```bash
npm install @mocksi/bilan-sdk
```

### Basic Usage

```typescript
import { trackTurn, vote } from '@mocksi/bilan-sdk'

// Track an AI interaction and get correlation ID
const { result, turnId } = await trackTurn(
  'Help me write an email',
  () => openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: prompt }]
  })
)

// Collect user feedback using the same ID
await vote(turnId, 1, 'Great suggestion!')
```

### With Configuration

```typescript
import { init, trackTurn, vote } from '@mocksi/bilan-sdk'

// Initialize with your preferences
await init({
  mode: 'server',                    // or 'local' for offline mode
  endpoint: 'https://your-api.com',   // your self-hosted endpoint
  userId: 'user-123',
  debug: process.env.NODE_ENV === 'development'
})

// Now track interactions
const { result, turnId } = await trackTurn(
  'Generate code snippet',
  () => callYourAI(prompt),
  {
    conversation_id: 'conv-456',
    model: 'gpt-4',
    temperature: 0.7
  }
)

await vote(turnId, -1, 'Not quite what I needed')
```

## API Reference

### Core Functions

#### `trackTurn<T>(prompt, aiCall, context?)`

Track an AI interaction and return both the result and a correlation ID.

```typescript
const { result, turnId } = await trackTurn(
  'User prompt or description',
  () => yourAICall(),
  {
    conversation_id?: string,
    model?: string,
    temperature?: number,
    // ... any custom context
  }
)
```

**Parameters:**
- `prompt` (string): Description of the AI task
- `aiCall` (function): Function that returns a Promise with your AI result  
- `context` (object, optional): Additional context for analytics

**Returns:** `{ result: T, turnId: string }`

#### `vote(turnId, value, comment?)`

Record user feedback for a specific AI interaction.

```typescript
await vote(turnId, 1, 'Helpful response!')  // Positive feedback
await vote(turnId, -1, 'Not relevant')      // Negative feedback
```

**Parameters:**
- `turnId` (string): ID returned from `trackTurn`
- `value` (1 | -1): Positive (1) or negative (-1) feedback
- `comment` (string, optional): Additional feedback text

#### `init(config)`

Initialize the SDK with your configuration.

```typescript
await init({
  mode: 'local' | 'server',
  endpoint?: string,
  userId?: string,
  debug?: boolean,
  privacyConfig?: {
    defaultCaptureLevel: 'none' | 'metadata' | 'sanitized' | 'full'
  }
})
```

### Advanced Usage

#### Conversation Tracking

```typescript
import { startConversation, endConversation } from '@mocksi/bilan-sdk'

const conversationId = await startConversation('user-123')

// Multiple turns in the same conversation
const { result: response1, turnId: turn1 } = await trackTurn(
  'First question',
  () => ai.chat(prompt1),
  { conversation_id: conversationId, turn_sequence: 1 }
)

const { result: response2, turnId: turn2 } = await trackTurn(
  'Follow-up question', 
  () => ai.chat(prompt2),
  { conversation_id: conversationId, turn_sequence: 2 }
)

await endConversation(conversationId, 'completed')
```

#### Journey Tracking

```typescript
import { trackJourneyStep } from '@mocksi/bilan-sdk'

// Track user progress through AI-powered workflows
await trackJourneyStep('email-workflow', 'draft-created', 'user-123')
await trackJourneyStep('email-workflow', 'ai-enhanced', 'user-123')  
await trackJourneyStep('email-workflow', 'completed', 'user-123')
```

## Framework Integration

### React

```typescript
import { trackTurn, vote } from '@mocksi/bilan-sdk'
import { useState } from 'react'

function AIChat() {
  const [feedback, setFeedback] = useState<Record<string, number>>({})

  const handleSubmit = async (prompt: string) => {
    const { result, turnId } = await trackTurn(
      prompt,
      () => openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: prompt }]
      })
    )
    
    // Store turnId for feedback buttons
    return { response: result, turnId }
  }

  const handleFeedback = async (turnId: string, value: 1 | -1) => {
    await vote(turnId, value)
    setFeedback(prev => ({ ...prev, [turnId]: value }))
  }

  // ... rest of component
}
```

### Next.js

```typescript
// pages/api/chat.ts
import { trackTurn } from '@mocksi/bilan-sdk'
import { openai } from '@/lib/openai'

export default async function handler(req, res) {
  const { prompt } = req.body

  const { result, turnId } = await trackTurn(
    prompt,
    () => openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }]
    })
  )

  res.json({ 
    response: result.choices[0].message.content,
    turnId 
  })
}
```

### Node.js

```typescript
import { init, trackTurn, vote } from '@mocksi/bilan-sdk'

// Initialize once at startup
await init({
  mode: 'server',
  endpoint: process.env.BILAN_ENDPOINT,
  userId: 'server-user'
})

// Use in your application
app.post('/ai-chat', async (req, res) => {
  const { result, turnId } = await trackTurn(
    req.body.prompt,
    () => callYourAI(req.body.prompt)
  )

  res.json({ response: result, turnId })
})
```

## Configuration Options

```typescript
interface InitConfig {
  mode: 'local' | 'server'
  endpoint?: string
  userId?: string
  debug?: boolean
  privacyConfig?: {
    defaultCaptureLevel: 'none' | 'metadata' | 'sanitized' | 'full'
    captureLevels?: {
      prompts?: 'none' | 'metadata' | 'sanitized' | 'full'
      responses?: 'none' | 'metadata' | 'sanitized' | 'full'
      errors?: 'none' | 'metadata' | 'sanitized' | 'full'
      metadata?: 'none' | 'metadata' | 'sanitized' | 'full'
    }
  }
  telemetry?: {
    enabled?: boolean
    endpoint?: string
  }
}
```

## Self-Hosting

Deploy your own Bilan analytics server:

```bash
# Install server package
npm install -g @mocksi/bilan-server

# Start server
bilan start --port 3001 --db ./bilan.db

# Or with Docker
docker run -p 3001:3001 -v $(pwd)/data:/data mocksi/bilan-server
```

Then configure the SDK to use your server:

```typescript
await init({
  mode: 'server',
  endpoint: 'http://localhost:3001'
})
```

## Browser Support

- Chrome/Edge 88+
- Firefox 87+  
- Safari 14+
- Node.js 14.17.0+

## TypeScript

This package includes TypeScript definitions. No additional `@types` packages needed.

```typescript
import type { TurnId, UserId, VoteValue } from '@mocksi/bilan-sdk'

// All types are exported for your use
const turnId: TurnId = 'turn_123' as TurnId
const vote: VoteValue = 1
```

## Contributing

We welcome contributions! Please see our [Contributing Guide](https://github.com/Mocksi/bilan/blob/main/CONTRIBUTING.md).

## License

MIT © [Mocksi](https://github.com/Mocksi)

## Links

- [Documentation](https://github.com/Mocksi/bilan#readme)
- [GitHub Repository](https://github.com/Mocksi/bilan)
- [Issue Tracker](https://github.com/Mocksi/bilan/issues)
- [Integration Examples](https://github.com/Mocksi/bilan/tree/main/docs/integrations) 