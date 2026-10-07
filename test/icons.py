# Generate PWA icons into argv[1] (Butcherman "P" with a blood drip on near-black)
import sys, os
from PIL import Image, ImageDraw, ImageFont, ImageFilter
out = sys.argv[1]
FONT = '/usr/share/fonts/truetype/sand-box/google/Butcherman/Butcherman-Regular.ttf'
def icon(size, maskable=False):
    S = 1024
    im = Image.new('RGB', (S, S), (10, 6, 7))
    d = ImageDraw.Draw(im)
    # radial red glow
    glow = Image.new('L', (S, S), 0); ImageDraw.Draw(glow).ellipse((180, 180, 844, 844), fill=150)
    glow = glow.filter(ImageFilter.GaussianBlur(160))
    im.paste(Image.new('RGB', (S, S), (120, 8, 12)), (0, 0), glow)
    scale = 0.62 if maskable else 0.8
    f = ImageFont.truetype(FONT, int(S * scale))
    t = 'P'; bb = d.textbbox((0, 0), t, font=f)
    x = (S - (bb[2] - bb[0])) / 2 - bb[0]; y = (S - (bb[3] - bb[1])) / 2 - bb[1] - S * 0.02
    sh = Image.new('L', (S, S), 0); ImageDraw.Draw(sh).text((x, y), t, font=f, fill=255)
    im.paste(Image.new('RGB', (S, S), (200, 0, 0)), (0, 0), sh.filter(ImageFilter.GaussianBlur(26)))
    d = ImageDraw.Draw(im); d.text((x, y), t, font=f, fill=(238, 230, 214))
    # blood splat bottom right
    cx, cy = (720, 760) if not maskable else (680, 700)
    for (dx, dy, r) in [(0, 0, 46), (60, -30, 22), (-50, 40, 18), (30, 60, 14), (85, 35, 10)]:
        d.ellipse((cx + dx - r, cy + dy - r, cx + dx + r, cy + dy + r), fill=(178, 10, 16))
    return im.resize((size, size), Image.LANCZOS)
icon(180).save(os.path.join(out, 'apple-touch-icon.png'))
icon(32).save(os.path.join(out, 'favicon-32.png'))
icon(192).save(os.path.join(out, 'icon-192.png'))
icon(512).save(os.path.join(out, 'icon-512.png'))
icon(512, True).save(os.path.join(out, 'icon-maskable-512.png'))
print('icons ok')
