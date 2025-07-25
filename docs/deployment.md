# Bilan Deployment Guide

This guide provides comprehensive instructions for deploying Bilan in various environments using Docker.

## 🆕 v0.4.2 Critical Server Mode Fix

**CRITICAL**: Bilan v0.4.2 fixes broken server mode from v0.4.1. v0.4.1 introduced API key authentication but server mode events were never sent. Before deploying, ensure you understand the authentication requirements:

### Development Mode (Default in Docker Compose)
```env
# Development - allows missing API key
BILAN_DEV_MODE=true
```

### Production Mode (Required for Production)
```env
# Production - requires secure API key
BILAN_API_KEY=your-secure-api-key-here
NEXT_PUBLIC_BILAN_API_KEY=your-secure-api-key-here  # For dashboard

# Generate secure API key:
openssl rand -hex 32
```

**⚠️ Security Warning**: Never set `BILAN_DEV_MODE=true` in production. Always use a secure API key.

### Docker Secrets (Enhanced Security)

For production deployments, Bilan v0.4.2 supports Docker secrets to avoid exposing credentials in container metadata:

#### **Environment Variables (Simple)**
```yaml
environment:
  - BILAN_API_KEY=${BILAN_API_KEY}
  - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
```

#### **Docker Secrets (Recommended for Production)**
```yaml
environment:
  - BILAN_API_KEY_FILE=/run/secrets/bilan_api_key
  - POSTGRES_PASSWORD_FILE=/run/secrets/postgres_password
secrets:
  - bilan_api_key
  - postgres_password

secrets:
  bilan_api_key:
    file: ./secrets/bilan_api_key.txt
  postgres_password:
    file: ./secrets/postgres_password.txt
```

#### **Setting Up Secrets**
```bash
# Create secrets directory
mkdir -p secrets

# Generate secure credentials
openssl rand -hex 32 > secrets/bilan_api_key.txt
openssl rand -base64 32 > secrets/postgres_password.txt

# Secure file permissions
chmod 600 secrets/*.txt
chown root:root secrets/*.txt  # If running as root

# Add to .gitignore
echo "secrets/" >> .gitignore
```

#### **Benefits of Docker Secrets**
- ✅ Credentials not visible in `docker inspect` output
- ✅ Files mounted in memory (not on disk)  
- ✅ Automatic rotation support
- ✅ Swarm mode compatibility
- ✅ Better security audit trail

## Quick Start

For a quick deployment with default settings:

```bash
# Clone and setup
git clone https://github.com/your-org/bilan.git
cd bilan

# Deploy with Docker
./scripts/deploy.sh
```

Access your deployment:
- **Server**: http://localhost:3002
- **Health Check**: http://localhost:3002/health
- **Dashboard**: http://localhost:3004

## Prerequisites

### System Requirements

- **Operating System**: Linux, macOS, or Windows with WSL2
- **Memory**: Minimum 2GB RAM, recommended 4GB+
- **Storage**: Minimum 5GB free space, recommended 10GB+
- **Network**: Internet access for Docker image pulls

### Required Software

- **Docker**: Version 20.10 or higher
- **Docker Compose**: Version 2.0 or higher (or Docker with compose plugin)
- **Node.js**: Version 18 or higher (for building)
- **Git**: For cloning the repository

### Optional Tools

- **SQLite**: For local database management
- **PostgreSQL**: For production database setup
- **curl**: For health checks and API testing

## Environment Configuration

### 1. Create Environment File

Copy the example environment file and customize:

```bash
cp ENV.example .env
```

### 2. Core Configuration

Edit `.env` with your deployment settings:

```env
# Server Configuration
BILAN_PORT=3002
BILAN_NODE_ENV=production
BILAN_HOST=0.0.0.0

# Database Configuration (Choose one)
# SQLite (recommended for small deployments)
BILAN_DB_PATH=./bilan.db

# PostgreSQL (recommended for production)
# DATABASE_URL=postgresql://username:password@localhost:5432/bilan

# Security (IMPORTANT: Change these in production!)
BILAN_SESSION_SECRET=your-unique-session-secret-here
BILAN_JWT_SECRET=your-unique-jwt-secret-here

# CORS Configuration
BILAN_CORS_ORIGIN=http://localhost:3004,https://yourdomain.com
BILAN_CORS_CREDENTIALS=true
```

### 3. Generate Secure Secrets

For production deployments, generate secure secrets:

```bash
# Generate session secret
openssl rand -hex 32

# Generate JWT secret  
openssl rand -hex 32
```

