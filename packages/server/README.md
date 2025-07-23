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
- **🛡️ Production Grade**: Comprehensive logging and error handling

## Quick Start

### Global Installation

```bash
# Install globally
npm install -g @mocksi/bilan-server

# Set required environment variables
export BILAN_API_KEY="your-secure-api-key"

# Start server
bilan

# Server running at http://localhost:3002 (default port)
```

### Docker (Recommended)

```bash
# Run with Docker
docker run -p 3002:3002 -v $(pwd)/data:/app/data \
  -e BILAN_API_KEY=your-secure-api-key \
  mocksi/bilan-server

# Or with docker-compose
version: '3.8'
services:
  bilan:
    image: mocksi/bilan-server
    ports:
      - "3002:3002"
    volumes:
      - ./data:/app/data
    environment:
      - BILAN_PORT=3002
      - BILAN_DB_PATH=/app/data/bilan.db
      - BILAN_API_KEY=your-secure-api-key
```

### Programmatic Usage

```bash
npm install @mocksi/bilan-server
```

```typescript
import { BilanServer } from '@mocksi/bilan-server'

const server = new BilanServer({
  port: 3002,
  dbPath: './bilan.db',
  apiKey: 'your-secure-api-key',
  cors: true
})

await server.start()
console.log('Bilan server running on http://localhost:3002')
```

## Configuration

### Environment Variables

```bash
# Required
BILAN_API_KEY=your-secure-api-key        # API key for authentication

# Optional
BILAN_PORT=3002                          # Port number (default: 3002)
BILAN_DB_PATH=./bilan.db                 # Database file path
BILAN_DEV_MODE=true                      # Skip API key requirement for development
BILAN_CORS_ORIGIN=http://localhost:3000  # CORS origins (comma-separated)
BILAN_CORS_CREDENTIALS=true              # Enable CORS credentials

# Docker Secrets Support
BILAN_API_KEY_FILE=/run/secrets/api_key  # Read API key from file
```

### Development Mode

For development, you can skip the API key requirement:

```bash
export BILAN_DEV_MODE=true
bilan
```

⚠️ **Never use development mode in production!**

## API Reference

The server provides a REST API for analytics data:

### Events

```bash
# Track an event
POST /api/events
Authorization: Bearer your-api-key
Content-Type: application/json

{
  "eventId": "event-123",
  "eventType": "turn_completed",
  "userId": "user-123",
  "timestamp": 1640995200000,
  "properties": {
    "turnId": "turn-456",
    "model": "gpt-4",
    "responseTime": 1200
  }
}
```

### Analytics

```bash
# Get vote analytics
GET /api/analytics/votes?timeRange=30d
Authorization: Bearer your-api-key

# Get turn analytics
GET /api/analytics/turns?timeRange=7d
Authorization: Bearer your-api-key

# Get overview analytics
GET /api/analytics/overview?timeRange=24h
Authorization: Bearer your-api-key
```

### Health Check

```bash
# Server health (no auth required)
GET /health

# Response: {"status":"ok","timestamp":"2024-01-01T00:00:00.000Z"}
```

## Client Integration

Configure the Bilan SDK to use your server:

```typescript
import { init } from '@mocksi/bilan-sdk'

await init({
  mode: 'server',
  endpoint: 'http://localhost:3002',
  userId: 'user-123'
})
```

## Database

The server uses SQLite with a unified events table:

```sql
CREATE TABLE events (
  event_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  properties JSON,
  prompt_text TEXT,
  ai_response TEXT
);
```

## Security

- **API Key Required**: All protected endpoints require `Authorization: Bearer <key>`
- **Rate Limiting**: 100 requests per minute per API key
- **CORS Protection**: Configurable allowed origins
- **Input Validation**: All inputs are validated and sanitized

## Deployment

### Docker Production

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3002
CMD ["npm", "start"]
```

### Environment Variables for Production

```bash
# Required
BILAN_API_KEY=your-secure-production-key

# Recommended
BILAN_PORT=3002
BILAN_DB_PATH=/data/bilan.db
BILAN_CORS_ORIGIN=https://yourdomain.com
NODE_ENV=production
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
ExecStart=/usr/bin/node dist/cli.js
Restart=always
Environment=NODE_ENV=production
Environment=BILAN_API_KEY=your-secure-key
Environment=BILAN_PORT=3002
Environment=BILAN_DB_PATH=/var/lib/bilan/bilan.db

[Install]
WantedBy=multi-user.target
```

## Performance

- **Throughput**: 1000+ requests/second on modest hardware
- **Latency**: <10ms P99 for event ingestion
- **Storage**: ~1KB per tracked turn (depending on metadata)
- **Database**: SQLite with WAL mode for concurrent access

## Troubleshooting

### Common Issues

**Missing API key error:**
```bash
# Set the required API key
export BILAN_API_KEY="your-secure-key"
# Or use development mode
export BILAN_DEV_MODE=true
```

**Database locked error:**
```bash
# Check for zombie processes
ps aux | grep bilan
# Check database permissions
ls -la bilan.db
```

**Connection refused:**
```bash
# Check if port is in use
lsof -i :3002
# Verify environment variables
echo $BILAN_PORT $BILAN_DB_PATH
```

## Requirements

- **Node.js**: 14.17.0 or higher
- **Memory**: 256MB minimum (1GB+ recommended for high traffic)
- **Storage**: 1GB+ for database growth
- **Network**: HTTP/HTTPS access for clients

## Contributing

We welcome contributions! Please see our [Contributing Guide](https://github.com/Mocksi/bilan/blob/main/CONTRIBUTING.md).

## License

MIT © [Mocksi](https://github.com/Mocksi)

## Links

- [Documentation](https://github.com/Mocksi/bilan#readme)
- [GitHub Repository](https://github.com/Mocksi/bilan)
- [Issue Tracker](https://github.com/Mocksi/bilan/issues)
- [SDK Package](https://www.npmjs.com/package/@mocksi/bilan-sdk) 