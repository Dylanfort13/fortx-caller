import os
import json
import urllib.request
from datetime import datetime, timedelta, date
from typing import Optional

import bcrypt
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Depends, status, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from jose import jwt, JWTError

load_dotenv()

DATABASE_URL = os.environ.get("DATABASE_URL")
JWT_SECRET = os.environ.get("JWT_SECRET", "fortx-caller-secret-change-me")
MOONSHOT_KEY = os.environ.get("MOONSHOT_KEY", "sk-1AD1ozZ7VEr1wIckrYbRcUkUkBuzFNA6r4T1uAB3wuDTvS9Z")
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_DAYS = 7

app = FastAPI(title="FortX Caller API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_conn():
    return psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)


def create_token(caller_id: int, name: str, role: str) -> str:
    payload = {
        "sub": str(caller_id),
        "name": name,
        "role": role,
        "exp": datetime.utcnow() + timedelta(days=JWT_EXPIRY_DAYS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")


@app.middleware("http")
async def auth_middleware(request, call_next):
    if request.method == "OPTIONS":
        return await call_next(request)

    if request.url.path in ["/auth/login", "/docs", "/openapi.json", "/"]:
        return await call_next(request)

    auth = request.headers.get("Authorization", "")
    if not auth.startswith("Bearer "):
        from fastapi.responses import JSONResponse
        return JSONResponse(status_code=401, content={"detail": "Missing token"})

    try:
        payload = decode_token(auth[7:])
        request.state.user = payload
    except HTTPException:
        from fastapi.responses import JSONResponse
        return JSONResponse(status_code=401, content={"detail": "Invalid token"})

    return await call_next(request)


def require_admin(request: Request):
    user = request.state.user
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")


class LoginRequest(BaseModel):
    name: str
    pin: str


class LogCallRequest(BaseModel):
    lead_id: int
    outcome: str
    prospect_email: Optional[str] = None
    prospect_name: Optional[str] = None
    notes: Optional[str] = None


class DemoAgreedRequest(BaseModel):
    lead_id: int
    prospect_email: str
    prospect_name: Optional[str] = None
    notes: Optional[str] = None


class SetGoalRequest(BaseModel):
    target_calls: int


class AddCallerRequest(BaseModel):
    name: str
    pin: str
    role: str = "caller"


class PatchCommissionRequest(BaseModel):
    status: str


@app.post("/auth/login")
def login(req: LoginRequest):
    conn = get_conn()
    try:
        cur = conn.cursor()
        cur.execute("SELECT * FROM callers WHERE name = %s", (req.name,))
        caller = cur.fetchone()
        if not caller:
            raise HTTPException(status_code=401, detail="Invalid name or PIN")
        if not bcrypt.checkpw(req.pin.encode(), caller["pin"].encode()):
            raise HTTPException(status_code=401, detail="Invalid name or PIN")

        token = create_token(caller["id"], caller["name"], caller["role"])
        return {
            "token": token,
            "caller": {
                "id": caller["id"],
                "name": caller["name"],
                "role": caller["role"],
            },
        }
    finally:
        conn.close()


@app.get("/me")
def get_me(request: Request):
    user = request.state.user
    caller_id = int(user["sub"])
    conn = get_conn()
    try:
        cur = conn.cursor()

        cur.execute(
            """SELECT COUNT(*) AS total_calls,
                      COUNT(*) FILTER (WHERE outcome = 'demo_agreed') AS total_demos
               FROM call_logs WHERE caller_id = %s""",
            (caller_id,),
        )
        stats = cur.fetchone()

        cur.execute(
            """SELECT COALESCE(SUM(amount_cad), 0) AS total_earned
               FROM commissions WHERE caller_id = %s AND status = 'paid'""",
            (caller_id,),
        )
        earned = cur.fetchone()

        cur.execute("SELECT * FROM callers WHERE id = %s", (caller_id,))
        caller = cur.fetchone()

        return {
            "id": caller["id"],
            "name": caller["name"],
            "role": caller["role"],
            "created_at": caller["created_at"].isoformat() if caller["created_at"] else None,
            "total_calls": stats["total_calls"],
            "total_demos": stats["total_demos"],
            "total_earned": float(earned["total_earned"]),
        }
    finally:
        conn.close()


@app.get("/leads/current")
def get_current_leads(request: Request):
    caller_id = int(request.state.user["sub"])
    conn = get_conn()
    try:
        cur = conn.cursor()
        cur.execute(
            """SELECT * FROM leads
               WHERE assigned_to = %s AND status IN ('assigned','no_answer','callback')
               ORDER BY sheet_row""",
            (caller_id,),
        )
        return cur.fetchall()
    finally:
        conn.close()


@app.post("/calls/log")
def log_call(req: LogCallRequest, request: Request):
    caller_id = int(request.state.user["sub"])
    conn = get_conn()
    try:
        cur = conn.cursor()

        cur.execute(
            """INSERT INTO call_logs (lead_id, caller_id, outcome, prospect_email, prospect_name, notes)
               VALUES (%s, %s, %s, %s, %s, %s) RETURNING *""",
            (req.lead_id, caller_id, req.outcome, req.prospect_email, req.prospect_name, req.notes),
        )
        call_log = cur.fetchone()

        status_map = {
            "no_answer": "no_answer",
            "not_interested": "not_interested",
            "callback": "callback",
        }
        new_status = status_map.get(req.outcome, req.outcome)
        cur.execute("UPDATE leads SET status = %s WHERE id = %s", (new_status, req.lead_id))

        cur.execute(
            """UPDATE daily_goals SET calls_made = calls_made + 1
               WHERE caller_id = %s AND goal_date = CURRENT_DATE""",
            (caller_id,),
        )

        conn.commit()
        return dict(call_log)
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


@app.post("/calls/demo-agreed")
def demo_agreed(req: DemoAgreedRequest, request: Request):
    caller_id = int(request.state.user["sub"])
    conn = get_conn()
    try:
        cur = conn.cursor()

        cur.execute(
            "SELECT id FROM commissions WHERE lead_id = %s AND caller_id = %s",
            (req.lead_id, caller_id),
        )
        if cur.fetchone():
            raise HTTPException(status_code=409, detail="Demo already triggered for this lead")

        cur.execute(
            """INSERT INTO call_logs (lead_id, caller_id, outcome, prospect_email, prospect_name, notes)
               VALUES (%s, %s, 'demo_agreed', %s, %s, %s) RETURNING *""",
            (req.lead_id, caller_id, req.prospect_email, req.prospect_name, req.notes),
        )
        call_log = cur.fetchone()

        cur.execute(
            "UPDATE leads SET status = 'demo_agreed' WHERE id = %s",
            (req.lead_id,),
        )

        cur.execute(
            """INSERT INTO commissions (caller_id, lead_id, call_log_id, amount_cad, status)
               VALUES (%s, %s, %s, 260.00, 'potential')""",
            (caller_id, req.lead_id, call_log["id"]),
        )

        cur.execute(
            """UPDATE daily_goals SET calls_made = calls_made + 1
               WHERE caller_id = %s AND goal_date = CURRENT_DATE""",
            (caller_id,),
        )

        conn.commit()

        try:
            enqueue_action("demo_agreed", {
                "caller_id": caller_id,
                "lead_id": req.lead_id,
                "prospect_email": req.prospect_email,
                "prospect_name": req.prospect_name,
                "business_name": None,
                "notes": req.notes,
            })
        except Exception:
            pass

        return {
            "status": "ok",
            "message": "Pipeline started",
            "commission_amount": 260.00,
            "currency": "CAD",
        }
    except HTTPException:
        conn.rollback()
        raise
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


@app.post("/leads/request-more")
def request_more_leads(request: Request):
    caller_id = int(request.state.user["sub"])
    conn = get_conn()
    try:
        cur = conn.cursor()

        cur.execute(
            """SELECT COUNT(*) AS remaining FROM leads
               WHERE assigned_to = %s AND status = 'assigned'""",
            (caller_id,),
        )
        remaining = cur.fetchone()["remaining"]

        if remaining > 5:
            return {"status": "ok", "message": f"Still have {remaining} leads remaining"}

        cur.execute(
            """SELECT * FROM leads
               WHERE status = 'unassigned'
               ORDER BY sheet_row
               LIMIT 30 FOR UPDATE SKIP LOCKED""",
        )
        leads = cur.fetchall()

        if not leads:
            return {"status": "empty", "message": "No unassigned leads available"}

        lead_ids = [l["id"] for l in leads]
        cur.execute(
            """UPDATE leads SET status = 'assigned', assigned_to = %s, assigned_at = NOW()
               WHERE id = ANY(%s)""",
            (caller_id, lead_ids),
        )

        cur.execute(
            """SELECT COALESCE(MAX(batch_number), 0) + 1 AS nb
               FROM lead_batches WHERE caller_id = %s""",
            (caller_id,),
        )
        batch_number = cur.fetchone()["nb"]

        cur.execute(
            """INSERT INTO lead_batches (caller_id, batch_number, leads_assigned)
               VALUES (%s, %s, %s)""",
            (caller_id, batch_number, len(leads)),
        )

        conn.commit()

        try:
            enqueue_action("request_more_leads", {
                "caller_id": caller_id,
                "count": len(leads),
            })
        except Exception:
            pass

        return {"status": "ok", "message": f"Assigned {len(leads)} new leads", "count": len(leads)}
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


@app.get("/stats/leaderboard")
def get_leaderboard(request: Request):
    conn = get_conn()
    try:
        cur = conn.cursor()
        cur.execute(
            """SELECT c.id, c.name,
                  COUNT(cl.id) FILTER (
                    WHERE cl.called_at >= date_trunc('week', CURRENT_DATE)
                  ) AS this_week_calls,
                  COUNT(cl.id) FILTER (
                    WHERE cl.called_at >= date_trunc('week', CURRENT_DATE)
                    AND cl.outcome = 'demo_agreed'
                  ) AS this_week_demos,
                  COUNT(cl.id) FILTER (
                    WHERE cl.called_at >= date_trunc('week', CURRENT_DATE) - INTERVAL '1 week'
                    AND cl.called_at < date_trunc('week', CURRENT_DATE)
                  ) AS last_week_calls,
                  COUNT(cl.id) FILTER (
                    WHERE cl.called_at >= date_trunc('week', CURRENT_DATE) - INTERVAL '1 week'
                    AND cl.called_at < date_trunc('week', CURRENT_DATE)
                    AND cl.outcome = 'demo_agreed'
                  ) AS last_week_demos,
                  COALESCE(cs.current_streak, 0) AS streak,
                  COALESCE(SUM(com.amount_cad) FILTER (
                    WHERE com.status IN ('potential','pending_payout')
                    AND com.created_at >= date_trunc('week', CURRENT_DATE)
                  ), 0) AS this_week_potential,
                  COALESCE(SUM(com.amount_cad) FILTER (
                    WHERE com.status IN ('potential','pending_payout')
                    AND com.created_at >= date_trunc('week', CURRENT_DATE) - INTERVAL '1 week'
                    AND com.created_at < date_trunc('week', CURRENT_DATE)
                  ), 0) AS last_week_potential
               FROM callers c
               LEFT JOIN call_logs cl ON cl.caller_id = c.id
               LEFT JOIN caller_streaks cs ON cs.caller_id = c.id
               LEFT JOIN commissions com ON com.caller_id = c.id
               GROUP BY c.id, c.name, cs.current_streak
               ORDER BY this_week_calls DESC"""
        )
        rows = cur.fetchall()
        return {
            "callers": [
                {
                    "id": r["id"],
                    "name": r["name"],
                    "streak": r["streak"],
                    "this_week": {
                        "calls": r["this_week_calls"],
                        "demos": r["this_week_demos"],
                        "potential_cad": float(r["this_week_potential"]),
                    },
                    "last_week": {
                        "calls": r["last_week_calls"],
                        "demos": r["last_week_demos"],
                        "potential_cad": float(r["last_week_potential"]),
                    },
                }
                for r in rows
            ]
        }
    finally:
        conn.close()


@app.get("/stats/me/streaks")
def get_my_streaks(request: Request):
    caller_id = int(request.state.user["sub"])
    conn = get_conn()
    try:
        cur = conn.cursor()
        cur.execute("SELECT * FROM caller_streaks WHERE caller_id = %s", (caller_id,))
        return cur.fetchone() or {"current_streak": 0, "longest_streak": 0}
    finally:
        conn.close()


@app.post("/goals/set")
def set_goal(req: SetGoalRequest, request: Request):
    caller_id = int(request.state.user["sub"])
    conn = get_conn()
    try:
        cur = conn.cursor()
        cur.execute(
            """INSERT INTO daily_goals (caller_id, goal_date, target_calls, calls_made)
               VALUES (%s, CURRENT_DATE, %s, 0)
               ON CONFLICT (caller_id, goal_date)
               DO UPDATE SET target_calls = %s
               RETURNING *""",
            (caller_id, req.target_calls, req.target_calls),
        )
        conn.commit()
        return cur.fetchone()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


@app.get("/goals/today")
def get_today_goal(request: Request):
    caller_id = int(request.state.user["sub"])
    conn = get_conn()
    try:
        cur = conn.cursor()
        cur.execute(
            "SELECT * FROM daily_goals WHERE caller_id = %s AND goal_date = CURRENT_DATE",
            (caller_id,),
        )
        return cur.fetchone() or {"target_calls": 30, "calls_made": 0}
    finally:
        conn.close()


@app.get("/commissions/me")
def get_my_commissions(request: Request):
    caller_id = int(request.state.user["sub"])
    conn = get_conn()
    try:
        cur = conn.cursor()
        cur.execute(
            """SELECT com.*, l.business_name, l.city
               FROM commissions com
               JOIN leads l ON l.id = com.lead_id
               WHERE com.caller_id = %s
               ORDER BY com.created_at DESC""",
            (caller_id,),
        )
        rows = cur.fetchall()

        potential = [r for r in rows if r["status"] == "potential"]
        pending = [r for r in rows if r["status"] == "pending_payout"]
        paid = [r for r in rows if r["status"] == "paid"]

        return {
            "potential": [dict(r) for r in potential],
            "pending_payout": [dict(r) for r in pending],
            "paid": [dict(r) for r in paid],
        }
    finally:
        conn.close()


class ChatRequest(BaseModel):
    messages: list


KITTER_SYSTEM = """You are Kitter, a friendly and supportive AI coworker who helps cold callers at FortX Web. You're like a trusted chill coworker — casual, warm, but also experienced and sharp.

ABOUT FORTX WEB:
- FortX Web builds websites for contractors (plumbers, electricians, roofers, etc.)
- 10+ years of experience, based in Canada, expanding into the US
- The cold callers call businesses, offer a free demo website, and if the prospect agrees, they log it as "Demo Agreed"
- Each Demo Agreed earns the caller a $260 CAD commission (once the client closes)

THE CALLER APP:
- Home tab: Shows calls today, streak, potential earnings, and the "Next Call" flow (call → log outcome → next lead)
- Leads tab: Full list of assigned leads
- Earnings tab: Commission tracking ($260 CAD per closed demo)
- Leaderboard tab: Weekly rankings vs other callers
- Script tab: The cold call script with common objections
- Chat tab (you're here!): Ask Kitter anything about cold calling

SCRIPT OVERVIEW:
1. "Hi, am I speaking with [business name]?"
2. "My name is [name], I handle the websites here in [city]"
3. "We just finished your website" (the hook)
4. If they ask "My website?": "It's a demo we built for free so you can see what it would look like"
5. "Would it bother you if I send you the demo by email?"
6. "By the way, what name should I put in the email?" (get their name + email)

COMMON OBJECTIONS:
- "How much?": ~$200 setup, $50/month hosting. Most clients make it back from their first client.
- "Who are you?": FortX Web, 10+ years, Canada, expanding to US, specialize in contractor websites.
- "I already have a website": Most clients had one too but were paying too much for something that didn't bring new clients.
- "Not interested": It's free to look at, most people are impressed.

YOUR PERSONALITY:
- Friendly, casual, like a trusted coworker
- Use natural language, not robotic
- Encourage callers, celebrate their wins
- Give practical advice when they're stuck
- Be direct when needed (e.g. pushing them to call more)
- Never be preachy or corporate"""


@app.post("/chat")
def chat_with_kitter(req: ChatRequest, request: Request):
    caller_id = int(request.state.user["sub"])
    conn = get_conn()
    try:
        cur = conn.cursor()
        for msg in req.messages:
            if msg.get("role") == "user":
                cur.execute(
                    "INSERT INTO chat_messages (caller_id, role, content) VALUES (%s, %s, %s)",
                    (caller_id, "user", msg["content"]),
                )
        conn.commit()
    except Exception:
        conn.rollback()
    finally:
        conn.close()

    payload = json.dumps({
        "model": "moonshot-v1-8k",
        "messages": [{"role": "system", "content": KITTER_SYSTEM}] + req.messages,
        "temperature": 0.7,
        "max_tokens": 500,
    }).encode()

    moonshot_req = urllib.request.Request(
        "https://api.moonshot.cn/v1/chat/completions",
        data=payload,
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {MOONSHOT_KEY}",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(moonshot_req, timeout=30) as resp:
            data = json.loads(resp.read().decode())
            content = data["choices"][0]["message"]["content"]

            conn2 = get_conn()
            try:
                cur2 = conn2.cursor()
                cur2.execute(
                    "INSERT INTO chat_messages (caller_id, role, content) VALUES (%s, %s, %s)",
                    (caller_id, "assistant", content),
                )
                conn2.commit()
            except Exception:
                conn2.rollback()
            finally:
                conn2.close()

            return {"reply": content}
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"AI service error: {str(e)}")


def enqueue_action(action_type: str, payload: dict):
    conn = get_conn()
    try:
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO action_queue (action_type, payload) VALUES (%s, %s)",
            (action_type, json.dumps(payload)),
        )
        conn.commit()
    finally:
        conn.close()


@app.get("/queue/pending")
def get_pending_actions(request: Request):
    require_admin(request)
    conn = get_conn()
    try:
        cur = conn.cursor()
        cur.execute(
            "SELECT * FROM action_queue WHERE status = 'pending' ORDER BY created_at"
        )
        return cur.fetchall()
    finally:
        conn.close()


@app.post("/queue/{action_id}/complete")
def complete_action(action_id: int, request: Request):
    require_admin(request)
    conn = get_conn()
    try:
        cur = conn.cursor()
        cur.execute(
            "UPDATE action_queue SET status = 'completed', processed_at = NOW() WHERE id = %s RETURNING *",
            (action_id,),
        )
        result = cur.fetchone()
        if not result:
            raise HTTPException(status_code=404, detail="Action not found")
        conn.commit()
        return dict(result)
    except HTTPException:
        conn.rollback()
        raise
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


@app.get("/admin/callers")
def admin_get_callers(request: Request):
    require_admin(request)
    conn = get_conn()
    try:
        cur = conn.cursor()
        cur.execute(
            """SELECT c.id, c.name, c.role, c.created_at,
                  COALESCE(cs.current_streak, 0) AS current_streak,
                  (SELECT COUNT(*) FROM call_logs WHERE caller_id = c.id AND called_at::date = CURRENT_DATE) AS calls_today,
                  (SELECT COUNT(*) FROM call_logs WHERE caller_id = c.id
                   AND called_at >= date_trunc('week', CURRENT_DATE)) AS calls_this_week,
                  (SELECT COUNT(*) FROM call_logs WHERE caller_id = c.id
                   AND called_at >= date_trunc('week', CURRENT_DATE)
                   AND outcome = 'demo_agreed') AS demos_this_week
               FROM callers c
               LEFT JOIN caller_streaks cs ON cs.caller_id = c.id
               ORDER BY c.id"""
        )
        return cur.fetchall()
    finally:
        conn.close()


@app.post("/admin/callers")
def admin_add_caller(req: AddCallerRequest, request: Request):
    require_admin(request)
    if len(req.pin) != 4 or not req.pin.isdigit():
        raise HTTPException(status_code=400, detail="PIN must be 4 digits")

    hashed = bcrypt.hashpw(req.pin.encode(), bcrypt.gensalt()).decode()
    conn = get_conn()
    try:
        cur = conn.cursor()
        cur.execute(
            "INSERT INTO callers (name, pin, role) VALUES (%s, %s, %s) RETURNING id, name, role",
            (req.name, hashed, req.role),
        )
        caller = cur.fetchone()

        cur.execute("INSERT INTO caller_streaks (caller_id) VALUES (%s)", (caller["id"],))

        conn.commit()
        return dict(caller)
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


@app.get("/admin/callers/{caller_id}/chat")
def admin_get_chat(caller_id: int, request: Request):
    require_admin(request)
    conn = get_conn()
    try:
        cur = conn.cursor()
        cur.execute(
            """SELECT id, role, content, created_at FROM chat_messages
               WHERE caller_id = %s ORDER BY created_at ASC LIMIT 500""",
            (caller_id,),
        )
        return {"messages": [dict(r) for r in cur.fetchall()]}
    finally:
        conn.close()


@app.get("/admin/callers/{caller_id}/goals")
def admin_get_goals(caller_id: int, request: Request):
    require_admin(request)
    conn = get_conn()
    try:
        cur = conn.cursor()
        cur.execute(
            """SELECT * FROM daily_goals WHERE caller_id = %s
               ORDER BY goal_date DESC LIMIT 30""",
            (caller_id,),
        )
        return {"goals": [dict(r) for r in cur.fetchall()]}
    finally:
        conn.close()


@app.patch("/admin/commissions/{commission_id}")
def admin_patch_commission(commission_id: int, req: PatchCommissionRequest, request: Request):
    require_admin(request)
    conn = get_conn()
    try:
        cur = conn.cursor()

        if req.status == "pending_payout":
            cur.execute(
                """UPDATE commissions SET status = 'pending_payout', demo_sent_at = NOW()
                   WHERE id = %s RETURNING *""",
                (commission_id,),
            )
        elif req.status == "paid":
            cur.execute(
                """UPDATE commissions SET status = 'paid', paid_at = NOW()
                   WHERE id = %s RETURNING *""",
                (commission_id,),
            )
        else:
            raise HTTPException(status_code=400, detail="Status must be 'pending_payout' or 'paid'")

        result = cur.fetchone()
        if not result:
            raise HTTPException(status_code=404, detail="Commission not found")

        conn.commit()
        return dict(result)
    except HTTPException:
        conn.rollback()
        raise
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
