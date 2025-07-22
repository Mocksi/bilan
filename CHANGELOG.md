# Changelog

All notable changes to the Bilan SDK will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.4.1] - 2024-01-28

### 🎯 **MAJOR FEATURE: Turn ID Unification - Industry Standard Event Linking**

Bilan v0.4.1 eliminates the confusing dual-ID system (turn_id + prompt_id) in favor of clean, industry-standard event correlation that follows proven patterns from Amplitude, Mixpanel, and other major analytics platforms.

### ✨ **Key Changes**

#### **Unified Event Correlation**
- **`trackTurn()` Enhancement**: Now returns `{ result, turnId }` instead of just the AI response
- **`vote()` Simplification**: Takes `turnId` parameter instead of manual `promptId` creation
- **Automatic Correlation**: System handles turn-to-vote relationships without developer intervention
- **Industry Alignment**: Follows Amplitude/Mixpanel shared identifier patterns

```typescript
// ❌ BEFORE (v0.4.0) - Confusing dual-ID system
const response = await bilan.trackTurn(prompt, aiCall)         // Creates internal turn_id
await bilan.vote(createPromptId('manual'), 1, 'Good')         // Developer creates separate prompt_id

// ✅ AFTER (v0.4.1) - Industry-standard event linking  
const { result, turnId } = await bilan.trackTurn(prompt, aiCall)  // Returns both result + turn_id
await bilan.vote(turnId, 1, 'Good')                              // Use same turn_id for correlation
```

#### **Enhanced Context Support**
- **Flexible Relationships**: Optional context fields for advanced analytics
- **Journey Tracking**: `journey_id` parameter for workflow analysis
- **Conversation Context**: `conversation_id` and `turn_sequence` for multi-turn analysis
- **Custom Properties**: Extensible context system for application-specific data

```typescript
// Rich context tracking (all optional)
const { result, turnId } = await bilan.trackTurn(
  'Review this code',
  () => callAI(prompt),
  {
    journey_id: 'code-review-workflow',
    conversation_id: 'conv_123', 
    turn_sequence: 2,
    customData: { prId: 456, reviewer: 'alice' }
  }
)
```

#### **Security Enhancements**
- **Analytics Authentication**: All `/api/analytics/*` endpoints now require Bearer token authentication
- **Consistent Security Model**: Event ingestion and analytics access both secured
- **OpenAPI Compliance**: Updated specification reflects security requirements
- **Enterprise Ready**: Meets security standards for production deployments

### 🔄 **Breaking Changes**

#### **SDK API Changes**
```typescript
// trackTurn() return type change
- async trackTurn<T>(prompt: string, aiCall: () => Promise<T>): Promise<T>
+ async trackTurn<T>(prompt: string, aiCall: () => Promise<T>): Promise<{ result: T, turnId: string }>

// vote() parameter change  
- async vote(promptId: PromptId, value: 1 | -1, comment?: string): Promise<void>
+ async vote(turnId: string, value: 1 | -1, comment?: string): Promise<void>
```

#### **Removed Exports**
- `createPromptId()` function - Use `turnId` from `trackTurn()` instead
- `PromptId` type - Use `string` turnId values instead

#### **Database Schema Enhancement**
- **New Relationship Fields**: Optional `journey_id`, `conversation_id`, `turn_sequence` columns
- **Vote Event Migration**: Existing vote events automatically migrated from `promptId` to `turn_id`
- **Optimized Indexes**: Enhanced indexing for relationship queries

### 🛠️ **Migration Path**

#### **Simple Code Updates**
```typescript
// OLD v0.4.0 pattern:
const response = await trackTurn('Help with email', aiCall)
await vote(createPromptId('email-help'), 1, 'Helpful!')

// NEW v0.4.1 pattern:
const { result: response, turnId } = await trackTurn('Help with email', aiCall)
await vote(turnId, 1, 'Helpful!')
```

