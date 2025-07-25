# @mocksi/bilan-sdk

[![NPM Version](https://img.shields.io/npm/v/@mocksi/bilan-sdk?style=flat-square)](https://www.npmjs.com/package/@mocksi/bilan-sdk)
[![Bundle Size](https://img.shields.io/badge/Bundle%20Size-5.5KB%20gzipped-green?style=flat-square)](https://bundlephobia.com/package/@mocksi/bilan-sdk)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue?style=flat-square)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)

**Trust analytics for AI products** - Track user feedback and trust signals for AI features. Self-hostable, TypeScript-first, production-ready.

## Features

- **🚀 Lightweight**: 5.5KB gzipped, zero dependencies
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
  apiKey: 'your-api-key',             // required for server mode
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
  apiKey: process.env.BILAN_API_KEY,
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

### Local vs Server Mode

The SDK supports two modes of operation:

#### Local Mode (Offline)
```typescript
await init({
  mode: 'local',
  userId: 'user-123',
  debug: true
})
```
- **Use case**: Development, offline applications, privacy-first setups
- **Data storage**: Browser localStorage or Node.js file system
- **Network**: No external requests made
- **Requirements**: None - works immediately

#### Server Mode (Analytics)
```typescript
await init({
  mode: 'server',
  endpoint: 'https://your-analytics-server.com',
  apiKey: 'your-secure-api-key',
  userId: 'user-123',
  debug: true
})
```
- **Use case**: Production analytics, team dashboards, data aggregation
- **Data storage**: Remote analytics server
- **Network**: Events sent via HTTP POST to `/api/events`
- **Requirements**: Running Bilan server, valid API key

⚠️ **Breaking Change in v0.4.2**: Server mode now requires the `apiKey` parameter. Previous versions silently failed to send events.

## Full Configuration Interface

```typescript
interface InitConfig {
  mode: 'local' | 'server'
  endpoint?: string
  apiKey?: string                     // required when mode is 'server'
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

# Set required environment variables
export BILAN_API_KEY="your-secure-api-key"

# Start server
bilan

# Or with Docker
docker run -p 3002:3002 -v $(pwd)/data:/data \
  -e BILAN_API_KEY=your-secure-api-key \
  mocksi/bilan-server
```

Then configure the SDK to use your server:

```typescript
await init({
  mode: 'server',
  endpoint: 'http://localhost:3002',
  apiKey: 'your-secure-api-key'        // must match server's BILAN_API_KEY
})
```

## Environment Variables

The SDK can be configured using environment variables, which is useful for deployment automation and CI/CD pipelines:

### Client-Side Environment Variables

**Note:** These are primarily for server-side usage (Node.js) or build-time configuration. Never expose API keys in client-side code.

| Variable | Purpose | Default | Example |
|----------|---------|---------|---------|
| `BILAN_ENDPOINT` | Default server endpoint URL | `undefined` | `https://analytics.yourapp.com` |
| `BILAN_API_KEY` | API key for server mode | `undefined` | `your-secure-api-key` |
| `BILAN_MODE` | Default SDK mode | `'local'` | `'server'` or `'local'` |
| `BILAN_DEBUG` | Enable debug logging | `false` | `true` |
| `BILAN_USER_ID` | Default user ID for tracking | `undefined` | `user-123` |

### Server Environment Variables

When running your own Bilan server, configure these variables:

| Variable | Purpose | Required | Default | Example |
|----------|---------|----------|---------|---------|
| `BILAN_API_KEY` | Authentication key for server | Yes* | `undefined` | `abc123...` |
| `BILAN_DEV_MODE` | Skip API key requirement | No | `false` | `true` |
| `BILAN_PORT` | Server port number | No | `3002` | `8080` |
| `BILAN_DB_PATH` | Database file path | No | `./bilan.db` | `/data/analytics.db` |
| `BILAN_CORS_ORIGIN` | Allowed CORS origins | No | `localhost:3000,localhost:3002` | `https://yourapp.com` |
| `BILAN_CORS_CREDENTIALS` | Enable CORS credentials | No | `false` | `true` |

*Required in production, optional in development with `BILAN_DEV_MODE=true`

### Usage Examples

**Node.js server configuration:**
```typescript
// Set environment variables before importing
process.env.BILAN_ENDPOINT = 'https://analytics.yourapp.com'
process.env.BILAN_API_KEY = 'your-secure-api-key'
process.env.BILAN_DEBUG = 'true'

import { init, trackTurn } from '@mocksi/bilan-sdk'

// SDK will automatically use environment variables
await init({
  mode: 'server',
  userId: 'server-user'
  // endpoint, apiKey, and debug will be read from environment
})
```

**Docker deployment:**
```bash
# Client application
docker run -e BILAN_ENDPOINT=https://analytics.yourapp.com \
           -e BILAN_API_KEY=your-secure-api-key \
           -e BILAN_DEBUG=true \
           your-app:latest

# Bilan server
docker run -e BILAN_API_KEY=your-secure-key \
           -e BILAN_PORT=3002 \
           -e BILAN_CORS_ORIGIN=https://yourapp.com \
           -p 3002:3002 \
           mocksi/bilan-server
```

**CI/CD pipeline:**
```yaml
# GitHub Actions example
env:
  BILAN_ENDPOINT: ${{ secrets.BILAN_ENDPOINT }}
  BILAN_API_KEY: ${{ secrets.BILAN_API_KEY }}
  BILAN_DEBUG: false
```

### Security Notes

- **Never expose `BILAN_API_KEY` in client-side code** - only use in server environments
- **Use `BILAN_DEV_MODE=true`** only for development/testing
- **Store sensitive values** in your deployment platform's secret management
- **Rotate API keys regularly** for production deployments

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

## Performance

| Scenario | Mean Time | P99 | Notes |
|----------|-----------|-----|-------|
| `trackTurn()` in browser | <5ms | <15ms | Measured on Chrome 126, includes UUID generation |
| `vote()` to local server | <50ms | <200ms | Network request to localhost:3002 |
| `vote()` to remote server | <150ms | <500ms | Network request over internet |
| SDK initialization | <100ms | <300ms | First `init()` call with config validation |
| Bundle parse time | <10ms | <25ms | JavaScript parsing and execution |

**Performance Notes:**
- **Zero dependencies**: No external libraries to slow down initialization
- **Tree-shakable**: Only import what you use
- **Lazy loading**: Non-critical features loaded on demand
- **Batching**: Multiple events can be batched for better throughput
- **Local mode**: Offline storage eliminates network latency

**Optimization Tips:**
```typescript
// ✅ Good: Initialize once at app startup
await init({ 
  mode: 'server', 
  endpoint: 'https://analytics.yourapp.com',
  apiKey: 'your-api-key'
})

// ✅ Good: Use local mode for development
await init({ mode: 'local' }) // No network requests

// ❌ Avoid: Re-initializing frequently
// This creates unnecessary overhead
```

## Troubleshooting

### Common Issues

**"Network request failed" / CORS errors:**
```typescript
// Check that endpoint is reachable and CORS headers allow your origin
await init({
  mode: 'server',
  endpoint: 'https://your-server.com', // Must be accessible
  apiKey: 'your-api-key',              // required for server mode
  debug: true // Enable debug logging
})
```

**Solution:**
- Verify server is running: `curl https://your-server.com/health`
- Check CORS configuration: `BILAN_CORS_ORIGIN=https://yourapp.com`
- Enable debug mode to see detailed error messages

**"turnId is undefined" errors:**
```typescript
// ❌ Wrong: Using trackTurn before init
const { result, turnId } = await trackTurn('prompt', aiCall)

// ✅ Correct: Wait for init to complete
await init({ 
  mode: 'server', 
  endpoint: 'https://your-server.com',
  apiKey: 'your-api-key'
})
const { result, turnId } = await trackTurn('prompt', aiCall)
```

**"Invalid API key" / 401 errors:**
```typescript
// Ensure your SDK apiKey matches the server's BILAN_API_KEY
await init({
  mode: 'server',
  endpoint: 'https://your-server.com',
  apiKey: 'your-api-key'  // Must match server's BILAN_API_KEY
})
```

**Solution:**
- Verify server environment: `echo $BILAN_API_KEY`
- Check server logs for authentication errors
- Use development mode for testing: `BILAN_DEV_MODE=true`
- Ensure SDK apiKey parameter matches server configuration

**Events not appearing in dashboard:**
```typescript
// Enable debug mode to see what's being sent
await init({ 
  mode: 'server',
  endpoint: 'https://your-server.com',
  apiKey: 'your-api-key',
  debug: true // Will log all events to console
})
```

**Common causes:**
- Network connectivity issues
- Server not processing events (check server logs)
- Wrong endpoint URL
- Events being filtered out by privacy settings

**Bundle size too large:**
```typescript
// ✅ Use tree-shaking friendly imports
import { trackTurn, vote } from '@mocksi/bilan-sdk'

// ❌ Avoid importing everything
import * as bilan from '@mocksi/bilan-sdk' // Imports entire library
```

**TypeScript compilation errors:**
```bash
# Ensure you're using compatible TypeScript version
npm install typescript@^5.0.0

# Check your tsconfig.json includes:
{
  "compilerOptions": {
    "moduleResolution": "node",
    "allowSyntheticDefaultImports": true
  }
}
```

### Debug Mode

Enable detailed logging for troubleshooting:

```typescript
await init({
  mode: 'server',
  endpoint: 'https://your-server.com',
  debug: true // Enables verbose logging
})

// Now all SDK operations will log details to console
const { result, turnId } = await trackTurn('test prompt', () => Promise.resolve('response'))
// Console: "Bilan: trackTurn called with prompt: test prompt"
// Console: "Bilan: Generated turnId: turn_abc123"
// Console: "Bilan: Event sent successfully"
```

### Getting Help

1. **Check server health**: `curl https://your-server.com/health`
2. **Enable debug mode**: Add `debug: true` to init config
3. **Check browser network tab**: Look for failed requests
4. **Review server logs**: Check for error messages
5. **Verify versions**: Ensure SDK and server versions are compatible

## API Changelog

### v0.4.2 - Current Version

**🚨 Critical Fix:**
- ✅ **Server Mode Working**: Fixed broken server mode - events now actually sent to analytics server
- 🔑 **API Key Required**: Added required `apiKey` parameter for server mode authentication  
- 📈 **Bundle Size**: Increased to 5.5KB gzipped to accommodate essential HTTP functionality
- 🔧 **Better Errors**: Clear validation messages when `apiKey` is missing

**Breaking Changes:**
```typescript
// ❌ v0.4.1 (broken - no events sent)
await init({
  mode: 'server',
  endpoint: 'https://api.com',
  userId: 'user-123'
})

// ✅ v0.4.2 (working)
await init({
  mode: 'server',
  endpoint: 'https://api.com', 
  apiKey: 'your-api-key',  // NEW: Required
  userId: 'user-123'
})
```

### v0.4.1

**Breaking Changes:**
- 🔄 **`trackTurn()` return value**: Now returns `{ result, turnId }` instead of just result
- 🔄 **`vote()` signature**: Now takes `turnId` as first parameter (was `promptId`)

**New Features:**
- ✅ **Automatic event correlation**: `trackTurn()` and `vote()` now use shared `turnId`
- ✅ **Enhanced context**: Support for `conversation_id`, `journey_id`, `turn_sequence`
- ✅ **Privacy controls**: New `privacyConfig.captureLevels` for granular data control

**Migration from v0.4.0:**
```typescript
// ❌ v0.4.0 (Old)
const response = await trackTurn('prompt', aiCall)
await vote(createPromptId('manual'), 1, 'Good')

// ✅ v0.4.1 (New)
const { result, turnId } = await trackTurn('prompt', aiCall)
await vote(turnId, 1, 'Good')
```

### v0.4.0

**Breaking Changes:**
- 🔄 **Configuration**: Renamed `endpointUrl` → `endpoint`
- 🔄 **Privacy config**: New structure with `defaultCaptureLevel` and `captureLevels`

**New Features:**
- ✅ **Privacy controls**: Granular data capture settings
- ✅ **Telemetry**: Optional usage analytics
- ✅ **Better error handling**: More descriptive error messages

### v0.3.x → v0.4.0 Migration

**Configuration changes:**
```typescript
// ❌ v0.3.x (Old)
await init({
  mode: 'server',
  endpointUrl: 'https://api.com', // Old property name
  captureLevel: 'full'            // Old privacy structure
})

// ✅ v0.4.0+ (New)  
await init({
  mode: 'server',
  endpoint: 'https://api.com',     // New property name
  privacyConfig: {                 // New privacy structure
    defaultCaptureLevel: 'full',
    captureLevels: {
      prompts: 'full',
      responses: 'sanitized'
    }
  }
})
```

### v0.2.x → v0.3.x (Historical)

**Breaking Changes:**
- 🔄 **Initialization**: Added required `init()` call
- 🔄 **Event structure**: Standardized event schemas

### Upgrade Policy

- ✅ **Patch versions** (0.4.x): Bug fixes only, safe to upgrade
- ⚠️ **Minor versions** (0.x.0): May include breaking changes, check changelog
- 🔄 **Major versions** (x.0.0): Significant breaking changes, migration guide provided

**Compatibility Matrix:**
| SDK Version | Server Version | Status |
|-------------|----------------|--------|
| 0.4.2 | 0.4.0+ | ✅ Recommended |
| 0.4.0 | 0.4.0+ | ✅ Supported |
| 0.3.x | 0.3.x - 0.4.0 | ⚠️ Legacy support |
| 0.2.x | 0.2.x - 0.3.x | ❌ Deprecated |

## Contributing

We welcome contributions! Please see our [Contributing Guide](https://github.com/Mocksi/bilan/blob/main/CONTRIBUTING.md).

## License

MIT © [Mocksi](https://github.com/Mocksi)

## Links

- [Documentation](https://github.com/Mocksi/bilan#readme)
- [GitHub Repository](https://github.com/Mocksi/bilan)
- [Issue Tracker](https://github.com/Mocksi/bilan/issues)
- [Integration Examples](https://github.com/Mocksi/bilan/tree/main/docs/integrations) 