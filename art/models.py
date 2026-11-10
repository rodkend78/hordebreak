"""Every Hordebreak model, authored with the kit. Positions are written as
P(right, forward, up) so a design reads the way the figure stands."""
import math

from kit import Model


def P(x, f, u):
    return (x, -f, u)


W = (1, 1, 1)
SKIN_T = (0.93, 0.91, 0.95)   # tinted: light flesh of a horde creature
DARK_T = (0.52, 0.48, 0.56)   # tinted: its darker hide
DEEP_T = (0.36, 0.33, 0.4)
BONE = (0.95, 0.9, 0.78)
METAL = (0.24, 0.25, 0.32)
STEEL = (0.5, 0.53, 0.6)
MOUTH = (0.2, 0.04, 0.07)
EYE = (1.0, 0.92, 0.35)
WOOD = (0.4, 0.27, 0.17)
GOLD = (1.0, 0.75, 0.2)


def sphere_profile(r, n=7, squash=1.0):
    return [(r * math.sin(i / n * math.pi), -r * squash * math.cos(i / n * math.pi)) for i in range(n + 1)]


def eyes(m, x, f, u, size=(0.06, 0.035, 0.05), col=EYE):
    m.box(P(x, f, u), size, col=col, glow=1, bevel=0, mirror=True)


# ------------------------------------------------------------------ horde
# Creatures are soft and rounded (rbox, capsule, ball); what they carry or
# wear is hard-edged (box, prism). Troopers are the other way round.

def grunt():
    m = Model('grunt')
    leg = dict(swing=-0.75, pivot=0.52, mirror=True)
    m.capsule(P(0.14, 0.02, 0.5), P(0.15, 0.0, 0.15), (0.105, 0.115), (0.075, 0.085), seg=7, col=DARK_T, tint=1, **leg)
    m.rbox(P(0.15, 0.07, 0.06), (0.2, 0.34, 0.12), round=0.45, cuts=1, col=DEEP_T, tint=1, **leg)
    m.rbox(P(0, 0.02, 0.53), (0.4, 0.3, 0.22), round=0.6, cuts=1, col=DEEP_T, tint=1)  # ragged hips
    m.rbox(P(0, 0.1, 0.8), (0.4, 0.32, 0.54), round=0.7, rot=(17, 0, 0), taper=(1.45, 1.2), col=W, tint=1)  # hunched torso
    m.rbox(P(0, 0.14, 1.02), (0.7, 0.34, 0.26), round=0.85, col=(0.86, 0.84, 0.9), tint=1)  # shoulder hump
    for i in range(3):  # spines down the back: the grunt's mark when seen from above
        m.spike(P(0, -0.0 - i * 0.05, 1.08 - i * 0.15), P(0, -0.2 - i * 0.06, 1.26 - i * 0.15), 0.1, col=BONE, detail=i == 1)
    m.ball(P(0, 0.31, 1.14), (0.19, 0.21, 0.19), col=SKIN_T, tint=1)  # head
    m.box(P(0, 0.44, 1.05), (0.2, 0.12, 0.07), col=MOUTH, bevel=0.012)
    m.rbox(P(0, 0.43, 0.98), (0.23, 0.2, 0.09), round=0.5, cuts=1, col=DARK_T, tint=1)  # underbite jaw
    for sx in (-1, 1):
        m.spike(P(sx * 0.075, 0.5, 1.0), P(sx * 0.08, 0.52, 1.1), 0.045, seg=4, col=BONE, detail=True)
    m.rbox(P(0, 0.42, 1.23), (0.3, 0.14, 0.07), round=0.4, cuts=1, rot=(14, 0, 0), col=DARK_T, tint=1, detail=True)  # brow
    eyes(m, 0.08, 0.485, 1.16)
    arm = dict(swing=0.32, pivot=0.98, mirror=True)
    m.capsule(P(0.33, 0.12, 0.98), P(0.34, 0.36, 0.86), 0.082, 0.07, seg=6, col=SKIN_T, tint=1, **arm)
    m.capsule(P(0.34, 0.36, 0.86), P(0.3, 0.6, 0.93), 0.072, 0.062, seg=6, col=SKIN_T, tint=1, **arm)
    m.ball(P(0.3, 0.66, 0.93), (0.09, 0.1, 0.08), sub=1, col=DARK_T, tint=1, **arm)
    for dx in (-0.055, 0, 0.055):
        m.spike(P(0.3 + dx, 0.7, 0.93), P(0.3 + dx * 1.7, 0.87, 0.87), 0.045, seg=4, col=BONE, detail=True, **arm)
    return m


