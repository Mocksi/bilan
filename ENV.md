# Environment Configuration

## Server-Side Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DB_PATH` | No | `./bilan.db` | Database path (SQLite) |
| `PORT` | No | `3001` | Server port |
| `HOST` | No | `0.0.0.0` | Server host |

## Client-Side Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_API_URL` | No | `http://localhost:3001` | API URL for dashboard |

## Local Development

Create a `.env` file in your project root:

```bash
# Database path (SQLite)
DB_PATH=./bilan.db

# Server configuration
PORT=3001
HOST=0.0.0.0

# Dashboard configuration  
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## Docker Environment

For Docker deployments, the following environment variables are automatically configured in `docker-compose.yml`:

- `DB_PATH=/app/data/bilan.db` - Database path inside container
- `PORT=3001` - Server port
- `HOST=0.0.0.0` - Server host (allows external connections)
- `NEXT_PUBLIC_API_URL=http://bilan-server:3001` - API URL for dashboard 