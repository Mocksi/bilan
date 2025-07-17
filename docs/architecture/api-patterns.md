# Bilan v0.4.0: API Patterns & Design

## Overview

This document defines the API patterns for Bilan v0.4.0's unified event system. The transformation from multiple specialized endpoints to a flexible event-driven API enables infinite customization while maintaining backward compatibility and exceptional performance.

## Core API Design Principles

### 1. **Unified Event Ingestion**
- Single endpoint for all event types
- Batch processing for performance
- Consistent request/response format
- Automatic validation and sanitization

### 2. **Dynamic Analytics**
- Flexible querying without schema changes
- Real-time aggregation and caching
- Custom metric definitions
- Funnel and conversion analysis

### 3. **Backward Compatibility**
- v0.3.x APIs continue to work
- Automatic conversion to events
- Deprecation warnings for migration
- Gradual migration path

### 4. **Performance & Security**
- <20ms P99 response times
- Authentication and rate limiting
- Input validation and sanitization
- Efficient database queries

## Event Ingestion API

### POST /api/events

**Purpose**: Unified endpoint for ingesting all event types

**Request Format**:
```typescript
interface EventIngestionRequest {
  events: {
    eventType: string
    timestamp: number
    properties: Record<string, any>
    promptText?: string
    aiResponse?: string
  }[]
}
```

**Response Format**:
```typescript
interface EventIngestionResponse {
  success: boolean
  data: {
    accepted: number
    rejected: number
    processed_at: number
  }
  errors?: {
    code: string
    message: string
    event_index?: number
  }[]
}
```

**Example Request**:
```bash
curl -X POST https://api.bilan.dev/api/events \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-api-key" \
  -d '{
    "events": [
      {
        "eventType": "turn_started",
        "timestamp": 1703123456789,
        "properties": {
          "turn_id": "turn_12345",
          "model_used": "gpt-4",
          "user_id": "user_456",
          "conversation_id": "conv_abc",
          "user_intent": "code_generation"
        },
        "promptText": "How do I center a div in CSS?"
      },
      {
        "eventType": "turn_completed",
        "timestamp": 1703123458000,
        "properties": {
          "turn_id": "turn_12345",
          "status": "success",
          "response_time": 1.2,
          "output_tokens": 200,
          "user_id": "user_456"
        },
        "aiResponse": "Use flexbox with justify-content: center..."
      }
    ]
  }'
```

**Example Response**:
```json
{
  "success": true,
  "data": {
    "accepted": 2,
    "rejected": 0,
    "processed_at": 1703123459000
  }
}
```

### Event Validation Rules

```typescript
interface EventValidationRules {
  required: string[]
  optional: string[]
  propertyValidation: Record<string, ValidationRule>
}

const eventValidationRules: Record<string, EventValidationRules> = {
  turn_started: {
    required: ['turn_id', 'user_id'],
    optional: ['model_used', 'conversation_id', 'user_intent'],
    propertyValidation: {
      turn_id: { type: 'string', pattern: /^turn_[a-zA-Z0-9]+$/ },
      user_id: { type: 'string', minLength: 1 },
      model_used: { type: 'string', enum: ['gpt-4', 'gpt-3.5-turbo', 'claude-3'] },
      response_time: { type: 'number', min: 0, max: 300 }
    }
  },
  turn_completed: {
    required: ['turn_id', 'status', 'response_time', 'user_id'],
    optional: ['output_tokens', 'model_used', 'quality_score'],
    propertyValidation: {
      turn_id: { type: 'string', pattern: /^turn_[a-zA-Z0-9]+$/ },
      status: { type: 'string', enum: ['success'] },
      response_time: { type: 'number', min: 0, max: 300 },
      output_tokens: { type: 'number', min: 0 }
    }
  }
  // ... other event types
}
```

### Error Handling

