# Testing Strategy: Event-Driven Architecture

## Executive Summary

This document outlines the comprehensive testing strategy for Bilan's v0.4.0 event-driven architecture transformation. The strategy ensures reliable, secure, and performant delivery of the new analytics platform while maintaining high code quality standards.

## Testing Philosophy

### Core Principles

1. **Test Pyramid**: Unit tests (70%) → Integration tests (20%) → E2E tests (10%)
2. **Shift-Left Testing**: Early testing in development cycle
3. **Event-Driven Testing**: Specialized approaches for event-based systems
4. **Continuous Testing**: Automated testing in CI/CD pipeline
5. **Performance as a Feature**: Performance testing integrated throughout

### Testing Levels

#### Level 1: Unit Tests
- Individual function and class testing
- Event schema validation
- Business logic verification
- Mock external dependencies

#### Level 2: Integration Tests
- API endpoint testing
- Database integration testing
- Event processing pipeline testing
- Third-party service integration

#### Level 3: System Tests
- End-to-end user flows
- Cross-component interaction
- Performance and load testing
- Security penetration testing

#### Level 4: Acceptance Tests
- User acceptance criteria verification
- Business requirement validation
- Migration success verification
- Compliance requirement testing

## Unit Testing Strategy

### Event-Driven Unit Testing

#### Event Schema Testing
```typescript
// Event schema validation tests
describe('Event Schema Validation', () => {
  const eventSchema = new EventSchema();
  
  it('should validate valid conversation_started event', () => {
    const event = {
      event_type: 'conversation_started',
      user_id: 'user-123',
      timestamp: Date.now(),
      properties: {
        conversation_id: 'conv-456',
        title: 'Test Conversation'
      }
    };
    
    const result = eventSchema.validate(event);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
  
  it('should reject event with missing required fields', () => {
    const event = {
      event_type: 'conversation_started',
      // Missing user_id
      timestamp: Date.now(),
      properties: {}
    };
    
    const result = eventSchema.validate(event);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('user_id is required');
  });
  
  it('should reject event with invalid event_type', () => {
    const event = {
      event_type: 'invalid_event',
      user_id: 'user-123',
      timestamp: Date.now(),
      properties: {}
    };
    
    const result = eventSchema.validate(event);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Invalid event_type');
  });
});
```

#### Event Processing Unit Tests
```typescript
// Event processor unit tests
describe('EventProcessor', () => {
  let processor: EventProcessor;
  let mockDatabase: jest.Mocked<Database>;
  let mockValidator: jest.Mocked<EventValidator>;
  
  beforeEach(() => {
    mockDatabase = createMockDatabase();
    mockValidator = createMockValidator();
    processor = new EventProcessor(mockDatabase, mockValidator);
  });
  
  it('should process valid event successfully', async () => {
    const event = createValidEvent();
    mockValidator.validate.mockReturnValue({ isValid: true, errors: [] });
    
    const result = await processor.process(event);
    
    expect(result.success).toBe(true);
    expect(mockDatabase.events.create).toHaveBeenCalledWith(event);
  });
  
  it('should handle validation errors gracefully', async () => {
    const event = createInvalidEvent();
    mockValidator.validate.mockReturnValue({ 
      isValid: false, 
      errors: ['Invalid event_type'] 
    });
    
    const result = await processor.process(event);
    
    expect(result.success).toBe(false);
    expect(result.errors).toContain('Invalid event_type');
    expect(mockDatabase.events.create).not.toHaveBeenCalled();
  });
  
  it('should handle database errors', async () => {
    const event = createValidEvent();
    mockValidator.validate.mockReturnValue({ isValid: true, errors: [] });
    mockDatabase.events.create.mockRejectedValue(new Error('DB Error'));
    
    const result = await processor.process(event);
    
    expect(result.success).toBe(false);
    expect(result.errors).toContain('Database error');
  });
});
```

