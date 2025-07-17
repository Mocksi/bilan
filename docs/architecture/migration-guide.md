# Migration Guide: v0.3.1 to v0.4.0

## Overview

This guide provides a comprehensive migration path from Bilan v0.3.1's conversation-centric architecture to v0.4.0's event-driven analytics system. The migration transforms Bilan from a rigid conversation tracker to a flexible "Google Analytics for AI" platform.

## Migration Timeline

### Phase 1: Foundation (Weeks 1-2)
- Database schema migration
- Core SDK updates
- API endpoint updates

### Phase 2: Features (Weeks 3-4)
- Event processing system
- Dashboard updates
- New analytics features

### Phase 3: Cleanup (Weeks 5-6)
- Deprecation of old endpoints
- Performance optimization
- Documentation updates

## Database Migration

### Schema Changes

#### Before (v0.3.1)
```sql
-- Multiple rigid tables
CREATE TABLE conversations (
  id UUID PRIMARY KEY,
  user_id VARCHAR(255),
  status VARCHAR(50),
  title VARCHAR(255),
  created_at TIMESTAMP
);

CREATE TABLE journeys (
  id UUID PRIMARY KEY,
  conversation_id UUID,
  step_name VARCHAR(255),
  completed_at TIMESTAMP
);

CREATE TABLE votes (
  id UUID PRIMARY KEY,
  conversation_id UUID,
  vote_type VARCHAR(10),
  comment TEXT
);
```

#### After (v0.4.0)
```sql
-- Single flexible events table
CREATE TABLE events (
  id UUID PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  properties JSONB NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Optimized indexes for event-driven queries
CREATE INDEX idx_events_user_type_time ON events(user_id, event_type, timestamp);
CREATE INDEX idx_events_type_time ON events(event_type, timestamp);
CREATE INDEX idx_events_properties ON events USING GIN(properties);
```

### Migration Script

```sql
-- Step 1: Create new events table
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR(255) NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  timestamp TIMESTAMP NOT NULL,
  properties JSONB NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Step 2: Migrate conversations to events
INSERT INTO events (user_id, event_type, timestamp, properties, metadata)
SELECT 
  user_id,
  'conversation_started',
  created_at,
  jsonb_build_object(
    'conversation_id', id,
    'status', status,
    'title', title
  ),
  jsonb_build_object(
    'migrated_from', 'conversations',
    'original_id', id
  )
FROM conversations;

-- Step 3: Migrate journeys to events
INSERT INTO events (user_id, event_type, timestamp, properties, metadata)
SELECT 
  c.user_id,
  'journey_step',
  j.created_at,
  jsonb_build_object(
    'conversation_id', j.conversation_id,
    'step_name', j.step_name,
    'completed', j.completed_at IS NOT NULL
  ),
  jsonb_build_object(
    'migrated_from', 'journeys',
    'original_id', j.id
  )
FROM journeys j
JOIN conversations c ON j.conversation_id = c.id;

-- Step 4: Migrate votes to events
INSERT INTO events (user_id, event_type, timestamp, properties, metadata)
SELECT 
  c.user_id,
  'vote',
  v.created_at,
  jsonb_build_object(
    'conversation_id', v.conversation_id,
    'vote_type', v.vote_type,
    'comment', v.comment,
    'value', CASE WHEN v.vote_type = 'up' THEN 1 ELSE -1 END
  ),
  jsonb_build_object(
    'migrated_from', 'votes',
    'original_id', v.id
  )
FROM votes v
JOIN conversations c ON v.conversation_id = c.id;

-- Step 5: Create indexes for performance
CREATE INDEX idx_events_user_type_time ON events(user_id, event_type, timestamp);
CREATE INDEX idx_events_type_time ON events(event_type, timestamp);
CREATE INDEX idx_events_properties ON events USING GIN(properties);
CREATE INDEX idx_events_metadata ON events USING GIN(metadata);
```

## SDK Migration

