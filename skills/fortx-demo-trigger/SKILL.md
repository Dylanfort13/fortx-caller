# FortX Demo Trigger Skill

## Purpose
Triggered when a caller logs "demo agreed" in the app. Starts the Kiter pipeline for the lead and creates a commission record.

## Input
```json
{
  "caller_id": 1,
  "lead_id": 42,
  "prospect_email": "mike@mikesplumbing.com",
  "prospect_name": "Mike",
  "notes": "He mentioned he's losing clients to a competitor",
  "sheet_row": 42
}
```

## Logic

```
1. Validate email format (must contain @ and .)
2. Check if commission already exists for this lead+caller (prevent double-trigger)
3. Update leads table: status = 'demo_agreed'
4. Insert call_logs with outcome='demo_agreed', prospect_email, prospect_name, notes
5. Create commission record: status = 'potential', amount = 260.00 CAD
6. Update Google Sheet row:
   - Column P → prospectEmail
   - Column Q → contactName
   - Column R → status = 'demo_agreed'
   - Column T → notes from caller
7. Trigger fortx-workflow for this lead:
   - Pass prospect_email, contact_name, sheet_row, notes as context
8. Log: "Demo triggered by [caller_name] for [business_name] — Kiter pipeline started"
```

## On Demo Sent (after fortx-email runs)
- Update commissions: `status = 'pending_payout'`, `demo_sent_at = NOW()`
- Update Dylan's dashboard via dashboard.json

## Critical Rules
- The demo pipeline must NOT trigger twice for the same lead. Always check the commissions table first.
- Commission amounts are always 260.00 CAD.
- The Google Sheet remains source of truth for Kiter. Always update it alongside the DB.