```typescript
interface ApiError {
  code: string
  message: string
  details?: Record<string, any>
  event_index?: number
}

const errorCodes = {
  // Validation errors
  INVALID_EVENT_TYPE: 'Event type is not supported',
  MISSING_REQUIRED_PROPERTY: 'Required property is missing',
  INVALID_PROPERTY_VALUE: 'Property value is invalid',
  INVALID_TIMESTAMP: 'Timestamp is invalid or too old',
  
  // Content errors
  CONTENT_TOO_LARGE: 'Event content exceeds size limit',
  INVALID_CONTENT_TYPE: 'Content type is not supported',
  
  // Authentication errors
  INVALID_API_KEY: 'API key is invalid or expired',
  INSUFFICIENT_PERMISSIONS: 'API key lacks required permissions',
  
  // Rate limiting
  RATE_LIMIT_EXCEEDED: 'Request rate limit exceeded',
  
  // Server errors
  INTERNAL_ERROR: 'Internal server error occurred',
  DATABASE_ERROR: 'Database operation failed'
}
```

## Dynamic Analytics API

### GET /api/analytics/events

**Purpose**: Flexible event querying and filtering

**Query Parameters**:
```typescript
interface EventQueryParams {
  // Event filtering
  eventType?: string | string[]
  userId?: string | string[]
  timeRange?: string | { start: number, end: number }
  
  // Property filtering
  properties?: Record<string, any>
  
  // Aggregation
  groupBy?: string | string[]
  aggregation?: 'count' | 'unique_users' | 'sum' | 'avg' | 'min' | 'max'
  
  // Sorting and pagination
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  limit?: number
  offset?: number
  
  // Output format
  format?: 'json' | 'csv' | 'metrics'
}
```

**Example Queries**:

```bash
# Get all turn failures grouped by error type
curl "https://api.bilan.dev/api/analytics/events?eventType=turn_failed&groupBy=properties.error_type&aggregation=count&timeRange=7d"

# Get response times for specific user
curl "https://api.bilan.dev/api/analytics/events?eventType=turn_completed&userId=user_123&timeRange=24h&format=metrics"

# Get conversation success rates
curl "https://api.bilan.dev/api/analytics/events?eventType=conversation_ended&groupBy=properties.outcome&aggregation=count"
```

**Response Format**:
```typescript
interface EventQueryResponse {
  success: boolean
  data: {
    events?: Event[]
    metrics?: Record<string, number>
    aggregations?: {
      [groupKey: string]: {
        count: number
        value: any
      }
    }
    pagination?: {
      total: number
      limit: number
      offset: number
      has_more: boolean
    }
  }
  query_info: {
    processed_events: number
    query_time_ms: number
    cached: boolean
  }
}
```

### GET /api/analytics/metrics

**Purpose**: Calculate custom metrics and KPIs

**Query Parameters**:
```typescript
interface MetricQueryParams {
  // Metric definition
  metric: string | MetricDefinition
  
  // Time filtering
  timeRange?: string | { start: number, end: number }
  
  // Grouping and segmentation
  groupBy?: string | string[]
  filters?: Record<string, any>
  
  // Comparison
  compareWith?: string | { start: number, end: number }
  
  // Output options
  includeBreakdown?: boolean
  format?: 'json' | 'time_series'
}

interface MetricDefinition {
  name: string
  type: 'count' | 'rate' | 'average' | 'sum' | 'funnel' | 'custom'
  events: string[]
  numerator?: string[]
  denominator?: string[]
  calculation?: string // Custom calculation formula
  filters?: Record<string, any>
}
```

