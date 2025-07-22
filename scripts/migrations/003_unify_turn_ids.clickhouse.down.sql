-- Migration: 003_unify_turn_ids ROLLBACK
-- Description: Rollback turn_id and promptId unification in vote events (ClickHouse)
-- Author: Bilan v0.4.1 Development Team
-- Date: 2024-01-18

-- Log rollback start
INSERT INTO events (event_id, user_id, event_type, timestamp, properties) 
VALUES (
  'migration_003_rollback_start_' || toString(toUnixTimestamp(now())) || '_' || toString(rand() % 1000),
  'system',
  'user_action',
  toUnixTimestamp(now()) * 1000,
  formatRow('JSON', 
    'migration', '003_unify_turn_ids',
    'phase', 'rollback_start',
    'vote_events_before_rollback', (SELECT count() FROM events WHERE event_type = 'vote_cast'),
    'votes_with_turn_id', (SELECT countIf(JSONHas(properties, 'turn_id')) FROM events WHERE event_type = 'vote_cast')
  )
);

-- Restore promptId from turn_id in vote events (ClickHouse ALTER TABLE UPDATE)
ALTER TABLE events UPDATE properties = JSONSet(
  JSONDelete(properties, 'turn_id'),
  'promptId', 
  JSONExtractString(properties, 'turn_id')
)
WHERE event_type = 'vote_cast' 
  AND JSONHas(properties, 'turn_id')
  AND JSONExtractString(properties, 'turn_id') != ''
  AND NOT match(JSONExtractString(properties, 'turn_id'), '^unknown_turn_');

-- Clean up turn_id fields in vote events  
ALTER TABLE events UPDATE properties = JSONDelete(properties, 'turn_id')
WHERE event_type = 'vote_cast' 
  AND JSONHas(properties, 'turn_id');

-- Verification: Check rollback results
CREATE TEMPORARY TABLE rollback_verification ENGINE = Memory AS
SELECT 
  count() as total_votes,
  countIf(JSONHas(properties, 'promptId')) as votes_with_promptId,
  countIf(JSONHas(properties, 'turn_id')) as votes_with_turn_id_remaining
FROM events 
WHERE event_type = 'vote_cast';

-- Log rollback completion
INSERT INTO events (event_id, user_id, event_type, timestamp, properties) 
VALUES (
  'migration_003_rollback_complete_' || toString(toUnixTimestamp(now())) || '_' || toString(rand() % 1000),
  'system',
  'user_action',
  toUnixTimestamp(now()) * 1000,
  (SELECT formatRow('JSON',
    'migration', '003_unify_turn_ids',
    'phase', 'rollback_complete',
    'total_votes', total_votes,
    'votes_with_promptId', votes_with_promptId,
    'votes_with_turn_id_remaining', votes_with_turn_id_remaining,
    'rollback_success', if(votes_with_turn_id_remaining = 0 AND votes_with_promptId > 0, 1, 0)
  ) FROM rollback_verification)
);

-- Final rollback verification
SELECT 
  'Migration 003 Rollback Results:' as status,
  total_votes,
  votes_with_promptId,
  votes_with_turn_id_remaining,
  multiIf(
    votes_with_turn_id_remaining = 0 AND votes_with_promptId > 0, 'SUCCESS',
    'NEEDS_REVIEW'
  ) as rollback_status
FROM rollback_verification;

-- Cleanup temp table
DROP TABLE rollback_verification;

-- Cleanup backup table (optional - uncomment if desired)
-- DROP TABLE IF EXISTS vote_events_backup; 