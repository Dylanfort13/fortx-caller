# FortX Caller App — Full Build Plan
## Task Plan for OpenCode Execution

> **Scope:** Database migration, OpenClaw workflow updates, Caller PWA, Dylan Admin Dashboard integration.
> **Stack:** Neon (PostgreSQL), Vanilla JS/HTML/CSS PWA, Python scripts, GitHub Pages hosting.
> **Callers:** Jonathan, Kevin, Dylan (admin caller view).

---

## PHASE 0 — Read Before Anything Else

Before writing any code, OpenCode must read these files in order:

1. `/home/node/.openclaw/workspace/fortx/data/dashboard.json` — current pipeline state
2. `/home/node/.openclaw/workspace/fortx/skills/fortx-workflow/SKILL.md` — master orchestrator
3. `/home/node/.openclaw/workspace/fortx/skills/fortx-lead-lookup/SKILL.md` — lead access
4. `/home/node/.openclaw/workspace/fortx/skills/fortx-email/SKILL.md` — follow-up system
5. The Google Sheet structure (columns A–T as documented in business context)
6. `/home/node/.openclaw/workspace/fortx/data/lessons-learned.md`

Do not proceed to Phase 1 until all are read.

---

## PHASE 1 — Database Setup (Neon PostgreSQL)

**Goal:** Migrate lead data from Google Sheets into a proper relational database that both the caller app and Kiter can read/write.

### 1.1 — Create Neon Project

- Create a new Neon project named `fortx-callerapp`
- Save the connection string to `/home/node/.openclaw/workspace/fortx/config/neon.env`
- Format: `DATABASE_URL=postgresql://...`

### 1.2 — Schema Design

Create the following tables:

```sql
-- Callers (Jonathan, Kevin, Dylan, future additions)
CREATE TABLE callers (
  id          SERIAL PRIMARY KEY,
  name        TEXT NOT NULL,
  pin         TEXT NOT NULL,              -- bcrypt hashed 4-digit PIN
  role        TEXT DEFAULT 'caller',      -- 'caller' | 'admin'
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Leads (migrated from Google Sheet)
CREATE TABLE leads (
  id              SERIAL PRIMARY KEY,
  sheet_row       INTEGER UNIQUE,          -- original Google Sheet row number
  business_name   TEXT NOT NULL,
  phone           TEXT,
  address         TEXT,
  city            TEXT,
  state           TEXT,
  country         TEXT DEFAULT 'US',
  category        TEXT,
  google_maps_url TEXT,
  website         TEXT,
  google_rating   NUMERIC(2,1),
  reviews_count   INTEGER,
  status          TEXT DEFAULT 'unassigned', -- 'unassigned'|'assigned'|'called'|'no_answer'|'not_interested'|'demo_agreed'|'closed'
  assigned_to     INTEGER REFERENCES callers(id),
  assigned_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Call logs (one row per call attempt)
CREATE TABLE call_logs (
  id              SERIAL PRIMARY KEY,
  lead_id         INTEGER REFERENCES leads(id),
  caller_id       INTEGER REFERENCES callers(id),
  outcome         TEXT NOT NULL,           -- 'no_answer'|'not_interested'|'demo_agreed'|'callback'
  prospect_email  TEXT,                    -- filled if demo_agreed
  prospect_name   TEXT,                    -- optional
  notes           TEXT,                    -- optional comment for Kiter
  called_at       TIMESTAMPTZ DEFAULT NOW()
);

-- Commissions
CREATE TABLE commissions (
  id              SERIAL PRIMARY KEY,
  caller_id       INTEGER REFERENCES callers(id),
  lead_id         INTEGER REFERENCES leads(id),
  call_log_id     INTEGER REFERENCES call_logs(id),
  amount_cad      NUMERIC(10,2) DEFAULT 260.00,
  status          TEXT DEFAULT 'potential', -- 'potential'|'pending_payout'|'paid'
  demo_sent_at    TIMESTAMPTZ,
  closed_at       TIMESTAMPTZ,
  paid_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Batch assignments (track 30-lead batches)
CREATE TABLE lead_batches (
  id              SERIAL PRIMARY KEY,
  caller_id       INTEGER REFERENCES callers(id),
  batch_number    INTEGER NOT NULL,
  leads_assigned  INTEGER NOT NULL DEFAULT 30,
  leads_called    INTEGER NOT NULL DEFAULT 0,
  requested_at    TIMESTAMPTZ DEFAULT NOW(),
  completed_at    TIMESTAMPTZ
);

-- Caller streaks (computed nightly by Kiter)
CREATE TABLE caller_streaks (
  id              SERIAL PRIMARY KEY,
  caller_id       INTEGER REFERENCES callers(id) UNIQUE,
  current_streak  INTEGER DEFAULT 0,
  longest_streak  INTEGER DEFAULT 0,
  last_call_date  DATE,
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Daily goals (set by each caller)
CREATE TABLE daily_goals (
  id              SERIAL PRIMARY KEY,
  caller_id       INTEGER REFERENCES callers(id),
  goal_date       DATE NOT NULL,
  target_calls    INTEGER NOT NULL DEFAULT 30,
  calls_made      INTEGER DEFAULT 0,
  UNIQUE(caller_id, goal_date)
);
```

