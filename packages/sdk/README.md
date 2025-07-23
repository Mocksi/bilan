# @mocksi/bilan-sdk

[![NPM Version](https://img.shields.io/npm/v/@mocksi/bilan-sdk?style=flat-square)](https://www.npmjs.com/package/@mocksi/bilan-sdk)
[![Bundle Size](https://img.shields.io/badge/Bundle%20Size-5.0KB%20gzipped-green?style=flat-square)](https://bundlephobia.com/package/@mocksi/bilan-sdk)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue?style=flat-square)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)

**TypeScript SDK for AI trust analytics** - Track user feedback on AI interactions with industry-standard event correlation. Self-hostable, TypeScript-first, <5KB bundle.

## Quick Start

### Installation

```bash
npm install @mocksi/bilan-sdk
```

### Basic Usage

```typescript
import { init, trackTurn, vote } from '@mocksi/bilan-sdk'

// Initialize the SDK
await init({
  mode: 'local',  // or 'server' for self-hosted API
  userId: 'user-123'
})

// ✅ v0.4.1: trackTurn returns both result and turnId
const { result, turnId } = await trackTurn(
  'Help me write an email',
  () => openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: prompt }]
  })
)

// Use the same turnId for feedback - automatic correlation
await vote(turnId, 1, 'Helpful suggestion!')
```

## Features

- **🚀 Lightweight**: <5KB gzipped bundle size
- **🔒 Type Safe**: Full TypeScript support with branded types  
- **🏃‍♂️ Zero Dependencies**: Uses only native web APIs
- **📱 Universal**: Works in browsers, Node.js, and edge environments
- **🛡️ Robust**: Comprehensive error handling and graceful degradation
- **🎯 Industry Standard**: Follows Amplitude/Mixpanel event correlation patterns
- **🔐 Privacy First**: Configurable data capture levels and sanitization

## Use Cases

### AI Chat Applications
```typescript
import { trackTurn, vote } from '@mocksi/bilan-sdk'

// Track OpenAI completion
const { result, turnId } = await trackTurn(
  userMessage,
  () => openai.chat.completions.create({
    model: 'gpt-4',
    messages: conversation
  })
)

// Record user feedback
await vote(turnId, 1, 'Great response!')
```

### LangChain Integration
```typescript
import { trackTurn } from '@mocksi/bilan-sdk'

const { result: answer, turnId } = await trackTurn(
  question,
  () => chain.invoke({ question })
)

// Use turnId for feedback correlation
await vote(turnId, -1, 'Inaccurate information')
```

### Streaming Responses
```typescript
const { result: stream, turnId } = await trackTurn(
  prompt,
  () => openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: prompt }],
    stream: true
  })
)

// Process stream...
for await (const chunk of stream) {
  // Handle streaming data
}

// Collect feedback after streaming completes
await vote(turnId, 1, 'Smooth streaming experience')
```

## API Reference

### Core Methods

#### `init(config: InitConfig): Promise<void>`

Initialize the SDK with configuration.

```typescript
interface InitConfig {
  mode: 'local' | 'server'
  userId: string
  endpoint?: string        // Custom API endpoint (server mode)
  debug?: boolean         // Enable debug logging
  privacyConfig?: PrivacyConfig
  telemetry?: TelemetryConfig
}
```

#### `trackTurn<T>(prompt: string, aiCall: () => Promise<T>, context?: object): Promise<{ result: T, turnId: string }>`

Track an AI interaction and get both result and turnId for correlation.

**Parameters:**
- `prompt` - Description of the AI task or user input
- `aiCall` - Function that returns the AI response
- `context` - Optional metadata (conversation_id, model, etc.)

**Returns:** Object with original result and turnId for feedback

#### `vote(turnId: string, value: 1 | -1, comment?: string): Promise<void>`

Record user feedback using turnId from trackTurn.

**Parameters:**
- `turnId` - ID from trackTurn response
- `value` - 1 for positive, -1 for negative feedback
- `comment` - Optional detailed feedback

### Conversation Tracking

#### `startConversation(userId: string, title?: string): Promise<string>`

Start a conversation session.

#### `endConversation(conversationId: string, status?: 'completed' | 'abandoned'): Promise<void>`

End a conversation with outcome.

### Journey Tracking

#### `trackJourneyStep(journeyName: string, stepName: string, userId: string): Promise<void>`

Track progress through workflow steps.

### Analytics

#### `getStats(userId?: string): Promise<StatsResponse>`

Get trust scores and analytics data.

```typescript
interface StatsResponse {
  trustScore: number        // 0-1 trust score
  totalInteractions: number
  positiveVotes: number
  negativeVotes: number
  conversationsCompleted: number
  averageSessionLength: number
}
```

## Configuration

### Privacy Controls

```typescript
await init({
  mode: 'local',
  userId: 'user-123',
  privacyConfig: {
    defaultCaptureLevel: 'sanitized',
    captureLevels: {
      prompts: 'sanitized',      // Remove PII from prompts
      responses: 'metadata',     // Only track response metadata
      errors: 'full',           // Full error context for debugging
      metadata: 'full'          // Full metadata capture
    }
  }
})
```

**Capture Levels:**
- `none` - Don't capture this data type
- `metadata` - Only basic metadata (length, timestamp, etc.)
- `sanitized` - Remove PII and sensitive data
- `full` - Capture complete data

### Server Mode

```typescript
await init({
  mode: 'server',
  userId: 'user-123',
  endpoint: 'https://your-bilan-server.com',
  // Server handles persistence and analytics
})
```

### Local Mode

```typescript
await init({
  mode: 'local',
  userId: 'user-123',
  // Data stored locally, basic analytics only
})
```

## Integration Guides

### OpenAI API
```typescript
import { trackTurn, vote } from '@mocksi/bilan-sdk'

const { result, turnId } = await trackTurn(
  'Generate creative content',
  () => openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.8
  })
)

await vote(turnId, 1, 'Very creative output!')
```

### Anthropic Claude
```typescript
const { result, turnId } = await trackTurn(
  'Analyze document',
  () => anthropic.messages.create({
    model: 'claude-3-sonnet-20240229',
    messages: [{ role: 'user', content: documentText }]
  })
)

await vote(turnId, 1, 'Accurate analysis')
```

### Vercel AI SDK
```typescript
import { streamText } from 'ai'
import { trackTurn } from '@mocksi/bilan-sdk'

const { result, turnId } = await trackTurn(
  'Generate streaming response',
  () => streamText({
    model: openai('gpt-4'),
    messages: conversation
  })
)

// Use turnId for feedback after streaming
await vote(turnId, 1, 'Great streaming experience')
```

## Error Handling

The SDK handles errors gracefully and never throws:

```typescript
try {
  const { result, turnId } = await trackTurn(
    'Risky AI operation',
    () => riskyAICall()
  )
  
  await vote(turnId, 1, 'Success!')
} catch (error) {
  // AI call failed, but Bilan tracking continues to work
  console.error('AI call failed:', error)
}
```

## Performance

- **Bundle Size**: <5KB gzipped
- **Runtime Overhead**: <1ms per tracked turn
- **Memory Usage**: <100KB for typical usage
- **Network**: Batched requests, offline queuing

## Browser Support

- **Modern Browsers**: Chrome 63+, Firefox 67+, Safari 13.1+, Edge 79+
- **Node.js**: 14.17.0+
- **React Native**: 0.63+
- **Web Workers**: Full support

## TypeScript

Full TypeScript support with branded types for safety:

```typescript
import { UserId, TurnId, ConversationId } from '@mocksi/bilan-sdk'

// Branded types prevent mixing up IDs
const userId: UserId = createUserId('user-123')
const turnId: TurnId = 'turn-456' as TurnId  // From trackTurn
const conversationId: ConversationId = createConversationId()
```

## Development

### Local Development

```bash
# Clone repository
git clone https://github.com/Mocksi/bilan.git
cd bilan/packages/sdk

# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build

# Run tests
npm test
```

### Testing

```typescript
import { init, trackTurn, vote } from '@mocksi/bilan-sdk'

// Initialize in test mode
await init({
  mode: 'local',
  userId: 'test-user',
  debug: true
})

// Test AI interaction tracking
const { result, turnId } = await trackTurn(
  'Test prompt',
  async () => ({ content: 'Test response' })
)

expect(result.content).toBe('Test response')
expect(turnId).toBeDefined()

// Test feedback
await vote(turnId, 1, 'Test feedback')
```

## Migration Guide

### From v0.3.x to v0.4.1

```typescript
// ❌ v0.3.x - Separate tracking
const promptId = await track('prompt', { text: prompt })
const response = await callAI(prompt)
await track('response', { promptId, response })
await vote(promptId, 1)

// ✅ v0.4.1 - Unified tracking
const { result: response, turnId } = await trackTurn(
  prompt,
  () => callAI(prompt)
)
await vote(turnId, 1)
```

## Troubleshooting

### Common Issues

**SDK not initializing**
```typescript
// Ensure init is called before other methods
await init({ mode: 'local', userId: 'user-123' })
```

**TypeScript errors**
```typescript
// Install type definitions
npm install --save-dev @types/node
```

**Bundle size too large**
```typescript
// Use dynamic imports for optional features
const { getStats } = await import('@mocksi/bilan-sdk/analytics')
```

### Debug Mode

```typescript
await init({
  mode: 'local',
  userId: 'user-123',
  debug: true  // Enables console logging
})
```

## Support

- **Documentation**: [https://github.com/Mocksi/bilan](https://github.com/Mocksi/bilan)
- **Integration Guides**: [docs/integrations/](https://github.com/Mocksi/bilan/tree/main/docs/integrations)
- **Issues**: [GitHub Issues](https://github.com/Mocksi/bilan/issues)
- **Discussions**: [GitHub Discussions](https://github.com/Mocksi/bilan/discussions)

## License

MIT © [Mocksi](https://github.com/Mocksi) 