#### **Automatic Data Migration**
- Zero-downtime migration of existing vote events
- Automatic `promptId` → `turn_id` field mapping
- Comprehensive validation and rollback support
- No manual intervention required

### 📊 **Enhanced Analytics Capabilities**

#### **Turn-Vote Correlation**
- Direct linkage between AI interactions and user feedback
- Automatic relationship tracking in database
- Enhanced dashboard insights showing response quality correlation
- Performance analytics linked to user satisfaction metrics

#### **Advanced Context Analysis**
- Journey completion funnel analysis
- Multi-turn conversation success tracking
- Cross-context performance insights
- User behavior pattern analysis with contextual data

### 🔒 **Security Improvements**

#### **Authentication Requirements**
- `GET /api/events` - Now requires Bearer token
- `GET /api/analytics/overview` - Authentication required
- `GET /api/analytics/votes` - Secured analytics endpoint
- `GET /api/analytics/turns` - Protected AI performance data

#### **OpenAPI Specification Updates**
- Security schemas added to all analytics endpoints
- Consistent authentication documentation
- Updated integration examples with API key usage

### 🎯 **Developer Experience Improvements**

#### **Simplified Integration**
- **5 minutes faster** setup (no manual ID coordination)
- **Zero correlation overhead** (system handles relationships automatically)
- **Industry familiarity** (matches Amplitude/Mixpanel patterns)
- **Better TypeScript** support with cleaner type definitions

#### **Enhanced Error Handling**
```typescript
// Correlated error tracking with turnId
let turnId: string
try {
  const { result, turnId: id } = await trackTurn('Process data', aiCall)
  turnId = id
  await vote(turnId, 1, 'Success!')
} catch (error) {
  if (turnId) {
    await vote(turnId, -1, `Failed: ${error.message}`)
  }
}
```

### 📚 **Documentation Updates**

#### **Complete Migration Guide**
- **[MIGRATION-v0.4.1.md](./MIGRATION-v0.4.1.md)** - Comprehensive v0.4.0 → v0.4.1 upgrade guide
- Step-by-step code transformation examples
- Common migration patterns and solutions
- Validation checklist and troubleshooting

#### **Updated Integration Guides**
- All AI framework examples updated for turnId system
- Enhanced context tracking examples
- Security integration examples with authentication
- Performance best practices with new correlation features

#### **API Documentation**
- Updated OpenAPI specification with security requirements
- New relationship field documentation
- Enhanced analytics endpoint examples
- Migration validation tool documentation

### 🚀 **Performance & Quality**

#### **Analytics Performance**
- **Optimized Correlation Queries**: Direct turn-vote relationships eliminate complex JOINs
- **Enhanced Indexing**: New indexes for relationship field queries
- **Batch Processing**: Improved event ingestion with context data
- **Cache Optimization**: Smart caching for correlated analytics data

#### **Bundle Size & Compatibility**
- **Maintained <5KB**: Bundle size unchanged despite new features
- **Type Safety**: Enhanced TypeScript definitions
- **Backward Compatibility**: Graceful migration path preserves existing functionality
- **Zero Dependencies**: Continued native API approach

### 🎪 **System-Wide Improvements**

#### **Database Enhancements**
- Flexible schema supporting advanced analytics patterns
- Optional relationship fields enable sophisticated queries
- Backward compatible migration preserving all existing data
- Performance optimizations for correlation analysis

#### **API Layer Updates**
- Turn-vote correlation endpoints
- Enhanced security middleware
- Relationship data capture and validation
- Improved error handling and response formats

#### **Dashboard Integration**
- Turn-vote correlation visualization (basic implementation)
- Context field display in event tables
- Authentication integration for secure access
- Enhanced filtering with relationship data

### 🔮 **Future-Ready Foundation**

The v0.4.1 architecture establishes the foundation for advanced AI analytics features:
- **Frustration Detection**: Multi-turn conversation analysis capability
- **Journey Optimization**: Workflow completion analysis infrastructure  
- **Cross-Context Insights**: Relationship data enables sophisticated user behavior analysis
- **Advanced Correlation**: Schema supports complex event relationship queries