#### SDK Unit Tests
```typescript
// SDK unit tests
describe('BilanSDK', () => {
  let sdk: BilanSDK;
  let mockApiClient: jest.Mocked<ApiClient>;
  
  beforeEach(() => {
    mockApiClient = createMockApiClient();
    sdk = new BilanSDK({
      apiKey: 'test-key',
      apiClient: mockApiClient
    });
  });
  
  it('should track event successfully', async () => {
    mockApiClient.post.mockResolvedValue({ success: true });
    
    await sdk.track('conversation_started', {
      user_id: 'user-123',
      conversation_id: 'conv-456'
    });
    
    expect(mockApiClient.post).toHaveBeenCalledWith('/events', {
      events: [{
        event_type: 'conversation_started',
        user_id: 'user-123',
        timestamp: expect.any(Number),
        properties: {
          conversation_id: 'conv-456'
        }
      }]
    });
  });
  
  it('should batch events when configured', async () => {
    sdk = new BilanSDK({
      apiKey: 'test-key',
      apiClient: mockApiClient,
      batchSize: 3
    });
    
    // Track multiple events
    await sdk.track('conversation_started', { user_id: 'user-1' });
    await sdk.track('conversation_started', { user_id: 'user-2' });
    
    // Should not send yet
    expect(mockApiClient.post).not.toHaveBeenCalled();
    
    // Third event should trigger batch send
    await sdk.track('conversation_started', { user_id: 'user-3' });
    
    expect(mockApiClient.post).toHaveBeenCalledWith('/events', {
      events: expect.arrayContaining([
        expect.objectContaining({ properties: { user_id: 'user-1' } }),
        expect.objectContaining({ properties: { user_id: 'user-2' } }),
        expect.objectContaining({ properties: { user_id: 'user-3' } })
      ])
    });
  });
});
```

### Analytics Unit Tests
```typescript
// Analytics engine unit tests
describe('AnalyticsEngine', () => {
  let engine: AnalyticsEngine;
  let mockEventStore: jest.Mocked<EventStore>;
  
  beforeEach(() => {
    mockEventStore = createMockEventStore();
    engine = new AnalyticsEngine(mockEventStore);
  });
  
  it('should calculate user engagement metrics', async () => {
    const events = [
      createEvent('conversation_started', 'user-1'),
      createEvent('journey_step', 'user-1'),
      createEvent('vote', 'user-1', { value: 1 }),
      createEvent('conversation_ended', 'user-1')
    ];
    
    mockEventStore.findEvents.mockResolvedValue(events);
    
    const metrics = await engine.calculateUserEngagement('user-1');
    
    expect(metrics.conversationCount).toBe(1);
    expect(metrics.journeySteps).toBe(1);
    expect(metrics.positiveVotes).toBe(1);
    expect(metrics.engagementScore).toBeGreaterThan(0);
  });
  
  it('should handle empty event data', async () => {
    mockEventStore.findEvents.mockResolvedValue([]);
    
    const metrics = await engine.calculateUserEngagement('user-1');
    
    expect(metrics.conversationCount).toBe(0);
    expect(metrics.engagementScore).toBe(0);
  });
});
```

## Integration Testing Strategy

### API Integration Tests

#### Event Ingestion API Tests
```typescript
// API integration tests
describe('Events API Integration', () => {
  let app: Application;
  let db: Database;
  
  beforeAll(async () => {
    app = await createTestApp();
    db = await createTestDatabase();
  });
  
  afterAll(async () => {
    await db.close();
  });
  
  beforeEach(async () => {
    await db.clearAllTables();
  });
  
  it('should ingest single event successfully', async () => {
    const event = {
      event_type: 'conversation_started',
      user_id: 'user-123',
      properties: {
        conversation_id: 'conv-456',
        title: 'Test Conversation'
      }
    };
    
    const response = await request(app)
      .post('/api/events')
      .set('Authorization', 'Bearer test-api-key')
      .send({ events: [event] });
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.events_processed).toBe(1);
    
    // Verify event was stored
    const storedEvents = await db.events.findAll();
    expect(storedEvents).toHaveLength(1);
    expect(storedEvents[0].event_type).toBe('conversation_started');
  });
  
  it('should handle batch event ingestion', async () => {
    const events = [
      createEvent('conversation_started', 'user-1'),
      createEvent('journey_step', 'user-1'),
      createEvent('vote', 'user-1')
    ];
    
    const response = await request(app)
      .post('/api/events')
      .set('Authorization', 'Bearer test-api-key')
      .send({ events });
    
    expect(response.status).toBe(200);
    expect(response.body.events_processed).toBe(3);
    
    const storedEvents = await db.events.findAll();
    expect(storedEvents).toHaveLength(3);
  });
  
  it('should validate API key', async () => {
    const response = await request(app)
      .post('/api/events')
      .set('Authorization', 'Bearer invalid-key')
      .send({ events: [] });
    
    expect(response.status).toBe(401);
    expect(response.body.error).toBe('Invalid API key');
  });
  
  it('should handle malformed events', async () => {
    const response = await request(app)
      .post('/api/events')
      .set('Authorization', 'Bearer test-api-key')
      .send({ events: [{ invalid: 'event' }] });
    
    expect(response.status).toBe(400);
    expect(response.body.errors).toBeDefined();
  });
});
```

