#!/usr/bin/env python3
"""Build a single self-contained dashboard.html (data + code inlined).
Double-click the output — no server needed. Re-run after refreshing the CSV."""
import os, html, pathlib

HERE = pathlib.Path(__file__).parent
def read(p): return (HERE / p).read_text(encoding="utf-8")

index   = read("index.html")
css     = read("styles.css")
appjs   = read("app.js")
echarts = read("vendor/echarts.min.js")
papa    = read("vendor/papaparse.min.js")
csv     = read("data/sales_data.csv")

# strip the <head> external refs / body script tags we will inline instead
import re
# drop stylesheet + font links and the three <script src=...> lines
index = re.sub(r'<link[^>]*styles\.css[^>]*>', '', index)
index = re.sub(r'<script src="vendor/echarts\.min\.js"></script>', '', index)
index = re.sub(r'<script src="vendor/papaparse\.min\.js"></script>', '', index)
index = re.sub(r'<script src="app\.js"></script>', '', index)
# also strip the cache-busting loader (document.write of app.js) — app.js is inlined below
index = re.sub(r'<!-- load app\.js.*?-->', '', index, flags=re.S)
index = re.sub(r'<script>document\.write.*?</script>', '', index, flags=re.S)

# inline CSS into <head>
index = index.replace('</head>', f'<style>\n{css}\n</style>\n</head>')

# embed data + libs + app just before </body>
# CSV goes in a non-executed script block; guard </script> just in case
csv_safe = csv.replace('</script>', '<\\/script>')
payload = (
  f'<script id="embeddedData" type="text/csv">\n{csv_safe}\n</script>\n'
  f'<script>{echarts}</script>\n'
  f'<script>{papa}</script>\n'
  f'<script>{appjs}</script>\n'
)
index = index.replace('</body>', payload + '</body>')

out = HERE / "dashboard.html"
out.write_text(index, encoding="utf-8")
mb = out.stat().st_size / 1e6
print(f"Built {out}  ({mb:.1f} MB) — double-click to open, no server needed.")