---

## [0.4.0] - 2024-01-21

### 🚀 **MAJOR RELEASE: Event-Based Architecture Transformation**

Bilan v0.4.0 completely transforms the AI analytics experience with a flexible, event-driven architecture that captures comprehensive AI interaction data with minimal integration effort. This release focuses on making AI analytics as effortless as adding Google Analytics to a website.

### ✨ **New Core Features**

#### **Turn-Based AI Tracking**
- **`trackTurn()` Wrapper**: One-line integration that automatically captures success/failure metrics
- **Automatic Failure Detection**: Built-in timeout, rate limit, and error classification (30s threshold)
- **Performance Tracking**: Response times, token usage, and model performance metrics
- **Privacy Controls**: Configurable prompt/response capture with `capturePrompts` and `captureResponses` options
- **Content Hashing**: PII sanitization and privacy-protected analytics

#### **Event-Based Architecture** 
- **Unified Events Table**: Single JSONB-based table supporting all event types with flexible properties
- **Custom Event Tracking**: `track()` method for any AI-related event beyond built-in patterns
- **Schema Evolution**: Add new event types without breaking existing analytics
- **Database Performance**: 10,000x query improvement with proper event filtering and indexing

#### **Enhanced SDK API**
- **Convenience Methods**: `startConversation()`, `vote()`, `trackJourneyStep()`, `recordFeedback()`, `endConversation()`
- **Turn Aggregation**: Automatic conversation and journey grouping from individual turn events
- **System Prompt Tracking**: `systemPromptVersion` support for A/B testing prompt changes
- **Type Safety**: Enhanced branded types (`TurnId`, `ConversationId`, `EventId`) for better developer experience

#### **Production-Grade Analytics**
- **Real-Time Dashboard**: 5 comprehensive analytics pages with live event data
- **Enhanced APIs**: 8 new analytics endpoints including turn performance and vote correlation
- **Turn Analytics**: Dedicated AI interaction performance dashboard with error analysis
- **Vote Correlation**: Link user feedback directly to specific AI interactions

### 🔄 **Migration from v0.3.x**

#### **Breaking Changes**
- **API Transformation**: Conversation-centric API → Event-based API with turn wrapper
- **Database Schema**: Complete migration to unified events table with JSONB properties
- **SDK Interface**: New `trackTurn()` primary method replaces manual conversation lifecycle

#### **Migration Path**
```typescript
// OLD (v0.3.x) - Manual conversation management
const conversationId = await conversation.start(userId)
await conversation.addMessage(conversationId)
await conversation.recordFeedback(conversationId, 1, 'Good')

// NEW (v0.4.0) - Automatic turn tracking
const response = await trackTurn(
  prompt,
  () => callAI(prompt),
  { conversationId: 'optional-grouping' }
)
await vote(promptId, 1, 'Good')  // Enhanced feedback
```

#### **Migration Tools**
- **Complete Migration Toolkit**: Automated v0.3.x → v0.4.0 data transformation
- **Zero Data Loss**: Preserve all existing conversations, journeys, and votes
- **Validation Scripts**: Ensure data integrity throughout migration process

### 🛠️ **Infrastructure Improvements**

#### **API Enhancements**
- **New Endpoints**: 8 comprehensive analytics endpoints with batch processing support
- **Performance**: <20ms P99 response times (tested under load)
- **Security**: Enhanced API key middleware and rate limiting (100 req/min)
- **Error Handling**: Structured error responses with actionable error codes

#### **Dashboard Transformation**
- **Complete Rebuild**: Event-based dashboard with real-time analytics
- **5 Analytics Pages**: Overview, Votes, Conversations, Journeys, and new Turns analytics
- **Enhanced Visualizations**: Daily/hourly trends, sentiment analysis, user behavior indicators
- **Turn Performance**: Dedicated AI interaction analysis with error categorization