#### Analytics API Tests
```typescript
// Analytics API integration tests
describe('Analytics API Integration', () => {
  let app: Application;
  let db: Database;
  
  beforeAll(async () => {
    app = await createTestApp();
    db = await createTestDatabase();
    
    // Seed test data
    await seedTestEvents(db);
  });
  
  it('should return event counts by type', async () => {
    const response = await request(app)
      .get('/api/analytics/event-counts')
      .set('Authorization', 'Bearer test-api-key')
      .query({ time_range: '7d' });
    
    expect(response.status).toBe(200);
    expect(response.body.results).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          event_type: 'conversation_started',
          count: expect.any(Number)
        })
      ])
    );
  });
  
  it('should filter events by user', async () => {
    const response = await request(app)
      .get('/api/analytics/user-events')
      .set('Authorization', 'Bearer test-api-key')
      .query({ user_id: 'user-123' });
    
    expect(response.status).toBe(200);
    expect(response.body.results.every(
      event => event.user_id === 'user-123'
    )).toBe(true);
  });
  
  it('should handle complex analytics queries', async () => {
    const query = {
      metrics: ['count', 'avg_value'],
      dimensions: ['event_type', 'hour'],
      filters: {
        event_type: ['vote', 'journey_step'],
        time_range: ['2024-01-01', '2024-01-31']
      }
    };
    
    const response = await request(app)
      .post('/api/analytics/query')
      .set('Authorization', 'Bearer test-api-key')
      .send(query);
    
    expect(response.status).toBe(200);
    expect(response.body.results).toBeDefined();
    expect(response.body.metadata.total_events).toBeGreaterThan(0);
  });
});
```

### Database Integration Tests

#### Event Storage Tests
```typescript
// Database integration tests
describe('Event Storage Integration', () => {
  let eventStore: EventStore;
  let db: Database;
  
  beforeAll(async () => {
    db = await createTestDatabase();
    eventStore = new EventStore(db);
  });
  
  it('should store and retrieve events', async () => {
    const event = createEvent('conversation_started', 'user-123');
    
    await eventStore.store(event);
    
    const retrievedEvents = await eventStore.findEvents({
      user_id: 'user-123',
      event_type: 'conversation_started'
    });
    
    expect(retrievedEvents).toHaveLength(1);
    expect(retrievedEvents[0].event_type).toBe('conversation_started');
  });
  
  it('should handle JSONB property queries', async () => {
    const event = createEvent('vote', 'user-123', {
      conversation_id: 'conv-456',
      value: 1
    });
    
    await eventStore.store(event);
    
    const retrievedEvents = await eventStore.findEvents({
      'properties.conversation_id': 'conv-456',
      'properties.value': 1
    });
    
    expect(retrievedEvents).toHaveLength(1);
  });
  
  it('should use indexes for performance', async () => {
    // Store many events
    const events = Array.from({ length: 1000 }, (_, i) => 
      createEvent('conversation_started', `user-${i}`)
    );
    
    await eventStore.storeBatch(events);
    
    // Query should be fast with indexes
    const startTime = Date.now();
    const results = await eventStore.findEvents({
      event_type: 'conversation_started'
    });
    const queryTime = Date.now() - startTime;
    
    expect(results).toHaveLength(1000);
    expect(queryTime).toBeLessThan(100); // Should be fast with indexes
  });
});
```

## End-to-End Testing Strategy

### User Journey Tests

