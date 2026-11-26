# Sky Letters 3D — texture generator (city-land pass).
# Original art, generated in-session: periodic sinusoid noise (tileable by
# construction: every term is sin(2*pi*(kx*x/W + ky*y/H) + phase) with
# integer kx, ky) plus PIL-painted details. No downloads, no copies.
# Usage: python3 tools/generate_textures.py  (writes game/assets/*.jpg|png)
import math
import os
import random

import numpy as np
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE) if os.path.basename(HERE) == 'tools' else os.path.dirname(HERE)
OUT = os.path.join(ROOT, 'game', 'assets')
os.makedirs(OUT, exist_ok=True)

SEED = 20261126
rng = np.random.default_rng(SEED)
pyrand = random.Random(SEED)


def noise_field(w, h, terms=18, max_freq=24, seed=0):
    """Tileable noise in [0, 1]: sum of sines with integer frequencies."""
    r = np.random.default_rng(seed)
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    xx /= w
    yy /= h
    field = np.zeros((h, w), dtype=np.float32)
    for _ in range(terms):
        kx = int(r.integers(-max_freq, max_freq + 1))
        ky = int(r.integers(-max_freq, max_freq + 1))
        if kx == 0 and ky == 0:
            continue
        amp = 1.0 / math.sqrt(kx * kx + ky * ky + 1.0)
        ph = float(r.uniform(0, 2 * math.pi))
        field += amp * np.sin(2 * math.pi * (kx * xx + ky * yy) + ph)
    field -= field.min()
    field /= field.max() or 1.0
    return field


def ramp(field, stops):
    """Map a [0,1] field through colour stops [(pos, (r,g,b)), ...]."""
    pos = np.array([s[0] for s in stops], dtype=np.float32)
    cols = np.array([s[1] for s in stops], dtype=np.float32)
    out = np.zeros(field.shape + (3,), dtype=np.float32)
    for c in range(3):
        out[:, :, c] = np.interp(field, pos, cols[:, c])
    return out


def to_image(arr):
    return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), 'RGB')


def grain(arr, amount=9.0, seed=1):
    n = np.random.default_rng(seed).normal(0, amount, arr.shape[:2])
    arr = arr.copy()
    arr += n[:, :, None]
    return arr


