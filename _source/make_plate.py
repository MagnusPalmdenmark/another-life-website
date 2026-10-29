"""Builds netlify/plate-data.mjs: the engraving layout for the 100 x 45 mm steel plate, all text as outlines.
Static text is baked into path data; the batch code glyphs are stored so the server can place any code.
Positions are the ink boxes measured from the dimensioned drawing (100 x 45 mm, holes 4 x 4.0 mm at 5 mm from each edge)."""
import json
from fontTools.ttLib import TTFont
from fontTools.pens.basePen import BasePen

DISPLAY = "/home/claude/another-life-website/assets/display.ttf"
GF = "/tmp/claude-0/-home-claude/696b4c0f-256c-57ba-9a34-547aefafc5bc/scratchpad/gf/ofl/ibmplexmono/"
MONO = GF + "IBMPlexMono-Regular.ttf"
MONOB = GF + "IBMPlexMono-Bold.ttf"

import os
NOKERN = os.environ.get("NOKERN") == "1"
class Font:
    def __init__(self, path):
        self.f = TTFont(path); self.gs = self.f.getGlyphSet(); self.cmap = self.f.getBestCmap()
        self.upm = self.f["head"].unitsPerEm
        self.kern = {}
        if "kern" in self.f and not NOKERN:
            for t in self.f["kern"].kernTables:
                self.kern.update(t.kernTable)
    def glyph(self, ch): return self.cmap[ord(ch)]
    def adv(self, ch): return self.gs[self.glyph(ch)].width
    def k(self, a, b): return self.kern.get((self.glyph(a), self.glyph(b)), 0)

class XPen(BasePen):
    """Collects absolute M/L/C/Z commands after mapping each point through fn."""
    def __init__(self, gs, fn):
        super().__init__(gs); self.fn = fn; self.out = []
    def p(self, pt):
        x, y = self.fn(pt); return f"{x:.3f} {y:.3f}"
    def _moveTo(self, pt): self.out.append("M" + self.p(pt))
    def _lineTo(self, pt): self.out.append("L" + self.p(pt))
    def _curveToOne(self, a, b, c): self.out.append("C" + " ".join(self.p(q) for q in (a, b, c)))
    def _closePath(self): self.out.append("Z")

def layout(font, text, size, ls=0.0):
    """Pen positions (mm along the line) per character, and the line length."""
    s = size / font.upm; x = 0.0; pos = []
    for i, ch in enumerate(text):
        pos.append(x)
        x += font.adv(ch) * s + ls
        if i + 1 < len(text): x += font.k(ch, text[i + 1]) * s
    return pos, x - ls

def ink_extent(font, text, size, ls=0.0):
    """Visible left/right of the ink along the line, from glyph bounds."""
    from fontTools.pens.boundsPen import BoundsPen
    s = size / font.upm; pos, _ = layout(font, text, size, ls); lo, hi = None, None
    for ch, x in zip(text, pos):
        b = BoundsPen(font.gs); font.gs[font.glyph(ch)].draw(b)
        if b.bounds is None: continue
        l, r = x + b.bounds[0] * s, x + b.bounds[2] * s
        lo = l if lo is None else min(lo, l); hi = r if hi is None else max(hi, r)
    return lo, hi

def fit_ls(font, text, size, target):
    """Letter spacing so the visible ink spans exactly `target` mm."""
    lo, hi = ink_extent(font, text, size, 0.0)
    return (target - (hi - lo)) / max(1, len(text) - 1)

def fit_size(font, text, target, ls=0.0):
    """Font size (mm) so the visible ink spans `target` mm."""
    lo, hi = ink_extent(font, text, 10.0, ls); return 10.0 * target / (hi - lo)

def draw(font, text, size, mapping, ls=0.0):
    s = size / font.upm; pos, _ = layout(font, text, size, ls); out = []
    for ch, x0 in zip(text, pos):
        pen = XPen(font.gs, lambda pt, x0=x0: mapping(x0 + pt[0] * s, pt[1] * s))
        font.gs[font.glyph(ch)].draw(pen); out += pen.out
    return "".join(out)

