# Bilan v0.4.0: Integration Patterns & Examples

## Overview

This document provides comprehensive integration patterns and examples for Bilan v0.4.0's event-driven architecture. The patterns demonstrate how to implement the one-line `trackTurn` wrapper, handle various AI interaction patterns, and leverage custom event tracking for specific use cases.

## Core Integration Principles

### 1. **One-Line Integration**
- Single wrapper method handles success/failure automatically
- Minimal code changes to existing AI implementations
- Automatic error classification and timing
- Privacy-controlled content capture

### 2. **Flexible Event Tracking**
- Manual event tracking for complex scenarios
- Custom properties for application-specific data
- Correlation across multiple events
- Real-time analytics and monitoring

### 3. **Privacy-First Design**
- Granular control over content capture
- Automatic PII detection and sanitization
- Selective response capture by category
- Configurable data retention policies

### 4. **Performance Optimized**
- Asynchronous event processing
- Batch operations for high-throughput
- Minimal SDK overhead (<50ms)
- Efficient error handling

## Primary Integration Pattern: trackTurn

### Basic Implementation

```typescript
import { bilan } from '@mocksi/bilan-sdk'

// Initialize SDK
await bilan.init({
  userId: 'user-123',
  mode: 'local', // or 'server'
  privacy: {
    capturePrompts: true,
    captureResponses: false
  }
})

// Basic AI call wrapping
const response = await bilan.trackTurn(
  'How do I center a div in CSS?',
  () => openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: 'How do I center a div in CSS?' }]
  })
)

console.log(response) // AI response (unchanged)
```

### Advanced Implementation with Context

```typescript
const response = await bilan.trackTurn(
  userPrompt,
  () => openai.chat.completions.create({
    model: 'gpt-4',
    messages: conversationHistory
  }),
  {
    // Context properties
    conversation_id: 'conv_abc123',
    user_intent: 'code_generation',
    context_category: 'css_styling',
    
    // AI configuration
    model_used: 'gpt-4',
    temperature: 0.7,
    max_tokens: 1000,
    
    // Application context
    feature_name: 'css_helper',
    user_experience_level: 'beginner',
    
    // Custom properties
    editor_language: 'html',
    project_type: 'web_app'
  }
)
```

### Error Handling and Retry Logic

```typescript
async function robustAICall(prompt: string, maxRetries: number = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await bilan.trackTurn(
        prompt,
        () => openai.chat.completions.create({
          model: 'gpt-4',
          messages: [{ role: 'user', content: prompt }]
        }),
        {
          attempt_number: attempt + 1,
          max_retries: maxRetries,
          retry_strategy: 'exponential_backoff'
        }
      )
      
      return response
      
    } catch (error) {
      if (attempt === maxRetries - 1) {
        // Final attempt failed - trackTurn already logged the failure
        throw error
      }
      
      // Wait before retry (exponential backoff)
      const delay = Math.pow(2, attempt) * 1000
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }
}
```

## Multi-Turn Conversation Patterns

### Conversation Lifecycle Management

```typescript
class ConversationManager {
  private conversationId: string
  private turnCount: number = 0
  private context: any[] = []
  private startTime: number = Date.now()
  
  constructor(userId: string, conversationType: string = 'general') {
    this.conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // Track conversation start
    bilan.track('conversation_started', {
      conversation_id: this.conversationId,
      user_id: userId,
      conversation_type: conversationType,
      started_at: this.startTime
    })
  }
  
  async sendMessage(userMessage: string, aiCall: () => Promise<string>) {
    this.turnCount++
    
    const response = await bilan.trackTurn(
      userMessage,
      aiCall,
      {
        conversation_id: this.conversationId,
        turn_number: this.turnCount,
        context_length: this.context.length,
        conversation_type: 'multi_turn'
      }
    )
    
    // Update context
    this.context.push(
      { role: 'user', content: userMessage },
      { role: 'assistant', content: response }
    )
    
    return response
  }
  
  async endConversation(outcome: 'completed' | 'abandoned' = 'completed') {
    bilan.track('conversation_ended', {
      conversation_id: this.conversationId,
      outcome: outcome,
      turn_count: this.turnCount,
      duration: Date.now() - this.startTime,
      final_context_length: this.context.length
    })
  }
}

// Usage
const conversation = new ConversationManager('user-123', 'code_review')

const response1 = await conversation.sendMessage(
  'Review this React component',
  () => openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{ role: 'user', content: 'Review this React component...' }]
  })
)

const response2 = await conversation.sendMessage(
  'How can I improve the performance?',
  () => openai.chat.completions.create({
    model: 'gpt-4',
    messages: conversation.context.concat([
      { role: 'user', content: 'How can I improve the performance?' }
    ])
  })
)

await conversation.endConversation('completed')
```