def runner():
    m = Model('runner')
    leg = dict(swing=-1.05, pivot=0.62, mirror=True)
    m.capsule(P(0.11, 0.0, 0.62), P(0.11, -0.02, 0.13), (0.08, 0.095), (0.05, 0.06), seg=6, col=DARK_T, tint=1, **leg)
    m.rbox(P(0.11, 0.06, 0.05), (0.13, 0.3, 0.1), round=0.4, cuts=1, col=DEEP_T, tint=1, **leg)
    m.rbox(P(0, 0.2, 0.84), (0.27, 0.24, 0.54), round=0.7, rot=(38, 0, 0), taper=(1.35, 1.15), col=W, tint=1)  # sprinting lean
    m.rbox(P(0, 0.36, 0.99), (0.5, 0.28, 0.22), round=0.85, cuts=1, col=(0.84, 0.82, 0.86), tint=1)
    m.ball(P(0, 0.5, 1.08), (0.145, 0.2, 0.15), col=SKIN_T, tint=1)  # head
    m.rbox(P(0, 0.66, 1.04), (0.13, 0.2, 0.1), round=0.5, cuts=1, col=DARK_T, tint=1)  # snout
    m.box(P(0, 0.73, 0.995), (0.1, 0.07, 0.025), col=MOUTH, bevel=0, detail=True)
    eyes(m, 0.07, 0.63, 1.13, (0.05, 0.04, 0.04))
    # Crest: a sail from brow to shoulder.
    m.prism([(0.62, 1.16), (0.52, 1.36), (0.34, 1.44), (0.12, 1.34), (0.02, 1.12), (0.3, 1.12)], 0.07, col=(1, 0.95, 0.55), bevel=0.015)
    m.capsule(P(0, 0.0, 0.7), P(0, -0.3, 0.74), 0.075, 0.05, seg=6, col=DARK_T, tint=1)  # tail
    m.spike(P(0, -0.28, 0.735), P(0, -0.66, 0.9), 0.1, seg=6, col=DARK_T, tint=1)
    arm = dict(swing=1.1, pivot=0.96, mirror=True)
    m.capsule(P(0.22, 0.26, 0.97), P(0.25, 0.14, 0.64), 0.058, 0.045, seg=6, col=SKIN_T, tint=1, **arm)
    m.spike(P(0.25, 0.14, 0.66), P(0.25, 0.28, 0.5), 0.09, seg=4, col=BONE, detail=True, **arm)
    return m


def shield():
    m = Model('shield')
    leg = dict(swing=-0.55, pivot=0.5, mirror=True)
    m.capsule(P(0.14, 0, 0.5), P(0.14, 0, 0.15), (0.105, 0.115), (0.085, 0.1), seg=7, col=DARK_T, tint=1, **leg)
    m.box(P(0.14, 0.05, 0.065), (0.2, 0.33, 0.13), col=METAL, bevel=0.035, **leg)
    m.box(P(0, 0, 0.53), (0.4, 0.29, 0.1), col=METAL, bevel=0.025)
    m.rbox(P(0, 0, 0.8), (0.42, 0.3, 0.52), round=0.55, taper=(1.3, 1.1), col=W, tint=1)
    m.box(P(0, 0.15, 0.84), (0.3, 0.05, 0.3), taper=(1.2, 1), col=STEEL, bevel=0.02)  # breastplate
    m.ball(P(0.31, 0, 1.05), (0.17, 0.17, 0.12), col=METAL, mirror=True)  # pauldrons
    m.ball(P(0, 0.03, 1.2), 0.165, col=SKIN_T, tint=1)
    m.lathe([(0.2, 0.0), (0.21, 0.07), (0.17, 0.17), (0.08, 0.23), (0, 0.24)], P(0, 0, 1.2), seg=10, scale=(1, 1.08), col=METAL)  # helmet
    m.prism([(-0.2, 1.38), (0.2, 1.4), (0.14, 1.62), (-0.14, 1.58)], 0.07, col=W, tint=1)  # helmet fin
    m.box(P(0, 0.2, 1.24), (0.22, 0.04, 0.05), col=EYE, glow=1, bevel=0)  # visor slit
    # Tower shield held out front.
    sx = -0.07
    m.prism([(sx - 0.33, 1.18), (sx + 0.33, 1.18), (sx + 0.38, 0.52), (sx + 0.2, 0.2), (sx, 0.1), (sx - 0.2, 0.2), (sx - 0.38, 0.52)], 0.08, at=0.4, plane='xu', col=METAL, bevel=0.02)
    m.prism([(sx - 0.26, 1.1), (sx + 0.26, 1.1), (sx + 0.3, 0.54), (sx, 0.22), (sx - 0.3, 0.54)], 0.03, at=0.445, plane='xu', col=(0.56, 0.5, 0.64), tint=1, bevel=0)
    for u, w in ((0.95, 0.36), (0.78, 0.42), (0.61, 0.4)):
        m.box(P(sx, 0.465, u), (w, 0.02, 0.07), col=W, tint=1, glow=0.9, bevel=0)
    # Spear.
    m.limb(P(0.36, 0.12, 0.12), P(0.36, 0.24, 1.62), 0.055, round=True, seg=6, col=WOOD)
    m.spike(P(0.36, 0.237, 1.58), P(0.36, 0.27, 1.95), 0.13, seg=4, col=(0.9, 0.95, 1), glow=0.6)
    m.capsule(P(0.31, 0, 1.0), P(0.36, 0.17, 0.86), 0.065, 0.06, seg=6, col=SKIN_T, tint=1)
    m.ball(P(0.36, 0.18, 0.83), 0.08, sub=1, col=METAL)
    return m