def horiz_left(font, text, size, x_ink, baseline, ls=0.0):
    lo, _ = ink_extent(font, text, size, ls)
    return draw(font, text, size, lambda lx, ly: (x_ink - lo + lx, baseline - ly), ls)

def horiz_center(font, text, size, cx, baseline, ls=0.0):
    lo, hi = ink_extent(font, text, size, ls); off = cx - (lo + hi) / 2
    return draw(font, text, size, lambda lx, ly: (off + lx, baseline - ly), ls)

def vert_center(font, text, size, bx, cy, ls=0.0, sx=1.0):
    """Reads bottom to top; baseline at x = bx; ink centred on y = cy; sx squeezes along the line."""
    lo, hi = ink_extent(font, text, size, ls); start = cy + sx * (lo + hi) / 2
    return draw(font, text, size, lambda lx, ly: (bx - ly, start - sx * lx), ls)


def ink_box(font, text, size, ls=0.0):
    """Ink left/right along the line and top/bottom relative to the baseline (y up), in mm."""
    from fontTools.pens.boundsPen import BoundsPen
    s = size / font.upm; pos, _ = layout(font, text, size, ls); b0 = [None] * 4
    for ch, x in zip(text, pos):
        b = BoundsPen(font.gs); font.gs[font.glyph(ch)].draw(b)
        if b.bounds is None: continue
        l, lo, r, hi = x + b.bounds[0] * s, b.bounds[1] * s, x + b.bounds[2] * s, b.bounds[3] * s
        b0 = [l if b0[0] is None else min(b0[0], l), lo if b0[1] is None else min(b0[1], lo),
              r if b0[2] is None else max(b0[2], r), hi if b0[3] is None else max(b0[3], hi)]
    return b0

def place(font, text, size, x_ink, top_ink=None, baseline=None, ls=0.0, right=False):
    """Left (or right) edge of the ink at x_ink; either the ink top at top_ink or the baseline at `baseline`."""
    l, lo, r, hi = ink_box(font, text, size, ls)
    off = (x_ink - r) if right else (x_ink - l)
    bl = baseline if baseline is not None else top_ink + hi
    return draw(font, text, size, lambda lx, ly: (off + lx, bl - ly), ls)

D, M, MB = Font(DISPLAY), Font(MONO), Font(MONOB)
CAPD, CAPM = 0.714, 0.698   # cap height / size for the display face and Plex Mono
paths = []
X = 10.61   # left edge of all text (2.0 mm clear of the 7.0 mm screw head at x 5)

