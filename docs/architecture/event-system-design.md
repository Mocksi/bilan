# Bilan v0.4.0: Event System Design Specification

## Overview

The event system is the core foundation of Bilan v0.4.0, providing a flexible, privacy-first approach to AI analytics. This specification defines the complete event taxonomy, properties schema, and processing patterns that enable infinite customization while maintaining consistency.

## Core Event Design Principles

### 1. **Flexibility First**
- Events can contain any properties via JSONB
- New event types can be added without schema changes
- Custom properties support unlimited use cases

### 2. **Privacy by Design**
- Content capture is opt-in and configurable
- Sensitive data is automatically sanitized
- Users have granular control over what is tracked

### 3. **Performance Optimized**
- Single table with optimized indexes
- Batch processing for high-throughput scenarios
- Efficient querying with JSONB operations

### 4. **Developer Experience**
- Intuitive event names and properties
- Comprehensive error classification
- Automatic event generation where possible

## Event Schema Definition

### Core Event Structure

```typescript
interface BilanEvent {
  // Required fields
  event_id: string          // UUID for event identification
  user_id: string           // User identifier
  event_type: string        // Event type from taxonomy
  timestamp: number         // Unix timestamp (milliseconds)
  properties: Record<string, any>  // Flexible properties (JSONB)
  
  // Optional content fields (privacy-controlled)
  prompt_text?: string      // AI prompt/input
  ai_response?: string      // AI output/response
}
```

### Database Schema

```sql
-- Event type validation enum
CREATE TYPE event_type_enum AS ENUM (
  'turn_started',
  'turn_completed',
  'turn_failed',
  'user_action',
  'conversation_started',
  'conversation_ended',
  'journey_step',
  'journey_completed',
  'vote_cast',
  'custom_event'
);

-- Single unified events table
CREATE TABLE events (
  event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  event_type event_type_enum NOT NULL,
  timestamp BIGINT NOT NULL,
  properties JSONB DEFAULT '{}',
  
  -- Optional AI content (privacy-controlled)
  prompt_text TEXT,
  ai_response TEXT,
  
  -- Performance indexes
  INDEX idx_user_timestamp (user_id, timestamp DESC),
  INDEX idx_event_type_timestamp (event_type, timestamp DESC),
  INDEX idx_properties_gin (properties) USING GIN,
  
  -- Partitioning for performance (optional)
  PARTITION BY RANGE (timestamp)
);
```

## Event Taxonomy

### Core AI Turn Events

#### `turn_started`
Triggered when an AI request is initiated.

```typescript
interface TurnStartedEvent extends BilanEvent {
  event_type: 'turn_started'
  properties: {
    turn_id: string           // Unique turn identifier
    model_used?: string       // AI model being used
    conversation_id?: string  // Parent conversation (if applicable)
    journey_id?: string       // Parent journey (if applicable)
    user_intent?: string      // Categorized user intent
    context_category?: string // App-specific context
    input_tokens?: number     // Token count (if available)
    // Custom properties...
  }
  prompt_text?: string        // User's input (if capturing prompts)
}

// Example usage
bilan.track('turn_started', {
  turn_id: 'turn_12345',
  model_used: 'gpt-4',
  conversation_id: 'conv_abcde',
  user_intent: 'code_generation',
  context_category: 'documentation',
  input_tokens: 150
}, {
  promptText: 'How do I center a div in CSS?'
})
```

#### `turn_completed`
Triggered when an AI request succeeds.

```typescript
interface TurnCompletedEvent extends BilanEvent {
  event_type: 'turn_completed'
  properties: {
    turn_id: string           // Matching turn_started event
    status: 'success'         // Always 'success' for completed turns
    response_time: number     // Response time in seconds
    output_tokens?: number    // Token count in response
    model_used?: string       // AI model used
    quality_score?: number    // Internal quality metric (0-1)
    // Inherited from turn_started...
  }
  ai_response?: string        // AI's response (if capturing responses)
}

// Example usage
bilan.track('turn_completed', {
  turn_id: 'turn_12345',
  status: 'success',
  response_time: 1.2,
  output_tokens: 200,
  model_used: 'gpt-4'
}, {
  aiResponse: 'Use flexbox with justify-content: center and align-items: center...'
})
```

