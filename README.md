<div align="center">
  <h1>📊</h1>
  <h1>Bilan</h1>
  <p><strong>Open Source Trust Analytics for AI Products</strong></p>
  <p>Track user feedback on AI suggestions. Self-hostable, TypeScript-first, <5KB bundle.</p>
</div>

<div align="center">

[![NPM Version](https://img.shields.io/npm/v/@bilan/sdk?style=flat-square)](https://www.npmjs.com/package/@bilan/sdk)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue?style=flat-square)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![CI](https://img.shields.io/github/actions/workflow/status/Mocksi/bilan/ci.yml?branch=main&style=flat-square&label=CI)](https://github.com/Mocksi/bilan/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/Mocksi/bilan/graph/badge.svg?token=YV3PW1YYM3)](https://codecov.io/gh/Mocksi/bilan)
[![Bundle Size](https://img.shields.io/bundlephobia/minzip/@bilan/sdk?style=flat-square&label=Bundle%20Size)](https://bundlephobia.com/package/@bilan/sdk)

</div>

---

## What is Bilan?

Bilan is an open source analytics tool that helps you understand how users react to your AI-powered features. Track thumbs up/down votes, detect frustration patterns, and get basic trust metrics - all running on your own infrastructure.

**Perfect for:** Individual developers, startups, and teams who want to understand AI user experience without external dependencies.

### SDK Features

- **🚀 Lightweight**: <2KB gzipped bundle size
- **🔒 Type Safe**: Full TypeScript support with branded types
- **🏃‍♂️ Zero Dependencies**: Uses only native web APIs
- **📱 Universal**: Works in browsers, Node.js, and edge environments
- **🔧 Configurable**: Advanced trend analysis with customizable parameters
- **🛡️ Robust**: Comprehensive error handling and graceful degradation
- **📊 Smart Analytics**: Time-weighted trend detection with statistical significance

### Quick Start

```bash
npm install @bilan/sdk
```

```typescript
import { init, vote, getStats, createUserId, createPromptId } from '@bilan/sdk'

// Initialize the SDK
await init({
  mode: 'local',  // or 'server' for self-hosted API
  userId: createUserId('user-123')
})

// Track user feedback
await vote(createPromptId('prompt-abc'), 1, 'Helpful suggestion!')

// Get analytics
const stats = await getStats()
console.log(`Trust score: ${(stats.positiveRate * 100).toFixed(1)}%`)
console.log(`Trend: ${stats.recentTrend}`) // 'improving' | 'declining' | 'stable'
```

### Advanced Configuration

```typescript
import { init, TrendConfig } from '@bilan/sdk'

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
type PromptId = string & { __brand: 'PromptId' }

// Create branded types
const userId = createUserId('user-123')
const promptId = createPromptId('prompt-abc')

// Vote event structure
interface VoteEvent {
  promptId: PromptId
  value: 1 | -1           // 👍 or 👎
  comment?: string        // Optional user comment
  timestamp: number       // Auto-generated
  userId: UserId         // From init config
  // Extended context (optional)
  promptText?: string     // Original user question
  aiOutput?: string       // AI's complete response
  modelUsed?: string      // AI model identifier
  responseTime?: number   // Response time in seconds
}

// Analytics results
interface BasicStats {
  totalVotes: number      // Total feedback count
  positiveRate: number    // Ratio 0.0-1.0 (75% = 0.75)
  recentTrend: 'improving' | 'declining' | 'stable'
  topFeedback: string[]   // Recent comments
}
```

#### Core Methods

**`init(config: InitConfig): Promise<void>`**
Initialize the SDK with configuration.

**`vote(promptId, value, comment?, options?): Promise<void>`**
Record user feedback with optional context.

```typescript
// Simple feedback
await vote('prompt-123', 1)

// With comment
await vote('prompt-123', -1, 'Not quite right')

// With full context
await vote('prompt-123', 1, 'Perfect!', {
  promptText: 'How do I center a div?',
  aiOutput: 'Use flexbox with justify-content: center...',
  modelUsed: 'gpt-4',
  responseTime: 1.2
})
```

**`getStats(): Promise<BasicStats>`**
Get aggregate analytics for all feedback.

**`getPromptStats(promptId): Promise<PromptStats>`**
Get analytics for a specific prompt.

#### Error Handling

The SDK includes robust error handling:

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

#### Multiple Instances

Create separate SDK instances for different contexts:

```typescript
import { BilanSDK, createUserId } from '@bilan/sdk'

const userSDK = new BilanSDK()
const adminSDK = new BilanSDK()

await userSDK.init({ mode: 'local', userId: createUserId('user-123') })
await adminSDK.init({ mode: 'server', userId: createUserId('admin-456'), endpoint: 'https://api.example.com' })
```

### Bundle Size & Performance

- **Minified**: 5.4KB
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
│   @bilan/sdk    │ -> │  Local Storage  │ -> │   Dashboard     │
│   (TypeScript)  │    │  or Database    │    │   (Next.js)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### What's Included

- **[@bilan/sdk](./packages/sdk)** - TypeScript SDK for tracking user feedback
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
  endpoint: 'http://localhost:3001',
  
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
  }
})
```

### Trend Configuration

The SDK includes an improved trend calculation that uses time weighting and statistical significance. You can configure it with:

```typescript
import { init, TrendConfig } from '@bilan/sdk'

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
    port: 3001,
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
curl -X POST http://localhost:3001/api/events \
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
curl http://localhost:3001/api/stats?userId=user-123
```

## Integration Examples

### React Hook

```typescript
import { useEffect, useState } from 'react'
import { init, vote, getStats } from '@bilan/sdk'

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
import { init, vote } from '@bilan/sdk'

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