# Wordmark: traced from the logo artwork, ink box x 10.61-56.30, top 5.97
import cv2, numpy as np
from PIL import Image
_a = Image.open("/home/claude/another-life-website/assets/logo-wordmark.png").split()[3]
_a = _a.crop(_a.getbbox()); W0, H0 = _a.size; UP = 6
_m = (np.array(_a.resize((W0 * UP, H0 * UP), Image.BICUBIC)) > 127).astype(np.uint8) * 255
_cs, _ = cv2.findContours(_m, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
LX0, LX1, LY0 = X, 56.30, 5.97
LY1 = LY0 + (LX1 - LX0) * H0 / W0
logo_d = ""
for c in _cs:
    c = cv2.approxPolyDP(c, 0.6, True).reshape(-1, 2)
    if len(c) < 3: continue
    logo_d += "M" + "L".join(f"{LX0 + (u / UP) / W0 * (LX1 - LX0):.3f} {LY0 + (v / UP) / H0 * (LY1 - LY0):.3f}" for u, v in c) + "Z"
print("logo bottom", round(LY1, 2), "(drawing 11.66)")

# Under the wordmark: mono caps 1.12 mm, baseline 14.09, left at X and right at 56.17
sz = 1.12 / CAPM
# (letter spacing fitted to the measured ink: 10.62-24.81 and 37.50-56.19)
paths.append(place(M, "DANISH FURNITURE", sz, X, baseline=14.09, ls=fit_ls(M, "DANISH FURNITURE", sz, 24.81 - 10.62)))
paths.append(place(M, "DESIGNED FOR TOMORROW", sz, 56.19, baseline=14.09, right=True, ls=fit_ls(M, "DESIGNED FOR TOMORROW", sz, 56.19 - 37.50)))

# Headline, display caps 2.31 mm incl. apostrophe -> fit to ink width 40.19, baseline 19.09
# Each word placed at its measured ink span so the word gaps match the drawing.
sz = 2.31 / CAPD
for w, x0, x1 in [("I’VE", 10.69, 15.38), ("BEEN", 16.44, 22.94), ("AROUND.", 23.94, 35.44), ("LITERALLY.", 36.56, 50.88)]:
    paths.append(place(D, w, sz, x0, baseline=19.09, ls=fit_ls(D, w, sz, x1 - x0)))

# Body, Plex Mono regular, size from the widest line (ink 46.62 mm); tops measured from the drawing
body = [("Once made for another purpose,", 21.91), ("now thoughtfully redesigned.", 24.78),
        ("Good materials deserve a long life.", 28.53), ("And sometimes, another one.", 31.41)]
sz = fit_size(M, body[2][0], 57.23 - X)
for t, top in body:
    paths.append(place(M, t, sz, X, top_ink=top))
    l, lo, r, hi = ink_box(M, t, sz); print(" body", t[:12], "w", round(r - l, 2), "h", round(hi - lo, 2))

# Tagline, display caps 1.88 mm, baselines 37.97 / 40.47, widths 36.50 / 33.19
sz = 1.88 / CAPD
for t, bl, x1 in [("MADE FROM WHAT CAME BEFORE.", 37.97, 47.11), ("MADE FOR WHAT COMES NEXT.", 40.47, 43.80)]:
    paths.append(place(D, t, sz, X, baseline=bl, ls=fit_ls(D, t, sz, x1 - X)))

# Under the QR: Plex Mono bold caps 1.5 mm
QX = 63.06   # ink left of the text under the QR (the QR itself starts at 63.0)
sz = 1.5 / CAPM
paths.append(place(MB, "SCAN TO DISCOVER", sz, QX, baseline=35.09, ls=fit_ls(MB, "SCAN TO DISCOVER", sz, 84.00 - 63.06)))
paths.append(place(MB, "MY STORY.", sz, QX, baseline=37.72, ls=fit_ls(MB, "MY STORY.", sz, 74.44 - 63.06)))

# Code glyphs: Plex Mono regular caps 1.5 mm, horizontal, left at QX, baseline 40.22
csz = 1.5 / CAPM
glyphs = {}
for ch in "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-":
    pen = XPen(M.gs, lambda pt: (pt[0] * csz / M.upm, -pt[1] * csz / M.upm))
    M.gs[M.glyph(ch)].draw(pen); glyphs[ch] = "".join(pen.out)
lA = ink_box(M, "A", csz)[0]
data = {"w": 100, "h": 45, "static": "".join(paths), "logo": logo_d,
        "qr": {"x": 63.0, "y": 4.5, "s": 26.0},
        "code": {"x": QX - lA, "baseline": 40.22, "adv": round(M.adv("A") * csz / M.upm + fit_ls(M, "AL-000", csz, 70.75 - 63.06), 4), "glyphs": glyphs},
        "guide": {"r": 3.0, "holes": [[5, 5], [95, 5], [5, 40], [95, 40]], "hole": 4.0}}
print("code adv", data["code"]["adv"], "-> AL-2610-482-H ends at", round(QX + 13 * data["code"]["adv"], 2))
open("/home/claude/another-life-website/netlify/plate-data.mjs", "w").write("// Engraving layout for the 100 x 45 mm steel plate, generated by _source/make_plate.py.\nexport default " + json.dumps(data, separators=(",", ":")) + ";\n")