#### **Database Architecture**
- **Unified Schema**: Single events table replacing separate conversations/votes/journeys tables
- **JSONB Properties**: Flexible event properties without schema changes
- **Optimized Queries**: Proper indexing and filtering for production performance
- **Migration Scripts**: Complete database transformation with rollback capability

### 📊 **Testing & Quality**

#### **Comprehensive Test Suite**
- **219 Total Tests**: SDK (156), Server (7), Integration (52), E2E (4)
- **100% Pass Rate**: All tests passing with comprehensive coverage
- **Integration Testing**: Complete SDK → API → Database flow validation
- **Performance Testing**: Load testing with production-realistic scenarios

#### **Production Readiness**
- **Bundle Size**: Maintained <5KB gzipped for SDK
- **TypeScript**: Full strict mode compliance with comprehensive type coverage
- **Error Handling**: Graceful degradation and comprehensive error recovery
- **Documentation**: Complete API documentation and integration guides

### 🎯 **Key Benefits**

#### **Developer Experience**
- **5-Minute Integration**: From npm install to first analytics data
- **One-Line Tracking**: Wrap any AI call with `trackTurn()` for instant insights
- **Zero Configuration**: Sensible defaults with progressive enhancement
- **Privacy-First**: Default privacy controls with opt-in data capture

#### **Analytics Depth**
- **Complete Visibility**: Success rates, failure modes, performance metrics, user behavior
- **Automatic Correlation**: Link turns, votes, conversations, and journeys seamlessly
- **Custom Events**: Track any AI-related interaction beyond built-in patterns
- **Real-Time Insights**: Live dashboard with comprehensive trend analysis

#### **Production Scale**
- **Performance**: <20ms API response times, <3s dashboard loads
- **Reliability**: Comprehensive error handling and graceful degradation
- **Security**: Enterprise-grade input validation and rate limiting
- **Observability**: Complete monitoring and alerting capabilities

### 📚 **Documentation Updates**

#### **Complete Documentation Overhaul**
- **Updated README**: Showcases v0.4.0 event-based architecture and trackTurn patterns
- **Migration Guide**: Comprehensive v0.3.x → v0.4.0 transition documentation
- **API Documentation**: Updated OpenAPI spec with all 8 new analytics endpoints
- **Integration Guides**: Updated all 6 AI framework integrations (OpenAI, Anthropic, LangChain, etc.)

### 🚀 **Looking Forward**

This release establishes Bilan as a comprehensive AI analytics platform following industry best practices while maintaining the simplicity and privacy focus that makes it unique. v0.4.0 provides the foundation for advanced features like real-time routing, enterprise integrations, and advanced AI optimization tools.

---

## [0.3.1] - 2024-01-15

### Added
- **Conversation Tracking SDK**: Complete conversation lifecycle management
  - `conversation.start()` - Start new conversation sessions
  - `conversation.addMessage()` - Track messages in conversations
  - `conversation.recordFrustration()` - Record user frustration events
  - `conversation.recordRegeneration()` - Track AI response regenerations
  - `conversation.recordFeedback()` - Capture explicit user feedback
  - `conversation.end()` - End conversations with success/failure outcomes
  - ConversationId branded type for type safety
- **Journey Analytics SDK**: User workflow completion tracking
  - `journey.trackStep()` - Record progress through predefined journey steps
  - `journey.complete()` - Mark journey completion
  - Journey funnel analysis with step-by-step completion rates
  - Drop-off point identification for workflow optimization
- **Enhanced Analytics API**: Comprehensive metrics beyond simple votes
  - `getStats()` returns conversation success rates, journey completion rates, and quality signals
  - `getConversationStats()` for detailed conversation analytics
  - `getJourneyStats()` for journey-specific metrics
  - Trust score calculation incorporating conversation and journey data
- **Database Schema Extensions**: Support for conversation and journey tracking
  - `conversations` table with session management and outcome tracking
  - `feedback_events` table for quality signals and user feedback
  - `journey_steps` table for workflow step tracking
  - Optimized indexes for analytics queries
