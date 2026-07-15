#!/usr/bin/env bash
# Conversie Markdown -> PDF cu împachetare garantată a codului și tabelelor.
# Pipeline: marked (md -> html) + Google Chrome headless (html -> pdf).
# Stilul global este în docs/pdf-style.css.
#
# Utilizare:
#   ./docs/md2pdf.sh docs/ghid-utilizare.md docs/ghid-deployment.md
#   ./docs/md2pdf.sh docs/*.md
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CSS="$SCRIPT_DIR/pdf-style.css"
CHROME="${CHROME:-google-chrome}"

if [ $# -eq 0 ]; then
  echo "Utilizare: $0 fisier1.md [fisier2.md ...]" >&2
  exit 1
fi

for md in "$@"; do
  [ -f "$md" ] || { echo "Nu există: $md" >&2; exit 1; }
  echo "==> $md"
  out="${md%.md}.pdf"
  html="$(mktemp --suffix=.html)"

  {
    echo '<!DOCTYPE html><html lang="ro"><head><meta charset="utf-8">'
    echo '<style>'
    cat "$CSS"
    echo '</style></head><body>'
    "$SCRIPT_DIR/../node_modules/.bin/marked" --gfm "$md"
    echo '</body></html>'
  } > "$html"

  "$CHROME" --headless=new --disable-gpu --no-sandbox \
    --no-pdf-header-footer \
    --print-to-pdf="$out" "$html" 2>/dev/null

  rm -f "$html"
  echo "    -> $out"
done
