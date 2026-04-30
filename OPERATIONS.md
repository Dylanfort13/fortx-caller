# FortX Caller App — Operations Guide

## 1. Starting the Caller API Server

```bash
cd "C:\Users\Dylan\Documents\FortX web\cold call system\caller-api"
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8080 --reload
```

The API runs at `http://localhost:8080`. For remote access, expose it via Cloudflare Tunnel.

## 2. Adding a New Caller

### Option A: Via the App (Admin)
1. Log in as Dylan (admin)
2. Go to the admin dashboard
3. Fill in name, 4-digit PIN, role → Submit

### Option B: Via API
```bash
curl -X POST http://localhost:8080/admin/callers \
  -H "Authorization: Bearer <DYLAN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"name": "NewCaller", "pin": "4321", "role": "caller"}'
```

### Option C: Via Script
```bash
cd "C:\Users\Dylan\Documents\FortX web\cold call system\scripts"
python seed_callers.py
```

## 3. Replenishing Leads

### Step 1: Scrape new leads
Use Apify or your preferred scraping tool to get new business leads.

### Step 2: Export to Google Sheet
Add the leads to the FortX Leads Google Sheet following the existing column format (A–O).

### Step 3: Run migration
```bash
cd "C:\Users\Dylan\Documents\FortX web\cold call system\scripts"
set DATABASE_URL=postgresql://neondb_owner:npg_EcYUA7Zx6skv@ep-blue-bar-ak6i2l9p-pooler.c-3.us-west-2.aws.neon.tech/neondb?channel_binding=require&sslmode=require
python migrate_leads.py
```

The script is idempotent — safe to run multiple times. It skips rows already imported (checked by `sheet_row`).

## 4. Marking a Commission as Paid

### Via API
```bash
curl -X PATCH http://localhost:8080/admin/commissions/<COMMISSION_ID> \
  -H "Authorization: Bearer <DYLAN_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"status": "paid"}'
```

### Via Neon SQL
```sql
UPDATE commissions SET status = 'paid', paid_at = NOW() WHERE id = <id>;
```

Commission status flow: `potential` → `pending_payout` → `paid`

## 5. Updating the API Tunnel URL

Edit `caller-app/js/config.js`:
```js
const CONFIG = {
  API_BASE: 'https://your-new-tunnel-url.com',
};
```

If using Cloudflare Tunnel with a fixed subdomain (e.g., `api.fortxweb.com`), this should never need updating.

## 6. Monitoring Kiter Batch Assignments

- Open the FortX Dashboard at `http://localhost:8080/dashboard/#callers`
- The "Lead Pool Status" section shows:
  - Total unassigned leads remaining
  - Leads assigned per caller with batch progress
  - Warning banner if < 50 leads remain

## 7. Caller PIN Lockout / Reset

If a caller forgets their PIN:

### Option A: Reset via script
```python
import bcrypt, psycopg2
conn = psycopg2.connect(DATABASE_URL)
cur = conn.cursor()
new_pin = "1111"  # temporary
hashed = bcrypt.hashpw(new_pin.encode(), bcrypt.gensalt()).decode()
cur.execute("UPDATE callers SET pin = %s WHERE name = %s", (hashed, "Jonathan"))
conn.commit()
```

### Option B: Delete and re-add
```bash
# Via Neon SQL console
DELETE FROM callers WHERE name = 'Jonathan';
# Then re-run seed_callers.py or add via admin API
```

---

## Project Structure

```
cold call system/
├── FORTX_CALLER_APP_PLAN.md
├── .env.example
├── caller-app/              # PWA Frontend (deploy to GitHub Pages)
│   ├── index.html           # Login screen
│   ├── app.html             # Main app shell
│   ├── manifest.json        # PWA manifest
│   ├── sw.js                # Service worker
│   ├── css/
│   │   ├── base.css         # Design system + variables
│   │   ├── components.css   # Reusable UI components
│   │   └── animations.css   # Animations + confetti
│   ├── js/
│   │   ├── config.js        # API base URL (edit when tunnel changes)
│   │   ├── auth.js          # Login, token, logout
│   │   ├── api.js           # All API calls
│   │   ├── router.js        # Hash-based view router
│   │   ├── views/
│   │   │   ├── home.js      # Dashboard home
│   │   │   ├── leads.js     # Lead list + call logging
│   │   │   ├── earnings.js  # Commissions view
│   │   │   ├── leaderboard.js
│   │   │   └── profile.js
│   │   └── components/
│   │       ├── lead-card.js
│   │       ├── outcome-modal.js
│   │       ├── demo-modal.js
│   │       └── toast.js
│   └── icons/               # PWA icons (add 192x192 + 512x512)
├── caller-api/              # FastAPI Backend
│   ├── main.py              # All API endpoints
│   └── requirements.txt
├── scripts/                 # Utility scripts
│   ├── db.py                # Database helper module
│   ├── seed_callers.py      # Create initial callers
│   ├── migrate_leads.py     # Google Sheet → Neon migration
│   └── requirements.txt
└── skills/                  # OpenClaw skill definitions
    ├── fortx-lead-manager/
    ├── fortx-demo-trigger/
    └── fortx-streak-updater/
```

## Neon Database

- **Project ID:** `misty-glade-12577350`
- **Database:** `neondb`
- **Tables:** callers, leads, call_logs, commissions, lead_batches, caller_streaks, daily_goals
- **Connection string:** See `.env.example`