#### Complete Analytics Flow
```typescript
// E2E user journey tests
describe('Complete Analytics Flow E2E', () => {
  let browser: Browser;
  let page: Page;
  let apiClient: ApiClient;
  
  beforeAll(async () => {
    browser = await puppeteer.launch();
    page = await browser.newPage();
    apiClient = new ApiClient({ apiKey: 'test-key' });
  });
  
  afterAll(async () => {
    await browser.close();
  });
  
  it('should track events and display in dashboard', async () => {
    // 1. Send events via SDK
    await apiClient.track('conversation_started', {
      user_id: 'user-123',
      conversation_id: 'conv-456',
      title: 'E2E Test Conversation'
    });
    
    await apiClient.track('journey_step', {
      user_id: 'user-123',
      conversation_id: 'conv-456',
      step_name: 'initial_query'
    });
    
    await apiClient.track('vote', {
      user_id: 'user-123',
      conversation_id: 'conv-456',
      value: 1
    });
    
    // 2. Wait for processing
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 3. Verify events appear in dashboard
    await page.goto('http://localhost:3000/dashboard');
    
    // Login
    await page.click('[data-testid="login-button"]');
    await page.waitForSelector('[data-testid="dashboard-content"]');
    
    // Check events table
    await page.waitForSelector('[data-testid="events-table"]');
    const eventRows = await page.$$('[data-testid="event-row"]');
    expect(eventRows.length).toBeGreaterThan(0);
    
    // Check conversation started event
    const conversationEvent = await page.$('[data-testid="event-conversation_started"]');
    expect(conversationEvent).toBeTruthy();
    
    // Check analytics charts
    await page.waitForSelector('[data-testid="analytics-chart"]');
    const chartData = await page.evaluate(() => {
      const chart = document.querySelector('[data-testid="analytics-chart"]');
      return chart?.getAttribute('data-values');
    });
    
    expect(chartData).toBeDefined();
  });
  
  it('should handle event filtering and search', async () => {
    await page.goto('http://localhost:3000/dashboard');
    
    // Filter by event type
    await page.click('[data-testid="filter-event-type"]');
    await page.click('[data-testid="filter-vote"]');
    
    await page.waitForSelector('[data-testid="events-table"]');
    const eventRows = await page.$$('[data-testid="event-row"]');
    
    // Check that only vote events are shown
    for (const row of eventRows) {
      const eventType = await row.$eval('[data-testid="event-type"]', el => el.textContent);
      expect(eventType).toBe('vote');
    }
    
    // Search by user ID
    await page.type('[data-testid="search-input"]', 'user-123');
    await page.click('[data-testid="search-button"]');
    
    await page.waitForSelector('[data-testid="events-table"]');
    const searchResults = await page.$$('[data-testid="event-row"]');
    
    expect(searchResults.length).toBeGreaterThan(0);
  });
});
```

### Migration E2E Tests
```typescript
// Migration E2E tests
describe('Migration E2E Tests', () => {
  let legacyDb: Database;
  let newDb: Database;
  
  beforeAll(async () => {
    legacyDb = await createLegacyTestDatabase();
    newDb = await createNewTestDatabase();
  });
  
  it('should migrate data from legacy to new format', async () => {
    // 1. Seed legacy data
    await legacyDb.conversations.create({
      id: 'conv-123',
      user_id: 'user-456',
      title: 'Legacy Conversation',
      status: 'active'
    });
    
    await legacyDb.journeys.create({
      id: 'journey-789',
      conversation_id: 'conv-123',
      step_name: 'initial_step',
      completed_at: new Date()
    });
    
    // 2. Run migration
    const migrationResult = await runMigration(legacyDb, newDb);
    
    expect(migrationResult.success).toBe(true);
    expect(migrationResult.errors).toHaveLength(0);
    
    // 3. Verify migrated data
    const events = await newDb.events.findAll();
    
    const conversationEvent = events.find(e => e.event_type === 'conversation_started');
    expect(conversationEvent).toBeDefined();
    expect(conversationEvent.user_id).toBe('user-456');
    expect(conversationEvent.properties.conversation_id).toBe('conv-123');
    
    const journeyEvent = events.find(e => e.event_type === 'journey_step');
    expect(journeyEvent).toBeDefined();
    expect(journeyEvent.properties.step_name).toBe('initial_step');
  });
  
  it('should handle backward compatibility', async () => {
    // Test legacy API endpoints still work
    const response = await request(app)
      .post('/api/legacy/conversations')
      .send({
        userId: 'user-123',
        title: 'Backward Compatibility Test'
      });
    
    expect(response.status).toBe(200);
    expect(response.body.id).toBeDefined();
    
    // Verify event was created in new format
    const events = await newDb.events.findAll({
      where: { event_type: 'conversation_started' }
    });
    
    expect(events.length).toBeGreaterThan(0);
  });
});
```

