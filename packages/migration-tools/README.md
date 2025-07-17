# @bilan/migration-tools

Migration tools for upgrading Bilan from v0.3.x to v0.4.0.

## Overview

This package provides utilities to migrate Bilan analytics data from the v0.3.x vote-centric schema to the v0.4.0 event-based schema. The migration preserves all existing data while transforming it to the new flexible event format.

## Installation

```bash
npm install @bilan/migration-tools
```

## CLI Usage

### Validate Database

Check the integrity of your v0.3.x database:

```bash
bilan-migrate validate --db-path ./bilan.db
```

### View Statistics

Get detailed statistics about your v0.3.x database:

```bash
bilan-migrate stats --db-path ./bilan.db --verbose
```

### Extract Data (Dry Run)

Preview the data extraction process:

```bash
bilan-migrate extract --db-path ./bilan.db --batch-size 1000 --verbose
```

### Convert Data (Dry Run)

Preview the conversion process:

```bash
bilan-migrate convert --source ./bilan.db --target ./bilan-v4.db --verbose
```

### Perform Migration

Run the full migration:

```bash
bilan-migrate migrate --source ./bilan.db --target ./bilan-v4.db --verbose
```

### Validation Commands

Validate migration readiness:

```bash
bilan-migrate validate-pre --source ./bilan.db --target ./bilan-v4.db
```

Validate migration integrity after completion:

```bash
bilan-migrate validate-post --source ./bilan.db --target ./bilan-v4.db
```

Validate migration by comparing databases:

```bash
bilan-migrate validate-migration --source ./bilan.db --target ./bilan-v4.db
```

### Rollback Commands

Rollback migration and restore v0.3.x database:

```bash
bilan-migrate rollback --source ./bilan.db --target ./bilan-v4.db --verify
```

### Reports

Generate comprehensive migration report:

```bash
bilan-migrate report --source ./bilan.db --target ./bilan-v4.db --output ./report.json
```

## Programmatic Usage

```typescript
import { 
  V3DataExtractor,
  BilanMigrator,
  RollbackManager,
  MigrationValidator 
} from '@bilan/migration-tools'

// Extract data
const extractor = new V3DataExtractor({
  sourceDbPath: './bilan.db',
  targetDbPath: './bilan-v4.db',
  batchSize: 1000,
  verbose: true
})

// Validate database integrity
const validation = extractor.validateV3Database()
if (!validation.isValid) {
  console.error('Database validation failed:', validation.errors)
  process.exit(1)
}

// Extract data in batches
for await (const batch of extractor.extractVoteEvents()) {
  console.log(`Processing batch of ${batch.length} events`)
  // Process each batch of V3VoteEvent objects
}

// Full migration
const migrator = new BilanMigrator({
  sourceDbPath: './bilan.db',
  targetDbPath: './bilan-v4.db',
  verbose: true
})

const stats = await migrator.migrate()
console.log(`Migrated ${stats.conversionSummary.votesToVoteCast} events`)

// Rollback if needed
const rollbackManager = new RollbackManager({
  sourceDbPath: './bilan.db',
  targetDbPath: './bilan-v4.db'
})

await rollbackManager.performFullRollback()

// Validation
const validator = new MigrationValidator({
  sourceDbPath: './bilan.db',
  targetDbPath: './bilan-v4.db'
})

const preValidation = await validator.validatePreMigration()
if (preValidation.isValid) {
  console.log('Ready for migration')
}

extractor.close()
```

## Migration Process

The migration transforms v0.3.x data as follows:

1. **Vote Events** → **`vote_cast` events** in v0.4.0
2. **Fixed columns** → **JSONB properties**
3. **Metadata TEXT** → **Properties JSONB**
4. **Preserve all content** (prompts, responses, comments)

### Schema Transformation

**v0.3.x Schema:**
```sql
CREATE TABLE events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  prompt_id TEXT NOT NULL,
  value INTEGER NOT NULL,
  comment TEXT,
  timestamp INTEGER NOT NULL,
  metadata TEXT,
  prompt_text TEXT,
  ai_output TEXT,
  model_used TEXT,
  response_time REAL
);
```

**v0.4.0 Schema:**
```sql
CREATE TABLE events (
  event_id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  event_type TEXT NOT NULL,
  timestamp BIGINT NOT NULL,
  properties JSONB,
  prompt_text TEXT,
  ai_response TEXT
);
```

## Data Validation

The migration tools include comprehensive validation:

- **Schema validation**: Ensures required tables and columns exist
- **Data integrity**: Checks for null values in required fields
- **Value validation**: Ensures vote values are 1 or -1
- **JSON validation**: Validates metadata JSON format
- **Statistics**: Provides detailed analytics about the migration

## Migration Safety Features

### Pre-Migration Validation

- **Database readiness**: Validates v0.3.x database integrity
- **Disk space**: Checks sufficient disk space for migration
- **Permissions**: Validates file read/write permissions
- **Checkpoint creation**: Creates safety checkpoint before migration

### Post-Migration Validation

- **Data integrity**: Compares v0.3.x and v0.4.0 data counts
- **Schema compliance**: Validates v0.4.0 schema integrity
- **Performance validation**: Tests query performance
- **Migration accuracy**: Calculates data preservation scores

### Rollback Protection

- **Automatic checkpoints**: Creates backup before migration
- **Safe rollback procedures**: Restores original database
- **Rollback verification**: Validates rollback integrity
- **Multiple recovery options**: Supports various rollback scenarios

## Progress Tracking

The migration process includes:

- **Batch processing**: Configurable batch sizes for memory efficiency
- **Progress tracking**: Real-time progress updates with ETA
- **Error handling**: Comprehensive error logging and recovery
- **Checkpoint management**: Automatic checkpoint creation and validation
- **Validation reports**: Detailed pre/post migration reports

## Development

```bash
# Install dependencies
npm install

# Run tests
npm test

# Build package
npm run build

# Run CLI in development
npm run dev -- validate --db-path ./test.db
```

## License

MIT 