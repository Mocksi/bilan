-- Migration: 003_unify_turn_ids
-- Description: Bilan v0.4.1 - Unify turn_id and promptId in vote events (ClickHouse)
-- Author: Bilan v0.4.1 Development Team
-- Date: 2024-01-18

-- Safety: Create backup table for vote events before migration (ClickHouse syntax)
CREATE TABLE IF NOT EXISTS vote_events_backup ENGINE = MergeTree()
ORDER BY (event_id, timestamp)
AS SELECT * FROM events WHERE event_type = 'vote_cast';

-- Log pre-migration state (ClickHouse JSON functions)
INSERT INTO events (event_id, user_id, event_type, timestamp, properties) 
VALUES (
  'migration_003_start_' || toString(toUnixTimestamp(now())) || '_' || toString(rand() % 1000),
  'system',
  'user_action',
  toUnixTimestamp(now()) * 1000,
  formatRow('JSON', 
    'migration', '003_unify_turn_ids',
    'phase', 'start',
    'vote_events_before', (SELECT count() FROM events WHERE event_type = 'vote_cast'),
    'votes_with_promptId', (SELECT countIf(JSONHas(properties, 'promptId')) FROM events WHERE event_type = 'vote_cast'),
    'votes_with_turnId', (SELECT countIf(JSONHas(properties, 'turnId')) FROM events WHERE event_type = 'vote_cast')
  )
);

-- Update vote events to use turn_id instead of promptId (ClickHouse ALTER TABLE UPDATE)
-- Handle different possible property structures for compatibility
ALTER TABLE events UPDATE properties = JSONDelete(
  JSONSet(
    properties,
    'turn_id', 
    multiIf(
      JSONHas(properties, 'turnId'), JSONExtractString(properties, 'turnId'),
      JSONHas(properties, 'promptId'), JSONExtractString(properties, 'promptId'),
      'unknown_turn_' || event_id
    )
  ),
  'promptId'
)
WHERE event_type = 'vote_cast' 
  AND NOT JSONHas(properties, 'turn_id')
  AND (JSONHas(properties, 'promptId') OR JSONHas(properties, 'turnId'));

-- Clean up any remaining promptId fields in vote events
ALTER TABLE events UPDATE properties = JSONDelete(properties, 'promptId')
WHERE event_type = 'vote_cast' 
  AND JSONHas(properties, 'promptId');

-- Verification: Check migration results (ClickHouse aggregation functions)
CREATE TEMPORARY TABLE migration_verification ENGINE = Memory AS
SELECT 
  count() as total_votes,
  countIf(JSONHas(properties, 'turn_id')) as votes_with_turn_id,
  countIf(JSONHas(properties, 'promptId')) as votes_with_promptId_remaining,
  countIf(JSONHas(properties, 'turnId')) as votes_with_legacy_turnId
FROM events 
WHERE event_type = 'vote_cast';

-- Log post-migration state
INSERT INTO events (event_id, user_id, event_type, timestamp, properties) 
VALUES (
  'migration_003_complete_' || toString(toUnixTimestamp(now())) || '_' || toString(rand() % 1000),
  'system',
  'user_action',
  toUnixTimestamp(now()) * 1000,
  (SELECT formatRow('JSON',
    'migration', '003_unify_turn_ids',
    'phase', 'complete',
    'total_votes', total_votes,
    'votes_with_turn_id', votes_with_turn_id,
    'votes_with_promptId_remaining', votes_with_promptId_remaining,
    'migration_success', if(votes_with_promptId_remaining = 0 AND votes_with_turn_id > 0, 1, 0)
  ) FROM migration_verification)
);

-- Final verification (ClickHouse-compatible)
SELECT 
  'Migration 003 Results:' as status,
  total_votes,
  votes_with_turn_id,
  votes_with_promptId_remaining,
  multiIf(
    votes_with_promptId_remaining = 0 AND votes_with_turn_id > 0, 'SUCCESS',
    'NEEDS_REVIEW'
  ) as migration_status
FROM migration_verification;

-- Cleanup temp table
DROP TABLE migration_verification;

-- Performance optimization: Improve compression after migration
-- Uncomment for production deployments to improve query performance after large-scale property changes
-- OPTIMIZE TABLE events FINAL; 