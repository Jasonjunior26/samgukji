#!/bin/sh
# 5계절 800x360 스크린샷 + 세로 이어붙인 시트. 사용: sh tools/mockup_v14/shots.sh <출력폴더> [폭] [높이]
OUT="$1"; WD="${2:-800}"; HT="${3:-360}"; SUF="${4:-}"
CH="/c/Program Files/Google/Chrome/Application/chrome.exe"
SRC="file:///C:/Users/USER/orca/projects/samgukji/tools/mockup_v14/mockup.html"
mkdir -p "$OUT"
for s in newyear spring summer autumn winter; do
  "$CH" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 --virtual-time-budget=1500 \
    --window-size=$WD,$HT --screenshot="$(cygpath -w "$OUT")\\mock_${s}_${WD}x${HT}${SUF}.png" "$SRC?s=$s" >/dev/null 2>&1
done
PYTHONIOENCODING=utf-8 python - "$OUT" "$WD" "$HT" "$SUF" <<'EOF'
import sys
from PIL import Image
out, w, h, suf = sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4]
ims = [Image.open(f"{out}/mock_{s}_{w}x{h}{suf}.png").convert('RGB') for s in ['newyear','spring','summer','autumn','winter']]
tw = 512
ims = [im.resize((tw, round(im.height * tw / im.width)), Image.LANCZOS) for im in ims]
sheet = Image.new('RGB', (tw, sum(i.height for i in ims)))
y = 0
for im in ims: sheet.paste(im, (0, y)); y += im.height
sheet.save(f"{out}/seasons_sheet{suf}.png"); print(sheet.size)
EOF
