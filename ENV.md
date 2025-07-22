# Environment Configuration

## Essential Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `BILAN_API_KEY` | **Yes** | None | API key for server authentication (generate with `openssl rand -hex 32`) |
| `NEXT_PUBLIC_BILAN_API_KEY` | **Yes** | None | API key for dashboard authentication (must match `BILAN_API_KEY`) |
| `DB_PATH` | No | `./bilan.db` | SQLite database file path |
| `BILAN_PORT` | No | `3002` | Server port (3002 in development) |
| `NEXT_PUBLIC_API_BASE_URL` | No | `http://localhost:3002` | API URL for dashboard |

## Local Development

Create a `.env` file in your project root:

```bash
# Required: API Authentication
BILAN_API_KEY=your-secure-api-key-here

# Optional: Only set these if you need different values
DB_PATH=./bilan.db
BILAN_PORT=3002
NEXT_PUBLIC_API_BASE_URL=http://localhost:3002
```

Create a `packages/dashboard/.env.local` file:

```bash
# Required: Dashboard authentication (must match server BILAN_API_KEY)
NEXT_PUBLIC_BILAN_API_KEY=your-secure-api-key-here
```

## Docker Environment

For Docker deployments, these are automatically configured:

- `DB_PATH=/app/data/bilan.db` - Database path inside container
- `BILAN_PORT=3002` - Server port
- `NEXT_PUBLIC_API_BASE_URL=http://bilan-server:3002` - API URL for dashboard
- `BILAN_API_KEY` - **Must be set for authentication**
- `NEXT_PUBLIC_BILAN_API_KEY` - **Must match server API key** 