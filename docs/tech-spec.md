# Bilan Technical Specification
**Open Source Trust Analytics with Managed Platform Option**

## Overview
Bilan provides trust analytics for AI products through a two-tier architecture: **open source components** for individual developers and **managed platform** for teams. This spec covers both, with focus on the open source MVP that developers can self-host.

## Architecture Overview

### Open Source Components
```
TypeScript SDK → Local Storage → Basic Analytics → Dashboard
       ↓              ↓              ↓             ↓
   OSS on npm    Browser/SQLite   Simple Math   Next.js
```

### Managed Platform (Optional)
```
TypeScript SDK → Event API → Advanced Analytics → Team Dashboard
       ↓              ↓              ↓                ↓
   OSS on npm    Cloud Service   ML-Powered    Multi-tenant
```

## Component Specifications

### 1. TypeScript SDK (`@bilan/sdk`)
**Purpose**: Universal trust signal capture with local and server modes  
**Bundle**: <5KB gzipped, zero dependencies, full TypeScript support

```typescript
// Local mode (open source)
import { init, vote, getStats } from '@bilan/sdk'

init({
  mode: 'local',
  userId: 'user-123'
})

vote('prompt-1', 1, 'Helpful!')
const stats = await getStats()
```

```typescript
// Server mode (managed platform)
init({
  mode: 'server',
  userId: 'user-123',
  endpoint: 'https://api.bilan.ai'
})
```

**Key Features**:
- **Mode switching**: Works locally or with managed platform
- **Local storage**: Browser localStorage with automatic cleanup
- **Offline support**: Queues events when offline
- **TypeScript-first**: Full type safety and IDE support

### 2. Open Source Server (`@bilan/server`)
**Purpose**: Self-hostable API for teams who want centralized storage  
**Tech**: Fastify + SQLite + TypeScript

```typescript
// Start server
import { BilanServer } from '@bilan/server'

const server = new BilanServer({
  port: 3001,
  dbPath: './bilan.db'
})

await server.start()
```

**API Endpoints**:
- `POST /api/events` - Submit vote events
- `GET /api/stats?userId=X` - Get user statistics
- `GET /api/prompt-stats?promptId=X` - Get prompt-specific stats
- `GET /health` - Health check

**Database Schema (SQLite)**:
```sql
CREATE TABLE events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  prompt_id TEXT NOT NULL,
  value INTEGER NOT NULL,
  comment TEXT,
  timestamp INTEGER NOT NULL,
  metadata TEXT
);
```

### 3. Basic Analytics Engine (`@bilan/analytics`)
**Purpose**: Simple but effective trust scoring algorithms  
**Tech**: Pure TypeScript, no external dependencies

```typescript
interface BasicStats {
  totalVotes: number
  positiveRate: number
  recentTrend: 'improving' | 'declining' | 'stable'
  topFeedback: string[]
}

class BasicAnalytics {
  static calculateBasicStats(events: VoteEvent[]): BasicStats {
    // Simple averaging with trend detection
    const totalVotes = events.length
    const positiveRate = events.filter(e => e.value > 0).length / totalVotes
    
    // Compare last 10 vs previous 10 for trend
    const recentTrend = this.calculateTrend(events)
    
    return { totalVotes, positiveRate, recentTrend, topFeedback }
  }
}
```

### 4. Dashboard (`@bilan/dashboard`)
**Purpose**: Simple analytics UI for self-hosted deployments  
**Tech**: Next.js 14, Tailwind CSS, Recharts

**Key Views**:
- **Overview**: Total votes, positive rate, trend
- **Feedback**: Recent comments and patterns
- **Prompts**: Per-prompt analytics
- **Users**: Individual user patterns (basic)

### 5. Storage Adapters
**Purpose**: Pluggable storage backends for different deployment scenarios

```typescript
interface StorageAdapter {
  get(key: string): Promise<string | null>
  set(key: string, value: string): Promise<void>
  delete(key: string): Promise<void>
  clear(): Promise<void>
}

// Built-in adapters
class LocalStorageAdapter implements StorageAdapter { /* ... */ }
class SQLiteAdapter implements StorageAdapter { /* ... */ }
class RedisAdapter implements StorageAdapter { /* ... */ }
```

## Open Source Deployment Options

### Option 1: Local Development
```bash
git clone https://github.com/bilan-ai/bilan.git
cd bilan
npm install
npm run dev
```

### Option 2: Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY . .
RUN npm install && npm run build
EXPOSE 3001
CMD ["npm", "run", "start:server"]
```

### Option 3: Self-Hosted (VPS/Cloud)
```bash
# On your server
git clone https://github.com/bilan-ai/bilan.git
cd bilan
npm install
npm run build
npm run start
```

## Managed Platform Architecture

### Event Ingestion API
**Purpose**: Scalable event collection for teams  
**Tech**: Fastify + ClickHouse + Railway/Render

```typescript
POST /v1/events
Authorization: Bearer pub_xxx
{
  "events": [{
    "promptId": "prompt-123",
    "userId": "user-456", 
    "value": 1,
    "comment": "Great suggestion!"
  }]
}
```

### Advanced Analytics Engine
**Purpose**: ML-powered trust scoring and insights  
**Tech**: Python + scikit-learn + Cloudflare Workers

```python
class AdvancedAnalytics:
    def calculate_trust_score(self, events: List[Event]) -> float:
        # Multi-factor trust scoring
        explicit_score = self.weight_explicit_feedback(events)
        implicit_score = self.detect_implicit_signals(events)
        temporal_score = self.apply_temporal_decay(events)
        
        return self.ensemble_score(explicit_score, implicit_score, temporal_score)
