#!/bin/sh
# v107 S7 UI v1.4 촬영·기능 시험 (tools/s7_harness.html 사용). 결과는 screenshots/s7/ (커밋 금지)
#   sh tools/s7_shots.sh test W H "쿼리"   → 기능 시험 JSON 출력
#   sh tools/s7_shots.sh shot W H "쿼리" 이름 → screenshots/s7/이름.png
CH="/c/Program Files/Google/Chrome/Application/chrome.exe"
ROOT="$(cd "$(dirname "$0")/.." && pwd -W 2>/dev/null || pwd)"
URL="file:///$ROOT/tools/s7_harness.html?$4"
mkdir -p "$ROOT/screenshots/s7"
VT="--virtual-time-budget=9000"; [ "$1" = perf ] && VT="--timeout=20000"
if [ "$1" = test ] || [ "$1" = perf ]; then
  "$CH" --headless=new --disable-gpu --hide-scrollbars --allow-file-access-from-files --force-device-scale-factor=1 $VT --window-size=$2,$3 --dump-dom "$URL&test=1" 2>/dev/null | grep -o '<pre id="out">[^<]*' | sed 's/<pre id="out">//'
else
  "$CH" --headless=new --disable-gpu --hide-scrollbars --allow-file-access-from-files --force-device-scale-factor=1 --virtual-time-budget=4000 --window-size=$2,$3 --screenshot="$ROOT/screenshots/s7/$5.png" "$URL" 2>/dev/null
fi