def bomber():
    m = Model('bomber')
    dark = (0.3, 0.26, 0.2)
    haz = (0.12, 0.12, 0.15)
    leg = dict(swing=-1.0, pivot=0.3, mirror=True)
    m.capsule(P(0.14, 0, 0.3), P(0.14, 0.02, 0.1), 0.075, 0.065, seg=6, col=dark, **leg)
    m.rbox(P(0.14, 0.06, 0.05), (0.17, 0.28, 0.1), round=0.45, cuts=1, col=haz, **leg)
    # The bomb it carries is its body.
    m.lathe(sphere_profile(0.42, 8), P(0, 0, 0.64), seg=12, col=W, tint=1, smooth=180)
    m.lathe([(0.41, -0.09), (0.44, -0.03), (0.44, 0.03), (0.41, 0.09)], P(0, 0, 0.64), seg=12, cap=False, col=haz)
    m.lathe([(0.3, -0.05), (0.335, 0.0), (0.3, 0.05)], P(0, 0, 0.91), seg=12, cap=False, col=haz)
    m.ball(P(0, 0.35, 0.74), (0.16, 0.1, 0.14), col=(0.86, 0.83, 0.8), tint=1)  # face
    eyes(m, 0.06, 0.44, 0.77, (0.055, 0.03, 0.055), col=(1, 0.3, 0.2))
    m.box(P(0, 0.435, 0.69), (0.11, 0.03, 0.025), col=MOUTH, bevel=0, detail=True)
    m.ball(P(0.42, 0.14, 0.58), 0.09, sub=1, col=dark, mirror=True, detail=True)  # stubby hands
    m.lathe([(0.11, 0), (0.11, 0.07), (0.07, 0.1)], P(0, 0, 1.03), seg=8, col=METAL)  # cap
    m.limb(P(0, 0, 1.11), P(0.07, 0, 1.28), 0.04, round=True, seg=5, col=(0.6, 0.5, 0.35))  # fuse
    m.ball(P(0.08, 0, 1.3), 0.075, sub=1, col=(1, 0.85, 0.4), glow=1)
    return m


def heavy(kind):
    m = Model(kind)
    leg = dict(swing=-0.45, pivot=0.46, mirror=True)
    m.capsule(P(0.22, 0, 0.46), P(0.24, 0, 0.17), (0.16, 0.18), (0.13, 0.15), seg=8, col=DARK_T, tint=1, **leg)
    m.box(P(0.24, 0.06, 0.075), (0.3, 0.44, 0.15), col=METAL, bevel=0.04, **leg)
    m.box(P(0, 0, 0.5), (0.68, 0.48, 0.17), col=METAL, bevel=0.035)  # belt
    m.box(P(0, 0.245, 0.5), (0.17, 0.03, 0.13), col=BONE, bevel=0.012, detail=True)
    m.rbox(P(0, 0.04, 0.9), (0.68, 0.52, 0.76), round=0.6, rot=(6, 0, 0), taper=(1.75, 1.3), cuts=3, col=W, tint=1)  # barrel chest
    m.rbox(P(0, 0.3, 0.84), (0.44, 0.12, 0.44), round=0.35, rot=(6, 0, 0), taper=(1.35, 1), col=(0.78, 0.74, 0.8), tint=1)  # belly plate
    m.ball(P(0, 0.19, 1.33), (0.18, 0.2, 0.17), col=SKIN_T, tint=1)  # small sunken head
    m.rbox(P(0, 0.33, 1.2), (0.26, 0.18, 0.1), round=0.45, cuts=1, col=DARK_T, tint=1)  # jaw
    m.box(P(0, 0.35, 1.26), (0.2, 0.1, 0.04), col=MOUTH, bevel=0.01)
    m.spike(P(0.1, 0.4, 1.22), P(0.13, 0.44, 1.42), 0.065, seg=5, col=BONE, mirror=True)  # tusks
    eyes(m, 0.075, 0.37, 1.36, (0.055, 0.04, 0.04))
    m.ball(P(0.6, 0.02, 1.19), (0.3, 0.29, 0.23), col=METAL, mirror=True)  # shoulder plates
    arm = dict(swing=0.5, pivot=1.1, mirror=True)
    m.capsule(P(0.64, 0.03, 1.08), P(0.66, 0.06, 0.78), (0.13, 0.15), (0.12, 0.14), seg=8, col=SKIN_T, tint=1, **arm)
    m.capsule(P(0.66, 0.06, 0.76), P(0.66, 0.12, 0.44), (0.15, 0.17), (0.14, 0.16), seg=8, col=(0.8, 0.78, 0.84), tint=1, **arm)
    m.rbox(P(0.66, 0.14, 0.33), (0.4, 0.44, 0.36), round=0.6, col=(0.68, 0.66, 0.72), tint=1, **arm)  # fist
    m.box(P(0.66, 0.36, 0.34), (0.32, 0.06, 0.11), col=METAL, bevel=0.02, detail=True, **arm)  # knuckle bar
    if kind != 'brute':
        for i in range(3):
            m.spike(P(0.46 + i * 0.13, 0.0, 1.34 - i * 0.03), P(0.5 + i * 0.2, -0.02, 1.68 - i * 0.1), 0.12, col=BONE, mirror=True)
            m.spike(P(0, -0.26, 1.26 - i * 0.2), P(0, -0.58, 1.4 - i * 0.2), 0.12, col=BONE)
    if kind == 'boss':
        m.limb(P(0.15, 0.16, 1.44), P(0.31, 0.16, 1.6), 0.12, 0.1, round=True, seg=6, col=BONE, mirror=True)
        m.spike(P(0.3, 0.16, 1.57), P(0.34, 0.24, 1.9), 0.1, seg=6, col=BONE, mirror=True)  # horns
        m.lathe([(0.16, 0), (0.18, 0.07)], P(0, 0.17, 1.47), seg=8, cap=False, col=GOLD, glow=0.9)  # burning crown
        for i in range(4):
            a = i * math.pi / 2 + math.pi / 4
            m.spike(P(math.cos(a) * 0.17, 0.17 + math.sin(a) * 0.17, 1.51), P(math.cos(a) * 0.2, 0.17 + math.sin(a) * 0.2, 1.66), 0.065, seg=4, col=GOLD, glow=0.9)
        m.ball(P(0, 0.34, 1.0), (0.16, 0.08, 0.16), col=(1, 0.55, 0.15), glow=1)  # chest core
        m.prism([(-0.4, 1.36), (0.4, 1.36), (0.54, 0.3), (0.27, 0.16), (0, 0.32), (-0.27, 0.16), (-0.54, 0.3)], 0.05, at=-0.36, plane='xu',
                col=(0.32, 0.05, 0.1), bevel=0, rot=(-9, 0, 0), rot_at=P(0, -0.36, 1.36))  # cape
        sh = dict(swing=-0.2, pivot=1.1)
        m.prism([(-0.96, 1.14), (-0.3, 1.14), (-0.24, 0.5), (-0.63, 0.12), (-1.02, 0.5)], 0.09, at=0.5, plane='xu', col=METAL, bevel=0.025, **sh)
        m.prism([(-0.63, 0.94), (-0.44, 0.7), (-0.63, 0.46), (-0.82, 0.7)], 0.03, at=0.56, plane='xu', col=GOLD, glow=0.9, bevel=0, **sh)  # emblem
        mc = dict(swing=0.5, pivot=1.1)
        m.limb(P(0.66, 0.2, 0.42), P(0.66, 0.9, 0.5), 0.085, round=True, seg=6, col=WOOD, **mc)
        m.ball(P(0.66, 0.98, 0.51), 0.21, col=METAL, **mc)
        for dx, df, du in ((1, 0, 0), (-1, 0, 0), (0, 0, 1), (0, 0, -1), (0, 1, 0)):
            m.spike(P(0.66 + dx * 0.17, 0.98 + df * 0.17, 0.51 + du * 0.17), P(0.66 + dx * 0.36, 0.98 + df * 0.36, 0.51 + du * 0.36), 0.11, seg=4, col=(1, 0.6, 0.2), glow=0.8, **mc)
    return m