### 1.3 — Seed Initial Callers

```sql
INSERT INTO callers (name, pin, role) VALUES
  ('Jonathan', '$2b$10$HASH_OF_1234', 'caller'),
  ('Kevin',    '$2b$10$HASH_OF_5678', 'caller'),
  ('Dylan',    '$2b$10$HASH_OF_9999', 'admin');
```

PINs must be bcrypt-hashed. Use a Python script to generate them.

### 1.4 — Migrate Google Sheet → Neon

Write `/home/node/.openclaw/workspace/fortx/scripts/migrate_leads.py`:

- Read all 783 rows from Google Sheet using existing `gspread` setup
- Skip rows already in DB (check by `sheet_row`)
- Import columns A–O into `leads` table
- Set all statuses to `'unassigned'`
- Log migration count to console
- Run once, then make it idempotent (safe to run again)

### 1.5 — Create DB Helper Module

Write `/home/node/.openclaw/workspace/fortx/scripts/db.py`:

- Single module with functions: `get_lead(id)`, `assign_leads(caller_id, count)`, `log_call(...)`, `get_caller_stats(caller_id)`, `get_leaderboard()`, `request_more_leads(caller_id)`
- All functions use `DATABASE_URL` from env
- Import this module in all other scripts

---

## PHASE 2 — OpenClaw Skill Updates

**Goal:** Update Kiter's skills to read/write Neon instead of only Google Sheets, manage lead batching, and handle demo triggers from the app.

### 2.1 — Update `fortx-lead-lookup` Skill

Current behavior: reads row from Google Sheet by row number.
New behavior:
- Primary source: Neon DB (`leads` table)
- Fallback: Google Sheet if row not in DB yet
- After lookup: mark lead as `assigned` in DB if a caller_id is provided
- Update SKILL.md to document new DB-first behavior

### 2.2 — New Skill: `fortx-lead-manager`

Create `/home/node/.openclaw/workspace/fortx/skills/fortx-lead-manager/SKILL.md`

**Purpose:** Manages the 30-lead batch system. Called by:
- The caller app webhook when a caller requests more leads
- Kiter's heartbeat (nightly check for stuck batches)

**Logic:**
```
When triggered with {caller_id, action: "request_batch"}:
  1. Check how many unassigned leads exist in DB
  2. Check if caller has <5 unassigned leads remaining in current batch
  3. If eligible: pick next 30 unassigned leads (ordered by sheet_row)
     - Prioritize leads in same state as caller's previous successes
     - Ensure no lead is assigned to two callers simultaneously (use DB lock)
  4. Mark those 30 leads as assigned to caller_id
  5. Create a new lead_batch record
  6. Notify caller app via webhook (POST to app API endpoint)
  7. Log to lessons-learned if fewer than 50 unassigned leads remain globally
```

