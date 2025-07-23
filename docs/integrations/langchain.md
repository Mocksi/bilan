# LangChain Integration

## Problem

LangChain applications often involve complex chains of AI operations, making it difficult to identify which specific steps are causing user frustration. Bilan helps you track user satisfaction at each AI interaction point to optimize your chains.

## Installation

```bash
npm install @mocksi/bilan-sdk langchain @langchain/openai
```

## Integration

### 1. Initialize Bilan

```typescript
// lib/bilan.ts
import { Bilan } from '@mocksi/bilan-sdk'

// Cross-platform UUID generation
function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  // Fallback for environments without crypto.randomUUID
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}

export const bilan = new Bilan({
  apiKey: process.env.BILAN_API_KEY,
  projectId: process.env.BILAN_PROJECT_ID,
  userId: process.env.BILAN_USER_ID || 'anonymous'
})
```

**Required Environment Variables:**
- `OPENAI_API_KEY` - Your OpenAI API key for LangChain models
- `BILAN_API_KEY` - Your Bilan API key
- `BILAN_PROJECT_ID` - Your Bilan project identifier
- `BILAN_USER_ID` - Unique identifier for the current user

### 2. Create a tracked LangChain chain

```typescript
// lib/chains/qa-chain.ts
import { ChatOpenAI } from '@langchain/openai'
import { PromptTemplate } from '@langchain/core/prompts'
import { RunnableSequence } from '@langchain/core/runnables'
import { StringOutputParser } from '@langchain/core/output_parsers'

// Cross-platform UUID generation
function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  // Fallback for environments without crypto.randomUUID
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}

const model = new ChatOpenAI({
  modelName: 'gpt-3.5-turbo',
  temperature: 0.7
})

const promptTemplate = PromptTemplate.fromTemplate(`
You are a helpful assistant. Answer the user's question clearly and concisely.

Question: {question}
Answer:`)

export interface TrackedChainResponse {
  answer: string
  turnId: string
  conversationId: string
  metadata?: Record<string, any>
}

export const createQAChain = () => {
  const chain = RunnableSequence.from([
    promptTemplate,
    model,
    new StringOutputParser()
  ])

  return {
    async invoke(question: string, conversationId?: string): Promise<TrackedChainResponse> {
      const turnId = generateId()
      const actualConversationId = conversationId || generateId()
      
      try {
        // Track turn start
        await bilan.track('turn_started', {
          turn_id: turnId,
          conversation_id: actualConversationId,
          model: 'gpt-3.5-turbo',
          provider: 'openai',
          chain_type: 'qa',
          question: question.substring(0, 100)
        })

        const startTime = Date.now()
        const answer = await chain.invoke({ question })
        
        // Track turn completion
        await bilan.track('turn_completed', {
          turn_id: turnId,
          conversation_id: actualConversationId,
          model: 'gpt-3.5-turbo',
          provider: 'openai',
          chain_type: 'qa',
          latency: Date.now() - startTime
        })
        
        return {
          answer,
          turnId,
          conversationId: actualConversationId,
          metadata: {
            model: 'gpt-3.5-turbo',
            timestamp: Date.now(),
            question: question.substring(0, 100)
          }
        }
      } catch (error) {
        // Track turn failure
        await bilan.track('turn_failed', {
          turn_id: turnId,
          conversation_id: actualConversationId,
          model: 'gpt-3.5-turbo',
          provider: 'openai',
          chain_type: 'qa',
          error: error.message,
          error_type: error.name
        })
        
        console.error('Chain execution failed:', error)
        throw error
      }
    }
  }
}
```

### 3. Create a chat component with LangChain integration

