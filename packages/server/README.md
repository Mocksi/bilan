# @mocksi/bilan-server

[![NPM Version](https://img.shields.io/npm/v/@mocksi/bilan-server?style=flat-square)](https://www.npmjs.com/package/@mocksi/bilan-server)
[![Node.js](https://img.shields.io/badge/Node.js-14.17%2B-green?style=flat-square)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue?style=flat-square)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)

**Self-hostable analytics server for AI trust tracking** - Process events from Bilan SDK, store analytics data, and provide insights API.

## Quick Start

### Installation

```bash
npm install -g @mocksi/bilan-server
```

### Run Server

```bash
# Start with default configuration
bilan

# Or with custom configuration
bilan --port 3001 --db-path ./data/analytics.db
```

### Environment Configuration

```bash
# Required
export BILAN_API_KEY="your-secure-api-key"

# Optional
export BILAN_PORT="3000"
export BILAN_DB_PATH="./data/bilan.db"
export BILAN_CORS_ORIGIN="https://yourapp.com"
export BILAN_LOG_LEVEL="info"
```

## Features

- **🚀 Fast**: Fastify-based server with <20ms P99 response times
- **💾 SQLite**: Better-sqlite3 for production performance
- **🔒 Secure**: API key authentication and CORS protection
- **📊 Analytics**: Built-in trust scoring and conversation analytics
- **🐳 Docker Ready**: Production Docker deployment included
- **📈 Scalable**: Event-based architecture supporting high throughput

## API Endpoints

### Event Ingestion

**POST `/api/events`**
```typescript
// Track AI turn completion
{
  "event_type": "turn_completed",
  "user_id": "user-123",
  "turn_id": "turn-456",
  "properties": {
    "model": "gpt-4",
    "provider": "openai",
    "latency": 1200,
    "input_tokens": 50,
    "output_tokens": 100
  }
}
```

**POST `/api/vote`**
```typescript
// Record user feedback
{
  "turn_id": "turn-456",
  "value": 1,
  "comment": "Great response!",
  "user_id": "user-123"
}
```

### Analytics

**GET `/api/analytics/trust-score?user_id=user-123`**
Get current trust score for a user.

**GET `/api/analytics/conversations?user_id=user-123`**
List conversations with metadata.

**GET `/api/analytics/stats`**
Get overall system statistics.

## Configuration

### CLI Options

```bash
bilan --help

Options:
  --port, -p          Server port (default: 3000)
  --db-path, -d       SQLite database path (default: ./data/bilan.db)
  --api-key, -k       API key for authentication
  --cors-origin, -c   CORS origin (default: *)
  --log-level, -l     Log level (default: info)
  --version, -v       Show version
  --help, -h          Show help
```

### Programmatic Usage

```typescript
import { createServer } from '@mocksi/bilan-server'

const server = await createServer({
  port: 3000,
  dbPath: './analytics.db',
  apiKey: 'your-secure-key',
  corsOrigin: 'https://yourapp.com'
})

await server.listen({ port: 3000 })
console.log('Bilan server running on http://localhost:3000')
```

## Docker Deployment

### Using Docker Compose

```yaml
version: '3.8'
services:
  bilan-server:
    image: mocksi/bilan-server:latest
    ports:
      - "3000:3000"
    environment:
      - BILAN_API_KEY=your-secure-api-key
      - BILAN_CORS_ORIGIN=https://yourapp.com
    volumes:
      - ./data:/app/data
    restart: unless-stopped
```

### Manual Docker Run

```bash
docker run -d \
  --name bilan-server \
  -p 3000:3000 \
  -e BILAN_API_KEY=your-secure-key \
  -v $(pwd)/data:/app/data \
  mocksi/bilan-server:latest
```

## Database Schema

The server uses SQLite with a unified events table:

```sql
CREATE TABLE events (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  user_id TEXT NOT NULL,
  turn_id TEXT,
  conversation_id TEXT,
  timestamp INTEGER NOT NULL,
  properties TEXT -- JSON
);

CREATE INDEX idx_events_user_id ON events(user_id);
CREATE INDEX idx_events_turn_id ON events(turn_id);
CREATE INDEX idx_events_type_timestamp ON events(event_type, timestamp);
```

## Health Monitoring

**GET `/health`**
```json
{
  "status": "ok",
  "version": "0.4.1",
  "uptime": 3600,
  "database": "connected",
  "events_processed": 12450
}
```

## Performance

- **Response Time**: <20ms P99 for event ingestion
- **Throughput**: 1000+ events/second on standard hardware
- **Storage**: ~100KB per 1000 events
- **Memory**: <50MB base usage

## Security

- **API Key Authentication**: Required for all endpoints
- **CORS Protection**: Configurable origin restrictions
- **Input Validation**: All payloads validated and sanitized
- **Rate Limiting**: 100 requests/minute per API key
- **SQL Injection Protection**: Parameterized queries only

## Development

```bash
# Clone repository
git clone https://github.com/Mocksi/bilan.git
cd bilan/packages/server

# Install dependencies
npm install

# Run in development mode
npm run dev

# Build for production
npm run build

# Run tests
npm test
```

## Troubleshooting

### Common Issues

**Database locked error**
```bash
# Ensure no other processes are using the database
lsof ./data/bilan.db

# Or use WAL mode (automatic in v0.4.1+)
```

**High memory usage**
```bash
# Check event processing backlog
curl http://localhost:3000/health

# Consider increasing batch size or processing frequency
```

### Logs

```bash
# View server logs
tail -f logs/bilan-server.log

# Enable debug logging
export BILAN_LOG_LEVEL=debug
```

## Migration from v0.3.x

If upgrading from v0.3.x, run the migration script:

```bash
npx @mocksi/bilan-server migrate --from-version 0.3.1
```

## Support

- **Documentation**: [https://github.com/Mocksi/bilan](https://github.com/Mocksi/bilan)
- **Issues**: [GitHub Issues](https://github.com/Mocksi/bilan/issues)
- **Discussions**: [GitHub Discussions](https://github.com/Mocksi/bilan/discussions)

## License

MIT © [Mocksi](https://github.com/Mocksi) 