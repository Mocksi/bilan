#!/bin/bash
set -e

# Bilan Database Migration Script
# Handles database initialization and migrations

echo "🗄️  Running Bilan database migrations..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Default values
ENVIRONMENT="production"
FORCE_RESET=false
BACKUP_BEFORE_MIGRATION=true

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--env)
            ENVIRONMENT="$2"
            shift 2
            ;;
        --force-reset)
            FORCE_RESET=true
            shift
            ;;
        --no-backup)
            BACKUP_BEFORE_MIGRATION=false
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  -e, --env ENVIRONMENT    Set environment (development|production) [default: production]"
            echo "  --force-reset           Reset database (WARNING: destroys all data)"
            echo "  --no-backup             Skip backup before migration"
            echo "  -h, --help              Show this help message"
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            echo "Use -h or --help for usage information"
            exit 1
            ;;
    esac
done

# Load environment variables
if [ -f ".env" ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Set default database path if not provided
DB_PATH=${DB_PATH:-"./bilan.db"}

# Check database type
if [ -n "$DATABASE_URL" ] || [ -n "$POSTGRES_HOST" ]; then
    DB_TYPE="postgresql"
    print_status "Using PostgreSQL database"
else
    DB_TYPE="sqlite"
    print_status "Using SQLite database at: $DB_PATH"
fi

# Function to check if database exists
check_database_exists() {
    if [ "$DB_TYPE" = "sqlite" ]; then
        [ -f "$DB_PATH" ]
    else
        # For PostgreSQL, check if we can connect
        if command -v psql > /dev/null 2>&1; then
            psql "$DATABASE_URL" -c "SELECT 1;" > /dev/null 2>&1
        else
            print_warning "psql not found, skipping database connectivity check"
            return 0
        fi
    fi
}

# Function to backup database
backup_database() {
    if [ "$BACKUP_BEFORE_MIGRATION" = false ]; then
        return 0
    fi
    
    print_status "Creating database backup..."
    BACKUP_DIR="backups/db/$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$BACKUP_DIR"
    
    if [ "$DB_TYPE" = "sqlite" ] && [ -f "$DB_PATH" ]; then
        cp "$DB_PATH" "$BACKUP_DIR/bilan.db.backup"
        print_success "SQLite database backed up to $BACKUP_DIR/bilan.db.backup"
    elif [ "$DB_TYPE" = "postgresql" ]; then
        if command -v pg_dump > /dev/null 2>&1; then
            pg_dump "$DATABASE_URL" > "$BACKUP_DIR/bilan.sql"
            print_success "PostgreSQL database backed up to $BACKUP_DIR/bilan.sql"
        else
            print_warning "pg_dump not found, skipping PostgreSQL backup"
        fi
    fi
}

# Function to initialize SQLite database
init_sqlite_database() {
    print_status "Initializing SQLite database..."
    
    # Create database directory if it doesn't exist
    DB_DIR=$(dirname "$DB_PATH")
    mkdir -p "$DB_DIR"
    
    # Create tables using SQL
    sqlite3 "$DB_PATH" << 'EOF'
-- Enable foreign key support
PRAGMA foreign_keys = ON;

-- Create conversations table
CREATE TABLE IF NOT EXISTS conversations (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    journey_id TEXT,
    journey_name TEXT,
    success_outcome BOOLEAN,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    ended_at INTEGER,
    metadata TEXT
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    metadata TEXT,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);

-- Create feedback_events table
CREATE TABLE IF NOT EXISTS feedback_events (
    id TEXT PRIMARY KEY,
    conversation_id TEXT,
    message_id TEXT,
    user_id TEXT NOT NULL,
    event_type TEXT NOT NULL CHECK (event_type IN ('vote', 'regeneration', 'frustration', 'success')),
    rating INTEGER,
    comment TEXT,
    created_at INTEGER NOT NULL,
    metadata TEXT,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
);

-- Create journey_steps table
CREATE TABLE IF NOT EXISTS journey_steps (
    id TEXT PRIMARY KEY,
    journey_id TEXT NOT NULL,
    journey_name TEXT NOT NULL,
    step_name TEXT NOT NULL,
    user_id TEXT NOT NULL,
    conversation_id TEXT,
    completed BOOLEAN DEFAULT FALSE,
    created_at INTEGER NOT NULL,
    metadata TEXT,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE SET NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_journey_name ON conversations(journey_name);
CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON conversations(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_feedback_events_conversation_id ON feedback_events(conversation_id);
CREATE INDEX IF NOT EXISTS idx_feedback_events_created_at ON feedback_events(created_at);
CREATE INDEX IF NOT EXISTS idx_journey_steps_journey_name ON journey_steps(journey_name);
CREATE INDEX IF NOT EXISTS idx_journey_steps_user_id ON journey_steps(user_id);
CREATE INDEX IF NOT EXISTS idx_journey_steps_created_at ON journey_steps(created_at);
EOF
    
    print_success "SQLite database initialized successfully"
}

# Function to initialize PostgreSQL database
init_postgresql_database() {
    print_status "Initializing PostgreSQL database..."
    
    if ! command -v psql > /dev/null 2>&1; then
        print_error "psql not found. Please install PostgreSQL client tools."
        exit 1
    fi
    
    # Create tables using SQL
    psql "$DATABASE_URL" << 'EOF'
-- Create conversations table
CREATE TABLE IF NOT EXISTS conversations (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    journey_id VARCHAR(255),
    journey_name VARCHAR(255),
    success_outcome BOOLEAN,
    created_at BIGINT NOT NULL,
    updated_at BIGINT NOT NULL,
    ended_at BIGINT,
    metadata JSONB
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
    id VARCHAR(255) PRIMARY KEY,
    conversation_id VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    created_at BIGINT NOT NULL,
    metadata JSONB,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
);

-- Create feedback_events table
CREATE TABLE IF NOT EXISTS feedback_events (
    id VARCHAR(255) PRIMARY KEY,
    conversation_id VARCHAR(255),
    message_id VARCHAR(255),
    user_id VARCHAR(255) NOT NULL,
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('vote', 'regeneration', 'frustration', 'success')),
    rating INTEGER,
    comment TEXT,
    created_at BIGINT NOT NULL,
    metadata JSONB,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
);

-- Create journey_steps table
CREATE TABLE IF NOT EXISTS journey_steps (
    id VARCHAR(255) PRIMARY KEY,
    journey_id VARCHAR(255) NOT NULL,
    journey_name VARCHAR(255) NOT NULL,
    step_name VARCHAR(255) NOT NULL,
    user_id VARCHAR(255) NOT NULL,
    conversation_id VARCHAR(255),
    completed BOOLEAN DEFAULT FALSE,
    created_at BIGINT NOT NULL,
    metadata JSONB,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE SET NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_journey_name ON conversations(journey_name);
CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON conversations(created_at);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_feedback_events_conversation_id ON feedback_events(conversation_id);
CREATE INDEX IF NOT EXISTS idx_feedback_events_created_at ON feedback_events(created_at);
CREATE INDEX IF NOT EXISTS idx_journey_steps_journey_name ON journey_steps(journey_name);
CREATE INDEX IF NOT EXISTS idx_journey_steps_user_id ON journey_steps(user_id);
CREATE INDEX IF NOT EXISTS idx_journey_steps_created_at ON journey_steps(created_at);
EOF
    
    print_success "PostgreSQL database initialized successfully"
}

# Function to reset database
reset_database() {
    if [ "$FORCE_RESET" = false ]; then
        return 0
    fi
    
    print_warning "⚠️  FORCE RESET: This will destroy all data in the database!"
    
    if [ "$DB_TYPE" = "sqlite" ]; then
        if [ -f "$DB_PATH" ]; then
            rm "$DB_PATH"
            print_success "SQLite database reset"
        fi
    else
        print_error "PostgreSQL reset not implemented for safety. Please reset manually."
        exit 1
    fi
}

# Main migration logic
main() {
    print_status "Starting database migration for environment: $ENVIRONMENT"
    
    # Check if database exists
    if check_database_exists; then
        print_status "Database exists, checking for migrations..."
        
        # Backup before migration
        backup_database
        
        # Reset if requested
        reset_database
    else
        print_status "Database does not exist, creating new database..."
    fi
    
    # Initialize database
    if [ "$DB_TYPE" = "sqlite" ]; then
        init_sqlite_database
    else
        init_postgresql_database
    fi
    
    # Verify database initialization
    if [ "$DB_TYPE" = "sqlite" ]; then
        if [ -f "$DB_PATH" ]; then
            table_count=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';")
            if [ "$table_count" -ge 4 ]; then
                print_success "Database verification passed: $table_count tables created"
            else
                print_error "Database verification failed: expected 4+ tables, found $table_count"
                exit 1
            fi
        else
            print_error "Database file not found after initialization"
            exit 1
        fi
    else
        print_success "PostgreSQL database migration completed"
    fi
    
    print_success "🎉 Database migration completed successfully!"
    echo ""
    echo "📊 Database Information:"
    echo "========================"
    echo "Type: $DB_TYPE"
    if [ "$DB_TYPE" = "sqlite" ]; then
        echo "Path: $DB_PATH"
        echo "Size: $(du -h "$DB_PATH" | cut -f1)"
    else
        echo "URL: $DATABASE_URL"
    fi
}

# Run main function
main 