```typescript
// components/LangChainChat.tsx
'use client'

import { useState } from 'react'
import { createQAChain, TrackedChainResponse } from '@/lib/chains/qa-chain'
import { trackTurn, vote } from '@mocksi/bilan-sdk'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  turnId?: string
  feedback?: 1 | -1
}

export default function LangChainChat() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [feedbackStates, setFeedbackStates] = useState<Record<string, 1 | -1>>({})

  const qaChain = createQAChain()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: input
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    try {
      const response: TrackedChainResponse = await qaChain.invoke(input)
      
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: response.answer,
        turnId: response.turnId
      }

      setMessages(prev => [...prev, assistantMessage])
    } catch (error) {
      console.error('Failed to get response:', error)
      
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.'
      }
      
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const handleFeedback = async (turnId: string, value: 1 | -1, comment?: string) => {
    try {
      await vote(turnId, value, comment)
      setFeedbackStates(prev => ({ ...prev, [turnId]: value }))
    } catch (error) {
      console.error('Failed to submit feedback:', error)
    }
  }

  return (
    <div className="flex flex-col h-screen max-w-2xl mx-auto p-4">
      <div className="flex-1 overflow-y-auto space-y-4">
        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
              message.role === 'user' 
                ? 'bg-blue-500 text-white' 
                : 'bg-gray-200 text-gray-900'
            }`}>
              <p className="whitespace-pre-wrap">{message.content}</p>
              
              {/* Feedback for AI responses */}
              {message.role === 'assistant' && message.turnId && (
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => handleFeedback(message.turnId!, 1)}
                    className={`text-sm px-2 py-1 rounded ${
                      feedbackStates[message.turnId] === 1
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    👍 Helpful
                  </button>
                  <button
                    onClick={() => handleFeedback(message.turnId!, -1)}
                    className={`text-sm px-2 py-1 rounded ${
                      feedbackStates[message.turnId] === -1
                        ? 'bg-red-500 text-white'
                        : 'bg-gray-100 hover:bg-gray-200'
                    }`}
                  >
                    👎 Not helpful
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-200 text-gray-900 px-4 py-2 rounded-lg">
              <div className="flex items-center gap-2">
                <div className="animate-spin h-4 w-4 border-2 border-gray-600 border-t-transparent rounded-full"></div>
                Thinking...
              </div>
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2 mt-4">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask me anything..."
          className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  )
}
```

### 4. Advanced: Multi-step chain tracking

```typescript
// lib/chains/research-chain.ts
import { ChatOpenAI } from '@langchain/openai'
import { PromptTemplate } from '@langchain/core/prompts'
import { RunnableSequence } from '@langchain/core/runnables'
import { StringOutputParser } from '@langchain/core/output_parsers'

// Cross-platform UUID generation
function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  // Fallback for environments without crypto.randomUUID
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}

export interface ResearchChainResponse {
  steps: Array<{
    name: string
    result: string
    turnId: string
  }>
  finalAnswer: string
  metadata: Record<string, any>
}

export const createResearchChain = () => {
  const model = new ChatOpenAI({ modelName: 'gpt-4' })

  const planningPrompt = PromptTemplate.fromTemplate(`
    Break down this research question into 3 specific sub-questions:
    Question: {question}
    
    Sub-questions:
    1.
    2.
    3.
  `)

  const answerPrompt = PromptTemplate.fromTemplate(`
    Answer this specific question concisely:
    Question: {subQuestion}
    Answer:
  `)

  const synthesisPrompt = PromptTemplate.fromTemplate(`
    Synthesize these answers into a comprehensive response:
    
    Original question: {originalQuestion}
    
    Research findings:
    {findings}
    
    Final answer:
  `)

  return {
    async invoke(question: string): Promise<ResearchChainResponse> {
      const steps: ResearchChainResponse['steps'] = []
      
      // Step 1: Planning
      const planningId = generateId()
      const planningChain = RunnableSequence.from([planningPrompt, model, new StringOutputParser()])
      const plan = await planningChain.invoke({ question })
      
      steps.push({
        name: 'Planning',
        result: plan,
        turnId: planningId
      })

      // Step 2: Research sub-questions
      const subQuestions = plan.split('\n').filter(line => line.match(/^\d+\./))
      const findings: string[] = []

      for (const subQuestion of subQuestions) {
        const researchId = generateId()
        const answerChain = RunnableSequence.from([answerPrompt, model, new StringOutputParser()])
        const answer = await answerChain.invoke({ subQuestion })
        
        steps.push({
          name: `Research: ${subQuestion.substring(0, 50)}...`,
          result: answer,
          turnId: researchId
        })
        
        findings.push(`${subQuestion}\n${answer}`)
      }

      // Step 3: Synthesis
      const synthesisId = generateId()
      const synthesisChain = RunnableSequence.from([synthesisPrompt, model, new StringOutputParser()])
      const finalAnswer = await synthesisChain.invoke({
        originalQuestion: question,
        findings: findings.join('\n\n')
      })

      steps.push({
        name: 'Synthesis',
        result: finalAnswer,
        turnId: synthesisId
      })

      return {
        steps,
        finalAnswer,
        metadata: {
          totalSteps: steps.length,
          timestamp: Date.now(),
          model: 'gpt-4'
        }
      }
    }
  }
}
```

### 5. Component for multi-step feedback

```typescript
// components/ResearchChat.tsx
'use client'

import { useState } from 'react'
import { createResearchChain, ResearchChainResponse } from '@/lib/chains/research-chain'
import { trackTurn, vote } from '@mocksi/bilan-sdk'

export default function ResearchChat() {
  const [question, setQuestion] = useState('')
  const [response, setResponse] = useState<ResearchChainResponse | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [feedbackStates, setFeedbackStates] = useState<Record<string, 1 | -1>>({})

  const researchChain = createResearchChain()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!question.trim() || isLoading) return

    setIsLoading(true)
    setResponse(null)

    try {
      const result = await researchChain.invoke(question)
      setResponse(result)
    } catch (error) {
      console.error('Research failed:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleStepFeedback = async (turnId: string, value: 1 | -1, stepName: string) => {
    try {
      await vote(turnId, value, `Feedback for step: ${stepName}`)
      setFeedbackStates(prev => ({ ...prev, [turnId]: value }))
    } catch (error) {
      console.error('Failed to submit feedback:', error)
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">AI Research Assistant</h1>
      
      <form onSubmit={handleSubmit} className="mb-8">
        <div className="flex gap-4">
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Enter your research question..."
            className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !question.trim()}
            className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
          >
            {isLoading ? 'Researching...' : 'Research'}
          </button>
        </div>
      </form>

      {isLoading && (
        <div className="text-center py-8">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Conducting research...</p>
        </div>
      )}

      {response && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold">Research Results</h2>
          
          {response.steps.map((step, index) => (
            <div key={index} className="bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-medium text-gray-900">{step.name}</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleStepFeedback(step.turnId, 1, step.name)}
                    className={`text-sm px-3 py-1 rounded ${
                      feedbackStates[step.turnId] === 1
                        ? 'bg-green-500 text-white'
                        : 'bg-white hover:bg-gray-100'
                    }`}
                  >
                    👍
                  </button>
                  <button
                    onClick={() => handleStepFeedback(step.turnId, -1, step.name)}
                    className={`text-sm px-3 py-1 rounded ${
                      feedbackStates[step.turnId] === -1
                        ? 'bg-red-500 text-white'
                        : 'bg-white hover:bg-gray-100'
                    }`}
                  >
                    👎
                  </button>
                </div>
              </div>
              <p className="text-gray-700 whitespace-pre-wrap">{step.result}</p>
            </div>
          ))}

          <div className="bg-blue-50 p-4 rounded-lg">
            <h3 className="font-medium text-blue-900 mb-2">Final Answer</h3>
            <p className="text-blue-800 whitespace-pre-wrap">{response.finalAnswer}</p>
          </div>
        </div>
      )}
    </div>
  )
}
```

## Testing

### 1. Test basic chain

```typescript
// Test in your browser console
import { createQAChain } from '@/lib/chains/qa-chain'

const chain = createQAChain()
const response = await chain.invoke('What is the capital of France?')
console.log('Response:', response)
```

### 2. Test multi-step chain

```typescript
import { createResearchChain } from '@/lib/chains/research-chain'

const researchChain = createResearchChain()
const result = await researchChain.invoke('How does climate change affect ocean currents?')
console.log('Research steps:', result.steps.length)
```

### 3. Verify feedback tracking

```typescript
import { trackTurn, getStats } from '@mocksi/bilan-sdk'

// Submit feedback
await trackTurn('Mock LangChain completion for feedback tracking', async () => {
  // Mock a simple task
  return {
    answer: 'This is a mock answer for feedback tracking.',
    context: [],
    metadata: {
      timestamp: Date.now()
    }
  }
})

// Check stats
const stats = await getStats()
console.log('Trust score:', stats.trustScore)
```

## Advanced Features

### Custom chain with retrieval

```typescript
// lib/chains/rag-chain.ts
import { ChatOpenAI } from '@langchain/openai'
import { MemoryVectorStore } from 'langchain/vectorstores/memory'
import { OpenAIEmbeddings } from '@langchain/openai'
import { trackTurn } from '@mocksi/bilan-sdk'

export function createRAGChain(documents: string[]) {
  const embeddings = new OpenAIEmbeddings()
  const vectorStore = await MemoryVectorStore.fromTexts(
    documents,
    documents.map((_, i) => ({ id: i })),
    embeddings
  )

  const model = new ChatOpenAI({ modelName: 'gpt-3.5-turbo' })

  return {
    async invoke(question: string) {
      // ✅ v0.4.1: Use trackTurn for automatic ID generation and correlation
      const { result: response, turnId } = await trackTurn(
        question,
        async () => {
          // Retrieve relevant documents
          const relevantDocs = await vectorStore.similaritySearch(question, 3)
          const context = relevantDocs.map(doc => doc.pageContent).join('\n\n')
          
          const prompt = `
            Based on the following context, answer the question:
            
            Context:
            ${context}
            
            Question: ${question}
            Answer:
          `
          
          const response = await model.invoke(prompt)
          
          return {
            answer: response.content,
            context: relevantDocs,
            metadata: {
              documentsUsed: relevantDocs.length,
              timestamp: Date.now()
            }
          }
        }
      )
      
      return {
        ...response,
        turnId  // Include turnId for frontend vote correlation
      }
    }
  }
}
```

### Agent-based chains

> **⚠️ SECURITY WARNING - NOT FOR PRODUCTION**  
> The calculator tool below uses Function constructor for demonstration purposes only. This poses a security risk and should NOT be used in production. For production applications, use a proper math expression parser like [mathjs](https://mathjs.org/) or similar libraries.

```typescript
// lib/chains/agent-chain.ts
import { ChatOpenAI } from '@langchain/openai'
import { AgentExecutor, createOpenAIFunctionsAgent } from 'langchain/agents'
import { DynamicTool } from '@langchain/core/tools'

export const createAgentChain = () => {
  const model = new ChatOpenAI({ modelName: 'gpt-4' })

  const tools = [
    new DynamicTool({
      name: 'calculator',
      description: 'Useful for mathematical calculations',
      func: async (input: string) => {
        // DEMO ONLY - NOT FOR PRODUCTION
        // Safe calculator implementation - only allow basic math operations
        try {
          // Remove any non-math characters and validate input
          const sanitized = input.replace(/[^0-9+\-*/().\s]/g, '')
          
          // Simple validation for basic math expressions
          if (!/^[0-9+\-*/().\s]+$/.test(sanitized)) {
            return 'Invalid mathematical expression'
          }
          
          // Use Function constructor for safer evaluation (still not recommended for production)
          // For production, use a proper math expression parser like mathjs
          const result = Function(`"use strict"; return (${sanitized})`)()
          
          return result.toString()
        } catch {
          return 'Invalid calculation'
        }
      }
    }),
    new DynamicTool({
      name: 'weather',
      description: 'Get current weather for a location',
      func: async (location: string) => {
        // Mock weather API call
        return `The weather in ${location} is sunny and 72°F`
      }
    })
  ]

  return {
    async invoke(input: string) {
      // ✅ v0.4.1: Use trackTurn for automatic correlation
      const { result, turnId } = await trackTurn(
        input,
        async () => {
          const agent = await createOpenAIFunctionsAgent({
            llm: model,
            tools,
            prompt: 'You are a helpful assistant with access to tools.'
          })

          const agentExecutor = new AgentExecutor({
            agent,
            tools,
            verbose: true
          })

          const result = await agentExecutor.invoke({ input })
          
          return {
            output: result.output,
            toolsUsed: result.intermediateSteps?.length || 0,
            metadata: {
              timestamp: Date.now(),
              inputLength: input.length
            }
          }
        }
      )
      
      return {
        ...result,
        turnId  // Include turnId for vote correlation
      }
    }
  }
}
```