**Lead Assignment Rules:**
- Jonathan and Kevin NEVER get the same lead
- Leads already called (any status except 'unassigned') are never re-assigned
- If fewer than 30 unassigned leads remain, assign all remaining and alert Dylan
- Dylan gets his own separate pool if he uses the app to call

### 2.3 — New Skill: `fortx-demo-trigger`

Create `/home/node/.openclaw/workspace/fortx/skills/fortx-demo-trigger/SKILL.md`

**Purpose:** Triggered when a caller logs "demo agreed" in the app.

**Input:** `{caller_id, lead_id, prospect_email, prospect_name, notes, sheet_row}`

**Logic:**
```
1. Validate email format
2. Update leads table: status = 'demo_agreed'
3. Update call_logs with outcome and contact info
4. Create commission record: status = 'potential', amount = 260.00 CAD
5. Update Google Sheet row: column P (prospectEmail), Q (contactName), R (status = 'demo_agreed'), T (notes from caller)
6. Trigger fortx-workflow for this lead (same as Dylan sending the lead manually)
   - Pass prospect_email, contact_name, sheet_row, notes as context
7. Log: "Demo triggered by [caller_name] for [business_name] — Kiter pipeline started"
```

**On demo sent (after fortx-email runs):**
- Update commission status to `'pending_payout'`
- Set `demo_sent_at = NOW()`
- Notify Dylan dashboard via dashboard.json update

### 2.4 — Update `fortx-email` Skill

Add a step at the end of the email sequence:
- When email is confirmed sent, call back to DB: `UPDATE commissions SET status='pending_payout', demo_sent_at=NOW() WHERE lead_id=?`

### 2.5 — New Skill: `fortx-streak-updater`

Create `/home/node/.openclaw/workspace/fortx/skills/fortx-streak-updater/SKILL.md`

**Purpose:** Runs nightly via Kiter heartbeat (e.g., midnight local time).

**Logic:**
```
For each active caller:
  1. Check if any call_logs exist with called_at::DATE = CURRENT_DATE - 1
  2. If yes: increment current_streak by 1, update last_call_date
  3. If no: reset current_streak to 0
  4. Update longest_streak if current_streak > longest_streak
  5. Update caller_streaks table
```

### 2.6 — Update `fortx-workflow` Master Orchestrator

Add handling for two new trigger types:
- `trigger: "app_demo_agreed"` → calls `fortx-demo-trigger`
- `trigger: "batch_request"` → calls `fortx-lead-manager`

Update SKILL.md to document these new entry points.

---

## PHASE 3 — Caller App (PWA)

**Location:** New GitHub repo or subfolder `/caller-app/` in existing `fortx-demos` repo
**Hosting:** GitHub Pages → `https://dylanfort13.github.io/fortx-caller/`
**Tech stack:** Vanilla HTML/CSS/JS, no framework, no build step. Single-file pages where possible.
**Backend:** Lightweight Python FastAPI server running on Dylan's machine (same server as dashboard), exposed via ngrok or Cloudflare Tunnel for the app to reach.

---

### 3.0 — Backend API (FastAPI)

Create `/home/node/.openclaw/workspace/fortx/caller-api/main.py`

Endpoints:

