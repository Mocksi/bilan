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

## 📑 Table of Contents

- [What is Bilan?](#what-is-bilan)
- [✨ v0.4.1: Turn ID Unification](#-v041-turn-id-unification)
- [Quick Start](#quick-start)
- [Platform Features](#platform-features)
- [Self-Hosting](#self-hosting)
- [Architecture](#architecture)
- [Configuration](#configuration)
- [API Reference](#api-reference)
- [Bundle Size & Performance](#bundle-size--performance)
- [Migration Guide](#migration-guide)
- [FAQ](#faq)
- [Contributing](#contributing)
- [License](#license)

---

## What is Bilan?

Bilan is an open source analytics platform that helps you understand how users interact with your AI-powered features. Think "Google Analytics for AI" - track every turn, conversation, and user interaction with comprehensive event-based analytics running on your own infrastructure.

**Perfect for:** Individual developers, startups, and teams who want complete visibility into AI user experience without external dependencies.

### ✨ **v0.4.1: Turn ID Unification**

Bilan v0.4.1 simplifies AI analytics with industry-standard event linking that follows proven patterns from Amplitude and Mixpanel. No more confusing dual-ID systems - just clean, correlated analytics.

#### 🚀 Industry-Standard Event Correlation
```typescript
// ✅ v0.4.1: Clean event linking with shared identifier
const { result, turnId } = await bilan.trackTurn(
  'Help me write an email',
  () => openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: prompt }]
  })
)

// Use the same turnId for related events
await bilan.vote(turnId, 1, 'Great response!')
```

**Automatically captures:**
- ✅ Success rates and response times with **direct turn-to-vote correlation**
- ❌ Timeouts, rate limits, and API errors **linked to user feedback**
- 📊 Model performance metrics **with user satisfaction data**
- 👤 User interaction patterns **across complete workflows**

#### 🎯 Enhanced Context Tracking

##### **🔄 Turn-Based Analytics**
Every AI interaction is tracked as an atomic "turn" with **automatic event correlation**:
- **Success/Failure Tracking**: Automatic detection with user feedback correlation
- **Performance Metrics**: Response times linked to satisfaction scores
- **Error Classification**: Detailed categorization with user reaction data
- **Privacy Controls**: Configurable prompt and response capture with PII sanitization

##### **💬 Conversation Aggregation**  
Turns automatically aggregate into conversation sessions with **optional context**:
- **Session Management**: Automatic conversation grouping and lifecycle tracking
- **Multi-turn Analysis**: Conversation flow patterns with turn sequencing
- **Abandonment Detection**: Identify where users drop off with contextual data
- **Success Metrics**: Completion rates correlated with user feedback

##### **🗺️ Journey Workflows**
Track user progress through multi-step AI-powered workflows with **flexible relationships**:
- **Step Progression**: Monitor progress with optional journey context
- **Funnel Analysis**: Identify optimization opportunities with turn-level data
- **Completion Tracking**: Measure end-to-end workflow success with user satisfaction
- **Cross-Context Insights**: Understand user behavior across different workflows

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

#### **🚀 Industry-Standard Event Correlation**

```typescript
import { init, trackTurn, vote, startConversation, trackJourneyStep, createUserId } from '@mocksi/bilan-sdk'

// Initialize the SDK
await init({
  mode: 'local', // or 'server' 
  userId: createUserId('user-123'),
  // Privacy controls
  privacyConfig: {
    defaultCaptureLevel: 'sanitized',
    captureLevels: {
      prompts: 'sanitized',
      responses: 'none'  // Default: privacy-first
    }
  }
})

// ✅ v0.4.1: Industry-standard event correlation
const { result, turnId } = await trackTurn(
  'Help me write a professional email',
  () => openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: prompt }]
  }),
  {
    conversation_id: 'conv-123',
    systemPromptVersion: 'v2.1',
    modelUsed: 'gpt-4'
  }
)

// Use the same turnId for user feedback - automatic correlation
await vote(turnId, 1, 'Very helpful!')

// Track user journeys with optional context
await trackJourneyStep('email-workflow', 'draft-composed', 'user-123')
await trackJourneyStep('email-workflow', 'ai-enhanced', 'user-123')
```

#### **📊 Complete Workflow Example**

```typescript
// Start a conversation
const conversationId = await startConversation('user-123')

// Track AI interactions with automatic correlation
const { result: response1, turnId: turn1 } = await trackTurn(
  'Write an email subject line',
  () => callOpenAI(prompt),
  { 
    conversationId,
    journey_id: 'email-workflow',
    turn_sequence: 1 
  }
)

const { result: response2, turnId: turn2 } = await trackTurn(
  'Write the email body',
  () => callOpenAI(bodyPrompt),  
  { 
    conversationId,
    journey_id: 'email-workflow', 
    turn_sequence: 2
  }
)

// Record user feedback using turnIds - automatic correlation
await vote(turn1, 1, 'Great subject line!')
await vote(turn2, 1, 'Perfect email body!')

// End conversation with success metrics
await endConversation(conversationId, 'completed')

// Analytics are automatically available with turn-to-vote correlation
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

**Turn Tracking Methods (v0.4.1)**

**`trackTurn<T>(prompt: string, aiCall: () => Promise<T>, context?: object): Promise<{ result: T, turnId: string }>`**
Track an AI interaction and return both the result and turnId for event correlation.

```typescript
// Basic turn tracking
const { result, turnId } = await trackTurn(
  'How do I center a div?',
  () => openai.chat.completions.create({ 
    model: 'gpt-4', 
    messages: [{ role: 'user', content: prompt }] 
  })
)

// Turn tracking with context
const { result, turnId } = await trackTurn(
  'Review this code',
  () => callAI(prompt),
  {
    journey_id: 'code-review-workflow',
    conversation_id: 'conv_123',
    turn_sequence: 2,
    systemPromptVersion: 'v2.1'
  }
)
```

**Feedback Methods (v0.4.1)**

**`vote(turnId: string, value: 1 | -1, comment?: string): Promise<void>`**
Record user feedback using the turnId from trackTurn for automatic correlation.

```typescript
// ✅ v0.4.1: Use turnId from trackTurn for automatic correlation
const { result, turnId } = await trackTurn('Generate code', aiCall)
await vote(turnId, 1, 'Perfect code generation!')
```

**Conversation Tracking Methods**

**`startConversation(userId: string): Promise<string>`**
Start a new conversation session.

**`endConversation(conversationId: string, status?: 'completed' | 'abandoned'): Promise<void>`**
End conversation with success/failure outcome.

```typescript
// Complete conversation flow
const conversationId = await startConversation('user-123')

// Track AI interactions within the conversation
const { result, turnId } = await trackTurn(
  'Help with email',
  () => callAI(prompt),
  { conversation_id: conversationId }
)

// Record feedback using turnId
await vote(turnId, 1, 'Helpful!')

// End conversation
await endConversation(conversationId, 'completed')
```

**Journey Tracking Methods**

**`trackJourneyStep(journeyName: string, stepName: string, userId: string): Promise<void>`**
Record progress through a journey step.

```typescript
// Track email workflow journey
await trackJourneyStep('email-workflow', 'draft-created', 'user-123')
await trackJourneyStep('email-workflow', 'ai-suggestions-applied', 'user-123')
await trackJourneyStep('email-workflow', 'completed', 'user-123') // Final step indicates completion
```

**Analytics Methods**

Analytics data is available through the dashboard and server API endpoints:
- `/api/analytics/overview` - Event overview statistics  
- `/api/analytics/votes` - Vote analytics with trends and sentiment
- `/api/analytics/turns` - AI turn performance metrics

All analytics endpoints require API key authentication (Bearer token).

## Self-Hosting

### Docker Deployment

```bash
git clone https://github.com/Mocksi/bilan.git
cd bilan
docker-compose up -d
```

Your dashboard will be available at `http://localhost:3004`

### Manual Setup

```bash
# Clone the repository
git clone https://github.com/Mocksi/bilan.git
cd bilan

# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Edit .env with your database settings

# Start the server
npm run dev
```

## 🏗️ Architecture

Bilan follows a modern, scalable architecture:

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   @mocksi/bilan-sdk   │ ──► │   Bilan Server  │ ──► │   Dashboard     │
│   (TypeScript)  │    │   (Fastify API)  │    │   (Next.js)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                  │
                       ┌─────────────────┐
                       │   SQLite/PgSQL  │
                       │   (Event Store) │
                       └─────────────────┘
```

- **SDK**: <5KB TypeScript client with privacy controls
- **API**: High-performance Fastify server (<20ms P99)
- **Dashboard**: Real-time Next.js analytics interface
- **Database**: SQLite for simple deployments, PostgreSQL for scale

## ❓ FAQ

<details>
<summary><strong>How is this different from traditional analytics?</strong></summary>

Bilan is built specifically for AI applications. Unlike Google Analytics or Mixpanel, we understand AI-specific concepts like turns, prompts, model performance, and user trust. We provide correlation between AI performance and user satisfaction.
</details>

<details>
<summary><strong>Can I use this with any AI provider?</strong></summary>

Yes! Bilan wraps around your existing AI calls (OpenAI, Anthropic, local models, etc.) and works with any provider. Check our **[Integration Guides](./docs/integrations/)**.
</details>

<details>
<summary><strong>What about data privacy?</strong></summary>

Bilan is privacy-first with configurable data capture levels. You can choose to capture no content, sanitized content, or full content. Everything runs on your infrastructure when self-hosted.
</details>

<details>
<summary><strong>How does pricing work?</strong></summary>

The SDK is completely free (MIT license). Self-hosting is also free. We may offer managed hosting in the future with transparent pricing.
</details>

## 🚀 Contributing

We **❤️ contributions** of all sizes! Here's how to get involved:

### 🎯 Quick Contributions
- ⭐ **Star the repo** - Show your support
- 🐛 **Report bugs** - Help us improve quality  
- 💡 **Request features** - Share your ideas
- 📖 **Improve docs** - Fix typos, add examples

### 🛠️ Code Contributions

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/your-feature`
3. **Make your changes** following our **[Development Guide](./CONTRIBUTING.md)**
4. **Add tests** - We aim for >90% coverage
5. **Submit a PR** with a clear description

### 📋 Development Setup
```bash
git clone https://github.com/Mocksi/bilan.git
cd bilan
npm install
npm run dev
```

See **[CONTRIBUTING.md](./CONTRIBUTING.md)** for detailed development instructions.

## 📄 License

**MIT License** - Feel free to use Bilan in your commercial and open-source projects.

See **[LICENSE](./LICENSE)** for full details.