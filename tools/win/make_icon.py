"""生成软件图标：天空蓝圆章 + 红白遮阳棚 + 银色钢珠（输出 icon.png 与多尺寸 icon.ico）"""
import pathlib
from PIL import Image, ImageDraw, ImageFilter

OUT = pathlib.Path(__file__).parent
INK = (35, 38, 71, 255)
S = 1024  # 先画大图再缩小，边缘更平滑


def draw():
    img = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    pad = 40
    # 投影
    sh = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    ImageDraw.Draw(sh).ellipse((pad + 18, pad + 34, S - pad + 18, S - pad + 34), fill=(30, 52, 100, 110))
    img = Image.alpha_composite(img, sh.filter(ImageFilter.GaussianBlur(10)))
    d = ImageDraw.Draw(img)
    # 圆章
    d.ellipse((pad, pad, S - pad, S - pad), fill=(79, 189, 238, 255), outline=INK, width=34)
    # 遮阳棚（裁在圆内）
    awn = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    ad = ImageDraw.Draw(awn)
    n = 6
    w = (S - 2 * pad) / n
    top, depth = pad, 250
    for i in range(n):
        x0 = pad + i * w
        col = (255, 90, 95, 255) if i % 2 == 0 else (255, 255, 255, 255)
        ad.rectangle((x0, top, x0 + w, top + depth), fill=col)
        ad.ellipse((x0, top + depth - w / 2, x0 + w, top + depth + w / 2), fill=col)
    for i in range(n):  # 扇贝描边
        x0 = pad + i * w
        ad.arc((x0, top + depth - w / 2, x0 + w, top + depth + w / 2), 0, 180, fill=INK, width=18)
        ad.line((x0, top, x0, top + depth), fill=INK, width=14)
    mask = Image.new('L', (S, S), 0)
    ImageDraw.Draw(mask).ellipse((pad + 17, pad + 17, S - pad - 17, S - pad - 17), fill=255)
    img.paste(awn, (0, 0), Image.composite(awn.split()[3], Image.new('L', (S, S), 0), mask))
    d = ImageDraw.Draw(img)
    d.ellipse((pad, pad, S - pad, S - pad), outline=INK, width=34)
    # 钢珠
    cx, cy, r = S / 2, S * 0.60, S * 0.25
    ball = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    bd = ImageDraw.Draw(ball)
    for k in range(120):  # 径向渐变
        t = k / 119
        rr = r * (1 - t)
        ox, oy = -r * 0.35 * t, -r * 0.4 * t
        c0, c1 = (110, 126, 150), (255, 255, 255)
        col = tuple(int(c0[j] + (c1[j] - c0[j]) * t) for j in range(3)) + (255,)
        bd.ellipse((cx + ox - rr, cy + oy - rr, cx + ox + rr, cy + oy + rr), fill=col)
    bmask = Image.new('L', (S, S), 0)
    ImageDraw.Draw(bmask).ellipse((cx - r, cy - r, cx + r, cy + r), fill=255)
    shadow = Image.new('RGBA', (S, S), (0, 0, 0, 0))
    ImageDraw.Draw(shadow).ellipse((cx - r + 16, cy - r + 28, cx + r + 16, cy + r + 28), fill=(30, 52, 100, 120))
    img = Image.alpha_composite(img, shadow.filter(ImageFilter.GaussianBlur(6)))
    img.paste(ball, (0, 0), bmask)
    d = ImageDraw.Draw(img)
    d.ellipse((cx - r, cy - r, cx + r, cy + r), outline=INK, width=26)
    d.ellipse((cx - r * 0.62, cy - r * 0.66, cx - r * 0.08, cy - r * 0.3), fill=(255, 255, 255, 235))
    # 金色小星
    import math
    sx, sy, R1, R2 = S * 0.78, S * 0.47, 70, 30
    pts = []
    for i in range(10):
        a = -math.pi / 2 + i * math.pi / 5
        rr = R1 if i % 2 == 0 else R2
        pts.append((sx + math.cos(a) * rr, sy + math.sin(a) * rr))
    d.polygon(pts, fill=(255, 194, 31, 255), outline=INK)
    d.line(pts + [pts[0]], fill=INK, width=12, joint='curve')
    return img


big = draw()
icon256 = big.resize((256, 256), Image.LANCZOS)
icon256.save(OUT / 'icon.png')
sizes = [16, 24, 32, 48, 64, 128, 256]
imgs = [big.resize((s, s), Image.LANCZOS) for s in sizes]
imgs[-1].save(OUT / 'icon.ico', format='ICO', sizes=[(s, s) for s in sizes], append_images=imgs[:-1])
print('icon.png / icon.ico written')