```
POST /auth/login                    → {name, pin} → JWT token (7-day expiry)
GET  /me                            → caller profile + stats
GET  /leads/current                 → current batch (30 leads) for caller
POST /calls/log                     → log a call outcome
POST /calls/demo-agreed             → trigger demo pipeline
POST /leads/request-more            → request next 30 leads from Kiter
GET  /stats/leaderboard             → all callers' week stats
GET  /stats/me/streaks              → streak data for caller
POST /goals/set                     → set daily call goal
GET  /goals/today                   → today's goal + progress
GET  /commissions/me                → potential + pending_payout amounts
GET  /admin/callers                 → [ADMIN ONLY] list all callers
POST /admin/callers                 → [ADMIN ONLY] add new caller
PATCH /admin/commissions/{id}       → [ADMIN ONLY] mark commission as paid
```

JWT middleware: every request except `/auth/login` requires valid token.
Admin middleware: `/admin/*` routes require `role = 'admin'`.

---

### 3.1 — App File Structure

```
caller-app/
  index.html          → login screen
  app.html            → main app shell (loads views dynamically)
  manifest.json       → PWA manifest
  sw.js               → service worker (offline support)
  icons/              → PWA icons (192x192, 512x512) — FortX logo
  css/
    base.css          → reset, variables, typography
    components.css    → cards, buttons, badges, modals
    animations.css    → transitions, micro-interactions
  js/
    auth.js           → login, token storage, auto-login
    api.js            → all fetch calls, token injection
    router.js         → simple hash-based view router
    views/
      home.js         → dashboard home view
      leads.js        → lead list + call logging
      earnings.js     → commissions view
      leaderboard.js  → all callers comparison
      profile.js      → streak, goal setting
    components/
      lead-card.js    → reusable lead card
      outcome-modal.js → post-call outcome picker
      demo-modal.js   → demo agreed form
      toast.js        → notification toasts
```

---

### 3.2 — Design System

**Fonts:** DM Sans (same as FortX demos) — load from Google Fonts
**Colors:**
```css
:root {
  --bg:          #F9F9F9;
  --surface:     #FFFFFF;
  --border:      rgba(0, 0, 0, 0.06);
  --text-primary: #1A1A1A;
  --text-sub:    #6B7280;
  --accent:      #E8650A;       /* FortX orange */
  --accent-light: #FFF3EB;
  --green:       #16A34A;
  --green-light: #F0FDF4;
  --red:         #DC2626;
  --red-light:   #FEF2F2;
  --yellow:      #D97706;
  --yellow-light:#FFFBEB;
  --radius-card: 16px;
  --radius-btn:  12px;
  --shadow-card: 0 1px 3px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.07), 0 0 0 0.5px rgba(0,0,0,0.04);
  --shadow-hover: 0 2px 8px rgba(0,0,0,0.10), 0 8px 24px rgba(0,0,0,0.12);
}
```

**Typography scale:**
```css
--text-xs:   10.5px;
--text-sm:   12px;
--text-base: 14px;
--text-md:   16px;
--text-lg:   20px;
--text-xl:   24px;
--text-2xl:  28px;
--text-3xl:  34px;
```

**Design rules (apply from soft-skill + taste-skill):**
- No pure black, no neon, no generic AI purple/blue
- Cards always have `--shadow-card` at rest, `--shadow-hover` on tap (mobile: active state)
- Generous padding: `1.5rem` minimum inside all cards
- All interactive elements have 0.2s ease transitions
- No emoji in UI labels (except streak fire 🔥 — one exception, intentional)
- Bottom navigation: 4 tabs (Home, Leads, Earnings, Leaderboard)
- Asymmetric section headers where possible

---

### 3.3 — Screen Specs

#### Login Screen (`index.html`)
- FortX logo centered, large
- Name selector: two large tappable cards (Jonathan / Kevin / Dylan — rendered from API or hardcoded initially)
- PIN entry: 4-digit keypad (custom, not native keyboard)
- "Stay logged in" — auto-enabled, no toggle
- On success: store JWT in localStorage, redirect to `app.html`
- On return visit: check token validity, skip to `app.html` immediately