**Predefined Metrics**:
```typescript
const predefinedMetrics = {
  ai_success_rate: {
    name: 'AI Success Rate',
    type: 'rate',
    numerator: ['turn_completed'],
    denominator: ['turn_started'],
    description: 'Percentage of AI requests that complete successfully'
  },
  
  average_response_time: {
    name: 'Average Response Time',
    type: 'average',
    events: ['turn_completed'],
    field: 'properties.response_time',
    description: 'Average time for AI responses in seconds'
  },
  
  conversation_completion_rate: {
    name: 'Conversation Completion Rate',
    type: 'rate',
    numerator: ['conversation_ended'],
    denominator: ['conversation_started'],
    filters: { 'properties.outcome': 'completed' },
    description: 'Percentage of conversations that complete successfully'
  },
  
  error_rate_by_type: {
    name: 'Error Rate by Type',
    type: 'count',
    events: ['turn_failed'],
    groupBy: 'properties.error_type',
    description: 'Count of errors grouped by error type'
  }
}
```

**Example Requests**:

```bash
# Get AI success rate for last 7 days
curl "https://api.bilan.dev/api/analytics/metrics?metric=ai_success_rate&timeRange=7d"

# Get response time trends grouped by model
curl "https://api.bilan.dev/api/analytics/metrics?metric=average_response_time&groupBy=properties.model_used&timeRange=30d&format=time_series"

# Custom metric: User engagement score
curl -X POST "https://api.bilan.dev/api/analytics/metrics" \
  -H "Content-Type: application/json" \
  -d '{
    "metric": {
      "name": "User Engagement Score",
      "type": "custom",
      "calculation": "(user_actions * 0.3) + (conversations * 0.5) + (positive_votes * 0.2)",
      "events": ["user_action", "conversation_started", "vote_cast"],
      "filters": {"properties.value": 1}
    },
    "timeRange": "7d",
    "groupBy": "user_id"
  }'
```

### GET /api/analytics/funnels

**Purpose**: Analyze conversion funnels and user journeys

**Query Parameters**:
```typescript
interface FunnelQueryParams {
  // Funnel definition
  events: string[]
  
  // Time constraints
  timeRange?: string | { start: number, end: number }
  timeWindow?: number // Max time between steps (seconds)
  
  // Grouping
  groupBy?: string
  
  // Filtering
  filters?: Record<string, any>
  
  // Options
  includeDropoffs?: boolean
  includeTimings?: boolean
}
```

**Example Requests**:

```bash
# AI interaction funnel
curl "https://api.bilan.dev/api/analytics/funnels?events=turn_started,turn_completed,user_action&timeRange=7d&includeDropoffs=true"

# Conversation journey analysis
curl "https://api.bilan.dev/api/analytics/funnels?events=conversation_started,turn_completed,conversation_ended&groupBy=properties.conversation_type&timeWindow=3600"
```

**Response Format**:
```typescript
interface FunnelResponse {
  success: boolean
  data: {
    funnel_steps: {
      event_type: string
      count: number
      conversion_rate: number
      drop_off_rate: number
      average_time_to_next?: number
    }[]
    overall_conversion: number
    dropoff_analysis?: {
      [stepIndex: number]: {
        common_dropoff_reasons: string[]
        dropoff_count: number
      }
    }
  }
}
```

## Backward Compatibility Layer

### Legacy API Endpoints

#### POST /api/conversations (v0.3.x compatibility)

```typescript
// Legacy endpoint implementation
app.post('/api/conversations', async (req, res) => {
  const { userId } = req.body
  
  // Generate conversation ID
  const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  
  // Convert to event
  const event = {
    eventType: 'conversation_started',
    timestamp: Date.now(),
    properties: {
      conversation_id: conversationId,
      user_id: userId,
      // Legacy compatibility flags
      _legacy_api: true,
      _migration_source: 'v0.3.x'
    }
  }
  
  // Ingest via new event system
  await ingestEvents([event])
  
  // Return legacy format
  res.json({ conversationId })
})
```

#### POST /api/vote (v0.3.x compatibility)

```typescript
app.post('/api/vote', async (req, res) => {
  const { promptId, value, comment, userId } = req.body
  
  // Convert to event
  const event = {
    eventType: 'vote_cast',
    timestamp: Date.now(),
    properties: {
      prompt_id: promptId,
      value: value,
      comment: comment,
      user_id: userId,
      vote_type: 'explicit',
      _legacy_api: true,
      _migration_source: 'v0.3.x'
    }
  }
  
  // Ingest via new event system
  await ingestEvents([event])
  
  // Return legacy format
  res.json({ success: true })
})
```

