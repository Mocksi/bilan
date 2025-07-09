# Bilan Integration Guides

This directory contains comprehensive integration guides for popular AI frameworks and services. Each guide follows the same structure to help you quickly integrate Bilan with your preferred AI provider.

## Available Integrations

### 🚀 **Popular Frameworks**

- **[Vercel AI SDK](./vercel-ai-sdk.md)** - Streaming AI responses with feedback tracking
- **[LangChain](./langchain.md)** - Complex chains with step-by-step feedback
- **[OpenAI API](./openai-api.md)** - Direct OpenAI integration with function calling
- **[Anthropic Claude](./anthropic-api.md)** - Claude API with tool use and vision
- **[Custom LLM](./custom-llm.md)** - Any LLM provider (Ollama, Hugging Face, local models)

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
Track AI performance across different models and prompts:

```typescript
import { getStats } from '@mocksi/bilan-sdk'

const stats = await getStats()
console.log({
  trustScore: stats.trustScore,
  totalVotes: stats.totalVotes,
  positiveVotes: stats.positiveVotes
})
```

### 🔄 **A/B Testing**
Compare different AI models or prompts:

```typescript
// Route to different models based on trust score
const stats = await getStats()
const model = stats.trustScore < 0.7 ? 'gpt-4' : 'gpt-3.5-turbo'
```

### 🎯 **Adaptive Routing**
Automatically improve based on feedback:

```typescript
// Use better model for low-trust scenarios
if (stats.trustScore < 0.6) {
  response = await generateWithBetterModel(prompt)
} else {
  response = await generateWithFastModel(prompt)
}
```

### 📈 **Continuous Improvement**
Collect feedback to improve prompts:

```typescript
// Track which prompts get positive feedback
const promptAnalytics = await getPromptStats(promptId)
if (promptAnalytics.averageScore > 0.8) {
  // This prompt works well, use it as template
}
```

## Framework Comparison

| Framework | Streaming | Function Calling | Multi-turn | Complexity |
|-----------|-----------|------------------|------------|------------|
| Vercel AI SDK | ✅ | ✅ | ✅ | Low |
| LangChain | ✅ | ✅ | ✅ | Medium |
| OpenAI API | ✅ | ✅ | ✅ | Low |
| Anthropic | ✅ | ✅ | ✅ | Low |
| Custom LLM | ⚠️ | ⚠️ | ✅ | High |

**Legend:**
- ✅ Fully supported
- ⚠️ Depends on provider
- ❌ Not supported

## Best Practices

### 1. **Always Generate Unique IDs**
```typescript
import { randomUUID } from 'crypto'

const promptId = randomUUID() // Use this for tracking
```

### 2. **Handle Errors Gracefully**
```typescript
try {
  const response = await generateResponse(prompt)
  await vote(response.promptId, 1)
} catch (error) {
  console.error('AI request failed:', error)
  // Continue without breaking user experience
}
```

### 3. **Provide Context in Feedback**
```typescript
await vote(promptId, -1, 'Response was too technical for my use case')
```

### 4. **Monitor Performance**
```typescript
const stats = await getStats()
if (stats.trustScore < 0.5) {
  // Consider switching models or updating prompts
}
```

### 5. **Batch Feedback for Performance**
```typescript
// Instead of individual votes, batch them
const feedbackBatch = [
  { promptId: 'id1', value: 1 },
  { promptId: 'id2', value: -1 }
]
// Process batch efficiently
```

## Troubleshooting

### Common Issues

**Q: Feedback not being recorded?**
A: Check that you're using the correct `promptId` from the response.

**Q: Trust score not updating?**
A: Ensure votes are being submitted successfully with `await vote()`.

**Q: Integration not working?**
A: Verify Bilan is initialized before making AI calls.

### Debug Mode

Enable debug mode to see what's happening:

```typescript
const bilan = await init({
  mode: 'local',
  userId: 'user-123',
  debug: true // Enable debug logging
})
```

### Getting Help

- **[GitHub Issues](https://github.com/mocksi/bilan/issues)** - Report bugs
- **[Discussions](https://github.com/mocksi/bilan/discussions)** - Ask questions
- **[Discord](https://discord.gg/bilan)** - Real-time help

## Contributing

Want to add a new integration guide? 

1. Follow the existing structure
2. Include working code examples
3. Add comprehensive testing section
4. Update this README with your integration

See our [Contributing Guide](../../CONTRIBUTING.md) for details.

## Next Steps

After integrating with your AI provider:

- **[Dashboard Setup](../dashboard.md)** - Visualize your analytics
- **[Server Mode](../server-mode.md)** - Scale for production
- **[Advanced Analytics](../advanced-analytics.md)** - Deep dive into metrics
- **[A/B Testing](../ab-testing.md)** - Optimize your AI performance

---

**Need help?** Join our [Discord community](https://discord.gg/bilan) or [open an issue](https://github.com/mocksi/bilan/issues). 