#### Home View
**Header:** "Good morning, [Name]." (time-aware), date subtitle
**Cards (4, full-width stacked):**
1. **Calls Today** — number + progress bar toward daily goal
2. **Streak** — 🔥 N days, longest record as subtext
3. **Potential Earnings** — $X,XXX CAD (all 'potential' commissions)
4. **Pending Payout** — $X,XXX CAD (all 'pending_payout' commissions), ℹ tooltip: "Demo sent — FortX team is closing this client"

**Pace projection strip** (below cards):
`"At your pace → ~$X,XXX this month"` — auto-calculated from (calls/day × demo rate × $260)

**Leads remaining banner:**
- If > 10 leads left: subtle green pill "18 leads remaining"
- If ≤ 5 leads left: orange banner "Almost done! Tap to request more leads"
- If 0 leads left: full-width card with big CTA "Request your next 30 leads" → POST /leads/request-more → Kiter executes batch assignment → toast "Kiter is assigning your next batch. Check back in ~2 minutes."

**Daily goal widget:**
- Circular progress ring (CSS, not canvas)
- Center: `XX / YY calls`
- Below ring: "Set today's goal" if not set, or edit icon if set
- Tap to set: modal with number picker (10, 20, 30, 40, 50, custom)

#### Leads View
- Scrollable list of 30 leads (current batch)
- Each lead card shows:
  - Business name (large)
  - City, State — category tag pill
  - Status pill (right side): Unassigned / Called / No Answer / etc.
  - If `demo_agreed`: green pill + lock icon (can't re-call)
- Tap a lead → expand or navigate to Call Screen

#### Call Screen (modal or full-screen overlay)
- Business name + phone (large, tappable tel: link)
- Google Maps link (opens in Maps app)
- Existing website link if present
- Big 3-button outcome picker:
  - 🔴 **No Answer** — gray
  - ⛔ **Not Interested** — muted red
  - ✅ **Demo Agreed** — FortX orange (primary)
- Tap "No Answer" or "Not Interested" → log immediately → advance to next lead
- Tap "Demo Agreed" → open Demo Modal

#### Demo Modal
```
Title: "Great call! 🎯"

Fields:
  [required] Client email address
             placeholder: "mike@mikesplumbing.com"

  [optional] Contact name
             placeholder: "Mike"

  [optional] Notes for the team
             placeholder: "He mentioned he's losing clients to a competitor who has a better website. Good urgency. Mentioned budget is not an issue."

[ Submit → Start Pipeline ]
```
- Email validation (format check, required)
- On submit: POST /calls/demo-agreed → Kiter starts pipeline
- Success state: confetti animation (CSS only, no lib), toast "Pipeline started! Kiter is on it 🤖", +$260 added to Potential Earnings card with a flip animation
- Commission card updates instantly (optimistic UI)

#### Earnings View
Two sections:

**Potential** (pending demo closes):
- List of leads where commission status = 'potential'
- Each row: business name, city, date called, +$260 CAD
- ℹ on each: "Demo sent — FortX is currently working on closing this client"
- Total at top: "**$X,XXX** potential"

**Pending Payout** (demo sent, awaiting payment):
- Same list style, green accent
- ℹ: "Client signed — awaiting payment processing"
- Total at top: "**$X,XXX** pending payout"

**Paid** (collapsed by default, expandable):
- Historical paid commissions
- Total earned all-time

#### Leaderboard View
- Week selector (this week / last week)
- Ranking cards for all callers including Dylan
- Each card: rank number, name, calls this week, demos this week, commission potential
- Highlight logged-in user's card with accent border
- Streak badges displayed on cards

#### Profile View
- Name + avatar initials
- Streak stats: current / longest
- All-time stats: total calls, total demos, total earned
- "Log out" button (bottom, subtle)

---

### 3.4 — PWA Config

`manifest.json`:
```json
{
  "name": "FortX Caller",
  "short_name": "FortX",
  "start_url": "/fortx-caller/",
  "display": "standalone",
  "background_color": "#F9F9F9",
  "theme_color": "#E8650A",
  "icons": [
    { "src": "icons/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

`sw.js` — cache app shell files for offline access. API calls always go to network.

---

## PHASE 4 — FortX Dashboard Integration

**Location:** `/home/node/.openclaw/workspace/fortx/dashboard/`
**Goal:** Add a "Callers" section to Dylan's existing Kanban dashboard.

### 4.1 — New Dashboard Tab: "Callers"

Add a 5th tab to the dashboard nav: **Callers**

URL: `http://localhost:8080/dashboard/#callers`

### 4.2 — Callers Tab Layout

**Section A — Active Callers Table**

| Caller | Calls Today | Calls This Week | Demos | Streak | Status |
|---|---|---|---|---|---|
| Jonathan | 34 | 187 | 4 | 🔥 5 days | 🟢 Active |
| Kevin | 22 | 143 | 2 | 🔥 2 days | 🟢 Active |
| Dylan | — | — | — | — | Admin |

- Live data from Neon (auto-refresh every 60s)
- Click a caller name → expand to full stats panel

**Section B — Commission Manager**

Table of all commissions with columns:
- Caller name | Business | Status | Amount | Date | Actions

Status pills: `Potential` (gray) / `Pending Payout` (yellow) / `Paid` (green)

Action buttons per row:
- `Mark as Closed` → changes status to `pending_payout` (when client signs)
- `Mark as Paid` → changes status to `paid`, sets `paid_at`

**Section C — Lead Pool Status**

- Total unassigned leads remaining
- Leads assigned per caller (with batch progress bars)
- Warning banner if < 50 leads remain globally: "⚠️ Replenish leads soon — only X remaining"
- Button: "Scrape new leads" → opens link to Apify or triggers a new scrape script

**Section D — Add New Caller**

Simple form (inline in dashboard):
```
Name: [____________]
PIN:  [____] (4 digits)
Role: [Caller ▾]
[ + Add Caller ]
```
- POST /admin/callers
- New caller appears instantly in the table

**Section E — Commission Totals Banner**

- Total potential commissions outstanding: $X,XXX CAD
- Total pending payout: $X,XXX CAD
- Total paid all-time: $X,XXX CAD

---

### 4.3 — Existing Pipeline Integration

When a lead moves to `Demo Sent` in the Kanban:
- Auto-check: does this lead have a commission record?
- If yes: update commission to `pending_payout` automatically
- Show a 🧑 caller badge on the Kanban card (e.g., "via Jonathan")

---

## PHASE 5 — GitHub Pages Deployment

### 5.1 — Repo Setup

Option A: New repo `fortx-caller` under dylanfort13
Option B: Subfolder in existing `fortx-demos` repo at `/caller-app/`

Recommended: **Option A** (cleaner separation).

### 5.2 — GitHub Actions Auto-Deploy

Create `.github/workflows/deploy.yml`:
- Trigger: push to `main`
- Action: copy `caller-app/` to `gh-pages` branch
- Result: auto-deploys on every push

### 5.3 — Environment Config

The app needs to know the API base URL. Since the API runs locally on Dylan's machine with a tunnel:

Create `caller-app/js/config.js`:
```js
const CONFIG = {
  API_BASE: 'https://fortx-api.YOUR-TUNNEL-DOMAIN.com', // update as needed
};
```

This is the one file Dylan updates when his tunnel URL changes.

### 5.4 — Cloudflare Tunnel (Recommended over ngrok)

Set up Cloudflare Tunnel to expose `localhost:8080` (or a separate port for the API) at a fixed subdomain like `api.fortxweb.com`. This means the URL never changes and no config updates are needed.

---

## PHASE 6 — Testing & Quality Gates

Before marking any phase complete, run these checks:

### Phase 1 (DB):
- [ ] All 783 leads imported, zero duplicates
- [ ] Each lead has exactly one `assigned_to` at a time
- [ ] Running `migrate_leads.py` twice produces no errors and no duplicate rows

### Phase 2 (OpenClaw):
- [ ] Send test trigger: `{trigger: "batch_request", caller_id: 1}` → verify 30 leads assigned to Jonathan, none to Kevin
- [ ] Send test trigger: `{trigger: "batch_request", caller_id: 2}` → verify 30 different leads assigned to Kevin
- [ ] Send test trigger: `{trigger: "app_demo_agreed", caller_id: 1, lead_id: 5, prospect_email: "test@test.com"}` → verify Google Sheet updated, commission created, Kiter pipeline started
- [ ] Streak updater: simulate two days of calls → verify streak = 2

### Phase 3 (App):
- [ ] Login with wrong PIN → proper error, no token stored
- [ ] Login with correct PIN → token stored, stays logged in on refresh
- [ ] Log "No Answer" → lead status updates, next lead shown
- [ ] Log "Demo Agreed" without email → form validation blocks submission
- [ ] Log "Demo Agreed" with email → Kiter notified, commission appears, +$260 animates
- [ ] Request more leads when < 5 remaining → banner appears, request works
- [ ] Install as PWA on iPhone (Add to Home Screen) → launches standalone, no browser chrome

### Phase 4 (Dashboard):
- [ ] Callers tab loads without breaking existing tabs
- [ ] Adding a new caller via form → appears in table + can log into app
- [ ] Marking commission as paid → updates in both dashboard and app

---

## PHASE 7 — Handoff Notes for Dylan

After all phases are complete, create a `OPERATIONS.md` file at:
`/home/node/.openclaw/workspace/fortx/CALLER_OPERATIONS.md`

Contents:
1. How to start the caller API server
2. How to add a new caller
3. How to replenish leads (Apify scrape + migration script)
4. How to mark a commission as paid
5. How to update the API tunnel URL in `config.js`
6. How to monitor Kiter batch assignments (dashboard link)
7. What to do if a caller is locked out of their PIN

---

## Execution Order Summary

```
Phase 0  → Read existing files                    [30 min]
Phase 1  → Neon DB + migration                    [2-3 hrs]
Phase 2  → OpenClaw skill updates                 [2-3 hrs]
Phase 3.0→ FastAPI backend                        [2 hrs]
Phase 3.1→ App file structure + base CSS          [1 hr]
Phase 3.2→ Login screen                           [1 hr]
Phase 3.3→ Home view + lead request banner        [2 hrs]
Phase 3.4→ Lead list + call screen + demo modal   [2 hrs]
Phase 3.5→ Earnings view                          [1 hr]
Phase 3.6→ Leaderboard view                       [1 hr]
Phase 3.7→ Profile + streak view                  [1 hr]
Phase 3.8→ PWA manifest + service worker          [30 min]
Phase 4  → Dashboard callers tab                  [2 hrs]
Phase 5  → GitHub Pages deployment                [30 min]
Phase 6  → Testing all gates                      [1-2 hrs]
Phase 7  → Operations doc                         [30 min]
```

**Estimated total: 20–24 hours of OpenCode execution time.**

---

## Critical Rules (Never Break)

1. **No lead is ever assigned to two callers at the same time.** Use DB-level locking in `fortx-lead-manager`.
2. **No fabricated data in the app.** If a stat is 0, show 0. Never display placeholder numbers.
3. **Commission amounts are always in CAD.** Display "CAD" suffix everywhere, never just "$".
4. **The demo pipeline must not trigger twice for the same lead.** Check commission table for existing record before creating.
5. **Dylan's admin routes are never exposed to caller role.** JWT middleware must enforce this.
6. **All PIN storage is bcrypt-hashed.** Never store plain text PINs in DB or logs.
7. **The Google Sheet remains the source of truth for Kiter.** Always update it alongside the DB when a lead status changes.
