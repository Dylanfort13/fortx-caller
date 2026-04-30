import os
import sys
import psycopg2
from psycopg2.extras import RealDictCursor

try:
    import gspread
    HAS_GSPREAD = True
except ImportError:
    HAS_GSPREAD = False

from dotenv import load_dotenv

load_dotenv()

DATABASE_URL = os.environ.get("DATABASE_URL")
SHEET_NAME = os.environ.get("FORTX_SHEET_NAME", "FortX Leads")

SHEET_COLUMNS = {
    0: "business_name",
    1: "phone",
    2: "address",
    3: "city",
    4: "state",
    5: "country",
    6: "category",
    7: "google_maps_url",
    8: "website",
    9: "google_rating",
    10: "reviews_count",
}


def get_conn():
    return psycopg2.connect(DATABASE_URL, cursor_factory=RealDictCursor)


def migrate_from_sheet():
    if not HAS_GSPREAD:
        print("gspread not installed. Falling back to CSV mode.")
        print("Install with: pip install gspread google-auth")
        return migrate_from_csv()

    gc = gspread.service_account()
    sh = gc.open(SHEET_NAME)
    ws = sh.sheet1
    rows = ws.get_all_values()

    if not rows:
        print("Sheet is empty")
        return

    header = rows[0]
    data_rows = rows[1:]

    conn = get_conn()
    try:
        cur = conn.cursor()
        imported = 0
        skipped = 0

        for i, row in enumerate(data_rows, start=2):
            sheet_row = i

            cur.execute("SELECT id FROM leads WHERE sheet_row = %s", (sheet_row,))
            if cur.fetchone():
                skipped += 1
                continue

            lead = {"sheet_row": sheet_row}
            for col_idx, col_name in SHEET_COLUMNS.items():
                if col_idx < len(row):
                    val = row[col_idx].strip() if row[col_idx] else None
                    if col_name == "google_rating" and val:
                        try:
                            val = float(val)
                        except ValueError:
                            val = None
                    elif col_name == "reviews_count" and val:
                        try:
                            val = int(float(val))
                        except ValueError:
                            val = None
                    lead[col_name] = val

            if not lead.get("business_name"):
                skipped += 1
                continue

            cols = list(lead.keys())
            vals = [lead[c] for c in cols]
            placeholders = ", ".join(["%s"] * len(cols))
            col_names = ", ".join(cols)

            cur.execute(
                f"INSERT INTO leads ({col_names}) VALUES ({placeholders})",
                vals,
            )
            imported += 1

        conn.commit()
        print(f"Migration complete: {imported} imported, {skipped} skipped")
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def migrate_from_csv():
    csv_path = os.environ.get("FORTX_CSV_PATH")
    if not csv_path or not os.path.exists(csv_path):
        print("Set FORTX_CSV_PATH env var to import from CSV")
        print("Or install gspread for Google Sheets import")
        sys.exit(1)

    import csv

    conn = get_conn()
    try:
        cur = conn.cursor()
        imported = 0
        skipped = 0

        with open(csv_path, "r", encoding="utf-8") as f:
            reader = csv.reader(f)
            header = next(reader, None)

            for i, row in enumerate(reader, start=2):
                sheet_row = i

                cur.execute("SELECT id FROM leads WHERE sheet_row = %s", (sheet_row,))
                if cur.fetchone():
                    skipped += 1
                    continue

                lead = {"sheet_row": sheet_row}
                for col_idx, col_name in SHEET_COLUMNS.items():
                    if col_idx < len(row):
                        val = row[col_idx].strip() if row[col_idx] else None
                        if col_name == "google_rating" and val:
                            try:
                                val = float(val)
                            except ValueError:
                                val = None
                        elif col_name == "reviews_count" and val:
                            try:
                                val = int(float(val))
                            except ValueError:
                                val = None
                        lead[col_name] = val

                if not lead.get("business_name"):
                    skipped += 1
                    continue

                cols = list(lead.keys())
                vals = [lead[c] for c in cols]
                placeholders = ", ".join(["%s"] * len(cols))
                col_names = ", ".join(cols)

                cur.execute(
                    f"INSERT INTO leads ({col_names}) VALUES ({placeholders})",
                    vals,
                )
                imported += 1

        conn.commit()
        print(f"Migration complete: {imported} imported, {skipped} skipped")
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


if __name__ == "__main__":
    migrate_from_sheet()