### Streaming Conversation Pattern

```typescript
async function streamingConversation(
  userMessage: string,
  conversationId: string,
  onChunk: (chunk: string) => void
) {
  const turnId = `turn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  const startTime = Date.now()
  
  // Track turn start
  bilan.track('turn_started', {
    turn_id: turnId,
    conversation_id: conversationId,
    streaming: true,
    user_id: 'user-123'
  })
  
  try {
    const stream = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: userMessage }],
      stream: true
    })
    
    let fullResponse = ''
    let chunkCount = 0
    
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || ''
      fullResponse += content
      chunkCount++
      
      onChunk(content)
      
      // Track streaming progress
      if (chunkCount % 10 === 0) {
        bilan.track('turn_progress', {
          turn_id: turnId,
          chunks_received: chunkCount,
          response_length: fullResponse.length,
          streaming: true
        })
      }
    }
    
    // Track successful completion
    bilan.track('turn_completed', {
      turn_id: turnId,
      status: 'success',
      response_time: (Date.now() - startTime) / 1000,
      streaming: true,
      total_chunks: chunkCount,
      response_length: fullResponse.length
    })
    
    return fullResponse
    
  } catch (error) {
    // Track streaming failure
    bilan.track('turn_failed', {
      turn_id: turnId,
      status: 'failed',
      error_type: bilan.classifyError(error),
      streaming: true,
      chunks_received: chunkCount
    })
    
    throw error
  }
}
```

## Single-Turn Application Patterns

### Code Generation Pattern

```typescript
class CodeGenerator {
  async generateCode(
    prompt: string,
    language: string,
    framework?: string
  ): Promise<string> {
    return await bilan.trackTurn(
      prompt,
      () => openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are a code generator for ${language}${framework ? ` with ${framework}` : ''}`
          },
          { role: 'user', content: prompt }
        ]
      }),
      {
        // Application context
        use_case: 'code_generation',
        target_language: language,
        framework: framework,
        
        // User context
        user_intent: 'generate_code',
        complexity_level: this.assessComplexity(prompt),
        
        // Quality signals
        includes_examples: prompt.includes('example'),
        includes_constraints: prompt.includes('should') || prompt.includes('must'),
        
        // Privacy: capture responses for code generation
        capture_response: true,
        response_category: 'code_generation'
      }
    )
  }
  
  private assessComplexity(prompt: string): 'simple' | 'medium' | 'complex' {
    const complexityIndicators = [
      'algorithm', 'optimization', 'performance', 'async', 'concurrent',
      'database', 'api', 'framework', 'architecture'
    ]
    
    const matches = complexityIndicators.filter(indicator => 
      prompt.toLowerCase().includes(indicator)
    ).length
    
    if (matches === 0) return 'simple'
    if (matches <= 2) return 'medium'
    return 'complex'
  }
}

// Usage
const codeGen = new CodeGenerator()
const reactComponent = await codeGen.generateCode(
  'Create a responsive navbar with dropdown menu',
  'typescript',
  'react'
)
```

### Image Generation Pattern

```typescript
class ImageGenerator {
  async generateImage(
    prompt: string,
    style: string = 'realistic',
    size: string = '1024x1024'
  ): Promise<string> {
    return await bilan.trackTurn(
      prompt,
      async () => {
        const response = await openai.images.generate({
          prompt: prompt,
          n: 1,
          size: size as any,
          style: style as any
        })
        
        return response.data[0].url || ''
      },
      {
        // Application context
        use_case: 'image_generation',
        image_style: style,
        image_size: size,
        
        // Content analysis
        prompt_length: prompt.length,
        contains_negative_prompts: prompt.includes('not') || prompt.includes('without'),
        artistic_style: this.detectArtisticStyle(prompt),
        
        // Quality metrics
        specificity_score: this.calculateSpecificity(prompt),
        
        // Privacy: don't capture image URLs by default
        capture_response: false,
        response_category: 'image_generation'
      }
    )
  }
  
  private detectArtisticStyle(prompt: string): string {
    const styles = ['photorealistic', 'cartoon', 'abstract', 'minimalist', 'vintage']
    return styles.find(style => prompt.toLowerCase().includes(style)) || 'unknown'
  }
  
  private calculateSpecificity(prompt: string): number {
    const specificWords = ['color', 'lighting', 'angle', 'composition', 'texture']
    const matches = specificWords.filter(word => prompt.toLowerCase().includes(word)).length
    return matches / specificWords.length
  }
}
```

### Document Processing Pattern

```typescript
class DocumentProcessor {
  async processDocument(
    document: string,
    task: 'summarize' | 'analyze' | 'extract' | 'transform',
    options: Record<string, any> = {}
  ): Promise<string> {
    return await bilan.trackTurn(
      `${task}: ${document.substring(0, 200)}...`,
      () => openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are a document processor. Task: ${task}`
          },
          { role: 'user', content: document }
        ]
      }),
      {
        // Document context
        use_case: 'document_processing',
        processing_task: task,
        document_length: document.length,
        document_type: this.detectDocumentType(document),
        
        // Processing options
        ...options,
        
        // Performance metrics
        input_tokens: Math.ceil(document.length / 4), // Rough estimate
        complexity_score: this.calculateComplexity(document),
        
        // Privacy: selective capture based on document type
        capture_response: this.shouldCaptureResponse(task, document),
        response_category: `document_${task}`
      }
    )
  }
  
  private detectDocumentType(document: string): string {
    if (document.includes('function') || document.includes('class')) return 'code'
    if (document.includes('Abstract:') || document.includes('References:')) return 'academic'
    if (document.includes('Dear') || document.includes('Sincerely')) return 'letter'
    return 'general'
  }
  
  private calculateComplexity(document: string): number {
    const sentences = document.split(/[.!?]+/).length
    const words = document.split(/\s+/).length
    const avgSentenceLength = words / sentences
    
    // Complexity based on sentence length and document length
    return Math.min(1, (avgSentenceLength / 20) + (document.length / 10000))
  }
  
  private shouldCaptureResponse(task: string, document: string): boolean {
    // Don't capture responses for potentially sensitive documents
    const sensitiveIndicators = ['confidential', 'private', 'personal', 'salary', 'medical']
    const isSensitive = sensitiveIndicators.some(indicator => 
      document.toLowerCase().includes(indicator)
    )
    
    return !isSensitive && ['summarize', 'analyze'].includes(task)
  }
}
```

## Custom Event Tracking Patterns

### User Journey Tracking

```typescript
class JourneyTracker {
  private journeyId: string
  private currentStep: number = 0
  private startTime: number = Date.now()
  private lastStepTime: number = Date.now()
  
