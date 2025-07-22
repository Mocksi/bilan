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
import { useChat } from 'ai/react'
import { vote } from '@mocksi/bilan-sdk'

// Add feedback to your existing chat
const handleFeedback = async (promptId: string, value: 1 | -1) => {
  await vote(promptId, value)
}
```
**→ [Full Vercel AI SDK Guide](./vercel-ai-sdk.md)**

### Building with LangChain?
```typescript
import { createQAChain } from '@/lib/chains/qa-chain'
import { vote } from '@mocksi/bilan-sdk'

const chain = createQAChain()
const response = await chain.invoke('Your question')
await vote(response.promptId, 1, 'Helpful response!')
```
**→ [Full LangChain Guide](./langchain.md)**

### Using OpenAI directly?
```typescript
import { createChatCompletion } from '@/lib/chat'
import { vote } from '@mocksi/bilan-sdk'

const response = await createChatCompletion(messages)
await vote(response.promptId, 1)
```
**→ [Full OpenAI Guide](./openai-api.md)**

### Working with Claude?
```typescript
import { createClaudeMessage } from '@/lib/claude-chat'
import { vote } from '@mocksi/bilan-sdk'

const response = await createClaudeMessage(messages)
await vote(response.promptId, 1)
```
**→ [Full Anthropic Guide](./anthropic-api.md)**

### Custom or local models?
```typescript
import { TrackedLLM } from '@/lib/llm-wrapper'
import { OllamaProvider } from '@/lib/providers/ollama'

const llm = new TrackedLLM(new OllamaProvider())
const response = await llm.generateResponse('Hello!')
await llm.submitFeedback(response.promptId, 1)
```
**→ [Full Custom LLM Guide](./custom-llm.md)**

## Integration Patterns

### 1. Basic Feedback Pattern
All integrations follow this core pattern:

```typescript
// 1. Generate response with tracked ID
const response = await generateAIResponse(prompt)
const { content, promptId } = response

// 2. Show response to user with feedback buttons
<div>
  <p>{content}</p>
  <button onClick={() => vote(promptId, 1)}>👍</button>
  <button onClick={() => vote(promptId, -1)}>👎</button>
</div>

// 3. Track trust score
const stats = await getStats()
console.log('Trust score:', stats.trustScore)
```

### 2. Streaming Pattern
For real-time streaming responses:

```typescript
const { stream, promptId } = await generateStreamingResponse(prompt)

let fullContent = ''
for await (const chunk of stream) {
  fullContent += chunk
  // Update UI with streaming content
}

// Add feedback after streaming completes
await vote(promptId, userFeedback)
```

### 3. Multi-step Pattern
For complex workflows (chains, agents):

```typescript
const steps = await executeMultiStepProcess(input)

// Each step has its own promptId for granular feedback
steps.forEach(step => {
  // Show step result with individual feedback
  <StepResult 
    content={step.result}
    onFeedback={(value) => vote(step.promptId, value)}
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