def spitter():
    """New: a bloated artillery creature that lobs acid from range."""
    m = Model('spitter')
    sac = (0.95, 1.0, 0.7)
    leg = dict(swing=-0.6, pivot=0.45, mirror=True)
    m.capsule(P(0.16, -0.02, 0.46), P(0.2, 0.0, 0.12), (0.07, 0.08), (0.05, 0.06), seg=6, col=DARK_T, tint=1, **leg)
    m.rbox(P(0.2, 0.06, 0.05), (0.17, 0.32, 0.1), round=0.45, cuts=1, col=DEEP_T, tint=1, **leg)
    m.rbox(P(0, 0.06, 0.68), (0.4, 0.42, 0.44), round=0.75, rot=(24, 0, 0), taper=(1.2, 1.1), col=DARK_T, tint=1)
    # Acid sacs piled on its back glow from inside.
    m.ball(P(0, -0.1, 1.0), (0.34, 0.36, 0.33), sub=2, col=sac, tint=1, glow=0.4)
    m.ball(P(0.24, -0.26, 0.82), 0.19, sub=2, col=sac, tint=1, glow=0.4, mirror=True)
    m.ball(P(0, -0.42, 0.9), 0.17, sub=1, col=sac, tint=1, glow=0.4, detail=True)
    for i in range(4):  # ribs clamping the sac
        a = (i - 1.5) * 0.55
        m.limb(P(math.sin(a) * 0.38, -0.1, 0.74), P(math.sin(a) * 0.3, -0.1, 1.33), (0.055, 0.07), (0.03, 0.03), col=BONE, bevel=0, detail=True)
    m.capsule(P(0, 0.2, 0.84), P(0, 0.42, 1.18), 0.09, 0.07, seg=7, col=SKIN_T, tint=1)  # neck
    m.ball(P(0, 0.46, 1.26), (0.16, 0.18, 0.15), col=SKIN_T, tint=1)
    # Funnel mouth aimed up the road.
    m.lathe([(0.07, 0.0), (0.16, 0.17)], P(0, 0.56, 1.3), axis='f', seg=8, cap=False, col=DARK_T, tint=1)
    m.ball(P(0, 0.65, 1.3), (0.11, 0.06, 0.11), sub=1, col=(0.75, 1, 0.35), glow=1)
    eyes(m, 0.12, 0.52, 1.37, (0.05, 0.05, 0.045), col=(0.8, 1, 0.4))
    arm = dict(swing=0.4, pivot=0.8, mirror=True)
    m.capsule(P(0.22, 0.2, 0.8), P(0.27, 0.42, 0.58), 0.05, 0.04, seg=5, col=SKIN_T, tint=1, **arm)
    return m