### Before (v0.3.1) - Conversation-Centric

```typescript
import { Bilan } from '@mocksi/bilan-sdk';

const bilan = new Bilan({
  apiKey: 'your-api-key',
  projectId: 'your-project'
});

// Start conversation
const conversation = await bilan.conversations.start({
  userId: 'user-123',
  title: 'Customer Support Chat'
});

// Track journey steps
await bilan.journeys.step({
  conversationId: conversation.id,
  stepName: 'initial_inquiry',
  metadata: { category: 'support' }
});

// Record vote
await bilan.votes.record({
  conversationId: conversation.id,
  voteType: 'up',
  comment: 'Helpful response'
});
```

### After (v0.4.0) - Event-Driven

```typescript
import { Bilan } from '@mocksi/bilan-sdk';

const bilan = new Bilan({
  apiKey: 'your-api-key',
  projectId: 'your-project'
});

// Single event tracking method
await bilan.track('conversation_started', {
  userId: 'user-123',
  conversation_id: 'conv-456',
  title: 'Customer Support Chat'
});

await bilan.track('journey_step', {
  userId: 'user-123',
  conversation_id: 'conv-456',
  step_name: 'initial_inquiry',
  metadata: { category: 'support' }
});

await bilan.track('vote', {
  userId: 'user-123',
  conversation_id: 'conv-456',
  vote_type: 'up',
  value: 1,
  comment: 'Helpful response'
});
```

### Migration Helper

```typescript
import { v4 as generateId } from 'uuid';

// Migration wrapper for backward compatibility
export class BilanMigrationWrapper {
  private bilan: Bilan;
  private migrationMode: boolean;

  constructor(config: BilanConfig) {
    this.bilan = new Bilan(config);
    this.migrationMode = config.migrationMode || false;
  }

  // Legacy conversation API
  get conversations() {
    return {
      start: async (data: ConversationStartData) => {
        const eventData = {
          userId: data.userId,
          conversation_id: data.conversationId || generateId(),
          title: data.title,
          ...data.metadata
        };
        
        await this.bilan.track('conversation_started', eventData);
        return { id: eventData.conversation_id };
      },
      
      end: async (conversationId: string) => {
        await this.bilan.track('conversation_ended', {
          conversation_id: conversationId
        });
      }
    };
  }

  // Legacy journey API
  get journeys() {
    return {
      step: async (data: JourneyStepData) => {
        await this.bilan.track('journey_step', {
          conversation_id: data.conversationId,
          step_name: data.stepName,
          ...data.metadata
        });
      }
    };
  }

  // Legacy vote API
  get votes() {
    return {
      record: async (data: VoteData) => {
        await this.bilan.track('vote', {
          conversation_id: data.conversationId,
          vote_type: data.voteType,
          value: data.voteType === 'up' ? 1 : -1,
          comment: data.comment
        });
      }
    };
  }
}
```

## API Migration

### Endpoint Changes

#### Before (v0.3.1) - Multiple Endpoints
```
POST /api/conversations
GET  /api/conversations/:id
POST /api/journeys
GET  /api/journeys/:conversationId
POST /api/votes
GET  /api/votes/:conversationId
```

#### After (v0.4.0) - Unified Endpoint
```
POST /api/events          # Single event ingestion
GET  /api/analytics       # Flexible analytics queries
GET  /api/events/:id      # Individual event lookup
```

### Request Format Migration

#### Before (v0.3.1)
```typescript
// Multiple endpoint calls
await fetch('/api/conversations', {
  method: 'POST',
  body: JSON.stringify({
    userId: 'user-123',
    title: 'Support Chat'
  })
});

await fetch('/api/journeys', {
  method: 'POST',
  body: JSON.stringify({
    conversationId: 'conv-456',
    stepName: 'initial_inquiry'
  })
});
```