## Performance Testing Strategy

### Load Testing

#### API Load Tests
```typescript
// API load testing with k6
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '2m', target: 100 },   // Ramp up to 100 users
    { duration: '5m', target: 100 },   // Stay at 100 users
    { duration: '2m', target: 200 },   // Ramp up to 200 users
    { duration: '5m', target: 200 },   // Stay at 200 users
    { duration: '2m', target: 0 },     // Ramp down to 0 users
  ],
  thresholds: {
    'http_req_duration': ['p(95)<100'],  // 95% of requests must complete below 100ms
    'http_req_failed': ['rate<0.01'],    // Error rate must be below 1%
  },
};

export default function() {
  // Test event ingestion performance
  const eventData = {
    events: [
      {
        event_type: 'conversation_started',
        user_id: `user-${Math.floor(Math.random() * 1000)}`,
        timestamp: Date.now(),
        properties: {
          conversation_id: `conv-${Math.floor(Math.random() * 1000)}`,
          title: `Load Test Conversation ${Math.random()}`
        }
      }
    ]
  };
  
  const response = http.post('http://localhost:3000/api/events', 
    JSON.stringify(eventData), 
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-api-key'
      }
    }
  );
  
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 100ms': (r) => r.timings.duration < 100,
    'events processed': (r) => JSON.parse(r.body).events_processed === 1,
  });
  
  sleep(1);
}
```

#### Database Performance Tests
```typescript
// Database performance tests
describe('Database Performance', () => {
  let db: Database;
  let eventStore: EventStore;
  
  beforeAll(async () => {
    db = await createTestDatabase();
    eventStore = new EventStore(db);
  });
  
  it('should handle high-volume event insertion', async () => {
    const events = Array.from({ length: 10000 }, (_, i) => 
      createEvent('conversation_started', `user-${i % 100}`)
    );
    
    const startTime = Date.now();
    await eventStore.storeBatch(events);
    const insertTime = Date.now() - startTime;
    
    // Should insert 10k events in under 5 seconds
    expect(insertTime).toBeLessThan(5000);
  });
  
  it('should perform analytics queries efficiently', async () => {
    // Pre-populate with test data
    await seedLargeDataset(db, 100000);
    
    const queries = [
      () => eventStore.findEvents({ event_type: 'conversation_started' }),
      () => eventStore.aggregateEvents('vote', 'value', 'avg'),
      () => eventStore.getEventCounts(['conversation_started', 'vote'])
    ];
    
    for (const query of queries) {
      const startTime = Date.now();
      await query();
      const queryTime = Date.now() - startTime;
      
      // Each query should complete in under 100ms
      expect(queryTime).toBeLessThan(100);
    }
  });
});
```

### SDK Performance Tests
```typescript
// SDK performance tests
describe('SDK Performance', () => {
  let sdk: BilanSDK;
  
  beforeEach(() => {
    sdk = new BilanSDK({
      apiKey: 'test-key',
      batchSize: 10
    });
  });
  
  it('should handle rapid event tracking', async () => {
    const startTime = Date.now();
    
    // Track 1000 events rapidly
    const promises = Array.from({ length: 1000 }, (_, i) =>
      sdk.track('conversation_started', { user_id: `user-${i}` })
    );
    
    await Promise.all(promises);
    
    const totalTime = Date.now() - startTime;
    
    // Should handle 1000 events in under 2 seconds
    expect(totalTime).toBeLessThan(2000);
  });
  
  it('should not leak memory with continuous usage', async () => {
    const initialMemory = process.memoryUsage().heapUsed;
    
    // Track many events over time
    for (let i = 0; i < 10000; i++) {
      await sdk.track('conversation_started', { user_id: `user-${i}` });
      
      if (i % 1000 === 0) {
        // Force garbage collection
        if (global.gc) global.gc();
      }
    }
    
    const finalMemory = process.memoryUsage().heapUsed;
    const memoryIncrease = finalMemory - initialMemory;
    
    // Memory increase should be minimal (< 50MB)
    expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
  });
});
```

## Security Testing Strategy