```

### Real-time Router
**Purpose**: Automatic model switching based on trust scores  
**Tech**: Cloudflare Workers + KV

```typescript
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const userId = request.headers.get('X-User-ID')
    const trustScore = await env.KV.get(`trust:${userId}`)
    
    const route = trustScore < 0.35 ? 'safe-template' : 'default'
    
    return fetch(upstreamURL, {
      ...request,
      headers: { ...request.headers, 'X-Bilan-Route': route }
    })
  }
}
```

## Feature Comparison

| Feature | Open Source | Managed Platform |
|---------|-------------|------------------|
| **SDK** | ✅ Full featured | ✅ Full featured |
| **Trust Scoring** | ✅ Basic algorithms | ✅ Advanced ML |
| **Data Storage** | ✅ SQLite, local | ✅ ClickHouse, cloud |
| **Dashboard** | ✅ Single user | ✅ Multi-user, teams |
| **Real-time Routing** | ❌ | ✅ Cloudflare Workers |
| **API Rate Limiting** | ❌ | ✅ 1000 req/min |
| **Customer Drill-down** | ❌ | ✅ Individual analysis |
| **Alerts/Notifications** | ❌ | ✅ Slack, email |
| **Enterprise Features** | ❌ | ✅ SSO, audit logs |

## Integration Patterns

### React/Next.js Integration
```typescript
// hooks/useBilan.ts
import { useEffect, useState } from 'react'
import { init, vote, getStats } from '@bilan/sdk'

export function useBilan(userId: string) {
  const [stats, setStats] = useState(null)
  
  useEffect(() => {
    init({ mode: 'local', userId })
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

### Vue.js Integration
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

onMounted(() => {
  init({ mode: 'local', userId: user.id })
})
</script>
```

## Performance Specifications

### Open Source Targets
| Metric | Target | Rationale |
|--------|--------|-----------|
| SDK bundle size | <5KB gzipped | Zero impact on app performance |
| Integration time | <10 minutes | Developer adoption |
| Local analytics | <100ms | Feels instant |
| Dashboard load | <2 seconds | Daily usage tool |

### Managed Platform Targets
| Metric | Target | Rationale |
|--------|--------|-----------|
| API response time | <20ms P99 | Real-time feel |
| Trust score update | <60 seconds | Fast enough for routing |
| Event ingestion | 1000 req/min | Team scale |
| Dashboard load | <1 second | Professional experience |

## Security Considerations

### Open Source Security
- **Local data**: Data stays on user's infrastructure
- **No external calls**: Works completely offline
- **Input validation**: Sanitize all user inputs
- **Rate limiting**: Basic protection in self-hosted mode

### Managed Platform Security
- **API keys**: `pub_xxx` for client, `sec_xxx` for admin
- **Rate limiting**: 1000 requests per minute per key
- **Data encryption**: TLS in transit, AES-256 at rest
- **Access control**: Team-based permissions

## Deployment Strategies

### Open Source Deployment
```bash
# Development
npm run dev

# Self-hosted
npm run build
npm run start

# Docker
docker build -t bilan .
docker run -p 3001:3001 bilan

# Docker Compose
docker-compose up
```

### Managed Platform Deployment
```bash
# API (Railway)
railway login
railway deploy

# Workers (Cloudflare)
wrangler deploy

# Dashboard (Vercel)
vercel deploy
```

## Migration Path

### Open Source → Managed Platform
1. **SDK unchanged**: Same API, just change mode
2. **Data export**: Export events from SQLite
3. **Gradual transition**: Run both simultaneously
4. **Feature upgrade**: Access advanced analytics

```typescript
// Before (open source)
init({ mode: 'local', userId })

// After (managed platform)
init({ mode: 'server', userId, endpoint: 'https://api.bilan.ai' })
```

## TypeScript Support

### Full Type Safety
```typescript
interface InitConfig {
  mode: 'local' | 'server'
  userId: string
  endpoint?: string
  debug?: boolean
  storage?: StorageAdapter
}

interface VoteEvent {
  promptId: string
  value: 1 | -1
  comment?: string
  timestamp: number
  userId: string
  metadata?: Record<string, any>
}
```

### IDE Integration
- **IntelliSense**: Full autocomplete
- **Type checking**: Compile-time validation
- **Inline documentation**: JSDoc for all APIs
- **Error handling**: Typed error responses

## Monitoring & Observability

### Open Source Monitoring
```typescript
// Built-in debug mode
init({ mode: 'local', userId, debug: true })

// Console logging for development
vote('prompt-1', 1) // Logs: "Bilan: Vote recorded locally"
```

### Managed Platform Monitoring
- **Sentry**: Error tracking and performance
- **DataDog**: Infrastructure monitoring
- **Custom metrics**: Business KPIs
- **Alerting**: PagerDuty integration

## Future Roadmap

### Open Source Roadmap
- **Python SDK**: Expand language support
- **Advanced algorithms**: Better trust scoring
- **Plugin system**: Community extensions
- **More examples**: Framework integrations

### Managed Platform Roadmap
- **Multi-armed bandit**: Advanced routing
- **Predictive analytics**: Churn prediction
- **Team collaboration**: Shared insights
- **Enterprise features**: SSO, compliance

This architecture provides a clear path from open source adoption to managed platform revenue while maintaining the core value proposition at each tier.