  constructor(
    private journeyName: string,
    private userId: string,
    private steps: string[]
  ) {
    this.journeyId = `journey_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    // Track journey start
    bilan.track('journey_started', {
      journey_id: this.journeyId,
      journey_name: this.journeyName,
      user_id: this.userId,
      total_steps: this.steps.length,
      expected_steps: this.steps
    })
  }
  
  async nextStep(stepName: string, additionalData: Record<string, any> = {}) {
    const stepStartTime = Date.now()
    this.currentStep++
    
    const stepData = {
      journey_id: this.journeyId,
      journey_name: this.journeyName,
      step_name: stepName,
      step_number: this.currentStep,
      time_since_start: (stepStartTime - this.startTime) / 1000,
      ...additionalData
    }
    
    // Track step completion
    bilan.track('journey_step', stepData)
    
    // Track step timing
    if (this.currentStep > 1) {
      bilan.track('step_timing', {
        ...stepData,
        step_duration: (stepStartTime - this.lastStepTime) / 1000
      })
    }
    
    this.lastStepTime = stepStartTime
    
    // Check if journey is complete
    if (this.currentStep >= this.steps.length) {
      await this.complete()
    }
  }
  
  async complete() {
    const completionTime = Date.now()
    
    bilan.track('journey_completed', {
      journey_id: this.journeyId,
      journey_name: this.journeyName,
      user_id: this.userId,
      total_steps: this.currentStep,
      completion_rate: this.currentStep / this.steps.length,
      total_duration: (completionTime - this.startTime) / 1000,
      success_indicator: this.currentStep >= this.steps.length
    })
  }
  
  async abandon(reason: string) {
    bilan.track('journey_abandoned', {
      journey_id: this.journeyId,
      journey_name: this.journeyName,
      user_id: this.userId,
      abandoned_at_step: this.currentStep,
      completion_rate: this.currentStep / this.steps.length,
      abandonment_reason: reason,
      time_to_abandonment: (Date.now() - this.startTime) / 1000
    })
  }
}

// Usage
const emailJourney = new JourneyTracker(
  'email_generation',
  'user-123',
  ['topic_selection', 'tone_configuration', 'draft_generation', 'review_and_edit', 'finalization']
)

await emailJourney.nextStep('topic_selection', { topic: 'product_launch' })
await emailJourney.nextStep('tone_configuration', { tone: 'professional' })
await emailJourney.nextStep('draft_generation', { word_count: 250 })
// ... continue through journey
```

### Feature Usage Analytics

```typescript
class FeatureAnalytics {
  static trackFeatureUsage(
    featureName: string,
    action: string,
    userId: string,
    context: Record<string, any> = {}
  ) {
    bilan.track('feature_usage', {
      feature_name: featureName,
      action: action,
      user_id: userId,
      session_id: this.getSessionId(),
      timestamp: Date.now(),
      
      // Context
      ...context,
      
      // Session information
      page_url: window.location.href,
      user_agent: navigator.userAgent,
      viewport_size: `${window.innerWidth}x${window.innerHeight}`,
      
      // Performance
      page_load_time: performance.now(),
      memory_usage: (performance as any).memory?.usedJSHeapSize
    })
  }
  
  static trackAIFeatureUsage(
    featureName: string,
    aiInteraction: 'success' | 'failure' | 'timeout',
    userId: string,
    metadata: Record<string, any> = {}
  ) {
    bilan.track('ai_feature_usage', {
      feature_name: featureName,
      ai_interaction: aiInteraction,
      user_id: userId,
      
      // AI-specific metrics
      model_used: metadata.model_used,
      response_time: metadata.response_time,
      tokens_used: metadata.tokens_used,
      
      // Feature context
      feature_category: this.categorizeFeature(featureName),
      user_experience_level: metadata.user_experience_level,
      
      // Business metrics
      feature_value_score: this.calculateFeatureValue(featureName, aiInteraction),
      user_satisfaction_indicator: aiInteraction === 'success' ? 1 : 0
    })
  }
  
  private static categorizeFeature(featureName: string): string {
    const categories = {
      'code_generation': ['code_gen', 'autocomplete', 'refactor'],
      'content_creation': ['write_email', 'blog_post', 'social_media'],
      'data_analysis': ['chart_gen', 'data_summary', 'insight_gen'],
      'productivity': ['task_planning', 'meeting_notes', 'calendar']
    }
    
    for (const [category, features] of Object.entries(categories)) {
      if (features.some(feature => featureName.includes(feature))) {
        return category
      }
    }
    
    return 'other'
  }
  
  private static calculateFeatureValue(
    featureName: string,
    outcome: string
  ): number {
    const baseValues = {
      'code_generation': 0.8,
      'content_creation': 0.6,
      'data_analysis': 0.9,
      'productivity': 0.7
    }
    
    const category = this.categorizeFeature(featureName)
    const baseValue = baseValues[category] || 0.5
    
    // Adjust based on outcome
    const outcomeMultiplier = {
      'success': 1.0,
      'failure': 0.2,
      'timeout': 0.1
    }
    
    return baseValue * outcomeMultiplier[outcome]
  }
}

// Usage
FeatureAnalytics.trackFeatureUsage('code_completion', 'trigger', 'user-123', {
  trigger_type: 'tab_key',
  cursor_position: 45,
  file_type: 'typescript'
})

FeatureAnalytics.trackAIFeatureUsage('email_generation', 'success', 'user-123', {
  model_used: 'gpt-4',
  response_time: 2.3,
  tokens_used: 150,
  user_experience_level: 'intermediate'
})
```

## Performance Optimization Patterns

### Batch Event Processing

```typescript
class BatchEventProcessor {
  private eventQueue: any[] = []
  private batchSize: number = 50
  private flushInterval: number = 5000 // 5 seconds
  private processingTimer: NodeJS.Timeout | null = null
  
  constructor(batchSize: number = 50, flushInterval: number = 5000) {
    this.batchSize = batchSize
    this.flushInterval = flushInterval
  }
  
  addEvent(eventType: string, properties: Record<string, any>) {
    this.eventQueue.push({
      eventType,
      timestamp: Date.now(),
      properties,
      userId: properties.user_id
    })
    
    // Auto-flush if batch is full
    if (this.eventQueue.length >= this.batchSize) {
      this.flush()
    } else if (!this.processingTimer) {
      // Schedule flush
      this.processingTimer = setTimeout(() => this.flush(), this.flushInterval)
    }
  }
  
  private async flush() {
    if (this.eventQueue.length === 0) return
    
    const eventsToProcess = [...this.eventQueue]
    this.eventQueue = []
    
    if (this.processingTimer) {
      clearTimeout(this.processingTimer)
      this.processingTimer = null
    }
    
    try {
      // Send batch to API
      await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events: eventsToProcess })
      })
      
      console.log(`Flushed ${eventsToProcess.length} events`)
      
    } catch (error) {
      console.error('Failed to flush events:', error)
      
      // Re-queue events with exponential backoff
      this.eventQueue.unshift(...eventsToProcess)
      
      const retryDelay = Math.min(30000, this.flushInterval * 2)
      this.processingTimer = setTimeout(() => this.flush(), retryDelay)
    }
  }
  
  // Ensure all events are flushed on page unload
  setupPageUnloadHandler() {
    window.addEventListener('beforeunload', () => {
      if (this.eventQueue.length > 0) {
        // Use sendBeacon for reliable delivery
        navigator.sendBeacon('/api/events', JSON.stringify({
          events: this.eventQueue
        }))
      }
    })
  }
}

// Usage
const batchProcessor = new BatchEventProcessor(25, 3000)
batchProcessor.setupPageUnloadHandler()

// High-frequency events
batchProcessor.addEvent('user_keystroke', { key: 'a', timestamp: Date.now() })
batchProcessor.addEvent('cursor_move', { x: 100, y: 200 })
```

### Offline Event Handling

```typescript
class OfflineEventHandler {
  private localStorageKey = 'bilan_offline_events'
  private maxOfflineEvents = 1000
  
  constructor() {
    this.setupOnlineHandler()
  }
  
  storeOfflineEvent(event: any) {
    const offlineEvents = this.getOfflineEvents()
    offlineEvents.push({
      ...event,
      stored_at: Date.now(),
      offline: true
    })
    
    // Limit storage size
    if (offlineEvents.length > this.maxOfflineEvents) {
      offlineEvents.splice(0, offlineEvents.length - this.maxOfflineEvents)
    }
    
    localStorage.setItem(this.localStorageKey, JSON.stringify(offlineEvents))
  }
  
  private getOfflineEvents(): any[] {
    try {
      const stored = localStorage.getItem(this.localStorageKey)
      return stored ? JSON.parse(stored) : []
    } catch {
      return []
    }
  }
  
  private async syncOfflineEvents() {
    const offlineEvents = this.getOfflineEvents()
    if (offlineEvents.length === 0) return
    
    try {
      const response = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events: offlineEvents })
      })
      
      if (response.ok) {
        // Clear offline events on successful sync
        localStorage.removeItem(this.localStorageKey)
        console.log(`Synced ${offlineEvents.length} offline events`)
      }
      
    } catch (error) {
      console.error('Failed to sync offline events:', error)
    }
  }
  
  private setupOnlineHandler() {
    window.addEventListener('online', () => {
      this.syncOfflineEvents()
    })
    
    // Also try to sync on page load
    if (navigator.onLine) {
      this.syncOfflineEvents()
    }
  }
}

// Usage
const offlineHandler = new OfflineEventHandler()

// In main event tracking function
async function trackEvent(eventType: string, properties: Record<string, any>) {
  const event = { eventType, timestamp: Date.now(), properties }
  
  if (navigator.onLine) {
    try {
      await bilan.track(eventType, properties)
    } catch (error) {
      // Store offline if network request fails
      offlineHandler.storeOfflineEvent(event)
    }
  } else {
    // Store offline immediately
    offlineHandler.storeOfflineEvent(event)
  }
}
```

## Privacy Configuration Examples

### Granular Privacy Controls

```typescript
// Privacy configuration for different use cases
const privacyConfigurations = {
  // Maximum privacy - no content capture
  high_privacy: {
    capturePrompts: false,
    captureResponses: false,
    captureResponsesFor: [],
    contentRetentionDays: 7,
    hashSensitiveData: true,
    anonymizeUsers: true
  },
  
  // Balanced privacy - selective capture
  balanced_privacy: {
    capturePrompts: true,
    captureResponses: false,
    captureResponsesFor: ['code_generation', 'documentation', 'safe_content'],
    contentRetentionDays: 30,
    hashSensitiveData: true,
    anonymizeUsers: false
  },
  
  // Development mode - full capture for debugging
  development: {
    capturePrompts: true,
    captureResponses: true,
    captureResponsesFor: ['*'],
    contentRetentionDays: 90,
    hashSensitiveData: false,
    anonymizeUsers: false,
    debugMode: true
  }
}

// Dynamic privacy configuration
function getPrivacyConfig(userPreferences: any, environment: string) {
  const baseConfig = privacyConfigurations[environment] || privacyConfigurations.balanced_privacy
  
  // Override with user preferences
  return {
    ...baseConfig,
    capturePrompts: userPreferences.analytics_consent && baseConfig.capturePrompts,
    captureResponses: userPreferences.response_capture_consent && baseConfig.captureResponses,
    contentRetentionDays: Math.min(
      userPreferences.data_retention_days || baseConfig.contentRetentionDays,
      baseConfig.contentRetentionDays
    )
  }
}
```

### Industry-Specific Privacy Patterns

```typescript
// Healthcare application privacy
const healthcarePrivacy = {
  capturePrompts: false, // Never capture medical prompts
  captureResponses: false, // Never capture medical responses
  captureResponsesFor: [],
  contentRetentionDays: 1, // Minimal retention
  hashSensitiveData: true,
  additionalSanitization: true,
  hipaaCompliant: true
}

// Financial services privacy
const financialPrivacy = {
  capturePrompts: false, // Never capture financial prompts
  captureResponses: false, // Never capture financial responses
  captureResponsesFor: [],
  contentRetentionDays: 7,
  hashSensitiveData: true,
  encryptAtRest: true,
  auditLogging: true
}

// Educational platform privacy
const educationalPrivacy = {
  capturePrompts: true, // Educational prompts are generally safe
  captureResponses: false,
  captureResponsesFor: ['educational_content', 'safe_examples'],
  contentRetentionDays: 180, // Longer retention for learning analytics
  hashSensitiveData: true,
  parentalConsentRequired: true
}
```

## Conclusion

These integration patterns provide comprehensive examples for implementing Bilan v0.4.0's event-driven architecture across diverse AI application scenarios. The patterns demonstrate:

1. **One-Line Integration** - Minimal code changes with maximum insights
2. **Flexible Event Tracking** - Custom analytics for specific use cases
3. **Privacy-First Design** - Granular control over data capture
4. **Performance Optimization** - Batch processing and offline handling
5. **Industry Compliance** - Patterns for regulated industries

These patterns serve as practical references for development teams implementing the v0.4.0 transformation, ensuring consistent, efficient, and privacy-conscious integration across all AI applications. 