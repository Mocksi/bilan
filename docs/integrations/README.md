# Bilan Integration Guides

This directory contains comprehensive integration guides for popular AI frameworks and services. Each guide follows the same structure to help you quickly integrate Bilan with your preferred AI provider.

## Available Integrations

### 🚀 **AI Frameworks**
- **[Vercel AI SDK](vercel-ai-sdk.md)** - Streaming responses with real-time feedback
- **[LangChain](langchain.md)** - Multi-step chains with granular feedback  
- **[CopilotKit](copilotkit.md)** - React components for AI chat interfaces

### 🤖 **AI Providers**
- **[OpenAI API](openai-api.md)** - Direct API usage with function calling
- **[Anthropic API](anthropic-api.md)** - Tool use and vision capabilities
- **[Custom LLM](custom-llm.md)** - Universal wrapper for any provider

## Guide Structure

Each integration guide includes:

1. **Problem** - What user experience issue this solves
2. **Installation** - Required packages and setup
3. **Integration** - Step-by-step code examples
4. **Testing** - How to verify everything works
5. **Advanced Features** - Power user capabilities
6. **Next Steps** - Links to related documentation

## Quick Start

Choose your integration based on your current setup:

### Already using Vercel AI SDK?
```typescript
import { trackTurn, vote } from '@mocksi/bilan-sdk'

// ✅ v0.4.1: Industry-standard event correlation
const { result, turnId } = await trackTurn(
  'Help me code',
  () => streamText({ model: openai('gpt-4'), prompt })
)
await vote(turnId, 1, 'Helpful response!')
```
**→ [Full Vercel AI SDK Guide](./vercel-ai-sdk.md)**

### Building with LangChain?
```typescript
import { trackTurn, vote } from '@mocksi/bilan-sdk'

// ✅ v0.4.1: Clean turn tracking with automatic correlation
const { result: response, turnId } = await trackTurn(
  'Your question',
  () => createQAChain().invoke('Your question')
)
await vote(turnId, 1, 'Helpful response!')
```
**→ [Full LangChain Guide](./langchain.md)**

### Using OpenAI directly?
```typescript
import { trackTurn, vote } from '@mocksi/bilan-sdk'

// ✅ v0.4.1: Direct OpenAI integration with turn correlation
const { result: response, turnId } = await trackTurn(
  'Write an email',
  () => openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: prompt }]
  })
)
await vote(turnId, 1)
```
**→ [Full OpenAI Guide](./openai-api.md)**

### Working with Claude?
```typescript
import { trackTurn, vote } from '@mocksi/bilan-sdk'

// ✅ v0.4.1: Claude integration with turn correlation
const { result: response, turnId } = await trackTurn(
  'Analyze this text',
  () => anthropic.messages.create({
    model: 'claude-3-sonnet-20240229',
    messages: [{ role: 'user', content: prompt }]
  })
)
await vote(turnId, 1)
```
**→ [Full Anthropic Guide](./anthropic-api.md)**

### Custom or local models?
```typescript
import { trackTurn, vote } from '@mocksi/bilan-sdk'

// ✅ v0.4.1: Custom model integration
const { result: response, turnId } = await trackTurn(
  'Generate content',
  () => customModel.generate({ prompt, temperature: 0.7 })
)
await vote(turnId, 1)
```
**→ [Full Custom LLM Guide](./custom-llm.md)**

## Integration Patterns

### 1. Basic Feedback Pattern
All integrations follow this core pattern:

```typescript
// ✅ v0.4.1: Standard event correlation pattern
// 1. Track turn with automatic ID generation  
const { result: response, turnId } = await trackTurn(
  prompt,
  () => generateAIResponse(prompt)
)

// 2. Collect user feedback using the same turnId
const handleFeedback = async (value: 1 | -1) => {
  await vote(turnId, value)
}

// 3. Add feedback UI
<div>
  <button onClick={() => vote(turnId, 1)}>👍</button>
  <button onClick={() => vote(turnId, -1)}>👎</button>
</div>
```

### 2. Streaming Pattern
For real-time streaming responses:

```typescript
// ✅ v0.4.1: Streaming with turn correlation
const { result: stream, turnId } = await trackTurn(
  prompt,
  () => generateStreamingResponse(prompt)
)

let fullContent = ''
for await (const chunk of stream) {
  fullContent += chunk
  // Update UI with streaming content
}

// Add feedback after streaming completes using the same turnId
await vote(turnId, userFeedback)
```

### 3. Multi-step Pattern
For complex workflows (chains, agents):

```typescript
// ✅ v0.4.1: Multi-step tracking with individual turn correlation
const steps = await executeMultiStepProcess(input)

// Each step has its own turnId for granular feedback correlation
steps.forEach(step => {
  // Show step result with individual feedback linked to specific turnId
  <StepResult 
    content={step.result}
    onFeedback={(value) => vote(step.turnId, value)}
  />
})
```

## Common Use Cases

### 📊 **Analytics & Monitoring**
Track AI performance across different models and prompts through the dashboard:

```typescript
// Analytics available through dashboard at /api/analytics/*
// All endpoints require API key authentication

// Track turns with automatic correlation
const { result, turnId } = await trackTurn('Generate code', aiCall)
await vote(turnId, 1, 'Great code!')

// Dashboard shows:
// - Turn performance metrics at /api/analytics/turns
// - Vote trends and sentiment at /api/analytics/votes  
// - Turn-to-vote correlation analysis
// - Event overview at /api/analytics/overview
```

### 🔄 **A/B Testing**
Use analytics data to optimize AI performance:

```typescript
// Use dashboard analytics to make routing decisions
// Access performance data through authenticated API endpoints
// Route based on model performance metrics from dashboard
```

### 🎯 **Adaptive Routing**
Automatically improve based on feedback:

```typescript
// Route to different models based on dashboard analytics
// Use turn performance data from /api/analytics/turns
// Dashboard provides insights for intelligent routing decisions
```

### 📈 **Continuous Improvement**
Collect feedback to improve prompts:

```typescript
// Track which prompts get positive feedback using dashboard
// Use vote analytics from /api/analytics/votes
// Dashboard correlation shows turn-to-vote relationships
```

---

**Need help?** Join our [GitHub Discussions](https://github.com/Mocksi/bilan/discussions) or [open an issue](https://github.com/Mocksi/bilan/issues). We're here to help you succeed with AI analytics! 🚀 