# ------------------------------------------------------------------ troopers

NAVY = (0.15, 0.17, 0.26)
BOOT = (0.09, 0.09, 0.11)
FACE = (0.96, 0.78, 0.62)
PLATE = (0.8, 0.8, 0.84)
VISOR = (0.5, 0.95, 1.0)


def trooper(tier):
    """Six ranks. Each adds armour so a stronger squad looks stronger."""
    m = Model('inf%d' % tier, face=-1)
    bulk = 1.0 + 0.05 * max(0, tier - 3)
    leg = dict(swing=-0.6, pivot=0.46, mirror=True)
    m.capsule(P(0.13, 0, 0.48), P(0.13, 0, 0.16), (0.092, 0.105), (0.08, 0.095), seg=7, col=NAVY, **leg)
    m.box(P(0.13, 0.05, 0.065), (0.19, 0.31, 0.13), col=BOOT, bevel=0.03, **leg)
    if tier >= 2:
        m.box(P(0.13, 0.11, 0.31), (0.16, 0.06, 0.13), col=PLATE, tint=1, bevel=0.02, **leg)  # knee pads
    if tier >= 5:
        m.box(P(0.13, 0.1, 0.17), (0.17, 0.05, 0.14), col=PLATE, tint=1, bevel=0.02, **leg)  # shin plates
    m.box(P(0, 0, 0.51), (0.37 * bulk, 0.26, 0.09), col=BOOT, bevel=0.02)  # belt
    m.rbox(P(0, 0, 0.73), (0.38 * bulk, 0.28, 0.44), round=0.45, taper=(1.28, 1.1), col=W, tint=1)  # jacket
    m.box(P(0, 0.145, 0.77), (0.3 * bulk, 0.06, 0.28), taper=(1.15, 1), col=PLATE, tint=1, bevel=0.02)  # chest plate
    if tier >= 1:
        for x in (-0.09, 0.09):
            m.box(P(x, 0.15, 0.59), (0.1, 0.07, 0.1), col=NAVY, bevel=0.015, detail=True)  # pouches
    # Pack.
    m.box(P(0, -0.2, 0.75), (0.3, 0.17, 0.36 if tier < 2 else 0.32), col=NAVY, bevel=0.035)
    m.box(P(0, -0.2, 0.94 if tier < 2 else 0.915), (0.24, 0.13, 0.03), col=(0.34, 0.38, 0.5), bevel=0.01, detail=True)  # pack flap
    if 2 <= tier <= 4:
        m.limb(P(-0.18, -0.2, 0.97), P(0.18, -0.2, 0.97), 0.13, round=True, seg=8, col=(0.34, 0.38, 0.3))  # bedroll
    if tier >= 3:
        m.limb(P(0.11, -0.26, 0.9), P(0.13, -0.3, 1.55), 0.03, round=True, seg=4, col=BOOT)  # antenna
        m.ball(P(0.13, -0.3, 1.57), 0.035, sub=1, col=(1, 0.4, 0.3), glow=1)
    if tier >= 5:
        m.lathe([(0.1, 0), (0.13, 0.05), (0.13, 0.2), (0.1, 0.25)], P(0, -0.24, 0.72), seg=8, col=STEEL)  # reactor
        m.lathe([(0.135, 0.09), (0.14, 0.12), (0.135, 0.15)], P(0, -0.24, 0.72), seg=8, cap=False, col=VISOR, glow=1)
        m.ball(P(0, -0.24, 0.98), 0.07, sub=1, col=VISOR, glow=1)
    # Shoulders.
    if tier >= 1:
        r = (0.105, 0.115, 0.075) if tier < 3 else (0.14, 0.15, 0.1) if tier < 4 else (0.17, 0.17, 0.12)
        m.ball(P(0.26 * bulk, 0, 0.955), r, col=(0.6, 0.63, 0.7) if tier < 4 else PLATE, tint=0 if tier < 4 else 1, mirror=True)
        if tier >= 4:
            m.lathe([(0.175, 0.0), (0.18, 0.025)], P(0.26 * bulk, 0, 0.95), seg=8, cap=False, col=GOLD, mirror=True)  # gilded rim
    if tier == 4:
        m.prism([(-0.26, 0.98), (0.26, 0.98), (0.3, 0.42), (0, 0.5), (-0.3, 0.42)], 0.03, at=-0.3, plane='xu', col=DARK_T, tint=1, bevel=0,
                rot=(-10, 0, 0), rot_at=P(0, -0.3, 0.98))  # half cape
    # Head and helmet.
    m.ball(P(0, 0.015, 1.06), 0.155, col=FACE)
    dome = [(0.2, -0.02), (0.205, 0.05), (0.17, 0.14), (0.09, 0.195), (0, 0.205)]
    m.lathe(dome, P(0, 0, 1.07), seg=10, scale=(1, 1.1), col=(0.97, 0.97, 1.0), tint=0.5)  # pale helmet: the squad reads as heads from above
    m.lathe([(0.208, 0.0), (0.212, 0.045)], P(0, 0, 1.07), seg=10, scale=(1, 1.1), cap=False, col=BOOT)  # helmet band
    if tier >= 1:
        m.box(P(0, -0.02, 1.262), (0.07, 0.3, 0.03), col=W, tint=1, bevel=0.01)  # rank stripe over the crown
    if tier == 0:
        m.box(P(0, 0.2, 1.1), (0.26, 0.1, 0.03), col=(0.6, 0.6, 0.64), tint=1, bevel=0.01)  # cap peak
    else:
        m.box(P(0, 0.17, 1.065), (0.25, 0.05, 0.075), col=VISOR, glow=0.75, bevel=0.012)  # visor
    if tier == 2:
        m.ball(P(0.07, 0.17, 1.2), (0.055, 0.04, 0.045), sub=1, col=BOOT, mirror=True, detail=True)  # goggles pushed up
    if tier >= 3:
        m.box(P(0, 0.16, 0.985), (0.2, 0.08, 0.09), col=(0.62, 0.62, 0.66), tint=1, bevel=0.02)  # face guard
    if tier == 4:
        m.prism([(0.16, 1.26), (0.0, 1.42), (-0.24, 1.36), (-0.2, 1.24)], 0.06, col=(0.85, 0.14, 0.18), bevel=0.012)  # plume
    if tier >= 5:
        for s in (-1, 1):
            m.prism([(0.02, 1.22), (-0.08, 1.46), (-0.2, 1.4), (-0.14, 1.2)], 0.035, at=s * 0.13, col=GOLD, bevel=0.008)  # twin fins
        m.box(P(0, 0.19, 1.065), (0.27, 0.03, 0.03), col=W, glow=1, bevel=0)
    return m