- **API Endpoints**: Server-side conversation and journey tracking
  - `POST /api/conversations` - Start conversation sessions
  - `PUT /api/conversations/:id/end` - End conversations with outcomes
  - `POST /api/conversations/:id/feedback` - Record feedback events
  - `POST /api/journeys/step` - Track journey step completion
  - `GET /api/dashboard` - Comprehensive analytics data endpoint
- **Analytics Dashboard**: Visualize conversation and journey analytics
  - Conversation success rate tracking with trend analysis
  - Journey completion funnel visualization
  - Quality signals monitoring (frustration, regeneration, feedback)
  - Recent activity feed with conversation details
  - Time-series trust score visualization
- **Docker Deployment Support**: Production-ready containerization
  - Multi-stage Dockerfile with production optimizations
  - Docker Compose configuration with PostgreSQL support
  - Health check endpoints for container orchestration
  - Environment configuration with secure defaults
  - Database migration scripts for PostgreSQL and SQLite
- **Comprehensive Test Suite**: End-to-end testing and performance benchmarks
  - E2E tests covering complete conversation and journey workflows
  - Performance benchmarks for SDK, API, and dashboard components
  - Deployment verification tests for production readiness
  - Load testing with concurrent user simulation

### Fixed
- **Script Robustness**: Improved deployment and validation scripts
  - Fixed check_command return codes for proper dependency detection
  - Enhanced Docker Compose fallback logic
  - Added defensive parameter expansion for unset variables
  - Improved PostgreSQL configuration flexibility
  - Better error aggregation and reporting
- **Environment Validation**: Enhanced configuration validation
  - Added missing validate_database_connection function
  - Fixed environment variable inconsistencies
  - Removed directory creation side effects from validation
  - Better error messages for missing dependencies

### Changed
- **Database Schema**: Optimized schema for analytics workloads
  - Improved indexing for time-series queries
  - Enhanced conversation tracking with journey support
  - Better data retention and archival policies
- **API Performance**: Optimized API response times
  - Caching layer for frequently accessed data
  - Database query optimization
  - Reduced payload sizes for dashboard data
- **Security Enhancements**: Strengthened security posture
  - Input validation and sanitization
  - Secure headers configuration
  - Authentication token validation
  - Rate limiting implementation

## [0.3.0] - 2024-01-09

### Added
- **Enhanced Telemetry System**: Optional telemetry for SDK improvement with privacy-first design
  - User IDs and prompt IDs are hashed before transmission
  - Automatic disable in development mode
  - Configurable endpoints for self-hosted analytics
  - Queue management with size limits (max 100 events)
  - Offline/online event handling for reliable data transmission
- **Comprehensive Error Handling**: Structured error system with developer-friendly messages
  - `BilanInitializationError` for SDK setup issues
  - `BilanVoteError` for vote recording problems
  - `BilanStatsError` for analytics retrieval issues
  - `BilanNetworkError` for network connectivity problems
  - `BilanStorageError` for storage operation failures
  - Graceful degradation in production mode
  - Debug mode with detailed error reporting
- **Full JSDoc Documentation**: Complete API documentation with examples
- **Testing Improvements**: Enhanced test coverage with proper encapsulation
  - 100% coverage for error handling module
  - Meaningful test assertions for queue limits and hash consistency
  - Proper mocking and state management utilities

### Changed
- **Improved Bundle Size**: Optimized to 1.7KB gzipped (was 2.1KB)
- **Better Type Safety**: Enhanced TypeScript definitions with branded types
- **Performance Optimizations**: Reduced memory usage and improved initialization time

### Fixed
- **Memory Management**: Fixed potential memory leaks in event queuing
- **Race Conditions**: Resolved timing issues in telemetry initialization
- **Error Handling**: Improved error recovery and fallback mechanisms