### Authentication Tests
```typescript
// Security testing
describe('Security Tests', () => {
  describe('Authentication', () => {
    it('should reject requests without API key', async () => {
      const response = await request(app)
        .post('/api/events')
        .send({ events: [] });
      
      expect(response.status).toBe(401);
    });
    
    it('should reject requests with invalid API key', async () => {
      const response = await request(app)
        .post('/api/events')
        .set('Authorization', 'Bearer invalid-key')
        .send({ events: [] });
      
      expect(response.status).toBe(401);
    });
    
    it('should enforce rate limiting', async () => {
      // Make requests exceeding rate limit
      const promises = Array.from({ length: 1001 }, () =>
        request(app)
          .post('/api/events')
          .set('Authorization', 'Bearer test-key')
          .send({ events: [] })
      );
      
      const responses = await Promise.all(promises);
      const rateLimitedResponses = responses.filter(r => r.status === 429);
      
      expect(rateLimitedResponses.length).toBeGreaterThan(0);
    });
  });
  
  describe('Data Validation', () => {
    it('should sanitize input data', async () => {
      const maliciousEvent = {
        event_type: 'conversation_started',
        user_id: '<script>alert("xss")</script>',
        properties: {
          title: ''; DROP TABLE events; --'
        }
      };
      
      const response = await request(app)
        .post('/api/events')
        .set('Authorization', 'Bearer test-key')
        .send({ events: [maliciousEvent] });
      
      expect(response.status).toBe(400);
      expect(response.body.errors).toContain('Invalid user_id format');
    });
  });
});
```

### Penetration Testing
```typescript
// Automated penetration testing
describe('Penetration Tests', () => {
  it('should resist SQL injection attacks', async () => {
    const sqlInjectionPayloads = [
      "'; DROP TABLE events; --",
      "' OR '1'='1",
      "' UNION SELECT * FROM users --"
    ];
    
    for (const payload of sqlInjectionPayloads) {
      const response = await request(app)
        .get('/api/analytics/events')
        .set('Authorization', 'Bearer test-key')
        .query({ user_id: payload });
      
      // Should not succeed or cause errors
      expect([400, 401, 403]).toContain(response.status);
    }
  });
  
  it('should resist XSS attacks', async () => {
    const xssPayloads = [
      '<script>alert("xss")</script>',
      'javascript:alert("xss")',
      '<img src=x onerror=alert("xss")>'
    ];
    
    for (const payload of xssPayloads) {
      const response = await request(app)
        .post('/api/events')
        .set('Authorization', 'Bearer test-key')
        .send({
          events: [{
            event_type: 'conversation_started',
            user_id: 'user-123',
            properties: { title: payload }
          }]
        });
      
      // Should be sanitized or rejected
      expect(response.status).toBe(400);
    }
  });
});
```

## Continuous Testing Strategy

### CI/CD Integration

#### GitHub Actions Testing Pipeline
```yaml
# .github/workflows/test.yml
name: Test Suite

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:13
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run unit tests
        run: npm run test:unit
        env:
          DATABASE_URL: postgres://postgres:postgres@localhost:5432/test
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info

  integration-tests:
    runs-on: ubuntu-latest
    needs: unit-tests
    
    services:
      postgres:
        image: postgres:13
        env:
          POSTGRES_PASSWORD: postgres
      redis:
        image: redis:6
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run integration tests
        run: npm run test:integration
        env:
          DATABASE_URL: postgres://postgres:postgres@localhost:5432/test
          REDIS_URL: redis://localhost:6379

  e2e-tests:
    runs-on: ubuntu-latest
    needs: integration-tests
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Start services
        run: docker-compose up -d
      
      - name: Wait for services
        run: sleep 30
      
      - name: Run E2E tests
        run: npm run test:e2e
      
      - name: Upload test artifacts
        uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: e2e-test-results
          path: test-results/

  performance-tests:
    runs-on: ubuntu-latest
    needs: integration-tests
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup k6
        run: |
          sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
          echo "deb https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
          sudo apt-get update
          sudo apt-get install k6
      
      - name: Start services
        run: docker-compose up -d
      
      - name: Run performance tests
        run: k6 run tests/performance/api-load-test.js
      
      - name: Performance regression check
        run: npm run test:performance:regression
```

### Test Automation