#### `turn_failed`
Triggered when an AI request fails.

```typescript
interface TurnFailedEvent extends BilanEvent {
  event_type: 'turn_failed'
  properties: {
    turn_id: string           // Matching turn_started event
    status: 'failed'          // Always 'failed' for failed turns
    error_type: ErrorType     // Classified error type
    error_message?: string    // Error message (sanitized)
    attempted_duration: number // Time spent before failure
    retry_count?: number      // Number of retries attempted
    model_used?: string       // AI model attempted
    // Inherited from turn_started...
  }
}

// Error classification types
type ErrorType = 
  | 'timeout'           // Request exceeded timeout threshold
  | 'rate_limit'        // API rate limit exceeded
  | 'quota_exceeded'    // API quota exceeded
  | 'context_limit'     // Input too long for model
  | 'network_error'     // Network connectivity issue
  | 'service_unavailable' // AI service temporarily down
  | 'authentication'    // API key or auth issue
  | 'unknown_error'     // Unclassified error

// Example usage
bilan.track('turn_failed', {
  turn_id: 'turn_12345',
  status: 'failed',
  error_type: 'timeout',
  error_message: 'Request timeout after 30 seconds',
  attempted_duration: 30.0,
  retry_count: 2,
  model_used: 'gpt-4'
})
```

### User Interaction Events

#### `user_action`
Triggered when users interact with AI-generated content.

```typescript
interface UserActionEvent extends BilanEvent {
  event_type: 'user_action'
  properties: {
    action_type: ActionType   // Type of user action
    turn_id?: string          // Related AI turn (if applicable)
    conversation_id?: string  // Parent conversation
    target_element?: string   // UI element interacted with
    action_value?: any        // Action-specific value
    // Custom properties...
  }
}

// User action types
type ActionType = 
  | 'vote_up'           // Thumbs up
  | 'vote_down'         // Thumbs down
  | 'copy'              // Copy content
  | 'edit'              // Edit AI response
  | 'regenerate'        // Request new response
  | 'cancel'            // Cancel ongoing request
  | 'share'             // Share content
  | 'bookmark'          // Save/bookmark
  | 'expand'            // Expand content
  | 'collapse'          // Collapse content
  | 'custom_action'     // App-specific action

// Example usage
bilan.track('user_action', {
  action_type: 'vote_up',
  turn_id: 'turn_12345',
  conversation_id: 'conv_abcde',
  target_element: 'response_feedback_button',
  action_value: 1
})
```

#### `vote_cast`
Triggered when users provide explicit feedback (backward compatibility).

```typescript
interface VoteCastEvent extends BilanEvent {
  event_type: 'vote_cast'
  properties: {
    prompt_id?: string        // Legacy prompt identifier
    turn_id?: string          // Related AI turn
    conversation_id?: string  // Parent conversation
    value: 1 | -1            // Vote value (1 = positive, -1 = negative)
    comment?: string         // User comment
    vote_type?: 'explicit' | 'implicit' // How vote was captured
    // Custom properties...
  }
}

// Example usage
bilan.track('vote_cast', {
  turn_id: 'turn_12345',
  value: 1,
  comment: 'This helped me solve my CSS problem!',
  vote_type: 'explicit'
})
```

### Conversation Events

#### `conversation_started`
Triggered when a multi-turn conversation begins.

```typescript
interface ConversationStartedEvent extends BilanEvent {
  event_type: 'conversation_started'
  properties: {
    conversation_id: string   // Unique conversation identifier
    conversation_type?: string // Type of conversation
    initial_context?: string  // Starting context
    user_intent?: string      // User's initial intent
    // Custom properties...
  }
}

// Example usage
bilan.track('conversation_started', {
  conversation_id: 'conv_abcde',
  conversation_type: 'code_review',
  initial_context: 'debugging_session',
  user_intent: 'fix_bug'
})
```

