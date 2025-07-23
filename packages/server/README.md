# @mocksi/bilan-server

[![NPM Version](https://img.shields.io/npm/v/@mocksi/bilan-server?style=flat-square)](https://www.npmjs.com/package/@mocksi/bilan-server)
[![Node.js](https://img.shields.io/badge/Node.js-14.17%2B-green?style=flat-square)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue?style=flat-square)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)

**Self-hostable analytics server for Bilan** - Own your AI trust analytics data. Fast SQLite backend with REST API.

## Features

- **🏠 Self-Hosted**: Complete control over your analytics data
- **⚡ Fast**: Built on Fastify + SQLite for optimal performance
- **🔒 Secure**: Rate limiting, CORS protection, and data validation
- **📊 Analytics Ready**: REST API for dashboards and custom queries
- **🐳 Docker Ready**: One-command deployment with Docker
- **🛡️ Production Grade**: Comprehensive logging, error handling, and monitoring

## Quick Start

### Global Installation

```bash
# Install globally
npm install -g @mocksi/bilan-server

# Start server
bilan start

# Server running at http://localhost:3001
```

### Docker (Recommended)

```bash
# Run with Docker
docker run -p 3001:3001 -v $(pwd)/data:/app/data mocksi/bilan-server

# Or with docker-compose
version: '3.8'
services:
  bilan:
    image: mocksi/bilan-server
    ports:
      - "3001:3001"
    volumes:
      - ./data:/app/data
    environment:
      - BILAN_PORT=3001
      - BILAN_DB_PATH=/app/data/bilan.db
```

### Programmatic Usage

```bash
npm install @mocksi/bilan-server
```

```typescript
import { createServer } from '@mocksi/bilan-server'

const server = await createServer({
  port: 3001,
  dbPath: './bilan.db',
  cors: {
    origin: ['http://localhost:3000']
  }
})

await server.listen({ port: 3001, host: '0.0.0.0' })
console.log('Bilan server running on http://localhost:3001')
```

## CLI Commands

### Start Server

```bash
bilan start [options]

Options:
  --port, -p       Port number (default: 3001)
  --host          Host address (default: 0.0.0.0)
  --db            Database path (default: ./bilan.db)
  --cors          CORS origins (comma-separated)
  --rate-limit    Rate limit per minute (default: 100)
  --log-level     Log level (default: info)
```

### Database Management

```bash
# Initialize database
bilan init --db ./bilan.db

# Backup database  
bilan backup --db ./bilan.db --output ./backup.db

# Show database stats
bilan stats --db ./bilan.db

# Run migrations
bilan migrate --db ./bilan.db
```

### Examples

```bash
# Development server
bilan start --port 3001 --log-level debug

# Production server with CORS
bilan start --port 8080 --cors "https://yourdomain.com,https://app.yourdomain.com"

# Custom database location
bilan start --db /var/lib/bilan/analytics.db --port 3001
```

## API Reference

The server provides a REST API for analytics data:

### Events

```bash
# Track an event
POST /api/events
Content-Type: application/json

{
  "event_type": "turn_completed",
  "user_id": "user-123",
  "turn_id": "turn-456",
  "properties": {
    "model": "gpt-4",
    "latency": 1200
  }
}
```

### Analytics

```bash
# Get analytics summary
GET /api/analytics/summary?user_id=user-123&days=7

# Get turn analytics
GET /api/analytics/turns?conversation_id=conv-456

# Get vote analytics
GET /api/analytics/votes?start_date=2024-01-01&end_date=2024-01-31
```

### Health Check

```bash
# Server health
GET /health

# Database health  
GET /health/db
```

## Configuration

### Environment Variables

```bash
# Server Configuration
BILAN_PORT=3001
BILAN_HOST=0.0.0.0
BILAN_DB_PATH=./bilan.db

# Security
BILAN_API_KEY=your-secret-key
BILAN_CORS_ORIGINS=http://localhost:3000,https://yourdomain.com
BILAN_RATE_LIMIT=100

# Logging
BILAN_LOG_LEVEL=info
BILAN_LOG_FILE=./bilan.log

# Database
BILAN_DB_WAL_MODE=true
BILAN_DB_BACKUP_INTERVAL=3600
```

### Configuration File

Create `bilan.config.js`:

```javascript
export default {
  port: 3001,
  host: '0.0.0.0',
  database: {
    path: './bilan.db',
    walMode: true,
    backupInterval: 3600
  },
  cors: {
    origin: ['http://localhost:3000']
  },
  rateLimit: {
    max: 100,
    timeWindow: '1 minute'
  },
  logging: {
    level: 'info',
    file: './bilan.log'
  }
}
```

## Client Integration

Configure the Bilan SDK to use your server:

```typescript
import { init } from '@mocksi/bilan-sdk'

await init({
  mode: 'server',
  endpoint: 'http://localhost:3001',
  userId: 'user-123'
})
```

## Database Schema

SQLite schema with optimized indexes:

```sql
-- Events table (unified analytics)
CREATE TABLE events (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  user_id TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  properties JSON,
  
  -- Indexes for fast queries
  INDEX idx_events_user_timestamp (user_id, timestamp),
  INDEX idx_events_type_timestamp (event_type, timestamp)
);

-- Additional indexes for analytics
CREATE INDEX idx_events_turn_id ON events(json_extract(properties, '$.turn_id'));
CREATE INDEX idx_events_conversation_id ON events(json_extract(properties, '$.conversation_id'));
```

## Monitoring

### Health Checks

```bash
# Basic health
curl http://localhost:3001/health

# Detailed health with database stats
curl http://localhost:3001/health/detailed
```

### Metrics

```bash
# Server metrics
curl http://localhost:3001/metrics

Response:
{
  "uptime": 3600,
  "requests": 1250,
  "database": {
    "size": "2.5MB",
    "events": 10000,
    "users": 150
  }
}
```

### Logs

```bash
# View logs (if file logging enabled)
tail -f bilan.log

# Or with Docker
docker logs -f <container-id>
```

## Performance

- **Throughput**: 1000+ requests/second on modest hardware
- **Latency**: <10ms P99 for event ingestion
- **Storage**: ~1KB per tracked turn (depending on metadata)
- **Concurrency**: SQLite WAL mode for concurrent reads/writes

## Security

- **Rate Limiting**: Configurable per-IP rate limits
- **CORS Protection**: Configurable allowed origins
- **Input Validation**: All API inputs validated and sanitized
- **SQL Injection**: Protected via prepared statements
- **Error Handling**: Secure error responses (no data leakage)

## Deployment

### Docker Production

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3001
CMD ["npm", "start"]
```

### Systemd Service

```ini
# /etc/systemd/system/bilan.service
[Unit]
Description=Bilan Analytics Server
After=network.target

[Service]
Type=simple
User=bilan
WorkingDirectory=/opt/bilan
ExecStart=/usr/bin/node /opt/bilan/dist/cli.js start --port 3001
Restart=always
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

### Reverse Proxy (nginx)

```nginx
server {
    listen 80;
    server_name analytics.yourdomain.com;
    
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Requirements

- **Node.js**: 14.17.0 or higher
- **Memory**: 512MB minimum (2GB+ recommended for high traffic)
- **Storage**: 10GB+ for database growth
- **Network**: HTTP/HTTPS access for clients

## Troubleshooting

### Common Issues

**Database locked error:**
```bash
# Check for zombie processes
ps aux | grep bilan
# Ensure WAL mode is enabled
bilan start --db ./bilan.db --wal-mode
```

**High memory usage:**
```bash
# Enable database vacuuming
bilan vacuum --db ./bilan.db
# Check log file size
ls -la bilan.log
```

**Connection refused:**
```bash
# Check if port is in use
lsof -i :3001
# Verify host binding
bilan start --host 0.0.0.0 --port 3001
```

## Contributing

We welcome contributions! Please see our [Contributing Guide](https://github.com/Mocksi/bilan/blob/main/CONTRIBUTING.md).

## License

MIT © [Mocksi](https://github.com/Mocksi)

## Links

- [Documentation](https://github.com/Mocksi/bilan#readme)
- [GitHub Repository](https://github.com/Mocksi/bilan)
- [Issue Tracker](https://github.com/Mocksi/bilan/issues)
- [SDK Package](https://www.npmjs.com/package/@mocksi/bilan-sdk) 