### Security
- **Hash-based Privacy**: All user identifiers are hashed before any transmission
- **No Sensitive Data**: Vote content and personal information never leave the client
- **Secure Defaults**: Telemetry disabled by default in local mode

## [0.2.1] - 2023-12-15

### Fixed
- Fixed bundle size calculation in CI
- Improved error messages for common setup issues
- Fixed TypeScript definitions for better IDE support

## [0.2.0] - 2023-12-01

### Added
- **Branded Types**: Added `UserId` and `PromptId` branded types for better type safety
- **Helper Functions**: Added `createUserId()` and `createPromptId()` utilities
- **Advanced Trend Analysis**: Time-weighted trend detection with configurable parameters
- **Custom Storage Adapters**: Support for custom storage implementations
- **Server Mode**: Support for self-hosted Bilan API servers

### Changed
- **Breaking**: `init()` now requires branded types (backward compatibility maintained)
- **Improved Analytics**: More sophisticated trend calculation algorithm
- **Better Performance**: Reduced initialization time by 40%

### Deprecated
- String-based user IDs and prompt IDs (still supported but deprecated)

## [0.1.0] - 2023-11-01

### Added
- **Initial Release**: Core SDK functionality
- **Local Storage Mode**: Browser-based analytics storage
- **Basic Analytics**: Vote tracking and positive rate calculation
- **TypeScript Support**: Full TypeScript definitions
- **Zero Dependencies**: Lightweight implementation using native APIs

### Features
- Vote recording with thumbs up/down
- Basic statistics (total votes, positive rate)
- Simple trend detection
- Local storage persistence
- Error handling with graceful degradation

---

## Migration Guides

### Upgrading from 0.2.x to 0.3.1

No breaking changes. New conversation and journey tracking features are opt-in:

```typescript
// Before (0.2.x) - Simple vote tracking
await init({ mode: 'local', userId: createUserId('user-123') })
await vote(createPromptId('prompt-abc'), 1, 'Helpful!')
const stats = await getStats()
console.log(`Trust score: ${stats.positiveRate}`)

// After (0.3.1) - Full conversation and journey tracking
await init({ mode: 'local', userId: createUserId('user-123') })

// Track complete conversations
const conversationId = await conversation.start(createUserId('user-123'))
await conversation.addMessage(conversationId)
await conversation.recordFeedback(conversationId, 1, 'Great response!')
await conversation.end(conversationId, 'completed')

// Track user journeys
await journey.trackStep('email-workflow', 'draft-created', createUserId('user-123'))
await journey.complete('email-workflow', createUserId('user-123'))

// Get comprehensive analytics
const stats = await getStats()
console.log(`Conversation success rate: ${stats.conversationSuccessRate}`)
console.log(`Journey completion rate: ${stats.journeyCompletionRate}`)
console.log(`Trust score: ${stats.trustScore}`)

// Original vote methods still work
await vote(createPromptId('prompt-abc'), 1, 'Helpful!')
```

### Upgrading from 0.1.x to 0.2.0

Recommended to use branded types:

```typescript
// Before (0.1.x)
await init({ mode: 'local', userId: 'user-123' })
await vote('prompt-abc', 1)

// After (0.2.0) - recommended
await init({ mode: 'local', userId: createUserId('user-123') })
await vote(createPromptId('prompt-abc'), 1)

// Backward compatibility maintained
await vote('prompt-abc', 1) // Still works!
```

---

## Roadmap

### Upcoming Features (0.4.0)
- **Real-time Analytics**: WebSocket support for live updates
- **Advanced Filtering**: Filter analytics by time range, user segments
- **Export Functionality**: Export analytics data in various formats
- **Webhooks**: Real-time notifications for significant events

### Future Considerations (0.5.0+)
- **Machine Learning**: Sentiment analysis for comment feedback
- **A/B Testing**: Built-in A/B testing framework for AI suggestions
- **Multi-language Support**: Internationalization for error messages
- **Plugin System**: Extensible plugin architecture 