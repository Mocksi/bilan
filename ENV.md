# Environment Configuration

## Essential Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DB_PATH` | No | `./bilan.db` | SQLite database file path |
| `PORT` | No | `3001` | Server port (3002 in development) |
| `NEXT_PUBLIC_API_BASE_URL` | No | `http://localhost:3002` | API URL for dashboard |

## Local Development

Create a `.env` file in your project root:

```bash
# Only set these if you need different values
DB_PATH=./bilan.db
PORT=3002
NEXT_PUBLIC_API_BASE_URL=http://localhost:3002
```

## Docker Environment

For Docker deployments, these are automatically configured:

- `DB_PATH=/app/data/bilan.db` - Database path inside container
- `PORT=3001` - Server port
- `NEXT_PUBLIC_API_BASE_URL=http://bilan-server:3001` - API URL for dashboard 