def _arms_fn(m, rh, lh, re=None, le=None, bulk=1.0):
    """Two bent arms from the shoulders to the given hand positions."""
    sleeve = (0.86, 0.86, 0.9)
    rs, ls = P(0.25, 0, 0.9), P(-0.25, 0, 0.9)
    re = re or P(0.3, 0.06, 0.7)
    le = le or P(-0.24, 0.2, 0.7)
    for s, e, h in ((rs, re, rh), (ls, le, lh)):
        m.capsule(s, e, 0.062, 0.055, seg=6, col=sleeve, tint=1)
        m.capsule(e, h, 0.055, 0.046, seg=6, col=sleeve, tint=1)
        m.ball(h, 0.062, sub=1, col=BOOT)


GUN = (0.2, 0.21, 0.26)
GUN2 = (0.36, 0.38, 0.46)


def weapon(kind, arms=True):
    """Arms and gun together, so each weapon gets the right grip."""
    m = Model('w_' + kind, face=-1)
    _arms = _arms_fn if arms else (lambda *a, **k: None)
    x = 0.17
    if kind == 'rifle':
        _arms(m, P(x, 0.2, 0.74), P(0.1, 0.52, 0.76))
        m.box(P(x, 0.28, 0.79), (0.085, 0.44, 0.12), col=GUN, bevel=0.015)
        m.box(P(x, -0.02, 0.775), (0.07, 0.2, 0.1), taper=(1, 1), col=GUN2, bevel=0.02)  # stock
        m.box(P(x, 0.6, 0.79), (0.08, 0.22, 0.095), col=(0.36, 0.38, 0.3), bevel=0.015)  # handguard
        m.limb(P(x, 0.7, 0.795), P(x, 0.96, 0.795), 0.045, round=True, seg=6, col=GUN)
        m.box(P(x, 0.34, 0.67), (0.055, 0.1, 0.17), rot=(-14, 0, 0), col=GUN2, bevel=0.012)  # magazine
        m.box(P(x, 0.3, 0.875), (0.04, 0.16, 0.05), col=GUN2, bevel=0.01, detail=True)  # sight
    elif kind == 'smg':
        _arms(m, P(x, 0.2, 0.74), P(0.11, 0.42, 0.74))
        m.box(P(x, 0.27, 0.79), (0.085, 0.34, 0.12), col=GUN, bevel=0.015)
        m.limb(P(x, 0.44, 0.795), P(x, 0.72, 0.795), 0.085, round=True, seg=7, col=GUN2)  # suppressor
        m.box(P(x, 0.3, 0.64), (0.05, 0.08, 0.22), col=GUN2, bevel=0.012)  # long magazine
        m.limb(P(x, 0.1, 0.82), P(x, -0.08, 0.82), (0.03, 0.03), col=GUN2, bevel=0)
        m.box(P(x, -0.09, 0.79), (0.07, 0.03, 0.1), col=GUN2, bevel=0.008, detail=True)
    elif kind == 'shotgun':
        _arms(m, P(x, 0.18, 0.74), P(0.11, 0.58, 0.75))
        m.box(P(x, 0.24, 0.79), (0.09, 0.3, 0.12), col=GUN, bevel=0.015)
        m.box(P(x, -0.04, 0.76), (0.075, 0.28, 0.13), taper=(1, 1), rot=(-6, 0, 0), col=WOOD, bevel=0.025)  # wooden stock
        m.limb(P(x, 0.38, 0.815), P(x, 1.0, 0.815), 0.065, round=True, seg=7, col=GUN2)  # barrel
        m.limb(P(x, 0.38, 0.755), P(x, 0.86, 0.755), 0.05, round=True, seg=6, col=GUN)  # tube magazine
        m.limb(P(x, 0.5, 0.76), P(x, 0.7, 0.76), 0.1, round=True, seg=7, col=WOOD)  # pump
    elif kind == 'mg':
        _arms(m, P(x, 0.18, 0.72), P(0.08, 0.5, 0.72))
        m.box(P(x, 0.3, 0.79), (0.12, 0.56, 0.16), col=GUN, bevel=0.02)
        m.box(P(x, -0.06, 0.77), (0.09, 0.2, 0.13), col=GUN2, bevel=0.02)
        m.limb(P(x, 0.58, 0.8), P(x, 0.9, 0.8), 0.13, round=True, seg=8, col=GUN2)  # heat shield
        m.limb(P(x, 0.88, 0.8), P(x, 1.06, 0.8), 0.06, round=True, seg=6, col=GUN)
        m.box(P(x - 0.12, 0.34, 0.72), (0.14, 0.18, 0.18), col=(0.3, 0.36, 0.26), bevel=0.02)  # ammo box
        m.box(P(x - 0.04, 0.34, 0.83), (0.1, 0.1, 0.03), col=(0.95, 0.72, 0.25), bevel=0, detail=True)  # belt
        m.limb(P(x, 0.24, 0.87), P(x, 0.44, 0.9), (0.03, 0.03), col=GUN2, bevel=0, detail=True)  # carry handle
        m.limb(P(x, 0.74, 0.74), P(x, 0.56, 0.66), (0.03, 0.03), col=GUN2, bevel=0, detail=True)  # folded bipod
    elif kind == 'rail':
        cyan = (0.35, 0.85, 1.0)
        _arms(m, P(x, 0.16, 0.73), P(0.1, 0.52, 0.72))
        m.box(P(x, 0.14, 0.79), (0.11, 0.4, 0.17), col=GUN2, bevel=0.025)  # capacitor housing
        for u in (0.855, 0.725):
            m.box(P(x, 0.68, u), (0.075, 0.72, 0.04), col=(0.76, 0.8, 0.9), bevel=0.012)  # the rails
        m.limb(P(x, 0.34, 0.79), P(x, 1.02, 0.79), (0.035, 0.05), col=cyan, glow=1, bevel=0)
        for f in (0.46, 0.66, 0.86):
            m.box(P(x, f, 0.79), (0.1, 0.06, 0.2), col=GUN, bevel=0.015)  # coil clamps
        m.ball(P(x, -0.06, 0.82), 0.07, sub=1, col=cyan, glow=1)
    elif kind == 'rocket':
        olive = (0.33, 0.4, 0.27)
        _arms(m, P(0.2, 0.2, 0.86), P(0.1, 0.42, 0.9), re=P(0.32, 0.04, 0.72), le=P(-0.22, 0.24, 0.78))
        m.lathe([(0.13, -0.42), (0.1, -0.34), (0.1, 0.52), (0.115, 0.54), (0.115, 0.62), (0.1, 0.62)], P(0.2, 0, 0.99), axis='f', seg=9, col=olive)
        m.lathe([(0.085, 0.6), (0.085, 0.68), (0, 0.84)], P(0.2, 0, 0.99), axis='f', seg=8, col=(0.9, 0.25, 0.2))  # warhead
        m.box(P(0.2, 0.2, 0.9), (0.05, 0.07, 0.12), col=GUN, bevel=0.01)
        m.box(P(0.11, 0.3, 1.06), (0.05, 0.14, 0.07), col=GUN, bevel=0.012, detail=True)  # sight
        m.lathe([(0.105, 0.0), (0.105, 0.05)], P(0.2, -0.1, 0.99), axis='f', seg=9, cap=False, col=(0.95, 0.8, 0.2), detail=True)  # band
    elif kind == 'plasma':
        mag = (0.9, 0.35, 1.0)
        _arms(m, P(x, 0.14, 0.72), P(0.08, 0.46, 0.7), re=P(0.31, 0.02, 0.7))
        m.box(P(x, 0.02, 0.76), (0.13, 0.26, 0.2), col=GUN, bevel=0.03)  # power pack
        m.lathe([(0.09, 0.12), (0.13, 0.2), (0.14, 0.4), (0.1, 0.52), (0.1, 0.72), (0.07, 0.74)], P(x, 0, 0.77), axis='f', seg=9, col=(0.82, 0.84, 0.92))
        m.ball(P(x, 0.32, 0.86), 0.105, sub=2, col=mag, glow=1)  # plasma chamber
        for f in (0.56, 0.66):
            m.lathe([(0.115, f), (0.125, f + 0.02), (0.115, f + 0.04)], P(x, 0, 0.77), axis='f', seg=9, cap=False, col=mag, glow=1)
        m.ball(P(x, 0.75, 0.77), (0.06, 0.04, 0.06), sub=1, col=mag, glow=1)
    return m