#### `conversation_ended`
Triggered when a conversation concludes.

```typescript
interface ConversationEndedEvent extends BilanEvent {
  event_type: 'conversation_ended'
  properties: {
    conversation_id: string   // Matching conversation_started event
    outcome: 'completed' | 'abandoned' | 'timeout' // How conversation ended
    turn_count: number        // Number of turns in conversation
    duration: number          // Conversation duration in seconds
    success_indicator?: boolean // Whether user achieved their goal
    // Custom properties...
  }
}

// Example usage
bilan.track('conversation_ended', {
  conversation_id: 'conv_abcde',
  outcome: 'completed',
  turn_count: 5,
  duration: 180,
  success_indicator: true
})
```

### Journey Events

#### `journey_step`
Triggered when users progress through workflow steps.

```typescript
interface JourneyStepEvent extends BilanEvent {
  event_type: 'journey_step'
  properties: {
    journey_id: string        // Unique journey identifier
    journey_name: string      // Name of the journey
    step_name: string         // Current step name
    step_order?: number       // Step position in journey
    step_category?: string    // Step categorization
    previous_step?: string    // Previous step name
    time_since_last_step?: number // Time since last step (seconds)
    // Custom properties...
  }
}

// Example usage
bilan.track('journey_step', {
  journey_id: 'journey_xyz',
  journey_name: 'email_generation',
  step_name: 'draft_created',
  step_order: 2,
  step_category: 'content_creation',
  previous_step: 'topic_selected',
  time_since_last_step: 45
})
```

#### `journey_completed`
Triggered when a user completes an entire journey.

```typescript
interface JourneyCompletedEvent extends BilanEvent {
  event_type: 'journey_completed'
  properties: {
    journey_id: string        // Matching journey_step events
    journey_name: string      // Name of completed journey
    total_steps: number       // Number of steps completed
    total_duration: number    // Total time spent (seconds)
    completion_rate: number   // Percentage of steps completed
    success_indicator?: boolean // Whether journey was successful
    // Custom properties...
  }
}

// Example usage
bilan.track('journey_completed', {
  journey_id: 'journey_xyz',
  journey_name: 'email_generation',
  total_steps: 5,
  total_duration: 300,
  completion_rate: 1.0,
  success_indicator: true
})
```

### Custom Events

#### `custom_event`
Flexible event type for application-specific tracking.

```typescript
interface CustomEvent extends BilanEvent {
  event_type: 'custom_event'
  properties: {
    custom_type: string       // Application-specific event type
    category?: string         // Event category
    label?: string           // Event label
    value?: any              // Event value
    // Unlimited custom properties...
  }
}

// Example usage
bilan.track('custom_event', {
  custom_type: 'feature_usage',
  category: 'ui_interaction',
  label: 'sidebar_toggle',
  value: 'expanded',
  feature_name: 'chat_history',
  user_experience_rating: 4
})
```

## Privacy Controls

### Content Capture Configuration

```typescript
interface PrivacyConfig {
  // Global content capture settings
  capturePrompts: boolean        // default: true
  captureResponses: boolean      // default: false
  
  // Selective response capture
  captureResponsesFor: string[]  // Categories to capture responses for
  
  // Data retention
  contentRetentionDays: number   // default: 30
  
  // Privacy protection
  hashSensitiveData: boolean     // default: true
  sanitizeContent: boolean       // default: true
  
  // PII detection patterns
  piiPatterns: RegExp[]         // Custom PII patterns to sanitize
}

// Example configuration
const privacyConfig: PrivacyConfig = {
  capturePrompts: true,
  captureResponses: false,
  captureResponsesFor: ['code_generation', 'documentation', 'safe_content'],
  contentRetentionDays: 30,
  hashSensitiveData: true,
  sanitizeContent: true,
  piiPatterns: [
    /\b[\w\.-]+@[\w\.-]+\.\w+\b/g,  // Email addresses
    /\b\d{3}-\d{3}-\d{4}\b/g,       // Phone numbers
    /\b\d{4}\s\d{4}\s\d{4}\s\d{4}\b/g // Credit card numbers
  ]
}
```

