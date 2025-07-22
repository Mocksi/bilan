-- Migration: 003_unify_turn_ids (PostgreSQL)
-- Description: Bilan v0.4.1 - Unify turn_id and promptId in vote events
-- Author: Bilan v0.4.1 Development Team
-- Date: 2024-01-18

-- BEGIN TRANSACTION: Ensure all migration steps are atomic
BEGIN;

-- Safety: Create backup table for vote events before migration
CREATE TABLE IF NOT EXISTS vote_events_backup AS 
SELECT * FROM events WHERE event_type = 'vote_cast';

-- Log pre-migration state
INSERT INTO events (event_id, user_id, event_type, timestamp, properties) 
VALUES (
  'migration_003_start_' || md5(random()::text || clock_timestamp()::text || pg_backend_pid()::text),
  'system',
  'user_action',
  EXTRACT(EPOCH FROM NOW())::BIGINT * 1000,
  jsonb_build_object(
    'migration', '003_unify_turn_ids',
    'phase', 'start',
    'vote_events_before', (SELECT COUNT(*) FROM events WHERE event_type = 'vote_cast'),
    'votes_with_promptId', (SELECT COUNT(*) FROM events WHERE event_type = 'vote_cast' AND properties ? 'promptId'),
    'votes_with_turnId', (SELECT COUNT(*) FROM events WHERE event_type = 'vote_cast' AND properties ? 'turnId')
  )
)
ON CONFLICT (event_id) DO NOTHING;

-- Update vote events to use turn_id instead of promptId
-- Handle different possible property structures for compatibility
UPDATE events 
SET properties = properties 
  - 'promptId'                              -- Remove old promptId field
  || jsonb_build_object('turn_id', COALESCE(
    properties->>'turnId',                  -- Use existing turnId if present
    properties->>'promptId',                -- Otherwise use promptId value
    'unknown_turn_' || event_id             -- Fallback for malformed data
  ))
WHERE 
  event_type = 'vote_cast' AND 
  (properties ? 'promptId' OR properties ? 'turnId');

-- Clean up any remaining legacy turnId fields in vote events
UPDATE events
SET properties = properties - 'turnId'
WHERE event_type = 'vote_cast' 
  AND properties ? 'turnId'
  AND properties ? 'turn_id';

-- Verification: Check migration results
CREATE TEMP TABLE migration_verification AS
SELECT 
  COUNT(*) as total_votes,
  COUNT(CASE WHEN properties ? 'turn_id' THEN 1 END) as votes_with_turn_id,
  COUNT(CASE WHEN properties ? 'promptId' THEN 1 END) as votes_with_promptId_remaining,
  COUNT(CASE WHEN properties ? 'turnId' THEN 1 END) as votes_with_legacy_turnId
FROM events 
WHERE event_type = 'vote_cast';

-- Log post-migration state
INSERT INTO events (event_id, user_id, event_type, timestamp, properties) 
VALUES (
  'migration_003_complete_' || md5(random()::text || clock_timestamp()::text || pg_backend_pid()::text),
  'system',
  'user_action',
  EXTRACT(EPOCH FROM NOW())::BIGINT * 1000,
  (SELECT jsonb_build_object(
    'migration', '003_unify_turn_ids',
    'phase', 'complete',
    'total_votes', total_votes,
    'votes_with_turn_id', votes_with_turn_id,
    'votes_with_promptId_remaining', votes_with_promptId_remaining,
    'migration_success', CASE WHEN votes_with_promptId_remaining = 0 AND votes_with_turn_id > 0 THEN 1 ELSE 0 END
  ) FROM migration_verification)
)
ON CONFLICT (event_id) DO NOTHING;

-- Final verification with error handling
DO $$
DECLARE
  vote_count INTEGER;
  migrated_count INTEGER;
  remaining_promptid_count INTEGER;
BEGIN
  SELECT total_votes, votes_with_turn_id, votes_with_promptId_remaining 
  INTO vote_count, migrated_count, remaining_promptid_count
  FROM migration_verification;
  
  RAISE NOTICE 'Migration 003 complete: % total votes, % with turn_id, % with promptId remaining', 
    vote_count, migrated_count, remaining_promptid_count;
  
  IF remaining_promptid_count > 0 THEN
    RAISE WARNING 'Migration incomplete: % votes still have promptId', remaining_promptid_count;
  END IF;
  
  IF migrated_count < vote_count THEN
    RAISE WARNING 'Some votes may be missing turn_id: expected %, got %', vote_count, migrated_count;
  END IF;
END $$;

-- Cleanup temp table
DROP TABLE migration_verification;

-- COMMIT TRANSACTION: All migration steps completed successfully
COMMIT; 