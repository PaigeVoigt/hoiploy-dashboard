#!/bin/bash
# Hoi P'loy dashboard — double-click to pull the latest sheet data and rebuild.
cd "$(dirname "$0")"
echo "======================================================"
echo " Refreshing Hoi P'loy dashboard from the sheet"
echo "======================================================"
if ! python3 refresh_data.py; then
  echo ""
  echo "Refresh did not complete (see the message above)."
  read -n 1 -s -r -p "Press any key to close..."
  exit 1
fi
python3 build_standalone.py
echo ""
echo "Done. Reload the dashboard in your browser (or re-open dashboard.html)."
read -n 1 -s -r -p "Press any key to close..."