# ------------------------------------------------------------------ props

def rocket():
    m = Model('rocket', face=-1, ground=False)
    m.lathe([(0.0, -0.32), (0.06, -0.3), (0.085, -0.2), (0.085, 0.2), (0, 0.42)], P(0, 0, 0), axis='f', seg=8, col=(0.86, 0.88, 0.92))
    m.lathe([(0.088, 0.14), (0.088, 0.2), (0, 0.425)], P(0, 0, 0), axis='f', seg=8, col=(0.9, 0.25, 0.2))
    fin = [(-0.34, 0.0), (-0.16, 0.0), (-0.22, 0.2), (-0.34, 0.2)]
    m.prism(fin, 0.025, col=(0.9, 0.25, 0.2), bevel=0)
    m.prism([(a, -b) for a, b in fin][::-1], 0.025, col=(0.9, 0.25, 0.2), bevel=0)
    m.prism([(b, a) for a, b in fin], 0.025, plane='xf', col=(0.9, 0.25, 0.2), bevel=0)
    m.prism([(-b, a) for a, b in fin][::-1], 0.025, plane='xf', col=(0.9, 0.25, 0.2), bevel=0)
    return m


def crate():
    """Supply crate, one unit across, centred on the origin."""
    m = Model('crate', ground=False)
    m.box((0, 0, 0), (0.94, 0.94, 0.94), col=W, tint=1, bevel=0.05)
    for s in (-1, 1):
        for t in (-1, 1):
            m.box((s * 0.45, t * 0.45, 0), (0.12, 0.12, 1.0), col=(0.2, 0.22, 0.28), bevel=0.02)  # corner posts
    m.box((0, 0, 0.3), (1.0, 1.0, 0.13), col=(1, 0.86, 0.3), glow=0.45, bevel=0.02)  # straps
    m.box((0, 0, -0.3), (1.0, 1.0, 0.13), col=(1, 0.86, 0.3), glow=0.45, bevel=0.02)
    for rz in (0, 90, 180, 270):  # an arrow on every side
        a = math.radians(rz)
        c = (math.sin(a) * 0.48, -math.cos(a) * 0.48, 0)
        m.box(c, (0.3, 0.02, 0.08), rot=(0, 0, rz), col=W, glow=0.9, bevel=0)
        m.box(c, (0.08, 0.02, 0.3), rot=(0, 0, rz), col=W, glow=0.9, bevel=0)
    return m


