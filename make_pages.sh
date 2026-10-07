#!/bin/bash
# Assemble the GitHub Pages site into ../parabellum-pages (index.html + assets/ + PWA manifest + icons + sources)
set -e
cd "$(dirname "$0")"; ./build.sh
OUT=../parabellum-pages; mkdir -p $OUT
LINKS='<link rel="apple-touch-icon" sizes="180x180" href="apple-touch-icon.png"><link rel="icon" type="image/png" sizes="32x32" href="favicon-32.png"><link rel="manifest" href="manifest.webmanifest"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-status-bar-style" content="black-translucent"><meta name="theme-color" content="#0a0607">'
LINKS="$LINKS" python3 -c 'import os,sys; s=open("dist/index.html").read(); open(sys.argv[1],"w").write(s.replace("<!--PWA-LINKS-->", os.environ["LINKS"]))' $OUT/index.html
grep -q 'manifest.webmanifest' $OUT/index.html
rm -rf $OUT/assets; cp -r dist/assets $OUT/assets
cp dist/Parabellum.html $OUT/Parabellum.html
python3 test/icons.py $OUT
cat > $OUT/manifest.webmanifest <<'MAN'
{
  "name": "PARABELLUM: Shayla vs. the Undead and the Steakburger Apocalypse",
  "short_name": "PARABELLUM",
  "description": "A zombie shooter starring Shayla, RN. Adults 18+: graphic gore and nonstop swearing.",
  "start_url": "./",
  "scope": "./",
  "display": "fullscreen",
  "orientation": "landscape",
  "background_color": "#0a0607",
  "theme_color": "#0a0607",
  "icons": [
    { "src": "icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
    { "src": "icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" },
    { "src": "icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
MAN
touch $OUT/.nojekyll
rm -rf $OUT/src $OUT/test $OUT/screenshots $OUT/dev; mkdir -p $OUT/src $OUT/test $OUT/screenshots $OUT/dev
cp src/* $OUT/src/; cp dev/game.html $OUT/dev/; cp build.sh make_pages.sh package.json $OUT/; cp test/*.cjs test/*.py $OUT/test/
python3 - "$OUT/screenshots" <<'PYS'
# published screenshots: downscaled (max 1100px) + quantized; full-res stay in the work dir
import sys, os, glob
from PIL import Image
out = sys.argv[1]
for f in sorted(glob.glob('screenshots/final/*.png')):
    im = Image.open(f).convert('RGB'); s = 1100 / max(im.size)
    if s < 1: im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
    im.quantize(256, method=Image.MEDIANCUT, dither=Image.FLOYDSTEINBERG).save(os.path.join(out, os.path.basename(f)), optimize=True)
PYS
cp README.md PROGRESS.md $OUT/
printf 'node_modules/\n' > $OUT/.gitignore
echo "pages assembled in $OUT"
