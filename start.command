#!/bin/bash
# Hoi P'loy Dashboard — double-click to launch on localhost
cd "$(dirname "$0")"
PORT=8756
echo "Starting Hoi P'loy dashboard on http://localhost:$PORT ..."
# open the browser after a short delay
( sleep 1; open "http://localhost:$PORT/" ) &
# serve this folder; Ctrl-C to stop
python3 -m http.server $PORT
