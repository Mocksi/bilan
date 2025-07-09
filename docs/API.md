# Bilan SDK API Documentation

## Table of Contents

- [Installation](#installation)
- [Configuration](#configuration)
- [Core Methods](#core-methods)
- [Error Handling](#error-handling)
- [Telemetry](#telemetry)
- [Types](#types)
- [Examples](#examples)

## Installation

```bash
npm install @mocksi/bilan-sdk
```

## Configuration

### `init(config: InitConfig): Promise<void>`

Initialize the Bilan SDK with configuration options.

#### InitConfig Interface

```typescript
interface InitConfig {
  mode: 'local' | 'server'
  userId: UserId | string
  endpoint?: string
  debug?: boolean
  storage?: StorageAdapter
  trendConfig?: TrendConfig
  telemetry?: TelemetryConfig
}
```

#### Configuration Options

| Option | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| `mode` | `'local' \| 'server'` | ✅ | - | Storage mode: local browser storage or server API |
| `userId` | `UserId \| string` | ✅ | - | Unique user identifier |
| `endpoint` | `string` | ⚠️ | - | API endpoint (required for server mode) |
| `debug` | `boolean` | ❌ | `false` | Enable debug mode with detailed error reporting |
| `storage` | `StorageAdapter` | ❌ | `LocalStorageAdapter` | Custom storage implementation |
| `trendConfig` | `TrendConfig` | ❌ | See below | Trend analysis configuration |
| `telemetry` | `TelemetryConfig` | ❌ | See below | Telemetry configuration |

#### TelemetryConfig

```typescript
interface TelemetryConfig {
  enabled: boolean
  endpoint?: string
}
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `enabled` | `boolean` | `true` (server mode), `false` (local mode) | Enable/disable telemetry |
| `endpoint` | `string` | `'https://analytics.bilan.dev/events'` | Custom telemetry endpoint |

**Privacy Features:**
- User IDs are hashed before transmission
- Prompt IDs are hashed for privacy
- No vote content or personal data is sent
- Automatically disabled in development mode
- Easy to disable completely

#### TrendConfig

```typescript
interface TrendConfig {
  sensitivity: number
  timeWeightHours: number
  minSampleSize: number
  recentWindowSize: number
}
```

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `sensitivity` | `number` | `0.1` | Threshold for trend detection (0.0-1.0) |
| `timeWeightHours` | `number` | `24` | Hours for time decay weighting |
| `minSampleSize` | `number` | `5` | Minimum events needed for reliable trends |
| `recentWindowSize` | `number` | `10` | Size of recent comparison window |

#### Example Configuration

```typescript
import { init, createUserId } from '@mocksi/bilan-sdk'

// Basic local mode
await init({
  mode: 'local',
  userId: createUserId('user-123')
})

// Server mode with custom configuration
await init({
  mode: 'server',
  userId: createUserId('user-123'),
  endpoint: 'https://your-api.com',
  debug: true,
  trendConfig: {
    sensitivity: 0.15,
    timeWeightHours: 48,
    minSampleSize: 8,
    recentWindowSize: 15
  },
  telemetry: {
    enabled: true,
    endpoint: 'https://your-analytics.com/events'
  }
})
```

## Core Methods

### `vote(promptId, value, comment?, options?): Promise<void>`

Record user feedback on an AI suggestion.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `promptId` | `PromptId \| string` | ✅ | Unique identifier for the AI prompt |
| `value` | `1 \| -1` | ✅ | Vote value: 1 (positive) or -1 (negative) |
| `comment` | `string` | ❌ | Optional user comment |
| `options` | `VoteOptions` | ❌ | Extended context information |

#### VoteOptions Interface

```typescript
interface VoteOptions {
  promptText?: string     // Original user question
  aiOutput?: string       // AI's complete response
  modelUsed?: string      // AI model identifier
  responseTime?: number   // Response time in seconds
  metadata?: Record<string, unknown>  // Additional context
}
```

#### Examples

```typescript
import { vote, createPromptId } from '@mocksi/bilan-sdk'

// Simple vote
await vote(createPromptId('prompt-123'), 1)

// Vote with comment
await vote(createPromptId('prompt-123'), -1, 'Not quite right')

// Vote with full context
await vote(createPromptId('prompt-123'), 1, 'Perfect!', {
  promptText: 'How do I center a div?',
  aiOutput: 'Use flexbox with justify-content: center...',
  modelUsed: 'gpt-4',
  responseTime: 1.2
})
```

### `getStats(): Promise<BasicStats>`

Get aggregate analytics for all user feedback.

#### Returns

```typescript
interface BasicStats {
  totalVotes: number        // Total feedback count
  positiveRate: number      // Ratio 0.0-1.0 (75% = 0.75)
  recentTrend: 'improving' | 'declining' | 'stable'
  topFeedback: string[]     // Recent comments (max 5)
}
```

#### Example

```typescript
import { getStats } from '@mocksi/bilan-sdk'

const stats = await getStats()
console.log(`Trust score: ${(stats.positiveRate * 100).toFixed(1)}%`)
console.log(`Total votes: ${stats.totalVotes}`)
console.log(`Trend: ${stats.recentTrend}`)
```

### `getPromptStats(promptId): Promise<PromptStats>`

Get analytics for a specific prompt.

#### Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `promptId` | `PromptId \| string` | ✅ | Prompt identifier |

#### Returns

```typescript
interface PromptStats {
  promptId: string
  totalVotes: number
  positiveRate: number
  comments: string[]
}
```

#### Example

```typescript
import { getPromptStats, createPromptId } from '@mocksi/bilan-sdk'

const stats = await getPromptStats(createPromptId('prompt-123'))
console.log(`Prompt ${stats.promptId}: ${stats.totalVotes} votes`)
console.log(`Positive rate: ${(stats.positiveRate * 100).toFixed(1)}%`)
```

## Error Handling

The SDK provides comprehensive error handling with graceful degradation.

### Error Types

```typescript
// Base error class
class BilanError extends Error {
  readonly code: string
  readonly context?: string
  readonly suggestion?: string
}

// Specific error types
class BilanInitializationError extends BilanError  // SDK setup issues
class BilanVoteError extends BilanError           // Vote recording problems
class BilanStatsError extends BilanError          // Analytics retrieval issues
class BilanNetworkError extends BilanError        // Network connectivity problems
class BilanStorageError extends BilanError        // Storage operation failures
```

### Error Handling Strategies

#### Production Mode (Recommended)

```typescript
import { init, vote, BilanVoteError } from '@mocksi/bilan-sdk'

// Graceful degradation - warnings logged, execution continues
try {
  await vote(createPromptId('prompt-123'), 1)
} catch (error) {
  if (error instanceof BilanVoteError) {
    console.warn('Vote failed:', error.message)
    // App continues normally
  }
}
```

#### Debug Mode

```typescript
// Debug mode - detailed errors thrown for debugging
await init({
  mode: 'local',
  userId: createUserId('user-123'),
  debug: true  // Enables detailed error reporting
})

try {
  await vote(createPromptId('invalid'), 2)  // Invalid vote value
} catch (error) {
  console.error('Detailed error:', error.message)
  console.error('Suggestion:', error.suggestion)
}
```

### Error Properties

Each error includes helpful information:

```typescript
interface BilanError {
  message: string      // Human-readable error message
  code: string        // Unique error code (e.g., 'VOTE_ERROR')
  context?: string    // Context where error occurred
  suggestion?: string // Developer-friendly resolution guidance
}
```

## Telemetry

The SDK includes optional telemetry to help improve the library while maintaining privacy.

### Configuration

```typescript
await init({
  mode: 'local',
  userId: createUserId('user-123'),
  telemetry: {
    enabled: true,  // Enable telemetry
    endpoint: 'https://your-analytics.com/events'  // Custom endpoint
  }
})
```

### What's Collected

- SDK initialization events
- Error occurrences (without sensitive data)
- Basic usage metrics (vote counts, not content)
- Performance metrics

### Privacy Features

- **User IDs are hashed** before transmission
- **Prompt IDs are hashed** for privacy
- **No personal data** or vote content is sent
- **Automatic disable** in development mode
- **Easy to disable** completely

### Disable Telemetry

```typescript
// Disable via configuration
await init({
  mode: 'local',
  userId: createUserId('user-123'),
  telemetry: { enabled: false }
})

// Or set environment variable
process.env.BILAN_TELEMETRY = 'false'
```

## Types

### Branded Types

The SDK uses branded types for better type safety:

```typescript
// Branded types prevent mixing up IDs
type UserId = string & { __brand: 'UserId' }
type PromptId = string & { __brand: 'PromptId' }

// Helper functions to create branded types
function createUserId(id: string): UserId
function createPromptId(id: string): PromptId
```

### Storage Adapter

Custom storage implementations:

```typescript
interface StorageAdapter {
  get(key: string): Promise<string | null>
  set(key: string, value: string): Promise<void>
  delete(key: string): Promise<void>
  clear(): Promise<void>
}
```

### Vote Event

Complete vote event structure:

```typescript
interface VoteEvent {
  promptId: PromptId
  value: 1 | -1
  comment?: string
  timestamp: number
  userId: UserId
  metadata?: Record<string, unknown>
}
```

## Examples

### React Hook

```typescript
import { useEffect, useState } from 'react'
import { init, vote, getStats, createUserId } from '@mocksi/bilan-sdk'

export function useBilan(userId: string) {
  const [stats, setStats] = useState(null)
  
  useEffect(() => {
    init({ 
      mode: 'local', 
      userId: createUserId(userId),
      telemetry: { enabled: true }
    })
    refreshStats()
  }, [userId])
  
  const refreshStats = async () => {
    const newStats = await getStats()
    setStats(newStats)
  }
  
  const handleVote = async (promptId: string, value: 1 | -1, comment?: string) => {
    await vote(promptId, value, comment)
    await refreshStats()
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

### Error Handling Example

```typescript
import { init, vote, BilanVoteError, createUserId, createPromptId } from '@mocksi/bilan-sdk'

async function setupBilan() {
  try {
    await init({
      mode: 'server',
      userId: createUserId('user-123'),
      endpoint: 'https://api.example.com',
      debug: process.env.NODE_ENV === 'development',
      telemetry: {
        enabled: process.env.NODE_ENV === 'production',
        endpoint: 'https://analytics.example.com/events'
      }
    })
  } catch (error) {
    console.error('Failed to initialize Bilan:', error.message)
    // Handle initialization failure
  }
}

async function trackFeedback(promptId: string, value: 1 | -1, comment?: string) {
  try {
    await vote(createPromptId(promptId), value, comment)
  } catch (error) {
    if (error instanceof BilanVoteError) {
      console.warn('Vote tracking failed:', error.message)
      // Show user-friendly message or retry
    }
  }
}
```

### Custom Storage Adapter

```typescript
import { init, StorageAdapter } from '@mocksi/bilan-sdk'

class RedisStorageAdapter implements StorageAdapter {
  private redis: RedisClient
  
  constructor(redis: RedisClient) {
    this.redis = redis
  }
  
  async get(key: string): Promise<string | null> {
    return await this.redis.get(key)
  }
  
  async set(key: string, value: string): Promise<void> {
    await this.redis.set(key, value)
  }
  
  async delete(key: string): Promise<void> {
    await this.redis.del(key)
  }
  
  async clear(): Promise<void> {
    await this.redis.flushdb()
  }
}

// Use custom storage
await init({
  mode: 'local',
  userId: createUserId('user-123'),
  storage: new RedisStorageAdapter(redisClient)
})
``` 