#### After (v0.4.0)
```typescript
// Single unified endpoint
await fetch('/api/events', {
  method: 'POST',
  body: JSON.stringify({
    events: [
      {
        event_type: 'conversation_started',
        user_id: 'user-123',
        properties: {
          conversation_id: 'conv-456',
          title: 'Support Chat'
        }
      },
      {
        event_type: 'journey_step',
        user_id: 'user-123',
        properties: {
          conversation_id: 'conv-456',
          step_name: 'initial_inquiry'
        }
      }
    ]
  })
});
```

### Response Format Migration

#### Before (v0.3.1)
```typescript
interface ConversationResponse {
  id: string;
  userId: string;
  status: string;
  createdAt: string;
}

interface JourneyResponse {
  id: string;
  conversationId: string;
  stepName: string;
  completedAt?: string;
}
```

#### After (v0.4.0)
```typescript
interface EventResponse {
  success: boolean;
  events_processed: number;
  errors?: Array<{
    event_index: number;
    error: string;
  }>;
}

interface AnalyticsResponse {
  query: string;
  results: Array<{
    event_type: string;
    count: number;
    properties: Record<string, any>;
  }>;
  metadata: {
    total_events: number;
    time_range: [string, string];
  };
}
```

## Dashboard Migration

### Component Updates

#### Before (v0.3.1) - Fixed Components
```typescript
// Rigid conversation-focused components
<ConversationTable conversations={conversations} />
<JourneyFlow journeys={journeys} />
<VotesSummary votes={votes} />
```

#### After (v0.4.0) - Dynamic Components
```typescript
// Flexible event-driven components
<EventsTable 
  events={events} 
  columns={['event_type', 'user_id', 'timestamp']}
  filters={{ event_type: 'conversation_started' }}
/>

<AnalyticsChart 
  query="SELECT event_type, COUNT(*) FROM events GROUP BY event_type"
  chartType="bar"
/>

<CustomDashboard 
  widgets={[
    { type: 'metric', query: 'user_engagement' },
    { type: 'chart', query: 'conversion_funnel' },
    { type: 'table', query: 'recent_events' }
  ]}
/>
```

### Query Migration

#### Before (v0.3.1)
```typescript
// Fixed queries for specific tables
const conversations = await api.get('/conversations', {
  params: { userId: 'user-123', status: 'active' }
});

const journeys = await api.get('/journeys', {
  params: { conversationId: 'conv-456' }
});
```

#### After (v0.4.0)
```typescript
// Flexible event queries
const events = await api.get('/analytics', {
  params: {
    query: {
      event_type: 'conversation_started',
      user_id: 'user-123',
      'properties.status': 'active'
    },
    time_range: ['2024-01-01', '2024-01-31']
  }
});
```

## Backward Compatibility

### Deprecation Timeline

#### Immediate (v0.4.0 Release)
- New event-driven API available
- Legacy APIs marked as deprecated
- Migration wrapper provided

#### 3 Months After Release
- Warning logs for legacy API usage
- Performance optimizations for new API

#### 6 Months After Release
- Legacy APIs return deprecation errors
- Migration required for continued service

### Compatibility Layer

```typescript
// Compatibility middleware for legacy endpoints
export const legacyCompatibility = {
  '/api/conversations': async (req, res) => {
    console.warn('Legacy API usage detected. Please migrate to /api/events');
    
    const eventData = {
      event_type: 'conversation_started',
      user_id: req.body.userId,
      properties: {
        conversation_id: generateId(),
        title: req.body.title,
        status: req.body.status || 'active'
      }
    };
    
    await eventsService.track(eventData);
    res.json({ id: eventData.properties.conversation_id });
  },
  
  '/api/journeys': async (req, res) => {
    console.warn('Legacy API usage detected. Please migrate to /api/events');
    
    const eventData = {
      event_type: 'journey_step',
      user_id: req.body.userId,
      properties: {
        conversation_id: req.body.conversationId,
        step_name: req.body.stepName,
        metadata: req.body.metadata
      }
    };
    
    await eventsService.track(eventData);
    res.json({ success: true });
  }
};
```

