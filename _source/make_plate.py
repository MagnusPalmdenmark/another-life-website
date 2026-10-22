"""Builds passport-app/plate.js: the engraving layout (150 x 55 mm) with all text as outlines.
Static text is baked into path data; the batch code glyphs are stored so app.js can place any code."""
import json
from fontTools.ttLib import TTFont
from fontTools.pens.basePen import BasePen

DISPLAY = "/home/claude/another-life-website/assets/display.ttf"
MONO = "/tmp/claude-0/-home-claude/696b4c0f-256c-57ba-9a34-547aefafc5bc/scratchpad/gf/ofl/ibmplexmono/IBMPlexMono-Regular.ttf"
OUT = "/home/claude/another-life-website/passport-app/plate.js"

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

D, M = Font(DISPLAY), Font(MONO)
paths = []
# Wordmark, vertical, ink from y 7.5 to 47.375 mm, cap height 4.94 mm, baseline x 12.94 mm
cap = 0.714
# Wordmark: traced from the logo artwork (logo-wordmark.png), vertical, reading bottom to top
import cv2, numpy as np
from PIL import Image
_a = Image.open("/home/claude/another-life-website/assets/logo-wordmark.png").split()[3]
_a = _a.crop(_a.getbbox()); W0, H0 = _a.size; UP = 6
_m = (np.array(_a.resize((W0 * UP, H0 * UP), Image.BICUBIC)) > 127).astype(np.uint8) * 255
_cs, _ = cv2.findContours(_m, cv2.RETR_CCOMP, cv2.CHAIN_APPROX_NONE)
X0, X1, Y0, Y1 = 8.0, 12.94, 7.5, 47.375
logo_d = ""
for c in _cs:
    c = cv2.approxPolyDP(c, 0.6, True).reshape(-1, 2)
    if len(c) < 3: continue
    pts = [(X0 + (v / UP) / H0 * (X1 - X0), Y1 - (u / UP) / W0 * (Y1 - Y0)) for u, v in c]
    logo_d += "M" + "L".join(f"{x:.3f} {y:.3f}" for x, y in pts) + "Z"
print("logo contours", len(_cs), "chars", len(logo_d))
# Headline, ink from x 19.125 to 139.875, baseline 11.375, cap height 4.31
head = "SAVING THE WORLD IS EXHAUSTING. HAVE A SEAT."
sz = float(os.environ.get("HEADSZ", "5.95"))  # headline font size from the reference
paths.append(horiz_left(D, head, sz, 19.125, 11.375, fit_ls(D, head, sz, 139.875 - 19.125)))
# Body, IBM Plex Mono, centred on x 57.5
body = [("I was once part of something else.", 21.36), ("When that life came to an end,", 24.86), ("my story didn’t have to.", 28.36),
        ("Reclaimed, upcycled and given", 33.11), ("another life through Danish design.", 36.61)]
sz = fit_size(M, body[4][0], (1445 - 551) / 16); print("body size", round(sz, 3), "line1 width", round(ink_extent(M, body[0][0], sz)[1] - ink_extent(M, body[0][0], sz)[0], 2), "target", (1432 - 565) / 16)
for (t, bl), dx in zip(body, (-1, -2, -2, 2, -2)): paths.append(horiz_center(M, t, sz, 57.5 + dx / 16, bl + 2 / 16))
# Tagline, display, cap height 2.375, centred on x 57.5
sz = fit_size(D, "MADE FROM WHAT CAME BEFORE.", 47.625); print("tag cap", round(sz * cap, 2), "target 2.375", "line2 w", round(ink_extent(D, "MADE FOR WHAT COMES NEXT.", sz)[1] - ink_extent(D, "MADE FOR WHAT COMES NEXT.", sz)[0], 2), "target 43.25")
sz = 2.375 / cap
for t, bl, w in [("MADE FROM WHAT CAME BEFORE.", 42.81, 47.625), ("MADE FOR WHAT COMES NEXT.", 46.56, 43.25)]:
    paths.append(horiz_center(D, t, sz, 57.5, bl, fit_ls(D, t, sz, w)))
# "Scan to see my life on my ID passport", vertical, mono, cap height 1.44 mm
mcap = 0.698; sz = 1.44 / mcap
l1, l2 = "SCAN TO SEE MY LIFE", "ON MY ID PASSPORT"
ls1 = fit_ls(M, l1, sz, (815 - 402) / 16)
paths.append(vert_center(M, l1, sz, 102.69 + 1 / 16, (402 + 815) / 2 / 16 - 5 + 1 / 16, ls1))
paths.append(vert_center(M, l2, sz, 105.31 + 1 / 16, (422 + 793) / 2 / 16 - 5 + 1 / 16, ls1))
rules = [(16.0, 7.5, 0.25, 47.44 - 7.5), (19.0, 14.75, 141.44 - 19.0, 0.25), (98.125, 18.0, 0.25, 47.94 - 18.0)]
rule_d = "".join(f"M{x:.3f} {y:.3f}h{w:.3f}v{h:.3f}h{-w:.3f}Z" for x, y, w, h in rules)

# Code glyphs: Plex Mono, cap height 1.625 mm, tracking matched to the reference (about 1.72 mm per character)
csz = 1.625 / mcap
cadv = M.adv("A") * csz / M.upm
cls = (157 / 16 - (ink_extent(M, "AL-000", csz)[1] - ink_extent(M, "AL-000", csz)[0])) / 5
glyphs = {}
for ch in "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-":
    pen = XPen(M.gs, lambda pt: (pt[0] * csz / M.upm, pt[1] * csz / M.upm))
    M.gs[M.glyph(ch)].draw(pen); glyphs[ch] = "".join(pen.out)
data = {"w": 150, "h": 55, "static": "".join(paths) + rule_d, "logo": logo_d,
        "qr": {"x": 107.375, "y": 18.0, "s": 30.0},
        "code": {"bx": 140.94, "cy": (531 + 688) / 2 / 16 - 5, "adv": round(cadv + cls, 4), "glyphs": glyphs}}
open(OUT, "w").write("// Engraving layout, 150 x 55 mm, text as outlines. Generated by make_plate.py; fonts: Helvetica Neue Condensed Bold, IBM Plex Mono.\nwindow.AL_PLATE = " + json.dumps(data, separators=(",", ":")) + ";\n")
print("ok", len(open(OUT).read()), "bytes; code adv", data["code"]["adv"], "cy", data["code"]["cy"])