### 4. Validate Configuration

Validate your environment configuration:

```bash
./scripts/validate-env.sh
```

## Deployment Methods

### Method 1: Docker Compose (Recommended)

#### Standard Deployment

```bash
# Build and deploy
./scripts/deploy.sh

# Or manually with Docker Compose
docker-compose up --build -d
```

#### Development Deployment

```bash
# Deploy in development mode
./scripts/deploy.sh --env development
```

#### Production Deployment

```bash
# Deploy in production mode with rebuild
./scripts/deploy.sh --env production --rebuild
```

### Method 2: Manual Docker Build

```bash
# Build the application
./scripts/build.sh

# Build Docker image
docker build -t bilan-server .

# Run container
docker run -d \
  --name bilan-server \
  -p 3002:3002 \
  -v $(pwd)/data:/app/data \
  -e BILAN_NODE_ENV=production \
  -e BILAN_PORT=3002 \
  -e BILAN_DB_PATH=/app/data/bilan.db \
  bilan-server
```

### Method 3: Docker Compose Override

Create `docker-compose.override.yml` for custom configurations:

```yaml
version: '3.8'

services:
  bilan-server:
    environment:
      - BILAN_DB_PATH=/app/data/custom.db
      - BILAN_LOG_LEVEL=debug
    volumes:
      - ./custom-data:/app/data
    ports:
      - "3003:3002"
```

## Database Setup

### SQLite Configuration (Default)

SQLite is the default database and requires minimal setup:

```env
# .env
BILAN_DB_PATH=./data/bilan.db
```

The database will be automatically created on first run.

### PostgreSQL Configuration

For production deployments, PostgreSQL is recommended:

```env
# .env
DATABASE_URL=postgresql://username:password@localhost:5432/bilan
```

#### Using Docker PostgreSQL

```bash
# Start PostgreSQL container
docker run -d \
  --name bilan-postgres \
  -e POSTGRES_DB=bilan \
  -e POSTGRES_USER=bilan \
  -e POSTGRES_PASSWORD=secure_password \
  -p 5432:5432 \
  postgres:15-alpine

# Update your .env file
DATABASE_URL=postgresql://bilan:secure_password@localhost:5432/bilan
```

### Database Migration

Initialize or migrate the database:

```bash
# Run migrations
./scripts/migrate.sh

# Force reset (WARNING: destroys data)
./scripts/migrate.sh --force-reset

# Skip backup during migration
./scripts/migrate.sh --no-backup
```

## Monitoring and Maintenance

### Health Checks

Bilan includes built-in health checks:

```bash
# Check server health
curl http://localhost:3002/health

# Check all services
docker-compose ps
```

### Logs

View application logs:

```bash
# View all logs
docker-compose logs -f

# View server logs only
docker-compose logs -f bilan-server

# View recent logs
docker-compose logs --tail=100 bilan-server
```

### Backup

#### Automatic Backup

Backups are created automatically during deployments and migrations in the `backups/` directory.

#### Manual Backup

```bash
# Create backup directory
mkdir -p backups/manual/$(date +%Y%m%d_%H%M%S)

# For SQLite
cp data/bilan.db backups/manual/$(date +%Y%m%d_%H%M%S)/

# For PostgreSQL
pg_dump $DATABASE_URL > backups/manual/$(date +%Y%m%d_%H%M%S)/bilan.sql
```

#### Restore from Backup

```bash
# For SQLite
cp backups/manual/20240101_120000/bilan.db data/

# For PostgreSQL
psql $DATABASE_URL < backups/manual/20240101_120000/bilan.sql
```

### Updates

Update your Bilan deployment:

```bash
# Pull latest code
git pull origin main

# Rebuild and redeploy
./scripts/deploy.sh --rebuild

# Or manually
docker-compose down
docker-compose up --build -d
```

## Security

### SSL/TLS Configuration

For production deployments, use a reverse proxy with SSL:

#### Nginx Configuration

```nginx
server {
    listen 443 ssl;
    server_name your-domain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:3002;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

#### Traefik Configuration

```yaml
version: '3.8'

services:
  bilan-server:
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.bilan.rule=Host(`your-domain.com`)"
      - "traefik.http.routers.bilan.tls.certresolver=letsencrypt"
```

### Firewall Configuration

Configure firewall rules:

```bash
# Allow HTTP/HTTPS traffic
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow Bilan server (if direct access needed)
sudo ufw allow 3002/tcp
```

## Performance Optimization

### Resource Limits

Configure Docker resource limits:

```yaml
# docker-compose.override.yml
version: '3.8'