### Migration Detection

```typescript
interface MigrationDetector {
  detectLegacyUsage(events: Event[]): LegacyUsageReport
  generateMigrationSuggestions(usage: LegacyUsageReport): MigrationSuggestion[]
}

interface LegacyUsageReport {
  legacy_api_calls: number
  migration_opportunities: {
    endpoint: string
    usage_count: number
    suggested_migration: string
  }[]
  estimated_migration_effort: 'low' | 'medium' | 'high'
}

interface MigrationSuggestion {
  current_usage: string
  suggested_pattern: string
  example_code: string
  benefits: string[]
}
```

## Performance Optimization

### Response Caching

```typescript
interface CacheStrategy {
  // Event queries
  event_queries: {
    ttl: number
    key_pattern: string
    invalidation_triggers: string[]
  }
  
  // Metrics
  metrics: {
    ttl: number
    key_pattern: string
    background_refresh: boolean
  }
  
  // Funnels
  funnels: {
    ttl: number
    key_pattern: string
    precompute_common: boolean
  }
}

const cacheStrategy: CacheStrategy = {
  event_queries: {
    ttl: 300, // 5 minutes
    key_pattern: 'events:{hash}',
    invalidation_triggers: ['new_events_ingested']
  },
  
  metrics: {
    ttl: 900, // 15 minutes
    key_pattern: 'metrics:{metric_name}:{time_range}:{filters_hash}',
    background_refresh: true
  },
  
  funnels: {
    ttl: 1800, // 30 minutes
    key_pattern: 'funnels:{events_hash}:{filters_hash}',
    precompute_common: true
  }
}
```

### Database Query Optimization

```typescript
// Optimized query patterns
const queryPatterns = {
  event_filtering: `
    SELECT * FROM events 
    WHERE event_type = $1 
    AND timestamp BETWEEN $2 AND $3
    AND (properties @> $4 OR $4 IS NULL)
    ORDER BY timestamp DESC
    LIMIT $5 OFFSET $6
  `,
  
  metric_calculation: `
    SELECT 
      COUNT(*) as count,
      properties->>'${groupBy}' as group_key
    FROM events 
    WHERE event_type = ANY($1)
    AND timestamp BETWEEN $2 AND $3
    GROUP BY properties->>'${groupBy}'
    ORDER BY count DESC
  `,
  
  funnel_analysis: `
    WITH funnel_events AS (
      SELECT 
        user_id,
        event_type,
        timestamp,
        LAG(event_type) OVER (PARTITION BY user_id ORDER BY timestamp) as prev_event,
        LAG(timestamp) OVER (PARTITION BY user_id ORDER BY timestamp) as prev_timestamp
      FROM events
      WHERE event_type = ANY($1)
      AND timestamp BETWEEN $2 AND $3
    )
    SELECT 
      event_type,
      COUNT(*) as count,
      AVG(timestamp - prev_timestamp) as avg_time_from_prev
    FROM funnel_events
    GROUP BY event_type
    ORDER BY COUNT(*) DESC
  `
}
```

### Rate Limiting

```typescript
interface RateLimitConfig {
  endpoint: string
  limit: number
  window: number // seconds
  burst_limit?: number
  key_generator: (req: Request) => string
}

const rateLimits: RateLimitConfig[] = [
  {
    endpoint: '/api/events',
    limit: 1000, // requests per window
    window: 60, // 1 minute
    burst_limit: 100,
    key_generator: (req) => req.headers.authorization // Per API key
  },
  {
    endpoint: '/api/analytics/*',
    limit: 100,
    window: 60,
    burst_limit: 20,
    key_generator: (req) => req.headers.authorization
  }
]
```

## Authentication & Security

### API Key Management

