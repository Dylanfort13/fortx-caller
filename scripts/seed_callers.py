import bcrypt
import os
import sys
from dotenv import load_dotenv
import psycopg2

load_dotenv()

DATABASE_URL = os.environ.get("DATABASE_URL")

CALLERS = [
    {"name": "Jonathan", "pin": "1234", "role": "caller"},
    {"name": "Kevin", "pin": "5678", "role": "caller"},
    {"name": "Dylan", "pin": "9999", "role": "admin"},
]


def hash_pin(pin: str) -> str:
    return bcrypt.hashpw(pin.encode(), bcrypt.gensalt()).decode()


def seed():
    if not DATABASE_URL:
        print("ERROR: DATABASE_URL not set")
        sys.exit(1)

    conn = psycopg2.connect(DATABASE_URL)
    cur = conn.cursor()

    for caller in CALLERS:
        hashed = hash_pin(caller["pin"])
        cur.execute(
            "SELECT id FROM callers WHERE name = %s",
            (caller["name"],),
        )
        if cur.fetchone():
            print(f"  Skip {caller['name']} (already exists)")
            continue

        cur.execute(
            "INSERT INTO callers (name, pin, role) VALUES (%s, %s, %s) RETURNING id",
            (caller["name"], hashed, caller["role"]),
        )
        cid = cur.fetchone()[0]
        print(f"  Created {caller['name']} (id={cid}, role={caller['role']})")

        cur.execute(
            "INSERT INTO caller_streaks (caller_id) VALUES (%s)",
            (cid,),
        )

    conn.commit()
    cur.close()
    conn.close()
    print("Done seeding callers.")


if __name__ == "__main__":
    seed()
