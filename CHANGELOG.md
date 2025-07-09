# Changelog

All notable changes to the Bilan SDK will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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

### Upgrading from 0.2.x to 0.3.0

No breaking changes. New features are opt-in:

```typescript
// Before (0.2.x)
await init({
  mode: 'local',
  userId: createUserId('user-123')
})

// After (0.3.0) - with telemetry
await init({
  mode: 'local',
  userId: createUserId('user-123'),
  telemetry: {
    enabled: true,
    endpoint: 'https://your-analytics.com'
  }
})
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