```typescript
interface ApiKeyPermissions {
  events: {
    read: boolean
    write: boolean
    admin: boolean
  }
  analytics: {
    read: boolean
    export: boolean
    custom_metrics: boolean
  }
  users: string[] // Allowed user IDs (empty = all)
}

interface ApiKey {
  key_id: string
  key_hash: string
  permissions: ApiKeyPermissions
  created_at: number
  expires_at?: number
  last_used?: number
  usage_count: number
  rate_limit_override?: number
}
```

### Input Validation & Sanitization

```typescript
class InputValidator {
  static validateEventIngestion(req: EventIngestionRequest): ValidationResult {
    // Validate event structure
    if (!req.events || !Array.isArray(req.events)) {
      return { valid: false, error: 'Events must be an array' }
    }
    
    // Limit batch size
    if (req.events.length > 100) {
      return { valid: false, error: 'Batch size cannot exceed 100 events' }
    }
    
    // Validate each event
    for (const event of req.events) {
      const eventValidation = this.validateEvent(event)
      if (!eventValidation.valid) {
        return eventValidation
      }
    }
    
    return { valid: true }
  }
  
  static sanitizeContent(content: string): string {
    // Remove potential XSS vectors
    const sanitized = content
      .replace(/<script[^>]*>.*?<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '')
    
    // Limit content length
    return sanitized.substring(0, 10000)
  }
}
```

## Monitoring & Observability

### API Metrics

```typescript
interface ApiMetrics {
  requests: {
    total: number
    by_endpoint: Record<string, number>
    by_status: Record<string, number>
  }
  
  response_times: {
    p50: number
    p90: number
    p99: number
  }
  
  errors: {
    total: number
    by_type: Record<string, number>
  }
  
  events: {
    ingested: number
    rejected: number
    processing_time: number
  }
}
```

### Health Checks

```typescript
interface HealthCheckResult {
  status: 'healthy' | 'degraded' | 'unhealthy'
  checks: {
    database: {
      status: 'ok' | 'error'
      response_time: number
      error?: string
    }
    cache: {
      status: 'ok' | 'error'
      response_time: number
      error?: string
    }
    event_processing: {
      status: 'ok' | 'error'
      queue_size: number
      processing_rate: number
    }
  }
  uptime: number
  version: string
}

// GET /health
app.get('/health', async (req, res) => {
  const health = await performHealthChecks()
  const status = health.status === 'healthy' ? 200 : 503
  res.status(status).json(health)
})
```

## Error Responses

### Standardized Error Format

```typescript
interface ApiErrorResponse {
  success: false
  error: {
    code: string
    message: string
    details?: Record<string, any>
    timestamp: number
    request_id: string
  }
  errors?: ApiError[] // For batch operations
}

// Example error responses
const errorExamples = {
  validation_error: {
    success: false,
    error: {
      code: 'VALIDATION_ERROR',
      message: 'Event validation failed',
      details: {
        event_index: 0,
        field: 'properties.turn_id',
        reason: 'Required field is missing'
      },
      timestamp: 1703123456789,
      request_id: 'req_abc123'
    }
  },
  
  rate_limit_error: {
    success: false,
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Request rate limit exceeded',
      details: {
        limit: 1000,
        window: 60,
        retry_after: 45
      },
      timestamp: 1703123456789,
      request_id: 'req_def456'
    }
  }
}
```

## Conclusion

This API design provides a comprehensive, flexible, and performant foundation for Bilan v0.4.0. The unified event ingestion system, dynamic analytics capabilities, and backward compatibility layer ensure:

1. **Effortless Integration** - Single endpoint for all event types
2. **Infinite Flexibility** - Dynamic querying and custom metrics
3. **Smooth Migration** - Backward compatibility with v0.3.x APIs
4. **Production Performance** - Optimized queries, caching, and rate limiting

These patterns serve as the specification for the server API implementation team and provide clear examples for the dashboard and integration teams to follow. 