### Content Sanitization

```typescript
// Automatic content sanitization
function sanitizeContent(content: string, config: PrivacyConfig): string {
  let sanitized = content
  
  // Apply PII patterns
  config.piiPatterns.forEach(pattern => {
    sanitized = sanitized.replace(pattern, '[REDACTED]')
  })
  
  // Hash sensitive data if enabled
  if (config.hashSensitiveData) {
    // Apply hashing to detected sensitive content
    sanitized = applySensitiveDataHashing(sanitized)
  }
  
  return sanitized
}

// Selective content capture
function shouldCaptureContent(
  contentType: 'prompt' | 'response',
  context: string,
  config: PrivacyConfig
): boolean {
  if (contentType === 'prompt') {
    return config.capturePrompts
  }
  
  if (contentType === 'response') {
    if (!config.captureResponses) return false
    
    // Check selective capture list
    return config.captureResponsesFor.includes(context)
  }
  
  return false
}
```

## Error Classification System

### Automatic Error Detection

```typescript
class ErrorClassifier {
  static classifyError(error: Error): ErrorType {
    const message = error.message.toLowerCase()
    
    // Timeout detection
    if (message.includes('timeout') || message.includes('timed out')) {
      return 'timeout'
    }
    
    // Rate limiting
    if (message.includes('429') || message.includes('rate limit')) {
      return 'rate_limit'
    }
    
    // Quota exceeded
    if (message.includes('quota') || message.includes('billing')) {
      return 'quota_exceeded'
    }
    
    // Context length
    if (message.includes('context') || message.includes('token limit')) {
      return 'context_limit'
    }
    
    // Network errors
    if (message.includes('network') || message.includes('connection')) {
      return 'network_error'
    }
    
    // Service unavailable
    if (message.includes('503') || message.includes('service unavailable')) {
      return 'service_unavailable'
    }
    
    // Authentication
    if (message.includes('401') || message.includes('unauthorized')) {
      return 'authentication'
    }
    
    return 'unknown_error'
  }
  
  static getErrorContext(error: Error): Record<string, any> {
    return {
      error_name: error.name,
      error_message: error.message,
      error_stack: error.stack?.split('\n')[0], // First line only
      classification: this.classifyError(error)
    }
  }
}
```

## Event Processing Pipeline

### Event Validation

```typescript
interface EventValidator {
  validateEvent(event: BilanEvent): ValidationResult
  validateProperties(properties: Record<string, any>): ValidationResult
  sanitizeEvent(event: BilanEvent): BilanEvent
}

interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

// Example validation
const validator: EventValidator = {
  validateEvent(event: BilanEvent): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []
    
    // Required fields
    if (!event.event_id) errors.push('event_id is required')
    if (!event.user_id) errors.push('user_id is required')
    if (!event.event_type) errors.push('event_type is required')
    if (!event.timestamp) errors.push('timestamp is required')
    
    // Event type validation
    if (!VALID_EVENT_TYPES.includes(event.event_type)) {
      errors.push(`Invalid event_type: ${event.event_type}`)
    }
    
    // Properties validation
    if (event.properties) {
      const propValidation = this.validateProperties(event.properties)
      errors.push(...propValidation.errors)
      warnings.push(...propValidation.warnings)
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings
    }
  },
  
  validateProperties(properties: Record<string, any>): ValidationResult {
    const errors: string[] = []
    const warnings: string[] = []
    
    // Check for required properties based on event type
    // Add specific validation logic...
    
    return { isValid: errors.length === 0, errors, warnings }
  },
  
  sanitizeEvent(event: BilanEvent): BilanEvent {
    // Apply privacy controls and sanitization
    return {
      ...event,
      prompt_text: event.prompt_text ? sanitizeContent(event.prompt_text, privacyConfig) : undefined,
      ai_response: event.ai_response ? sanitizeContent(event.ai_response, privacyConfig) : undefined
    }
  }
}
```

