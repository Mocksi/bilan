<div align="center">
  <h1>📊</h1>
  <h1>Bilan</h1>
  <p><strong>Open Source Trust Analytics for AI Products</strong></p>
  <p>Track user feedback on AI suggestions. Self-hostable, TypeScript-first, <5KB bundle.</p>
</div>

<div align="center">

[![NPM Version](https://img.shields.io/npm/v/@mocksi/bilan-sdk?style=flat-square)](https://www.npmjs.com/package/@mocksi/bilan-sdk)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue?style=flat-square)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![CI](https://img.shields.io/github/actions/workflow/status/Mocksi/bilan/ci.yml?branch=main&style=flat-square&label=CI)](https://github.com/Mocksi/bilan/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/Mocksi/bilan/graph/badge.svg?token=YV3PW1YYM3)](https://codecov.io/gh/Mocksi/bilan)
[![Bundle Size](https://img.shields.io/badge/Bundle%20Size-4.8KB%20gzipped-brightgreen?style=flat-square)](https://github.com/Mocksi/bilan/tree/main/packages/sdk)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue?style=flat-square)](https://github.com/Mocksi/bilan/tree/main/docker)
[![Production](https://img.shields.io/badge/Production-Ready-green?style=flat-square)](https://github.com/Mocksi/bilan/tree/main/docs/deployment.md)

</div>

---

## What is Bilan?

Bilan is an open source analytics platform that helps you understand how users interact with your AI-powered features. Think "Google Analytics for AI" - track every turn, conversation, and user interaction with comprehensive event-based analytics running on your own infrastructure.

**Perfect for:** Individual developers, startups, and teams who want complete visibility into AI user experience without external dependencies.

### ✨ **v0.4.0: Event-Based Architecture**

Bilan v0.4.0 transforms AI analytics with a flexible, event-driven approach that automatically captures success rates, failure modes, and user behavior patterns with minimal integration effort.

#### 🚀 One-Line AI Tracking
Wrap any AI call to automatically track success, failures, and performance:

```typescript
// Before: Manual conversation management 
const response = await openai.chat.completions.create({...})

// After: Automatic turn tracking with failure detection
const response = await bilan.trackTurn(
  'Help me write an email',
  () => openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: prompt }]
  })
)
```

**Automatically captures:**
- ✅ Success rates and response times
- ❌ Timeouts, rate limits, and API errors
- 📊 Model performance metrics
- 👤 User interaction patterns

#### 🎯 Core Capabilities

##### **🔄 Turn-Based Analytics**
Every AI interaction is tracked as an atomic "turn" with comprehensive metrics:
- **Success/Failure Tracking**: Automatic detection of timeouts, API errors, and cancellations
- **Performance Metrics**: Response times, token usage, and model performance
- **Error Classification**: Detailed error categorization (timeout, rate_limit, network, etc.)
- **Privacy Controls**: Configurable prompt and response capture with PII sanitization

##### **💬 Conversation Aggregation**  
Turns automatically aggregate into conversation sessions:
- **Session Management**: Automatic conversation grouping and lifecycle tracking
- **Multi-turn Analysis**: Conversation flow patterns and user behavior insights
- **Abandonment Detection**: Identify where users drop off or get frustrated
- **Success Metrics**: Completion rates and conversation quality scores

##### **🗺️ Journey Workflows**
Track user progress through multi-step AI-powered workflows:
- **Step Progression**: Monitor progress through predefined journey steps
- **Funnel Analysis**: Identify optimization opportunities and drop-off points
- **Completion Tracking**: Measure end-to-end workflow success rates
- **User Path Analysis**: Understand how users navigate AI-powered experiences

##### **👍 Enhanced Feedback Collection**
Capture both explicit and implicit user signals:
- **Explicit Feedback**: Traditional thumbs up/down with contextual comments
- **Implicit Signals**: Automatic frustration and regeneration event detection
- **Quality Indicators**: Aggregate feedback into actionable trust and satisfaction scores
- **Trend Analysis**: Track improvement or decline over time with detailed insights

##### **📊 Event-Based Flexibility**
Built on a flexible event architecture that grows with your needs:
- **Custom Events**: Track any AI-related interaction beyond built-in patterns
- **Flexible Analytics**: Slice data by conversation, journey, user, or custom properties
- **Schema Evolution**: Add new event types without breaking existing analytics
- **API-First Design**: Full REST API for custom dashboards and integrations

### Platform Features

#### SDK
- **🚀 Lightweight**: <5KB gzipped bundle size
- **🔒 Type Safe**: Full TypeScript support with branded types
- **🏃‍♂️ Zero Dependencies**: Uses only native web APIs
- **📱 Universal**: Works in browsers, Node.js, and edge environments
- **🔧 Configurable**: Advanced trend analysis with customizable parameters
- **🛡️ Robust**: Comprehensive error handling and graceful degradation
- **📊 Smart Analytics**: Time-weighted trend detection with statistical significance

#### Production Infrastructure
- **🐳 Docker Ready**: Complete containerization with multi-stage builds
- **📈 Real-time Dashboard**: Live analytics with conversation tracking
- **🔍 Health Monitoring**: Comprehensive health checks and metrics
- **💾 Database Support**: PostgreSQL and SQLite with migration scripts
- **⚡ Performance Tested**: <500ms API response times, <3s dashboard loads
- **🔐 Security Hardened**: Input validation, secure headers, rate limiting
- **📊 Observability**: Prometheus metrics, structured logging, alerting

### Quick Start

```bash
npm install @mocksi/bilan-sdk
```

#### **🚀 Effortless AI Tracking**

```typescript
import { init, trackTurn, vote, startConversation, createUserId } from '@mocksi/bilan-sdk'

// Initialize the SDK
await init({
  apiKey: 'your-api-key',
  userId: createUserId('user-123'),
  // Privacy controls
  capturePrompts: true,
  captureResponses: false  // Default: privacy-first
})

// Wrap any AI call for automatic tracking
const response = await trackTurn(
  'Help me write a professional email',
  () => openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: prompt }]
  }),
  {
    conversationId: 'conv-123',
    systemPromptVersion: 'v2.1',
    modelUsed: 'gpt-4'
  }
)

// Capture user feedback
await vote(promptId, 1, 'Very helpful!')

// Track user journeys
await trackJourneyStep('email-workflow', 'draft-composed', createUserId('user-123'))
await trackJourneyStep('email-workflow', 'ai-enhanced', createUserId('user-123'))
```

#### **📊 Complete Workflow Example**

```typescript
// Start a conversation
const conversationId = await startConversation('user-123')

// Track AI interactions with automatic failure detection
const response1 = await trackTurn(
  'Write an email subject line',
  () => callOpenAI(prompt),
  { conversationId }
)

const response2 = await trackTurn(
  'Write the email body',
  () => callOpenAI(bodyPrompt),  
  { conversationId }
)

// Record user feedback
await recordFeedback(conversationId, 1, 'Great suggestions!')

// End conversation
await endConversation(conversationId, 'completed')

// Analytics are automatically available in your dashboard
```

### Advanced Configuration

```typescript
import { init, TrendConfig } from '@mocksi/bilan-sdk'

// Custom trend analysis configuration
const trendConfig: TrendConfig = {
  sensitivity: 0.15,      // Threshold for trend detection (0.0-1.0)
  timeWeightHours: 48,    // Hours for time decay weighting
  minSampleSize: 8,       // Minimum events needed for reliable trends
  recentWindowSize: 15    // Size of recent comparison window
}

await init({
  mode: 'server',
  userId: createUserId('user-123'),
  endpoint: 'https://your-bilan-api.com',
  debug: true,            // Enable detailed error reporting
  trendConfig
})
```

### Complete API Reference

#### Types & Interfaces

```typescript
// Branded types for type safety
type UserId = string & { __brand: 'UserId' }
type ConversationId = string & { __brand: 'ConversationId' }

// Create branded types
const userId = createUserId('user-123')

// Conversation tracking
interface ConversationData {
  id: ConversationId
  userId: UserId
  startedAt: number
  endedAt?: number
  messageCount: number
  outcome?: 'completed' | 'abandoned'
}

// Quality signals and feedback
interface FeedbackEvent {
  conversationId: ConversationId
  type: 'frustration' | 'regeneration' | 'explicit_feedback'
  value?: 1 | -1          // for explicit feedback only
  comment?: string        // Optional user comment
  timestamp: number
}

// Journey tracking
interface JourneyStep {
  journeyName: string
  stepName: string
  userId: UserId
  completedAt: number
}

// Comprehensive analytics
interface AnalyticsStats {
  // Conversation metrics
  totalConversations: number
  conversationSuccessRate: number    // 0.0-1.0
  averageMessagesPerConversation: number
  
  // Journey metrics
  journeyCompletionRate: number      // 0.0-1.0
  averageJourneyDuration: number     // milliseconds
  
  // Quality signals
  frustrationEvents: number
  regenerationEvents: number
  explicitFeedbackScore: number      // -1.0 to 1.0
  
  // Overall trust score
  trustScore: number                 // 0.0-1.0
  trendDirection: 'improving' | 'declining' | 'stable'
}
```

#### Core Methods

**`init(config: InitConfig): Promise<void>`**
Initialize the SDK with configuration.

**Conversation Tracking Methods**

**`conversation.start(userId: UserId): Promise<ConversationId>`**
Start a new conversation session.

**`conversation.addMessage(conversationId: ConversationId): Promise<void>`**
Record a message in the conversation.

**`conversation.recordFrustration(conversationId: ConversationId): Promise<void>`**
Record a user frustration event.

**`conversation.recordRegeneration(conversationId: ConversationId): Promise<void>`**
Record when user regenerates AI response.

**`conversation.recordFeedback(conversationId: ConversationId, value: 1 | -1, comment?: string): Promise<void>`**
Record explicit user feedback.

**`conversation.end(conversationId: ConversationId, outcome: 'completed' | 'abandoned'): Promise<void>`**
End conversation with success/failure outcome.

```typescript
// Complete conversation flow
const conversationId = await conversation.start(createUserId('user-123'))
await conversation.addMessage(conversationId)
await conversation.recordFeedback(conversationId, 1, 'Helpful!')
await conversation.end(conversationId, 'completed')
```

**Journey Tracking Methods**

**`journey.trackStep(journeyName: string, stepName: string, userId: UserId): Promise<void>`**
Record progress through a journey step.

**`journey.complete(journeyName: string, userId: UserId): Promise<void>`**
Mark a journey as completed.

```typescript
// Track email workflow journey
await journey.trackStep('email-workflow', 'draft-created', userId)
await journey.trackStep('email-workflow', 'ai-suggestions-applied', userId)
await journey.complete('email-workflow', userId)
```

**Analytics Methods**

**`getStats(): Promise<AnalyticsStats>`**
Get comprehensive analytics including conversations, journeys, and quality signals.

**`getConversationStats(conversationId?: ConversationId): Promise<ConversationStats>`**
Get analytics for conversations (specific or all).

**`getJourneyStats(journeyName?: string): Promise<JourneyStats>`**
Get analytics for journeys (specific or all).

#### Error Handling

The SDK includes robust error handling with graceful degradation:

```typescript
// Production mode: warnings logged, execution continues
await init({ mode: 'local', userId: createUserId('user-123') })

// Debug mode: errors thrown for debugging
await init({ 
  mode: 'local', 
  userId: createUserId('user-123'),
  debug: true  // Throws errors instead of warning
})
```

**Error Types:**
- `BilanInitializationError` - SDK setup issues
- `BilanVoteError` - Vote recording problems  
- `BilanStatsError` - Analytics retrieval issues
- `BilanNetworkError` - Network connectivity problems
- `BilanStorageError` - Storage operation failures

**Error Handling Strategies:**

```typescript
import { init, vote, BilanVoteError } from '@mocksi/bilan-sdk'

// Graceful degradation (recommended for production)
try {
  await vote(createPromptId('prompt-123'), 1)
} catch (error) {
  if (error instanceof BilanVoteError) {
    console.warn('Vote failed:', error.message)
    // App continues normally
  }
}

// Debug mode for development
await init({ 
  mode: 'local', 
  userId: createUserId('user-123'),
  debug: true  // Throws detailed errors
})
```

#### Telemetry & Privacy

The SDK includes optional telemetry to help improve the library:

```typescript
await init({
  mode: 'local',
  userId: createUserId('user-123'),
  telemetry: {
    enabled: true,  // Default: true for server mode, false for local
    endpoint: 'https://your-analytics.com/events'  // Optional custom endpoint
  }
})
```

**What's Collected:**
- SDK initialization events
- Error occurrences (without sensitive data)
- Basic usage metrics (vote counts, not content)
- Performance metrics

**Privacy Features:**
- User IDs are hashed before transmission
- No personal data or vote content is sent
- Prompt IDs are hashed for privacy
- Disabled automatically in development mode
- Easy to disable completely

**Disable Telemetry:**
```typescript
// Disable for all modes
await init({
  mode: 'local',
  userId: createUserId('user-123'),
  telemetry: { enabled: false }
})

// Or set environment variable
process.env.BILAN_TELEMETRY = 'false'
```

**Custom Telemetry Endpoint:**
```typescript
await init({
  mode: 'server',
  userId: createUserId('user-123'),
  endpoint: 'https://your-api.com',
  telemetry: {
    enabled: true,
    endpoint: 'https://your-analytics.com/events'
  }
})
```

#### Multiple Instances

Create separate SDK instances for different contexts:

```typescript
import { BilanSDK, createUserId } from '@mocksi/bilan-sdk'

const userSDK = new BilanSDK()
const adminSDK = new BilanSDK()

await userSDK.init({ mode: 'local', userId: createUserId('user-123') })
await adminSDK.init({ mode: 'server', userId: createUserId('admin-456'), endpoint: 'https://api.example.com' })
```

### Bundle Size & Performance

- **Minified**: 5.5KB
- **Gzipped**: 1.7KB  
- **Dependencies**: 0
- **ES2020 target**: Modern, efficient JavaScript
- **Tree-shakeable**: Import only what you need

### Migration Guide

If upgrading from version 0.2.x or earlier:

```typescript
// Before (0.2.x)
await init({ mode: 'local', userId: 'user-123' })
await vote('prompt-abc', 1)

// After (0.3.0+) - with branded types
await init({ mode: 'local', userId: createUserId('user-123') })
await vote(createPromptId('prompt-abc'), 1)

// Or continue using strings (auto-converted)
await vote('prompt-abc', 1) // Still works!
```

## Self-Hosting

### Option 1: Local Development

```bash
git clone https://github.com/bilan-ai/bilan.git
cd bilan
npm install
npm run dev
```

Your dashboard will be available at `http://localhost:3000`

### Option 2: Docker

```bash
docker run -p 3000:3000 bilan/bilan:latest
```

### Option 3: Full Self-Hosted Setup

```bash
# Clone the repository
git clone https://github.com/bilan-ai/bilan.git
cd bilan

# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your database settings

# Run migrations
npm run db:migrate

# Start the server
npm run start
```

## Architecture

### Open Source Components

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   @mocksi/bilan-sdk    │ -> │  Local Storage  │ -> │   Dashboard     │
│   (TypeScript)  │    │  or Database    │    │   (Next.js)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### What's Included

- **[@mocksi/bilan-sdk](./packages/sdk)** - TypeScript SDK for tracking user feedback
- **[Basic Server](./packages/server)** - Self-hostable API server
- **[Dashboard](./packages/dashboard)** - Web interface for viewing metrics
- **[Examples](./packages/examples)** - Integration examples (React, Next.js, etc.)

### Performance Characteristics

- **Bundle Size**: 5.4KB minified, 1.7KB gzipped
- **Dependencies**: Zero external dependencies
- **Memory Usage**: <100KB for 1000+ events
- **Storage**: Auto-cleanup, keeps last 1000 events
- **Network**: Efficient batching for server mode
- **CPU**: <1ms for analytics calculations

## Configuration

### SDK Options

```typescript
init({
  // Mode: 'local' (browser storage) or 'server' (self-hosted API)
  mode: 'local',
  
  // Required: User identifier
  userId: 'user-123',
  
  // Optional: Custom endpoint for self-hosted server
  endpoint: 'http://localhost:3002',
  
  // Optional: Enable debug logging
  debug: true,
  
  // Optional: Custom storage adapter
  storage: new CustomStorageAdapter(),
  
  // Optional: Configure trend calculation
  trendConfig: {
    sensitivity: 0.15,      // Threshold for trend detection (default: 0.1)
    timeWeightHours: 48,    // Hours for time decay (default: 24)
    minSampleSize: 8,       // Minimum events needed (default: 5)
    recentWindowSize: 15    // Size of recent window (default: 10)
  },
  
  // Optional: Telemetry configuration
  telemetry: {
    enabled: true,          // Enable/disable telemetry (default: true for server mode)
    endpoint: 'https://your-analytics.com/events'  // Custom telemetry endpoint
  }
})
```

### Trend Configuration

The SDK includes an improved trend calculation that uses time weighting and statistical significance. You can configure it with:

```typescript
import { init, TrendConfig } from '@mocksi/bilan-sdk'

const customTrendConfig: TrendConfig = {
  sensitivity: 0.2,        // Higher = more sensitive to changes
  timeWeightHours: 12,     // Shorter = more focus on recent events
  minSampleSize: 10,       // Higher = more reliable but slower to detect
  recentWindowSize: 20     // Larger = smoother trend detection
}

init({
  mode: 'local',
  userId: 'user-123',
  trendConfig: customTrendConfig
})
```

**How it works:**
- **Time weighting**: Recent events have more influence on the trend
- **Statistical significance**: Trends are only detected when statistically meaningful
- **Configurable sensitivity**: Adjust how easily trends are detected
- **Minimum sample size**: Ensures trends are based on sufficient data

### Server Configuration

```javascript
// bilan.config.js
module.exports = {
  // Database configuration
  database: {
    type: 'sqlite', // SQLite database
    path: process.env.DB_PATH || './bilan.db'
  },
  
  // Basic trust scoring settings
  scoring: {
    decayFactor: 0.1,        // How much old votes matter
    minimumVotes: 5,         // Minimum votes for reliable score
    windowSize: 100          // Number of recent votes to consider
  },
  
  // API settings
  api: {
    port: 3002,
    cors: true,
    rateLimit: {
      max: 100,              // Requests per minute
      window: 60000
    }
  }
}
```

## API Reference

### SDK Methods

#### `init(config: InitConfig)`
Initialize the Bilan SDK.

```typescript
interface InitConfig {
  mode: 'local' | 'server'
  userId: string
  endpoint?: string
  debug?: boolean
  storage?: StorageAdapter
  trendConfig?: TrendConfig
  telemetry?: {
    enabled: boolean
    endpoint?: string
  }
}
```

#### `vote(promptId: string, value: 1 | -1, comment?: string)`
Record user feedback on an AI suggestion.

```typescript
vote('prompt-123', 1)                    // Positive vote
vote('prompt-456', -1, 'Not helpful')    // Negative vote with comment
```

#### `getStats(): BasicStats`
Get basic analytics for the current user.

```typescript
interface BasicStats {
  totalVotes: number
  positiveRate: number
  recentTrend: 'improving' | 'declining' | 'stable'
  topFeedback: string[]
}
```

#### `getPromptStats(promptId: string): PromptStats`
Get analytics for a specific prompt.

```typescript
interface PromptStats {
  promptId: string
  totalVotes: number
  positiveRate: number
  comments: string[]
}
```

### Server API

#### `POST /api/events`
Submit voting events to the server.

```bash
curl -X POST http://localhost:3002/api/events \
  -H "Content-Type: application/json" \
  -d '{
    "events": [{
      "promptId": "prompt-123",
      "value": 1,
      "comment": "Great suggestion!",
      "metadata": {
        "timestamp": 1642634400000
      }
    }]
  }'
```

#### `GET /api/stats?userId=user-123`
Get basic analytics for a user.

```bash
curl http://localhost:3002/api/stats?userId=user-123
```

## Integration Examples

### React Hook

```typescript
import { useEffect, useState } from 'react'
import { init, vote, getStats } from '@mocksi/bilan-sdk'

export function useBilan(userId: string) {
  const [stats, setStats] = useState(null)
  
  useEffect(() => {
    init({ mode: 'local', userId })
    setStats(getStats())
  }, [userId])
  
  const handleVote = (promptId: string, value: 1 | -1, comment?: string) => {
    vote(promptId, value, comment)
    setStats(getStats()) // Update stats
  }
  
  return { stats, vote: handleVote }
}
```

### Next.js App Router

```typescript
// app/components/AIFeedback.tsx
'use client'
import { useBilan } from '@/hooks/useBilan'

export default function AIFeedback({ promptId, suggestion }: Props) {
  const { vote } = useBilan(user.id)
  
  return (
    <div className="ai-suggestion">
      <p>{suggestion}</p>
      <div className="feedback-buttons">
        <button onClick={() => vote(promptId, 1)}>👍</button>
        <button onClick={() => vote(promptId, -1)}>👎</button>
      </div>
    </div>
  )
}
```

### Vue.js

```vue
<template>
  <div class="ai-suggestion">
    <p>{{ suggestion }}</p>
    <button @click="vote(promptId, 1)">👍</button>
    <button @click="vote(promptId, -1)">👎</button>
  </div>
</template>

<script setup>
import { init, vote } from '@mocksi/bilan-sdk'

const props = defineProps(['promptId', 'suggestion'])
const { userId } = useAuth()

onMounted(() => {
  init({ mode: 'local', userId })
})
</script>
```

## Development

### Project Structure

```
```