def save(arr, name, quality=88):
    img = to_image(arr)
    img.save(os.path.join(OUT, name), quality=quality)
    print(name, img.size, os.path.getsize(os.path.join(OUT, name)) // 1024, 'KiB')


def noise_texture(name, size, stops, terms=18, max_freq=24, seed=0,
                  grain_amt=9.0, quality=88, extra=None):
    f = noise_field(size, size, terms=terms, max_freq=max_freq, seed=seed)
    arr = ramp(f, stops)
    arr = grain(arr, grain_amt, seed + 7)
    if extra:
        img = to_image(arr)
        extra(img)
        arr = np.asarray(img).astype(np.float32)
    save(arr, name, quality)
    return f


def normal_from_noise(name, size, seed=0, strength=2.0, quality=88):
    f = noise_field(size, size, terms=16, max_freq=32, seed=seed)
    gx = np.roll(f, -1, axis=1) - np.roll(f, 1, axis=1)
    gy = np.roll(f, -1, axis=0) - np.roll(f, 1, axis=0)
    nx = -gx * strength
    ny = -gy * strength
    nz = np.ones_like(f)
    inv = 1.0 / np.sqrt(nx * nx + ny * ny + nz * nz)
    arr = np.stack([(nx * inv * 0.5 + 0.5) * 255,
                    (ny * inv * 0.5 + 0.5) * 255,
                    (nz * inv * 0.5 + 0.5) * 255], axis=2)
    save(arr, name, quality)


# ---------------------------------------------------------------- facades
def facade(name, wall, trim, floors, lit_ratio, shop=False, seed=0):
    W, H = 1024, 2048
    r = random.Random(seed)
    f = noise_field(W, H, terms=10, max_freq=10, seed=seed)
    base = np.array(wall, dtype=np.float32)
    arr = base[None, None, :] + (f[:, :, None] - 0.5) * 22
    img = to_image(arr)
    d = ImageDraw.Draw(img)
    # Roof line and cornice.
    d.rectangle([0, 0, W, 46], fill=tuple(min(255, c + 18) for c in wall))
    d.rectangle([0, 46, W, 58], fill=trim)
    floor_h = (H - 120) // floors
    for fl in range(floors):
        y0 = 70 + fl * floor_h
        # Floor slab line.
        d.rectangle([0, y0 + floor_h - 8, W, y0 + floor_h], fill=trim)
        cols = 5 if W > 900 else 4
        for c in range(cols):
            x0 = 46 + c * ((W - 92) // cols)
            x1 = x0 + (W - 92) // cols - 34
            y1 = y0 + floor_h - 34
            lit = r.random() < lit_ratio
            if lit:
                col = r.choice([(255, 217, 122), (255, 190, 90), (255, 236, 170)])
            else:
                col = (26, 32, 48)
            d.rectangle([x0, y0 + 18, x1, y1], fill=col, outline=trim, width=4)
            # Window cross bars.
            d.line([x0, (y0 + 18 + y1) // 2, x1, (y0 + 18 + y1) // 2], fill=trim, width=3)
            d.line([(x0 + x1) // 2, y0 + 18, (x0 + x1) // 2, y1], fill=trim, width=3)
            # Balcony on some windows.
            if r.random() < 0.3 and fl < floors - 1:
                d.rectangle([x0 - 8, y1, x1 + 8, y1 + 14], fill=trim)
                for bx in range(x0 - 4, x1 + 8, 14):
                    d.line([bx, y1, bx, y1 + 14], fill=(20, 24, 34), width=2)
    if shop:
        # Ground-floor shop front: glass + warm sign band.
        d.rectangle([0, H - 190, W, H], fill=(40, 44, 54))
        d.rectangle([0, H - 190, W, H - 150], fill=(255, 190, 90))
        for c in range(4):
            x0 = 30 + c * (W // 4)
            d.rectangle([x0, H - 140, x0 + W // 4 - 30, H - 20],
                        fill=(200, 225, 240), outline=trim, width=4)
    img.save(os.path.join(OUT, name), quality=88)
    print(name, img.size, os.path.getsize(os.path.join(OUT, name)) // 1024, 'KiB')


# ------------------------------------------------------------- city ground
def city_land():
    S = 4096
    C = S // 2
    scale = S / 600.0  # px per world unit; disc covers +-300 units

    def px(v):
        return (v + 300) * scale

    f = noise_field(S, S, terms=14, max_freq=18, seed=41)
    arr = ramp(f, [(0.0, (86, 148, 74)), (0.5, (104, 166, 84)),
                   (1.0, (74, 132, 66))])
    arr = grain(arr, 7.0, 42)
    img = to_image(arr)
    d = ImageDraw.Draw(img)
    # City blocks: slightly varied green/grey tints between the streets.
    streets = [-145, -87, -29, 29, 87, 145]
    edges = [-300] + [s + 5 for s in streets] + [300]
    for i in range(len(edges) - 1):
        for j in range(len(edges) - 1):
            x0, x1 = px(edges[i]), px(edges[j + 1] if False else edges[i + 1])
            y0, y1 = px(edges[j]), px(edges[j + 1])
            # (drawn in world coords: x east, y south in the image)
            tint = pyrand.choice([(0, 0, 0), (12, 18, 8), (22, 22, 18), (8, 14, 20)])
            d.rectangle([x0, y0, x1, y1], fill=tuple(
                max(0, min(255, int(v))) for v in
                (86 + tint[0], 148 + tint[1], 74 + tint[2])))
    # Sand rim ring (beach) at the island edge.
    d.ellipse([C - 2048, C - 2048, C + 2048, C + 2048], outline=(232, 214, 170), width=110)
    # Streets: asphalt bands with dashed centre lines.
    for s in streets:
        c = px(s)
        d.rectangle([0, c - 34, S, c + 34], fill=(52, 56, 66))
        d.rectangle([c - 34, 0, c + 34, S], fill=(52, 56, 66))
        for t in range(0, S, 120):
            d.rectangle([t, c - 3, t + 60, c + 3], fill=(220, 200, 90))
            d.rectangle([c - 3, t, c + 3, t + 60], fill=(220, 200, 90))
    # Central plaza: paved circle with rings.
    d.ellipse([C - 218, C - 218, C + 218, C + 218], fill=(196, 188, 172))
    d.ellipse([C - 218, C - 218, C + 218, C + 218], outline=(120, 112, 96), width=6)
    d.ellipse([C - 150, C - 150, C + 150, C + 150], outline=(150, 142, 126), width=5)
    d.ellipse([C - 84, C - 84, C + 84, C + 84], outline=(150, 142, 126), width=5)
    # Park (north-west quadrant, x -174..-58, z -174..-58): darker green,
    # paths and tree dots.
    d.rounded_rectangle([px(-174), px(-174), px(-58), px(-58)], radius=60,
                        fill=(58, 110, 58))
    d.line([px(-174), px(-174), px(-58), px(-58)], fill=(196, 188, 172), width=18)
    d.line([px(-174), px(-58), px(-58), px(-174)], fill=(196, 188, 172), width=18)
    for _ in range(46):
        tx = pyrand.uniform(px(-168), px(-64))
        ty = pyrand.uniform(px(-168), px(-64))
        r = pyrand.uniform(12, 26)
        d.ellipse([tx - r, ty - r, tx + r, ty + r], fill=(34, 84, 40))
        d.ellipse([tx - r * 0.4, ty - r * 0.4, tx + r * 0.3, ty + r * 0.3],
                  fill=(86, 150, 70))
    # Night market along the south street (z = +145), warm stall dots.
    for x in range(-120, 121, 24):
        d.rounded_rectangle([px(x) - 26, px(145) + 44, px(x) + 26, px(145) + 96],
                            radius=8, fill=(255, 176, 92))
        d.rectangle([px(x) - 26, px(145) + 44, px(x) + 26, px(145) + 62],
                    fill=(214, 59, 43))
    # Airport tarmac (east edge) with runway strip.
    d.rectangle([px(150), px(-100), S, px(100)], fill=(96, 98, 104))
    d.rectangle([px(172), px(-85), px(196), px(85)], fill=(44, 46, 52))
    for t in range(-80, 81, 16):
        d.rectangle([px(182), px(t), px(186), px(t) + 8], fill=(240, 240, 230))
    d.rectangle([px(150), px(-100), px(156), px(100)], fill=(255, 217, 77))
    # Harbour (south edge): grey pier apron.
    d.rectangle([px(-60), px(240), px(60), S], fill=(120, 122, 126))
    img.save(os.path.join(OUT, 'city_land.jpg'), quality=90)
    print('city_land.jpg', img.size,
          os.path.getsize(os.path.join(OUT, 'city_land.jpg')) // 1024, 'KiB')


# ------------------------------------------------------------------- clouds
def cloud_png(name, seed=0, dark=False):
    S = 1024
    H = 512
    img = Image.new('RGBA', (S, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    r = random.Random(seed)
    base = (70, 76, 92) if dark else (255, 255, 255)
    for _ in range(26):
        cx = r.uniform(60, S - 60)
        cy = r.uniform(150, 360)
        rx = r.uniform(70, 190)
        ry = r.uniform(34, 80)
        alpha = r.randint(28, 66)
        # Soft blob: layered ellipses fading outward.
        for k in range(6, 0, -1):
            a = int(alpha * k / 6)
            d.ellipse([cx - rx * k / 6, cy - ry * k / 6,
                       cx + rx * k / 6, cy + ry * k / 6],
                      fill=base + (a,))
    img.save(os.path.join(OUT, name))
    print(name, img.size, os.path.getsize(os.path.join(OUT, name)) // 1024, 'KiB')


def firework_star():
    S = 512
    img = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    c = S // 2
    for k in range(40, 0, -1):
        a = int(235 * (1 - k / 40) ** 1.6) + 18
        d.ellipse([c - k * 3, c - k * 3, c + k * 3, c + k * 3],
                  fill=(255, 220, 150, a))
    for ang in range(0, 360, 30):
        a = math.radians(ang)
        x1, y1 = c + math.cos(a) * 60, c + math.sin(a) * 60
        x2, y2 = c + math.cos(a) * 245, c + math.sin(a) * 245
        d.line([x1, y1, x2, y2], fill=(255, 230, 170, 150), width=10)
    img.save(os.path.join(OUT, 'firework_star.png'))
    print('firework_star.png', img.size,
          os.path.getsize(os.path.join(OUT, 'firework_star.png')) // 1024, 'KiB')


def jet_detail():
    S = 4096
    f = noise_field(S, S, terms=14, max_freq=20, seed=77)
    arr = ramp(f, [(0.0, (128, 136, 148)), (0.5, (146, 154, 166)),
                   (1.0, (112, 120, 132))])
    arr = grain(arr, 8.0, 78)
    img = to_image(arr)
    d = ImageDraw.Draw(img)
    # Panel seams and rivet rows.
    for y in range(0, S, 256):
        d.line([0, y, S, y], fill=(52, 58, 68), width=5)
        for x in range(32, S, 64):
            d.ellipse([x - 4, y - 4, x + 4, y + 4], fill=(70, 76, 86))
    for x in range(0, S, 512):
        d.line([x, 0, x, S], fill=(52, 58, 68), width=4)
    # Orange cheatline + weathering streaks.
    d.rectangle([0, S // 2 - 90, S, S // 2 + 90], fill=(249, 106, 18))
    d.rectangle([0, S // 2 - 104, S, S // 2 - 90], fill=(255, 255, 255))
    for _ in range(240):
        x = pyrand.uniform(0, S)
        y = pyrand.uniform(0, S)
        ln = pyrand.uniform(60, 420)
        d.line([x, y, x + ln * 0.2, y + ln], fill=(90, 96, 106), width=3)
    # Squadron marking.
    try:
        font = ImageFont.truetype(
            '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 200)
        font2 = ImageFont.truetype(
            '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 110)
    except Exception:
        font = ImageFont.load_default()
        font2 = font
    d.text((140, S - 700), 'PIPIT 07', fill=(30, 34, 42), font=font)
    d.text((140, S - 460), 'SKY LETTERS', fill=(30, 34, 42), font=font2)
    # Envelope emblem.
    d.rectangle([140, S - 1050, 620, S - 800], outline=(255, 243, 214), width=14)
    d.line([140, S - 1050, 380, S - 880], fill=(255, 243, 214), width=12)
    d.line([620, S - 1050, 380, S - 880], fill=(255, 243, 214), width=12)
    img.save(os.path.join(OUT, 'jet_detail.jpg'), quality=90)
    print('jet_detail.jpg', img.size,
          os.path.getsize(os.path.join(OUT, 'jet_detail.jpg')) // 1024, 'KiB')


def extra_rooftop(img):
    d = ImageDraw.Draw(img)
    r = random.Random(5)
    for _ in range(260):
        x = r.uniform(0, 2048)
        y = r.uniform(0, 2048)
        w = r.uniform(60, 200)
        h = r.uniform(50, 140)
        shade = r.randint(-14, 14)
        d.rectangle([x, y, x + w, y + h],
                    fill=(86 + shade, 88 + shade, 94 + shade),
                    outline=(40, 42, 48), width=3)
        d.rectangle([x + 8, y + 8, x + w - 8, y + h - 8],
                    outline=(150, 152, 158), width=2)
    for _ in range(40):  # water tanks
        x = r.uniform(0, 2048)
        y = r.uniform(0, 2048)
        d.ellipse([x, y, x + 90, y + 90], fill=(120, 122, 128),
                  outline=(60, 62, 68), width=3)


def extra_awning(img):
    d = ImageDraw.Draw(img)
    # Red/white stripes with fold shading.
    for i, x in enumerate(range(0, 2048, 128)):
        col = (214, 59, 43) if i % 2 == 0 else (245, 240, 228)
        d.rectangle([x, 0, x + 128, 2048], fill=col)
    for x in range(0, 2048, 128):
        d.rectangle([x, 0, x + 10, 2048], fill=(0, 0, 0, 40))
    for y in range(0, 2048, 256):
        d.rectangle([0, y, 2048, y + 26], fill=(255, 255, 255, 26))


def extra_marble(img):
    d = ImageDraw.Draw(img)
    r = random.Random(9)
    for _ in range(26):
        x = r.uniform(0, 2048)
        y = r.uniform(0, 2048)
        pts = [(x, y)]
        for _ in range(14):
            x += r.uniform(-160, 160)
            y += r.uniform(-60, 160)
            pts.append((x, y))
        d.line(pts, fill=(150, 148, 150), width=3)


def extra_volcano(img):
    d = ImageDraw.Draw(img)
    r = random.Random(11)
    for _ in range(60):
        x = r.uniform(0, 2048)
        y = r.uniform(0, 2048)
        pts = [(x, y)]
        for _ in range(8):
            x += r.uniform(-90, 90)
            y += r.uniform(40, 160)
            pts.append((x, y))
        d.line(pts, fill=(255, 122, 26), width=5)
        d.line(pts, fill=(255, 200, 90), width=2)


def extra_cracks(img):
    d = ImageDraw.Draw(img)
    r = random.Random(13)
    for _ in range(90):
        x = r.uniform(0, 2048)
        y = r.uniform(0, 2048)
        pts = [(x, y)]
        for _ in range(7):
            x += r.uniform(-70, 70)
            y += r.uniform(-70, 70)
            pts.append((x, y))
        d.line(pts, fill=(38, 40, 46), width=3)


def extra_fountain(img):
    d = ImageDraw.Draw(img)
    c = 1024
    for r0 in range(60, 1000, 90):
        d.ellipse([c - r0, c - r0, c + r0, c + r0],
                  outline=(190, 220, 235), width=7)
    for _ in range(300):
        a = pyrand.uniform(0, 2 * math.pi)
        rr = pyrand.uniform(0, 980)
        x, y = c + math.cos(a) * rr, c + math.sin(a) * rr
        d.ellipse([x - 3, y - 3, x + 3, y + 3], fill=(225, 240, 250))


def extra_flowers(img):
    d = ImageDraw.Draw(img)
    r = random.Random(21)
    for _ in range(500):
        x = r.uniform(0, 2048)
        y = r.uniform(0, 2048)
        col = r.choice([(255, 120, 160), (255, 220, 90), (255, 255, 255),
                        (180, 120, 255)])
        d.ellipse([x, y, x + 9, y + 9], fill=col)


def extra_foliage(img):
    d = ImageDraw.Draw(img)
    r = random.Random(23)
    for _ in range(900):
        x = r.uniform(0, 2048)
        y = r.uniform(0, 2048)
        rad = r.uniform(14, 52)
        col = r.choice([(34, 96, 44), (52, 128, 58), (26, 78, 36),
                        (74, 150, 72)])
        d.ellipse([x - rad, y - rad, x + rad, y + rad], fill=col)
        d.ellipse([x - rad * 0.4, y - rad * 0.4, x + rad * 0.3, y + rad * 0.3],
                  fill=(110, 180, 92))


def extra_fronds(img):
    d = ImageDraw.Draw(img)
    r = random.Random(29)
    for _ in range(260):
        x = r.uniform(0, 2048)
        y = r.uniform(0, 2048)
        ang = r.uniform(0, 2 * math.pi)
        ln = r.uniform(120, 420)
        col = r.choice([(46, 120, 52), (64, 148, 66), (34, 96, 44)])
        d.line([x, y, x + math.cos(ang) * ln, y + math.sin(ang) * ln],
               fill=col, width=14)


def extra_plaza(img):
    d = ImageDraw.Draw(img)
    # Paving stone grid with varied tones.
    for gy in range(0, 2048, 128):
        for gx in range(0, 2048, 128):
            t = pyrand.randint(-12, 14)
            d.rectangle([gx + 3, gy + 3, gx + 125, gy + 125],
                        fill=(196 + t, 188 + t, 172 + t))
    d.ellipse([512, 512, 1536, 1536], outline=(120, 112, 96), width=8)


def extra_lighthouse(img):
    d = ImageDraw.Draw(img)
    # Weathering streaks running down the white paint.
    for _ in range(120):
        x = pyrand.uniform(0, 2048)
        y = pyrand.uniform(0, 1200)
        ln = pyrand.uniform(80, 500)
        d.line([x, y, x + pyrand.uniform(-8, 8), y + ln],
               fill=(170, 168, 160), width=5)


def main():
    # Painted city map + its normal map (the big-ticket items).
    city_land()
    normal_from_noise('city_land_normal.jpg', 4096, seed=43, strength=1.6)
    jet_detail()
    # 2048 detail sets.
    noise_texture('city_detail.jpg', 2048,
                  [(0.0, (96, 104, 92)), (0.5, (118, 126, 112)),
                   (1.0, (84, 92, 82))], terms=16, max_freq=28, seed=51)
    normal_from_noise('terrain_normal.jpg', 2048, seed=53, strength=2.2)
    noise_texture('grass2.jpg', 2048,
                  [(0.0, (72, 138, 62)), (0.5, (96, 164, 76)),
                   (1.0, (60, 120, 54))], terms=16, max_freq=26, seed=55,
                  extra=extra_flowers)
    noise_texture('rock2.jpg', 2048,
                  [(0.0, (96, 90, 82)), (0.5, (128, 120, 110)),
                   (1.0, (74, 70, 64))], terms=16, max_freq=26, seed=57,
                  extra=extra_cracks)
    noise_texture('tarmac2.jpg', 2048,
                  [(0.0, (44, 46, 52)), (0.5, (62, 64, 72)),
                   (1.0, (36, 38, 44))], terms=16, max_freq=30, seed=59,
                  extra=extra_cracks)
    noise_texture('rooftop.jpg', 2048,
                  [(0.0, (88, 90, 96)), (0.5, (108, 110, 116)),
                   (1.0, (74, 76, 82))], terms=14, max_freq=22, seed=61,
                  extra=extra_rooftop)
    noise_texture('market_awning.jpg', 2048,
                  [(0.0, (232, 228, 220)), (1.0, (238, 234, 226))],
                  terms=6, max_freq=8, seed=63, extra=extra_awning)
    noise_texture('plaza_stone.jpg', 2048,
                  [(0.0, (188, 180, 164)), (0.5, (200, 192, 176)),
                   (1.0, (176, 168, 152))], terms=12, max_freq=20, seed=65,
                  extra=extra_plaza)
    noise_texture('memorial_stone.jpg', 2048,
                  [(0.0, (232, 230, 228)), (0.5, (244, 242, 240)),
                   (1.0, (220, 218, 216))], terms=10, max_freq=16, seed=67,
                  extra=extra_marble)
    noise_texture('lighthouse_paint.jpg', 2048,
                  [(0.0, (238, 236, 230)), (0.5, (248, 246, 240)),
                   (1.0, (226, 224, 218))], terms=10, max_freq=16, seed=69,
                  extra=extra_lighthouse)
    noise_texture('volcano_detail.jpg', 2048,
                  [(0.0, (38, 34, 32)), (0.5, (58, 50, 46)),
                   (1.0, (28, 26, 24))], terms=16, max_freq=26, seed=71,
                  extra=extra_volcano)
    noise_texture('park_foliage.jpg', 2048,
                  [(0.0, (40, 100, 48)), (0.5, (52, 118, 58)),
                   (1.0, (34, 88, 42))], terms=12, max_freq=18, seed=73,
                  extra=extra_foliage)
    noise_texture('sea_spray.jpg', 2048,
                  [(0.0, (120, 190, 200)), (0.5, (200, 235, 240)),
                   (1.0, (90, 160, 175))], terms=16, max_freq=30, seed=75)
    noise_texture('concrete.jpg', 2048,
                  [(0.0, (150, 150, 148)), (0.5, (168, 168, 166)),
                   (1.0, (136, 136, 134))], terms=14, max_freq=22, seed=77,
                  extra=extra_cracks)
    noise_texture('water_fountain.jpg', 2048,
                  [(0.0, (40, 120, 170)), (0.5, (70, 160, 205)),
                   (1.0, (30, 100, 150))], terms=12, max_freq=20, seed=79,
                  extra=extra_fountain)
    noise_texture('island_grass.jpg', 2048,
                  [(0.0, (82, 150, 70)), (0.5, (108, 176, 86)),
                   (1.0, (70, 134, 62))], terms=16, max_freq=26, seed=81,
                  extra=extra_flowers)
    # Cliff rock: vertical striations — noise stretched vertically.
    f = noise_field(512, 2048, terms=14, max_freq=20, seed=83)
    f = np.asarray(Image.fromarray((f * 255).astype(np.uint8)).resize(
        (2048, 2048), Image.BICUBIC)).astype(np.float32) / 255.0
    arr = ramp(f, [(0.0, (88, 80, 72)), (0.5, (122, 112, 100)),
                   (1.0, (66, 60, 54))])
    arr = grain(arr, 9.0, 90)
    save(arr, 'cliff_rock.jpg', 88)
    noise_texture('palm_frond.jpg', 2048,
                  [(0.0, (40, 110, 48)), (0.5, (58, 140, 62)),
                   (1.0, (32, 94, 40))], terms=10, max_freq=16, seed=85,
                  extra=extra_fronds)
    # Six new facades (g-l), same 1024x2048 format as a-f.
    facade('facade_g.jpg', (176, 132, 96), (90, 66, 48), 7, 0.5, shop=True, seed=101)
    facade('facade_h.jpg', (96, 128, 150), (52, 70, 88), 9, 0.55, seed=102)
    facade('facade_i.jpg', (150, 96, 110), (84, 54, 62), 6, 0.45, shop=True, seed=103)
    facade('facade_j.jpg', (120, 140, 120), (66, 78, 66), 8, 0.5, seed=104)
    facade('facade_k.jpg', (190, 178, 150), (110, 100, 82), 5, 0.6, shop=True, seed=105)
    facade('facade_l.jpg', (110, 110, 128), (60, 60, 72), 10, 0.5, seed=106)
    # New cloud variants + a second storm cloud.
    cloud_png('cloud_d.png', seed=201)
    cloud_png('cloud_e.png', seed=202)
    cloud_png('cloud_f.png', seed=203)
    cloud_png('storm_cloud2.png', seed=204, dark=True)
    firework_star()
    print('done')


if __name__ == '__main__':
    main()
