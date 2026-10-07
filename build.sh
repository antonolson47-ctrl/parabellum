#!/bin/bash
# Build PARABELLUM:
#   dist/index.html      bundle inlined, loads GLB/JPG from dist/assets/ (used for GitHub Pages; faster on phones)
#   dist/Parabellum.html fully self-contained single file (assets base64-inlined) for offline sharing
set -e
cd "$(dirname "$0")"
mkdir -p dist/assets
npx esbuild src/main.js --bundle --minify --format=iife --target=es2020 --legal-comments=none --outfile=dist/game.js --log-level=warning
ASSETS="female.glb male.glb anims.glb hair_long.glb hair_buzzedfemale.glb hair_buzzed.glb hair_buns.glb hair_simpleparted.glb female_light.jpg male_light.jpg"
for a in $ASSETS; do cp build_assets/$a dist/assets/; done
python3 - "$ASSETS" <<'PY'
import sys, base64, json
assets = sys.argv[1].split()
js = open('dist/game.js').read().replace('</script', '<\\/script')
fonts = open('build_assets/fonts.css').read()
def page(pre):
    return f'''<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover">
<meta name="apple-mobile-web-app-capable" content="yes"><meta name="mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<meta name="theme-color" content="#000000"><meta name="description" content="PARABELLUM: Shayla vs. the Undead and the Steakburger Apocalypse. An 18+ zombie FPS birthday game.">
<title>PARABELLUM</title><!--PWA-LINKS-->
<style>{fonts}</style>
<script>{pre}</script>
</head><body>
<script>{js}</script>
</body></html>'''
open('dist/index.html', 'w').write(page("window.__PB_ASSET_BASE='assets/';"))
blob = {a: base64.b64encode(open('build_assets/' + a, 'rb').read()).decode() for a in assets}
open('dist/Parabellum.html', 'w').write(page('window.__PB_ASSETS=' + json.dumps(blob) + ';'))
PY
rm dist/game.js
echo "built dist/index.html ($(wc -c < dist/index.html) bytes) + dist/assets ($(du -sh dist/assets | cut -f1)), dist/Parabellum.html ($(wc -c < dist/Parabellum.html) bytes)"
