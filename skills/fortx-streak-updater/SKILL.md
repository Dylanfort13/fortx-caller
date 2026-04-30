# FortX Streak Updater Skill

## Purpose
Runs nightly via Kiter heartbeat (e.g., midnight local time). Updates caller streaks based on call activity.

## Trigger
- `{trigger: "nightly_streak_update"}` — Called by Kiter's heartbeat at midnight

## Logic

```
For each active caller:
  1. Check if any call_logs exist with called_at::DATE = CURRENT_DATE - 1
  2. If yes: increment current_streak by 1, update last_call_date
  3. If no: reset current_streak to 0
  4. Update longest_streak if current_streak > longest_streak
  5. Update caller_streaks table
```

## SQL Implementation

```sql
-- Check yesterday's calls for all callers
SELECT caller_id, COUNT(*) as call_count
FROM call_logs
WHERE called_at::DATE = CURRENT_DATE - 1
GROUP BY caller_id;

-- For callers with calls yesterday:
UPDATE caller_streaks
SET current_streak = current_streak + 1,
    longest_streak = GREATEST(longest_streak, current_streak + 1),
    last_call_date = CURRENT_DATE - 1,
    updated_at = NOW()
WHERE caller_id = ANY(caller_ids_with_calls);

-- For callers without calls yesterday:
UPDATE caller_streaks
SET current_streak = 0,
    updated_at = NOW()
WHERE caller_id != ALL(caller_ids_with_calls);
```

## Edge Cases
- New callers with no streak record: INSERT is handled by seed_callers.py
- Caller who has never called: streak stays at 0
- Streak resets happen even on weekends (no special weekend logic)