### Event Ingestion

```typescript
class EventIngestionPipeline {
  async ingest(events: BilanEvent[]): Promise<IngestionResult> {
    const results: IngestionResult = {
      accepted: 0,
      rejected: 0,
      errors: []
    }
    
    for (const event of events) {
      try {
        // Validate event
        const validation = validator.validateEvent(event)
        if (!validation.isValid) {
          results.rejected++
          results.errors.push(...validation.errors)
          continue
        }
        
        // Sanitize event
        const sanitizedEvent = validator.sanitizeEvent(event)
        
        // Store in database
        await this.storeEvent(sanitizedEvent)
        results.accepted++
        
      } catch (error) {
        results.rejected++
        results.errors.push(error.message)
      }
    }
    
    return results
  }
  
  private async storeEvent(event: BilanEvent): Promise<void> {
    // Database insertion logic
    await db.query(`
      INSERT INTO events (event_id, user_id, event_type, timestamp, properties, prompt_text, ai_response)
      VALUES ($1, $2, $3::event_type_enum, $4, $5, $6, $7)
    `, [
      event.event_id,
      event.user_id,
      event.event_type,
      event.timestamp,
      JSON.stringify(event.properties),
      event.prompt_text,
      event.ai_response
    ])
  }
}

interface IngestionResult {
  accepted: number
  rejected: number
  errors: string[]
}
```

## Performance Optimizations

### Batch Processing

```typescript
class EventBatcher {
  private batch: BilanEvent[] = []
  private batchSize: number = 10
  private flushInterval: number = 5000 // 5 seconds
  private timer: NodeJS.Timeout | null = null
  
  addEvent(event: BilanEvent): void {
    this.batch.push(event)
    
    if (this.batch.length >= this.batchSize) {
      this.flush()
    } else if (!this.timer) {
      this.timer = setTimeout(() => this.flush(), this.flushInterval)
    }
  }
  
  private async flush(): Promise<void> {
    if (this.batch.length === 0) return
    
    const events = [...this.batch]
    this.batch = []
    
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
    
    await this.ingestionPipeline.ingest(events)
  }
}
```

### Database Indexing Strategy

```sql
-- Core performance indexes
CREATE INDEX CONCURRENTLY idx_events_user_timestamp 
ON events (user_id, timestamp DESC);

CREATE INDEX CONCURRENTLY idx_events_type_timestamp 
ON events (event_type, timestamp DESC);

CREATE INDEX CONCURRENTLY idx_events_properties_gin 
ON events USING GIN (properties);

-- Specialized indexes for common queries
CREATE INDEX CONCURRENTLY idx_events_turn_id 
ON events ((properties->>'turn_id'));

CREATE INDEX CONCURRENTLY idx_events_conversation_id 
ON events ((properties->>'conversation_id'));

CREATE INDEX CONCURRENTLY idx_events_journey_id 
ON events ((properties->>'journey_id'));

-- Composite indexes for analytics
CREATE INDEX CONCURRENTLY idx_events_analytics 
ON events (event_type, user_id, timestamp DESC);
```

## Conclusion

This event system design provides the foundation for flexible, privacy-first AI analytics. The unified event schema, comprehensive taxonomy, and robust privacy controls enable:

1. **Unlimited Flexibility** - Any AI interaction pattern can be tracked
2. **Privacy Protection** - Granular control over content capture
3. **Performance Optimization** - Single table with intelligent indexing
4. **Developer Experience** - Intuitive event structure and automatic classification

This design serves as the specification for all implementation teams working on the v0.4.0 transformation. 