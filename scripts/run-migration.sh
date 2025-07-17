#!/bin/bash
set -euo pipefail

# Bilan Migration Runner Script
# Safely execute database migrations with rollback support

# Source shared color functions
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/colors.sh"

echo "🔄 Running Bilan database migrations..."

# Default values
MIGRATION_DIR="$SCRIPT_DIR/migrations"
DIRECTION="up"
MIGRATION_NAME=""
DB_TYPE="sqlite"
FORCE=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -d|--direction)
            if [ -z "${2-}" ]; then
                print_error "Direction argument required for -d|--direction option"
                exit 1
            fi
            DIRECTION="$2"
            shift 2
            ;;
        -m|--migration)
            if [ -z "${2-}" ]; then
                print_error "Migration name required for -m|--migration option"
                exit 1
            fi
            MIGRATION_NAME="$2"
            shift 2
            ;;
        -t|--type)
            if [ -z "${2-}" ]; then
                print_error "Database type required for -t|--type option"
                exit 1
            fi
            DB_TYPE="$2"
            shift 2
            ;;
        --force)
            FORCE=true
            shift
            ;;
        -h|--help)
            echo "Usage: $0 [OPTIONS]"
            echo "Options:"
            echo "  -d, --direction DIRECTION   Migration direction (up|down) [default: up]"
            echo "  -m, --migration MIGRATION   Specific migration to run"
            echo "  -t, --type TYPE             Database type (sqlite|postgresql) [default: sqlite]"
            echo "  --force                     Force migration without confirmation"
            echo "  -h, --help                  Show this help message"
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
    set -a
    source .env
    set +a
fi

# Set database paths
DB_PATH=${BILAN_DB_PATH:-${DB_PATH:-"./bilan.db"}}

# Check database type
if [ -n "${DATABASE_URL:-}" ] || [ -n "${POSTGRES_HOST:-}" ]; then
    DB_TYPE="postgresql"
fi

# Function to run SQLite migration
run_sqlite_migration() {
    local migration_file="$1"
    local migration_name="$2"
    
    if [ ! -f "$migration_file" ]; then
        print_error "Migration file not found: $migration_file"
        return 1
    fi
    
    print_status "Running SQLite migration: $migration_name"
    
    # Execute migration
    if sqlite3 "$DB_PATH" < "$migration_file"; then
        print_success "Migration completed: $migration_name"
        return 0
    else
        print_error "Migration failed: $migration_name"
        return 1
    fi
}

# Function to run PostgreSQL migration
run_postgresql_migration() {
    local migration_file="$1"
    local migration_name="$2"
    
    if [ ! -f "$migration_file" ]; then
        print_error "Migration file not found: $migration_file"
        return 1
    fi
    
    if ! command -v psql > /dev/null 2>&1; then
        print_error "psql not found. Please install PostgreSQL client tools."
        return 1
    fi
    
    print_status "Running PostgreSQL migration: $migration_name"
    
    # Execute migration
    if psql "${DATABASE_URL:-}" < "$migration_file"; then
        print_success "Migration completed: $migration_name"
        return 0
    else
        print_error "Migration failed: $migration_name"
        return 1
    fi
}

# Function to run specific migration
run_migration() {
    local migration_name="$1"
    local direction="$2"
    
    # Determine file extension based on database type
    local file_suffix=""
    if [ "$DB_TYPE" = "postgresql" ]; then
        file_suffix=".postgres"
    fi
    
    # Construct migration file path
    local migration_file="$MIGRATION_DIR/${migration_name}${file_suffix}.${direction}.sql"
    
    # Run migration based on database type
    if [ "$DB_TYPE" = "sqlite" ]; then
        run_sqlite_migration "$migration_file" "$migration_name"
    else
        run_postgresql_migration "$migration_file" "$migration_name"
    fi
}

# Function to validate migration before running
validate_migration() {
    local migration_name="$1"
    local direction="$2"
    
    # Check if migration files exist
    local file_suffix=""
    if [ "$DB_TYPE" = "postgresql" ]; then
        file_suffix=".postgres"
    fi
    
    local migration_file="$MIGRATION_DIR/${migration_name}${file_suffix}.${direction}.sql"
    
    if [ ! -f "$migration_file" ]; then
        print_error "Migration file not found: $migration_file"
        return 1
    fi
    
    print_status "Validating migration: $migration_name ($direction)"
    
    # Basic SQL syntax validation
    if [[ "$migration_file" == *.sql ]]; then
        if ! grep -q "CREATE TABLE\|DROP TABLE\|ALTER TABLE" "$migration_file"; then
            print_warning "Migration file may not contain expected SQL operations"
        fi
    fi
    
    return 0
}

# Function to create backup before migration
create_backup() {
    if [ "$DB_TYPE" = "sqlite" ] && [ -f "$DB_PATH" ]; then
        local backup_dir="backups/migrations/$(date +%Y%m%d_%H%M%S)"
        mkdir -p "$backup_dir"
        cp "$DB_PATH" "$backup_dir/bilan.db.backup"
        print_success "Database backed up to $backup_dir/bilan.db.backup"
    fi
}

# Main migration logic
main() {
    print_status "Starting migration process..."
    print_status "Database type: $DB_TYPE"
    print_status "Direction: $DIRECTION"
    
    # Create backup before migration
    if [ "$DIRECTION" = "up" ]; then
        create_backup
    fi
    
    # If specific migration is provided, run it
    if [ -n "$MIGRATION_NAME" ]; then
        if validate_migration "$MIGRATION_NAME" "$DIRECTION"; then
            if [ "$FORCE" = false ]; then
                print_warning "About to run migration: $MIGRATION_NAME ($DIRECTION)"
                read -p "Continue? (y/N): " -r
                if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                    print_error "Migration cancelled"
                    exit 1
                fi
            fi
            
            run_migration "$MIGRATION_NAME" "$DIRECTION"
        else
            print_error "Migration validation failed"
            exit 1
        fi
    else
        # Run all migrations in order
        local migrations=("001_create_events_table")
        
        for migration in "${migrations[@]}"; do
            if validate_migration "$migration" "$DIRECTION"; then
                run_migration "$migration" "$DIRECTION"
            else
                print_error "Migration validation failed: $migration"
                exit 1
            fi
        done
    fi
    
    print_success "🎉 Migration process completed successfully!"
}

# Run main function
main 