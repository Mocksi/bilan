-- Migration: 003_unify_turn_ids
-- Description: Bilan v0.4.1 - Unify turn_id and promptId in vote events
-- Author: Bilan v0.4.1 Development Team
-- Date: 2024-01-18

-- BEGIN TRANSACTION: Ensure all migration steps are atomic
BEGIN TRANSACTION;

-- Safety: Create backup table for vote events before migration
CREATE TABLE IF NOT EXISTS vote_events_backup AS 
SELECT * FROM events WHERE event_type = 'vote_cast';

-- Log pre-migration state
INSERT INTO events (event_id, user_id, event_type, timestamp, properties) 
VALUES (
  'migration_003_start_' || hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-' || hex(randomblob(2)) || '-' || hex(randomblob(2)) || '-' || hex(randomblob(6)) || '_' || strftime('%s%f', 'now') || substr(hex(randomblob(2)), 1, 3),
  'system',
  'user_action',
  strftime('%s', 'now') * 1000,
  json_object(
    'migration', '003_unify_turn_ids',
    'phase', 'start',
    'vote_events_before', (SELECT COUNT(*) FROM events WHERE event_type = 'vote_cast'),
    'votes_with_promptId', (SELECT COUNT(*) FROM events WHERE event_type = 'vote_cast' AND JSON_EXTRACT(properties, '$.promptId') IS NOT NULL),
    'votes_with_turnId', (SELECT COUNT(*) FROM events WHERE event_type = 'vote_cast' AND JSON_EXTRACT(properties, '$.turnId') IS NOT NULL)
  )
);

-- Update vote events to use turn_id instead of promptId
-- Handle different possible property structures for compatibility
UPDATE events 
SET properties = json_set(
  json_remove(properties, '$.promptId'),     -- Remove old promptId field
  '$.turn_id',                              -- Add new turn_id field  
  COALESCE(
    JSON_EXTRACT(properties, '$.turnId'),    -- Use existing turnId if present
    JSON_EXTRACT(properties, '$.promptId'),  -- Otherwise use promptId value
    'unknown_turn_' || event_id              -- Fallback for malformed data
  )
)
WHERE 
  event_type = 'vote_cast' AND 
  (JSON_EXTRACT(properties, '$.promptId') IS NOT NULL OR 
   JSON_EXTRACT(properties, '$.turnId') IS NOT NULL);

-- Clean up any remaining promptId fields in vote events
UPDATE events
SET properties = json_remove(properties, '$.promptId') 
WHERE event_type = 'vote_cast' 
  AND JSON_EXTRACT(properties, '$.promptId') IS NOT NULL;

-- Verification: Check migration results
CREATE TEMP TABLE migration_verification AS
SELECT 
  COUNT(*) as total_votes,
  COUNT(CASE WHEN JSON_EXTRACT(properties, '$.turn_id') IS NOT NULL THEN 1 END) as votes_with_turn_id,
  COUNT(CASE WHEN JSON_EXTRACT(properties, '$.promptId') IS NOT NULL THEN 1 END) as votes_with_promptId_remaining,
  COUNT(CASE WHEN JSON_EXTRACT(properties, '$.turnId') IS NOT NULL THEN 1 END) as votes_with_legacy_turnId
FROM events 
WHERE event_type = 'vote_cast';

-- Log post-migration state
INSERT INTO events (event_id, user_id, event_type, timestamp, properties) 
VALUES (
  'migration_003_complete_' || hex(randomblob(4)) || '-' || hex(randomblob(2)) || '-' || hex(randomblob(2)) || '-' || hex(randomblob(2)) || '-' || hex(randomblob(6)) || '_' || strftime('%s%f', 'now') || substr(hex(randomblob(2)), 1, 3),
  'system',
  'user_action',
  strftime('%s', 'now') * 1000,
  (SELECT json_object(
    'migration', '003_unify_turn_ids',
    'phase', 'complete',
    'total_votes', total_votes,
    'votes_with_turn_id', votes_with_turn_id,
    'votes_with_promptId_remaining', votes_with_promptId_remaining,
    'migration_success', CASE WHEN votes_with_promptId_remaining = 0 AND votes_with_turn_id > 0 THEN 1 ELSE 0 END
  ) FROM migration_verification)
);

-- Final verification (SQLite compatible)
SELECT 
  'Migration 003 Results:' as status,
  total_votes,
  votes_with_turn_id,
  votes_with_promptId_remaining,
  CASE 
    WHEN votes_with_promptId_remaining = 0 AND votes_with_turn_id > 0 
    THEN 'SUCCESS' 
    ELSE 'NEEDS_REVIEW' 
  END as migration_status
FROM migration_verification;

-- Cleanup temp table
DROP TABLE migration_verification;

-- COMMIT TRANSACTION: All migration steps completed successfully
COMMIT; 