#### Test Data Management
```typescript
// Test data factory
export class TestDataFactory {
  static createEvent(type: string, userId: string, properties: any = {}): Event {
    return {
      id: generateId(),
      event_type: type,
      user_id: userId,
      timestamp: Date.now(),
      properties: {
        ...properties,
        test_data: true
      },
      metadata: {
        source: 'test',
        version: '1.0.0'
      }
    };
  }
  
  static createEventBatch(count: number, userId: string): Event[] {
    return Array.from({ length: count }, (_, i) => 
      this.createEvent('conversation_started', userId, { 
        conversation_id: `conv-${i}` 
      })
    );
  }
  
  static async seedDatabase(db: Database, scenario: 'small' | 'medium' | 'large') {
    const counts = {
      small: 100,
      medium: 10000,
      large: 100000
    };
    
    const events = Array.from({ length: counts[scenario] }, (_, i) => 
      this.createEvent(
        ['conversation_started', 'journey_step', 'vote'][i % 3],
        `user-${i % 100}`,
        { index: i }
      )
    );
    
    await db.events.bulkCreate(events);
  }
}
```

#### Test Environment Management
```typescript
// Test environment setup
export class TestEnvironment {
  private db: Database;
  private app: Application;
  private cleanup: (() => Promise<void>)[] = [];
  
  async setup(): Promise<void> {
    // Setup test database
    this.db = await createTestDatabase();
    await this.db.sync({ force: true });
    
    // Setup test app
    this.app = await createTestApp(this.db);
    
    // Setup cleanup
    this.cleanup.push(async () => {
      await this.db.close();
      await this.app.close();
    });
  }
  
  async teardown(): Promise<void> {
    for (const cleanupFn of this.cleanup.reverse()) {
      await cleanupFn();
    }
  }
  
  async reset(): Promise<void> {
    await this.db.sync({ force: true });
  }
  
  getApp(): Application {
    return this.app;
  }
  
  getDatabase(): Database {
    return this.db;
  }
}
```

## Test Monitoring and Reporting

### Test Metrics Dashboard
```typescript
// Test metrics collection
export class TestMetricsCollector {
  private metrics: TestMetrics[] = [];
  
  recordTestRun(suite: string, results: TestResults): void {
    this.metrics.push({
      suite,
      timestamp: Date.now(),
      passed: results.passed,
      failed: results.failed,
      duration: results.duration,
      coverage: results.coverage
    });
  }
  
  generateReport(): TestReport {
    const totalTests = this.metrics.reduce((sum, m) => sum + m.passed + m.failed, 0);
    const passedTests = this.metrics.reduce((sum, m) => sum + m.passed, 0);
    const avgCoverage = this.metrics.reduce((sum, m) => sum + m.coverage, 0) / this.metrics.length;
    
    return {
      totalTests,
      passRate: passedTests / totalTests,
      avgCoverage,
      trends: this.calculateTrends(),
      slowestTests: this.findSlowestTests()
    };
  }
}
```

### Quality Gates
```typescript
// Quality gate checks
export class QualityGates {
  static async checkTestCoverage(coverageReport: CoverageReport): Promise<boolean> {
    const minCoverage = 80;
    return coverageReport.lines.pct >= minCoverage;
  }
  
  static async checkPerformanceRegression(
    currentMetrics: PerformanceMetrics,
    baselineMetrics: PerformanceMetrics
  ): Promise<boolean> {
    const regressionThreshold = 0.1; // 10% performance regression
    
    return currentMetrics.avgResponseTime <= 
           baselineMetrics.avgResponseTime * (1 + regressionThreshold);
  }
  
  static async checkSecurityVulnerabilities(
    scanResults: SecurityScanResults
  ): Promise<boolean> {
    return scanResults.critical === 0 && scanResults.high === 0;
  }
}
```

## Conclusion

This comprehensive testing strategy ensures the reliability, performance, and security of Bilan's v0.4.0 event-driven architecture. The multi-layered approach covers all aspects of the system while maintaining high development velocity.

### Key Testing Principles
- **Comprehensive Coverage**: Unit, integration, and E2E tests cover all system components
- **Performance Focus**: Performance testing integrated throughout development
- **Security First**: Security testing embedded in every level
- **Automation**: Continuous testing in CI/CD pipeline
- **Quality Gates**: Clear criteria for release readiness

### Testing Metrics Targets
- **Unit Test Coverage**: >80%
- **Integration Test Coverage**: >70%
- **E2E Test Coverage**: >60%
- **Performance Test Pass Rate**: >95%
- **Security Test Pass Rate**: 100%

The testing strategy provides the foundation for confident deployment of the v0.4.0 transformation while maintaining system reliability and user trust. 