services:
  bilan-server:
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 1G
        reservations:
          cpus: '0.5'
          memory: 512M
```

### Database Optimization

#### SQLite Optimization

```bash
# Optimize SQLite database
sqlite3 data/bilan.db "VACUUM; ANALYZE;"
```

#### PostgreSQL Optimization

```sql
-- Connect to PostgreSQL and run
VACUUM ANALYZE;
REINDEX DATABASE bilan;
```

## Troubleshooting

### Common Issues

#### Port Already in Use

```bash
# Find process using port
lsof -i :3002

# Kill process
kill -9 <PID>
```

#### Database Connection Issues

```bash
# Check database connectivity
./scripts/validate-env.sh

# Reset database
./scripts/migrate.sh --force-reset
```

#### Permission Issues

```bash
# Fix file permissions
sudo chown -R $(id -u):$(id -g) data/
chmod -R 755 data/
```

#### Container Won't Start

```bash
# Check container logs
docker-compose logs bilan-server

# Check system resources
docker system df
docker system prune
```

### Debug Mode

Enable debug mode for troubleshooting:

```env
# .env
BILAN_DEBUG=true
BILAN_LOG_LEVEL=debug
BILAN_NODE_ENV=development
```

### Performance Issues

#### High Memory Usage

```bash
# Check memory usage
docker stats

# Restart containers
docker-compose restart
```

#### Slow Database Queries

```bash
# For SQLite
sqlite3 data/bilan.db ".tables"
sqlite3 data/bilan.db "EXPLAIN QUERY PLAN SELECT * FROM conversations;"

# For PostgreSQL
psql $DATABASE_URL -c "EXPLAIN ANALYZE SELECT * FROM conversations;"
```

## Production Checklist

### Pre-Deployment

- [ ] Environment variables configured
- [ ] Secrets generated and secure
- [ ] Database configured and accessible
- [ ] SSL/TLS certificates configured
- [ ] Firewall rules configured
- [ ] Backup strategy implemented
- [ ] Monitoring configured

### Post-Deployment

- [ ] Health check passes
- [ ] Application accessible
- [ ] Dashboard functional
- [ ] Logs are being written
- [ ] Database is receiving data
- [ ] Backup system working
- [ ] Performance metrics acceptable

## Support

### Getting Help

1. Check the [troubleshooting section](#troubleshooting)
2. Review logs: `docker-compose logs -f`
3. Validate environment: `./scripts/validate-env.sh`
4. Check GitHub issues: [Bilan Issues](https://github.com/your-org/bilan/issues)

### Reporting Issues

When reporting deployment issues, please include:

- Operating system and version
- Docker and Docker Compose versions
- Environment configuration (sanitized)
- Error messages and logs
- Steps to reproduce

### Contributing

Contributions to improve deployment documentation and scripts are welcome! Please see [CONTRIBUTING.md](../CONTRIBUTING.md) for guidelines. 

## v0.4.2 Docker Secrets Setup

### Secure Credential Management

Bilan v0.4.2 supports Docker secrets for enhanced security in production:

#### **Environment Variables (Simple)**
```yaml
environment:
  - BILAN_API_KEY=${BILAN_API_KEY}
  - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
```

#### **Docker Secrets (Recommended for Production)**
```yaml
environment:
  - BILAN_API_KEY_FILE=/run/secrets/bilan_api_key
  - POSTGRES_PASSWORD_FILE=/run/secrets/postgres_password
secrets:
  - bilan_api_key
  - postgres_password

secrets:
  bilan_api_key:
    file: ./secrets/bilan_api_key.txt
  postgres_password:
    file: ./secrets/postgres_password.txt
```

#### **Setting Up Secrets**
```bash
# Create secrets directory
mkdir -p secrets

# Generate secure credentials
openssl rand -hex 32 > secrets/bilan_api_key.txt
openssl rand -base64 32 > secrets/postgres_password.txt

# Secure file permissions
chmod 600 secrets/*.txt
chown root:root secrets/*.txt  # If running as root

# Add to .gitignore
echo "secrets/" >> .gitignore
```

#### **Benefits of Docker Secrets**
- ✅ Credentials not visible in `docker inspect` output
- ✅ Files mounted in memory (not on disk)  
- ✅ Automatic rotation support
- ✅ Swarm mode compatibility
- ✅ Better security audit trail 