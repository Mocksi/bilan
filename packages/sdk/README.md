# @mocksi/bilan-sdk

[![NPM Version](https://img.shields.io/npm/v/@mocksi/bilan-sdk?style=flat-square)](https://www.npmjs.com/package/@mocksi/bilan-sdk)
[![Bundle Size](https://img.shields.io/badge/Bundle%20Size-5.4KB%20gzipped-yellow?style=flat-square)](https://github.com/Mocksi/bilan/tree/main/packages/sdk)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue?style=flat-square)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)

**TypeScript SDK for Bilan trust analytics** - Track user feedback on AI suggestions. Self-hostable, TypeScript-first, <5KB bundle.

## Quick Start

```bash
npm install @mocksi/bilan-sdk
```

### ✨ v0.4.1: Industry-Standard Event Correlation

```typescript
import { init, trackTurn, vote, createUserId } from '@mocksi/bilan-sdk'

// Initialize the SDK
await init({
  mode: 'local',  // or 'server' for self-hosted API
  userId: createUserId('user-123')
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

### Conversation Tracking

Track AI conversation success and quality signals:

```typescript
import { init, startConversation, vote, endConversation, createUserId } from '@mocksi/bilan-sdk'

// Initialize the SDK
await init({ mode: 'local', userId: createUserId('user-123') })

// Track conversation flow
const conversationId = await startConversation('user-123')

// Track AI interactions within conversation
const { result, turnId } = await trackTurn(
  'Write an email',
  () => callAI(prompt),
  {
    conversation_id: conversationId,
    turn_sequence: 1
  }
)

// Record feedback using turnId
await vote(turnId, 1, 'Great response!')

// End conversation
await endConversation(conversationId, 'completed')  // or 'abandoned'
```

### Journey Tracking

Track user progress through AI-powered workflows:

```typescript
import { init, trackTurn, trackJourneyStep, createUserId } from '@mocksi/bilan-sdk'

// Initialize the SDK
await init({ mode: 'local', userId: createUserId('user-123') })

// Track AI interaction within journey
const { result, turnId } = await trackTurn(
  'Generate email draft',
  () => callAI(prompt),
  {
    journey_id: 'email-workflow'
  }
)

// Track journey progress
await trackJourneyStep('email-workflow', 'draft-created', 'user-123')
await trackJourneyStep('email-workflow', 'ai-enhanced', 'user-123')
await trackJourneyStep('email-workflow', 'completed', 'user-123')

// Record feedback
await vote(turnId, 1, 'Perfect email!')
```

## Features

- **🚀 Lightweight**: <5KB gzipped bundle size
- **🔒 Type Safe**: Full TypeScript support with branded types
- **🏃‍♂️ Zero Dependencies**: Uses only native web APIs
- **📱 Universal**: Works in browsers, Node.js, and edge environments
- **🛡️ Robust**: Comprehensive error handling and graceful degradation
- **🎯 Industry Standard**: Follows Amplitude/Mixpanel event correlation patterns

## API Reference

### Core Methods

**`trackTurn<T>(prompt: string, aiCall: () => Promise<T>, context?: object): Promise<{ result: T, turnId: string }>`**
Track an AI interaction and get both result and turnId for correlation.

**`vote(turnId: string, value: 1 | -1, comment?: string): Promise<void>`**
Record user feedback using turnId from trackTurn.

**`startConversation(userId: string): Promise<string>`**
Start a conversation session.

**`endConversation(conversationId: string, status?: 'completed' | 'abandoned'): Promise<void>`**
End a conversation with outcome.

**`trackJourneyStep(journeyName: string, stepName: string, userId: string): Promise<void>`**
Track progress through workflow steps.

### Configuration

```typescript
interface InitConfig {
  mode: 'local' | 'server'
  userId: UserId
  endpoint?: string        // Custom API endpoint
  debug?: boolean         // Enable debug logging
  privacyConfig?: {       // Privacy controls
    defaultCaptureLevel: 'none' | 'metadata' | 'sanitized' | 'full'
    captureLevels: {
      prompts: 'none' | 'metadata' | 'sanitized' | 'full'
      responses: 'none' | 'metadata' | 'sanitized' | 'full'
      errors: 'none' | 'metadata' | 'sanitized' | 'full'
      metadata: 'none' | 'metadata' | 'sanitized' | 'full'
    }
  }
  telemetry?: {          // Optional usage telemetry
    enabled?: boolean
    endpoint?: string
  }
}
```

## Documentation

For complete documentation, examples, and self-hosting instructions, visit:
**[https://github.com/Mocksi/bilan](https://github.com/Mocksi/bilan)**

## License

MIT © [Mocksi](https://github.com/Mocksi) 