# FortX Lead Manager Skill

## Purpose
Manages the 30-lead batch system for callers. Called by the caller app webhook when a caller requests more leads, and by Kiter's heartbeat for nightly stuck-batch checks.

## Triggers
- `{trigger: "batch_request", caller_id: <int>}` — Caller requested a new batch
- `{trigger: "heartbeat_stuck_check"}` — Nightly check for stuck batches

## Logic: batch_request

```
When triggered with {caller_id, action: "request_batch"}:
  1. Check how many unassigned leads exist in DB
  2. Check if caller has <5 unassigned leads remaining in current batch
  3. If eligible: pick next 30 unassigned leads (ordered by sheet_row)
     - Prioritize leads in same state as caller's previous successes
     - Ensure no lead is assigned to two callers simultaneously (use DB lock: FOR UPDATE SKIP LOCKED)
  4. Mark those 30 leads as assigned to caller_id
  5. Create a new lead_batch record
  6. Notify caller app via webhook (POST to app API endpoint)
  7. Log to lessons-learned if fewer than 50 unassigned leads remain globally
```

## Lead Assignment Rules
- Jonathan and Kevin NEVER get the same lead
- Leads already called (any status except 'unassigned') are never re-assigned
- If fewer than 30 unassigned leads remain, assign all remaining and alert Dylan
- Dylan gets his own separate pool if he uses the app to call

## Database Operations
All operations go through `scripts/db.py` → `assign_leads(caller_id, count)`.

The SQL uses `FOR UPDATE SKIP LOCKED` to prevent concurrent assignment of the same lead to two callers.

## Stuck Batch Detection (heartbeat)
```
For each lead_batches where completed_at IS NULL AND requested_at < NOW() - INTERVAL '48 hours':
  1. Count how many leads in the batch still have status = 'assigned'
  2. If all called: set completed_at = NOW(), leads_called = count
  3. If stuck: notify Dylan, optionally re-assign unassigned leads
```
