-- Migration Rollback: 003_unify_turn_ids (PostgreSQL)
-- Description: Rollback turn_id unification - restore promptId format
-- Author: Bilan v0.4.1 Development Team
-- Date: 2024-01-18

-- BEGIN TRANSACTION: Ensure all rollback steps are atomic
BEGIN;

-- Log rollback start
INSERT INTO events (event_id, user_id, event_type, timestamp, properties) 
VALUES (
  'migration_003_rollback_' || EXTRACT(EPOCH FROM NOW())::TEXT || '_' || (random() * 1000)::INTEGER,
  'system',
  'user_action',
  EXTRACT(EPOCH FROM NOW())::BIGINT * 1000,
  jsonb_build_object(
    'migration', '003_unify_turn_ids',
    'phase', 'rollback_start',
    'vote_events_before_rollback', (SELECT COUNT(*) FROM events WHERE event_type = 'vote_cast'),
    'votes_with_turn_id', (SELECT COUNT(*) FROM events WHERE event_type = 'vote_cast' AND properties ? 'turn_id')
  )
)
ON CONFLICT (event_id) DO NOTHING;

-- Restore vote events from backup if available
-- Note: We only need to restore vote_cast events since non-vote events weren't modified

-- Delete current vote events
DELETE FROM events WHERE event_type = 'vote_cast';

-- Restore vote events from backup table (with conflict resolution for safety)
INSERT INTO events 
SELECT * FROM vote_events_backup 
WHERE event_type = 'vote_cast'
ON CONFLICT (event_id) DO NOTHING;

-- Note: Non-vote events are already in the events table and don't need restoration
-- since they were never modified during the forward migration

-- Log rollback completion
INSERT INTO events (event_id, user_id, event_type, timestamp, properties) 
VALUES (
  'migration_003_rollback_complete_' || EXTRACT(EPOCH FROM NOW())::TEXT || '_' || (random() * 1000)::INTEGER,
  'system',
  'user_action',
  EXTRACT(EPOCH FROM NOW())::BIGINT * 1000,
  jsonb_build_object(
    'migration', '003_unify_turn_ids',
    'phase', 'rollback_complete',
    'vote_events_restored', (SELECT COUNT(*) FROM events WHERE event_type = 'vote_cast'),
    'votes_with_promptId', (SELECT COUNT(*) FROM events WHERE event_type = 'vote_cast' AND properties ? 'promptId')
  )
)
ON CONFLICT (event_id) DO NOTHING;

-- Verify rollback
SELECT 
  'Rollback 003 Results:' as status,
  COUNT(*) as total_votes,
  COUNT(CASE WHEN properties ? 'promptId' THEN 1 END) as votes_with_promptId,
  COUNT(CASE WHEN properties ? 'turn_id' THEN 1 END) as votes_with_turn_id_remaining,
  CASE 
    WHEN COUNT(CASE WHEN properties ? 'promptId' THEN 1 END) > 0 
    THEN 'ROLLBACK_SUCCESS' 
    ELSE 'ROLLBACK_FAILED' 
  END as rollback_status
FROM events 
WHERE event_type = 'vote_cast';

-- COMMIT TRANSACTION: All rollback steps completed successfully
COMMIT; 