def jet():
    """Strike aircraft for the airstrike. Nose toward -z in game."""
    m = Model('jet', face=-1, ground=False)
    body = (0.34, 0.4, 0.55)
    m.lathe([(0.0, -1.5), (0.2, -1.3), (0.26, -0.4), (0.24, 0.6), (0.12, 1.3), (0, 1.7)], P(0, 0, 0), axis='f', seg=8, scale=(1, 0.8), col=body)
    m.prism([(0.2, 0.5), (1.5, -0.8), (1.5, -1.1), (0.2, -0.9)], 0.07, plane='xf', col=body, bevel=0.015)
    m.prism([(-0.2, 0.5), (-0.2, -0.9), (-1.5, -1.1), (-1.5, -0.8)], 0.07, plane='xf', col=body, bevel=0.015)
    m.prism([(-0.7, 0.05), (-1.3, 0.05), (-1.45, 0.62), (-1.2, 0.62)], 0.06, at=0.3, col=(0.24, 0.28, 0.4), bevel=0.012,
            rot=(0, 18, 0), rot_at=P(0.3, 0, 0))
    m.prism([(-0.7, 0.05), (-1.3, 0.05), (-1.45, 0.62), (-1.2, 0.62)], 0.06, at=-0.3, col=(0.24, 0.28, 0.4), bevel=0.012,
            rot=(0, -18, 0), rot_at=P(-0.3, 0, 0))
    m.ball(P(0, 0.75, 0.14), (0.13, 0.36, 0.12), sub=2, col=(0.5, 0.95, 1.0), glow=0.6)  # canopy
    m.ball(P(0, -1.46, 0), (0.17, 0.1, 0.14), sub=1, col=(1, 0.7, 0.3), glow=1)  # afterburner
    m.prism([(0.6, 0.2), (1.2, -0.42), (1.2, -0.58), (0.6, -0.1)], 0.02, plane='xf', at=0.045, col=(1, 0.6, 0.15), bevel=0)
    m.prism([(-0.6, 0.2), (-0.6, -0.1), (-1.2, -0.58), (-1.2, -0.42)], 0.02, plane='xf', at=0.045, col=(1, 0.6, 0.15), bevel=0)
    return m


ENEMIES = {
    'grunt': (grunt, (0.95, 0.27, 0.3), 1.0),
    'runner': (runner, (1.0, 0.5, 0.14), 0.98),
    'shield': (shield, (0.66, 0.36, 0.95), 1.04),
    'bomber': (bomber, (1.0, 0.78, 0.1), 1.05),
    'spitter': (spitter, (0.42, 0.86, 0.3), 1.08),
    'brute': (lambda: heavy('brute'), (0.7, 0.16, 0.28), 1.12),
    'giant': (lambda: heavy('giant'), (0.56, 0.1, 0.18), 1.95),
    'boss': (lambda: heavy('boss'), (0.78, 0.12, 0.2), 3.1),
}
LOD_ENEMIES = ['grunt', 'runner', 'shield', 'bomber', 'spitter', 'brute']
INFANTRY = [
    ('recruit', (0.2, 0.62, 1.0)), ('soldier', (0.1, 0.78, 0.86)), ('veteran', (0.16, 0.82, 0.55)),
    ('commando', (0.42, 0.5, 1.0)), ('guard', (0.72, 0.5, 1.0)), ('titan', (1.0, 0.82, 0.25)),
]
WEAPONS = ['rifle', 'smg', 'shotgun', 'mg', 'rail', 'rocket', 'plasma']
