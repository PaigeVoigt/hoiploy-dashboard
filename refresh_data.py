#!/usr/bin/env python3
"""Pull the latest 'Sales Data' tab from the Hoi P'loy sheet into data/sales_data.csv.

One-time setup (done once, in an interactive session):
  1. Create a Google Cloud service account and download its JSON key.
  2. Save the key as  credentials/service-account.json  in this folder.
  3. Share the Google Sheet with the service account's email (Viewer is enough).
After that, Refresh.command pulls fresh data with no sign-in each time.
"""
import os, sys, csv, subprocess

HERE = os.path.dirname(os.path.abspath(__file__))
SHEET_ID = "1MwVJ-Thu27pHBalYfYBuBaff8WCG2m9aAhiabAjGgf0"   # Hoi P'loy GP Margins sheet
TAB      = "Sales Data"                                      # primary feed tab
KEY_PATH = os.path.join(HERE, "credentials", "service-account.json")
OUT      = os.path.join(HERE, "data", "sales_data.csv")

def fail(msg):
    print("\n  " + msg + "\n")
    sys.exit(1)

if not os.path.exists(KEY_PATH):
    fail("No credentials found.\n"
         "  Save your Google service-account key at:\n"
         "    " + KEY_PATH + "\n"
         "  and share the sheet with that service account (Viewer).\n"
         "  See README.md > 'Refreshing the data' for the one-time setup.")

# Make sure the Google client libraries are present (installs once if not).
try:
    from google.oauth2.service_account import Credentials
    from googleapiclient.discovery import build
except ImportError:
    print("Installing Google API libraries (first run only)...")
    subprocess.check_call([sys.executable, "-m", "pip", "install", "--quiet",
                           "google-api-python-client", "google-auth"])
    from google.oauth2.service_account import Credentials
    from googleapiclient.discovery import build

creds = Credentials.from_service_account_file(
    KEY_PATH, scopes=["https://www.googleapis.com/auth/spreadsheets.readonly"])
svc = build("sheets", "v4", credentials=creds, cache_discovery=False)

print("Pulling '%s' from the sheet..." % TAB)
resp = svc.spreadsheets().values().get(
    spreadsheetId=SHEET_ID, range=TAB,
    valueRenderOption="UNFORMATTED_VALUE",
    dateTimeRenderOption="FORMATTED_STRING").execute()
rows = resp.get("values", [])
if not rows:
    fail("The sheet returned no rows. Check the tab name is exactly '%s'." % TAB)

width = max(len(r) for r in rows)
os.makedirs(os.path.dirname(OUT), exist_ok=True)
with open(OUT, "w", newline="") as f:
    w = csv.writer(f)
    for r in rows:
        w.writerow(list(r) + [""] * (width - len(r)))

print("Wrote %s (%d rows incl. header)." % (OUT, len(rows)))
