# Environment Configuration

Copy this to `.env` or set as environment variables:

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