## Testing Migration

### Unit Tests

```typescript
describe('Migration Compatibility', () => {
  it('should handle legacy conversation API', async () => {
    const wrapper = new BilanMigrationWrapper({
      apiKey: 'test-key',
      migrationMode: true
    });
    
    const conversation = await wrapper.conversations.start({
      userId: 'user-123',
      title: 'Test Conversation'
    });
    
    expect(conversation.id).toBeDefined();
    expect(mockBilan.track).toHaveBeenCalledWith('conversation_started', {
      userId: 'user-123',
      conversation_id: conversation.id,
      title: 'Test Conversation'
    });
  });
});
```

### Integration Tests

```typescript
describe('API Migration', () => {
  it('should migrate conversation creation to events', async () => {
    const response = await request(app)
      .post('/api/conversations')
      .send({
        userId: 'user-123',
        title: 'Test Conversation'
      });
    
    expect(response.status).toBe(200);
    expect(response.body.id).toBeDefined();
    
    // Verify event was created
    const events = await db.events.findMany({
      where: { event_type: 'conversation_started' }
    });
    
    expect(events).toHaveLength(1);
    expect(events[0].properties.title).toBe('Test Conversation');
  });
});
```

## Performance Considerations

### Expected Improvements

- **Query Performance**: 50% faster with optimized event indexes
- **API Response Time**: <20ms P99 (improved from 35ms)
- **Dashboard Load Time**: <2s (improved from 4s)
- **Memory Usage**: 30% reduction with unified schema

### Monitoring

```typescript
// Performance monitoring during migration
const migrationMetrics = {
  legacyApiUsage: counter('legacy_api_calls_total'),
  eventProcessingTime: histogram('event_processing_duration_seconds'),
  migrationErrors: counter('migration_errors_total')
};

// Track migration progress
app.use('/api/legacy/*', (req, res, next) => {
  migrationMetrics.legacyApiUsage.inc();
  next();
});
```

## Rollback Plan

### Emergency Rollback

1. **Immediate**: Switch traffic back to legacy endpoints
2. **Database**: Restore from pre-migration backup
3. **Frontend**: Deploy previous dashboard version
4. **Monitoring**: Activate legacy monitoring dashboards

### Rollback Script

```bash
#!/bin/bash
# rollback-v0.4.0.sh

echo "Rolling back to v0.3.1..."

# 1. Stop new services
docker-compose down

# 2. Restore database
pg_restore --clean --if-exists -d bilan_db backup_v0.3.1.sql

# 3. Deploy legacy services
docker-compose -f docker-compose.v0.3.1.yml up -d

# 4. Verify rollback
curl -f http://localhost:3000/api/health || exit 1

echo "Rollback completed successfully"
```

## Support and Troubleshooting

### Common Issues

1. **Event Schema Validation Errors**
   - Check event_type is valid
   - Verify properties match expected schema
   - Ensure required fields are present

2. **Performance Degradation**
   - Monitor event table size
   - Check index usage
   - Optimize JSONB queries

3. **Missing Data After Migration**
   - Verify migration script completed
   - Check event metadata for source mapping
   - Run data integrity checks

### Getting Help

- **Documentation**: `/docs/architecture/`
- **Migration Support**: `migration-help@mocksi.com`
- **Emergency Contact**: `emergency@mocksi.com`
- **Slack Channel**: `#bilan-v0.4.0-migration`

## Conclusion

The v0.3.1 to v0.4.0 migration transforms Bilan from a conversation-centric tracker to a flexible event-driven analytics platform. Following this guide ensures a smooth transition while maintaining backward compatibility and system reliability.

Key success factors:
- Thorough testing of migration scripts
- Gradual rollout with monitoring
- Team training on new APIs
- Comprehensive rollback planning

The migration enables Bilan to become the "Google Analytics for AI" with flexible event tracking, real-time analytics, and unlimited customization possibilities. 