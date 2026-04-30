import os
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.environ.get("DATABASE_URL")


def get_conn():
    return psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)


def get_lead(lead_id: int):
    conn = get_conn()
    try:
        cur = conn.cursor()
        cur.execute("SELECT * FROM leads WHERE id = %s", (lead_id,))
        return cur.fetchone()
    finally:
        conn.close()


def assign_leads(caller_id: int, count: int = 30):
    conn = get_conn()
    try:
        cur = conn.cursor()
        cur.execute("SELECT id FROM callers WHERE id = %s", (caller_id,))
        if not cur.fetchone():
            return None

        cur.execute(
            """SELECT * FROM leads
               WHERE status = 'unassigned'
               ORDER BY sheet_row
               LIMIT %s FOR UPDATE SKIP LOCKED""",
            (count,),
        )
        leads = cur.fetchall()

        if not leads:
            return []

        lead_ids = [l["id"] for l in leads]
        cur.execute(
            """UPDATE leads
               SET status = 'assigned', assigned_to = %s, assigned_at = NOW()
               WHERE id = ANY(%s)""",
            (caller_id, lead_ids),
        )

        cur.execute(
            """SELECT COALESCE(MAX(batch_number), 0) + 1 AS next_batch
               FROM lead_batches WHERE caller_id = %s""",
            (caller_id,),
        )
        batch_number = cur.fetchone()["next_batch"]

        cur.execute(
            """INSERT INTO lead_batches (caller_id, batch_number, leads_assigned)
               VALUES (%s, %s, %s) RETURNING id""",
            (caller_id, batch_number, len(leads)),
        )

        conn.commit()
        return leads
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def log_call(lead_id: int, caller_id: int, outcome: str,
             prospect_email: str = None, prospect_name: str = None,
             notes: str = None):
    conn = get_conn()
    try:
        cur = conn.cursor()

        cur.execute(
            """INSERT INTO call_logs (lead_id, caller_id, outcome, prospect_email, prospect_name, notes)
               VALUES (%s, %s, %s, %s, %s, %s) RETURNING *""",
            (lead_id, caller_id, outcome, prospect_email, prospect_name, notes),
        )
        call_log = cur.fetchone()

        status_map = {
            "no_answer": "no_answer",
            "not_interested": "not_interested",
            "demo_agreed": "demo_agreed",
            "callback": "callback",
        }
        cur.execute(
            "UPDATE leads SET status = %s WHERE id = %s",
            (status_map.get(outcome, outcome), lead_id),
        )

        if outcome == "demo_agreed":
            cur.execute(
                """INSERT INTO commissions (caller_id, lead_id, call_log_id, amount_cad, status)
                   VALUES (%s, %s, %s, 260.00, 'potential')
                   ON CONFLICT DO NOTHING""",
                (caller_id, lead_id, call_log["id"]),
            )

        cur.execute(
            """UPDATE daily_goals SET calls_made = calls_made + 1
               WHERE caller_id = %s AND goal_date = CURRENT_DATE""",
            (caller_id,),
        )

        conn.commit()
        return call_log
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def get_caller_stats(caller_id: int):
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

        return {
            "total_calls": stats["total_calls"],
            "total_demos": stats["total_demos"],
            "total_earned": float(earned["total_earned"]),
        }
    finally:
        conn.close()


def get_leaderboard():
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
        return cur.fetchall()
    finally:
        conn.close()


def request_more_leads(caller_id: int):
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

        leads = assign_leads(caller_id, 30)
        if not leads:
            return {"status": "empty", "message": "No unassigned leads available"}

        return {"status": "ok", "message": f"Assigned {len(leads)} new leads", "count": len(leads)}
    finally:
        conn.close()
