"""Every Hordebreak model, authored with the kit. Positions are written as
P(right, forward, up) so a design reads the way the figure stands."""
import math

from kit import Model, Rig


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


def eyes(m, x, f, u, size=(0.06, 0.035, 0.05), col=EYE, **kw):
    m.box(P(x, f, u), size, col=col, glow=1, bevel=0, mirror=True, **kw)


# ------------------------------------------------------------------ horde
# Style: chunky faceted bodies in the unit's colour, steel armour plates,
# bone spikes, and glowing hexagon / triangle insets. Chamfered edges are
# painted lighter by the bake.

BODY = (0.9, 0.9, 0.9)        # tinted: main colour (leaves headroom for edge highlights)
BODY_L = (1.0, 1.0, 1.0)      # tinted: raised plates
BODY_D = (0.62, 0.58, 0.66)   # tinted: joints and hide
BODY_DD = (0.36, 0.34, 0.4)
PLATE_S = (0.62, 0.62, 0.72)  # steel armour
PLATE_D = (0.33, 0.32, 0.41)  # dark steel
AMBER = (1.0, 0.74, 0.22)
ACID = (0.62, 1.0, 0.25)


def light(m, c, r, axis='f', sides=6, col=AMBER, rim=PLATE_D, flip=False, turn=0.0, tint=0, **kw):
    """A glowing inset: a dark polygon rim with a lit core, facing along axis."""
    s = -1 if flip else 1
    m.lathe([(r, -0.012 * s), (r, 0.02 * s)], c, axis=axis, seg=sides, exact=True, turn=turn, col=rim, **kw)
    m.lathe([(r * 0.66, 0.0), (r * 0.6, 0.034 * s)], c, axis=axis, seg=sides, exact=True, turn=turn, col=col, tint=tint, glow=1, **kw)


def biped(name, hip_u, hip_x, knee_u, waist_u, neck, shoulder, elbow, head=None, extras=()):
    """The two-legged skeleton most figures share. Pivots are P(right, forward, up)."""
    sx, sf, su = shoulder
    ex, ef, eu = elbow
    bones = [
        ('root', None, P(0, 0, hip_u)), ('chest', 'root', P(0, 0, waist_u)), ('head', 'chest', P(*neck)),
        ('arm_r', 'chest', P(sx, sf, su)), ('fore_r', 'arm_r', P(ex, ef, eu)),
        ('arm_l', 'chest', P(-sx, sf, su)), ('fore_l', 'arm_l', P(-ex, ef, eu)),
        ('thigh_r', 'root', P(hip_x, 0, hip_u)), ('shin_r', 'thigh_r', P(hip_x, 0, knee_u)),
        ('thigh_l', 'root', P(-hip_x, 0, hip_u)), ('shin_l', 'thigh_l', P(-hip_x, 0, knee_u)),
    ] + list(extras)
    return Rig(name, bones, head=head, waist=waist_u)


RIG_GRUNT = biped('grunt', 0.54, 0.14, 0.33, 0.6, neck=(0, 0.2, 1.05), shoulder=(0.33, 0.12, 0.99), elbow=(0.34, 0.36, 0.86),
                  head=(P(0, 0.36, 1.12), 0.22))
RIG_SHIELD = biped('shield', 0.54, 0.14, 0.32, 0.62, neck=(0, 0, 1.1), shoulder=(0.32, 0, 1.0), elbow=(0.36, 0.1, 0.9),
                   head=(P(0, 0.05, 1.3), 0.3))
RIG_SPITTER = biped('spitter', 0.5, 0.17, 0.3, 0.56, neck=(0, 0.2, 0.86), shoulder=(0.22, 0.2, 0.82), elbow=(0.25, 0.3, 0.7))
RIG_HEAVY = biped('heavy', 0.52, 0.22, 0.32, 0.62, neck=(0, 0.12, 1.24), shoulder=(0.66, 0.03, 1.1), elbow=(0.68, 0.05, 0.8),
                  head=(P(0, 0.28, 1.35), 0.26))
RIG_TROOPER = biped('trooper', 0.5, 0.13, 0.3, 0.6, neck=(0, 0, 1.0), shoulder=(0.27, 0, 0.9), elbow=(0.3, 0.06, 0.7),
                    extras=[('gun', 'chest', P(0.2, 0, 0.9))])  # arms and weapon move as one aiming unit
RIG_BOMBER = Rig('bomber', [
    ('root', None, P(0, 0, 0.34)), ('chest', 'root', P(0, 0, 0.34)),
    ('thigh_r', 'root', P(0.18, 0, 0.34)), ('thigh_l', 'root', P(-0.18, 0, 0.34)),
    ('halo', 'chest', P(0, 0, 1.26)),
])
RIG_HOUND = Rig('hound', [
    ('root', None, P(0, -0.24, 0.56)), ('chest', 'root', P(0, 0.0, 0.56)), ('head', 'chest', P(0, 0.36, 0.64)),
    ('jaw', 'head', P(0, 0.68, 0.66)), ('tail', 'root', P(0, -0.42, 0.64)),
    ('fleg_r', 'chest', P(0.15, 0.3, 0.48)), ('fshin_r', 'fleg_r', P(0.16, 0.37, 0.24)),
    ('fleg_l', 'chest', P(-0.15, 0.3, 0.48)), ('fshin_l', 'fleg_l', P(-0.16, 0.37, 0.24)),
    ('hleg_r', 'root', P(0.15, -0.26, 0.54)), ('hshin_r', 'hleg_r', P(0.17, -0.42, 0.28)),
    ('hleg_l', 'root', P(-0.15, -0.26, 0.54)), ('hshin_l', 'hleg_l', P(-0.17, -0.42, 0.28)),
])


def grunt():
    m = Model('grunt', rig=RIG_GRUNT)
    th = dict(bone='thigh_r', mirror=True)
    sh = dict(bone='shin_r', mirror=True)
    m.limb(P(0.14, 0.02, 0.54), P(0.145, 0.02, 0.32), (0.2, 0.22), (0.18, 0.2), col=BODY_D, tint=1, bevel=0.03, **th)
    m.limb(P(0.145, 0.02, 0.34), P(0.15, 0.0, 0.12), (0.18, 0.2), (0.15, 0.17), col=BODY_D, tint=1, bevel=0.03, **sh)
    m.box(P(0.15, 0.07, 0.06), (0.2, 0.34, 0.12), taper=(0.85, 0.8), col=BODY_DD, tint=1, bevel=0.03, **sh)
    m.box(P(0, 0.02, 0.55), (0.4, 0.3, 0.12), col=PLATE_D, bevel=0.03)  # belt
    m.box(P(0, 0.1, 0.8), (0.38, 0.3, 0.5), rot=(17, 0, 0), taper=(1.5, 1.2), col=BODY, tint=1, bevel=0.05)  # hunched torso
    m.box(P(0, 0.14, 1.03), (0.74, 0.34, 0.22), taper=(0.8, 0.8), col=BODY_L, tint=1, bevel=0.06, bone='chest')  # shoulder yoke
    m.ball(P(-0.36, 0.12, 1.1), (0.19, 0.2, 0.14), sub=1, smooth=0, col=PLATE_S)  # one scavenged pauldron
    light(m, P(0, 0.275, 0.84), 0.075, axis='f', detail=True)
    for i in range(3):  # spines down the back: the grunt's mark when seen from above
        m.spike(P(0, -0.0 - i * 0.05, 1.1 - i * 0.15), P(0, -0.2 - i * 0.06, 1.3 - i * 0.15), 0.1, col=BONE, detail=i == 1)
    m.box(P(0, 0.31, 1.15), (0.34, 0.38, 0.3), taper=(0.8, 0.85), col=SKIN_T, tint=1, bevel=0.06)  # head
    m.box(P(0, 0.45, 1.06), (0.2, 0.12, 0.07), col=MOUTH, bevel=0.012)
    m.box(P(0, 0.44, 0.99), (0.24, 0.2, 0.09), taper=(0.9, 0.9), col=BODY_D, tint=1, bevel=0.03)  # underbite jaw
    for sx in (-1, 1):
        m.spike(P(sx * 0.08, 0.51, 1.01), P(sx * 0.085, 0.53, 1.12), 0.05, seg=4, col=BONE, detail=True)
    m.box(P(0, 0.43, 1.25), (0.32, 0.14, 0.07), rot=(14, 0, 0), col=BODY_D, tint=1, bevel=0.02, detail=True)  # brow
    eyes(m, 0.085, 0.5, 1.17, (0.07, 0.035, 0.05))
    ua = dict(bone='arm_r', mirror=True)
    fa = dict(bone='fore_r', mirror=True)
    m.limb(P(0.33, 0.12, 0.99), P(0.34, 0.36, 0.86), (0.16, 0.16), (0.14, 0.14), col=BODY, tint=1, bevel=0.03, **ua)
    m.limb(P(0.34, 0.36, 0.86), P(0.3, 0.62, 0.93), (0.15, 0.15), (0.13, 0.13), col=SKIN_T, tint=1, bevel=0.03, **fa)
    m.box(P(0.3, 0.68, 0.93), (0.17, 0.16, 0.14), col=BODY_D, tint=1, bevel=0.035, **fa)
    for dx in (-0.055, 0, 0.055):
        m.spike(P(0.3 + dx, 0.73, 0.93), P(0.3 + dx * 1.7, 0.9, 0.87), 0.05, seg=4, col=BONE, detail=True, **fa)
    return m


def runner():
    """A plated hound. Diagonal legs move together, each about its own hip."""
    m = Model('runner', rig=RIG_HOUND)
    fu = dict(bone='fleg_r', mirror=True)
    fs = dict(bone='fshin_r', mirror=True)
    hu = dict(bone='hleg_r', mirror=True)
    hs = dict(bone='hshin_r', mirror=True)
    # Front legs.
    m.limb(P(0.15, 0.3, 0.48), P(0.16, 0.37, 0.23), (0.13, 0.17), (0.1, 0.12), col=BODY_D, tint=1, bevel=0.02, **fu)
    m.limb(P(0.16, 0.37, 0.25), P(0.16, 0.34, 0.07), (0.1, 0.12), (0.085, 0.1), col=BODY_D, tint=1, bevel=0.02, **fs)
    m.box(P(0.16, 0.4, 0.045), (0.14, 0.22, 0.09), col=BODY_DD, tint=1, bevel=0.025, **fs)
    # Hind legs, with a heavy haunch.
    m.limb(P(0.15, -0.26, 0.54), P(0.17, -0.42, 0.28), (0.15, 0.24), (0.11, 0.14), col=BODY, tint=1, bevel=0.03, **hu)
    m.limb(P(0.17, -0.42, 0.29), P(0.17, -0.31, 0.07), (0.1, 0.12), (0.085, 0.1), col=BODY_D, tint=1, bevel=0.02, **hs)
    m.box(P(0.17, -0.25, 0.045), (0.14, 0.22, 0.09), col=BODY_DD, tint=1, bevel=0.025, **hs)
    for leg, f in ((fs, 0.5), (hs, -0.15)):
        for dx in (-0.045, 0, 0.045):
            m.spike(P(0.16 + dx, f, 0.05), P(0.16 + dx * 1.4, f + 0.12, 0.015), 0.045, seg=4, col=BONE, detail=True, **leg)
    # Body.
    m.box(P(0, 0.2, 0.58), (0.34, 0.48, 0.36), taper=(0.85, 1), col=BODY, tint=1, bevel=0.05, bone='chest')  # chest
    m.box(P(0, -0.2, 0.56), (0.28, 0.46, 0.28), rot=(-6, 0, 0), taper=(0.9, 1), col=BODY, tint=1, bevel=0.05, bone='root')  # loin
    m.box(P(0, 0.0, 0.44), (0.22, 0.6, 0.12), col=BODY_D, tint=1, bevel=0.025, bone='root')  # belly
    for sx in (-1, 1):  # hexagonal plates on shoulder and haunch, each with a lit core
        m.lathe([(0.17, 0.0), (0.15, 0.05 * sx)], P(sx * 0.17, 0.22, 0.62), axis='x', seg=6, exact=True, col=BODY_L, tint=1, bone='chest')
        light(m, P(sx * 0.222, 0.22, 0.62), 0.1, axis='x', flip=sx < 0, bone='chest')
        m.lathe([(0.13, 0.0), (0.115, 0.04 * sx)], P(sx * 0.145, -0.24, 0.6), axis='x', seg=6, exact=True, col=BODY_L, tint=1, bone='root')
        light(m, P(sx * 0.187, -0.24, 0.6), 0.075, axis='x', flip=sx < 0, detail=True, bone='root')
    # Neck and head.
    m.limb(P(0, 0.36, 0.64), P(0, 0.56, 0.74), (0.2, 0.22), (0.17, 0.19), col=BODY, tint=1, bevel=0.03, bone='head')
    m.box(P(0, 0.62, 0.75), (0.25, 0.27, 0.22), taper=(0.8, 0.9), col=SKIN_T, tint=1, bevel=0.045, bone='head')  # skull
    m.box(P(0, 0.81, 0.72), (0.15, 0.22, 0.1), taper=(0.8, 1), col=BODY_D, tint=1, bevel=0.025, bone='head')  # muzzle
    m.box(P(0, 0.78, 0.63), (0.13, 0.22, 0.05), rot=(-16, 0, 0), col=BODY_D, tint=1, bevel=0.015, bone='jaw')  # open jaw
    m.box(P(0, 0.77, 0.665), (0.1, 0.17, 0.035), col=MOUTH, bevel=0, bone='head')
    for sx in (-1, 1):
        m.spike(P(sx * 0.05, 0.9, 0.69), P(sx * 0.05, 0.91, 0.6), 0.04, seg=4, col=BONE, detail=True, bone='head')  # fangs
        m.spike(P(sx * 0.045, 0.85, 0.61), P(sx * 0.045, 0.87, 0.68), 0.035, seg=4, col=BONE, detail=True, bone='jaw')
        m.spike(P(sx * 0.09, 0.56, 0.84), P(sx * 0.15, 0.38, 1.02), 0.09, seg=4, col=BONE, bone='head')  # swept horns
    m.box(P(0.105, 0.72, 0.79), (0.03, 0.07, 0.045), col=EYE, glow=1, bevel=0, mirror=True, bone='head')
    for i in range(4):  # mane of bone along the spine
        m.spike(P(0, 0.34 - i * 0.18, 0.74 - i * 0.03), P(0, 0.18 - i * 0.18, 1.02 - i * 0.08), 0.11 - i * 0.012, seg=4, col=BONE, detail=i == 2, bone='chest' if i < 2 else 'root')
    m.limb(P(0, -0.42, 0.64), P(0, -0.62, 0.8), (0.09, 0.09), (0.06, 0.06), col=BODY_D, tint=1, bevel=0.015, bone='tail')  # tail
    m.spike(P(0, -0.6, 0.78), P(0, -0.74, 1.02), 0.09, seg=4, col=BONE, bone='tail')
    return m


def shield():
    m = Model('shield', rig=RIG_SHIELD)
    leather = (0.4, 0.27, 0.19)
    violet = (0.93, 0.87, 1.0)
    th = dict(bone='thigh_r', mirror=True)
    sh = dict(bone='shin_r', mirror=True)
    spear = dict(bone='arm_r')
    shd = dict(bone='arm_l')
    m.limb(P(0.14, 0, 0.54), P(0.14, 0, 0.3), (0.2, 0.22), (0.17, 0.19), col=BODY_D, tint=1, bevel=0.03, **th)
    m.limb(P(0.14, 0.01, 0.33), P(0.14, 0, 0.1), (0.2, 0.22), (0.17, 0.2), col=PLATE_S, bevel=0.03, **sh)  # greave
    m.lathe([(0.09, 0.0), (0.075, 0.045)], P(0.14, 0.11, 0.35), axis='f', seg=6, exact=True, col=BODY_L, tint=1, **sh)  # knee
    m.box(P(0.14, 0.05, 0.065), (0.21, 0.34, 0.13), taper=(0.85, 0.8), col=PLATE_D, bevel=0.035, **sh)
    m.box(P(0, 0, 0.56), (0.42, 0.3, 0.1), col=leather, bevel=0.025)
    m.box(P(0.15, 0.15, 0.51), (0.11, 0.07, 0.12), col=(0.5, 0.35, 0.25), bevel=0.02, mirror=True, detail=True)  # pouches
    m.box(P(0, 0, 0.82), (0.4, 0.3, 0.46), taper=(1.35, 1.1), col=BODY, tint=1, bevel=0.05)  # cuirass
    m.box(P(0, 0.02, 1.04), (0.5, 0.32, 0.09), col=PLATE_S, bevel=0.03, bone='chest')  # gorget
    light(m, P(0, 0.165, 0.86), 0.09, axis='f', col=violet, rim=PLATE_S)
    m.ball(P(0.33, 0, 1.02), (0.18, 0.18, 0.11), sub=1, smooth=0, col=PLATE_S, mirror=True)
    m.ball(P(0.31, 0, 1.1), (0.16, 0.17, 0.12), sub=1, smooth=0, col=BODY_L, tint=1, mirror=True)  # pauldrons
    m.box(P(0, 0.02, 1.25), (0.3, 0.32, 0.3), taper=(0.82, 0.85), col=PLATE_S, bevel=0.06)  # helm
    m.box(P(0, 0.17, 1.16), (0.17, 0.05, 0.11), col=PLATE_D, bevel=0.015)
    m.box(P(0, 0.19, 1.27), (0.21, 0.03, 0.045), col=AMBER, glow=1, bevel=0)  # visor slit
    m.prism([(0.16, 1.39), (0.1, 1.6), (-0.08, 1.7), (-0.27, 1.6), (-0.22, 1.37)], 0.085, col=BODY_L, tint=1, bevel=0.02)  # plume
    # Kite shield: steel rim, coloured face, three lit chevrons.
    sx, f0 = -0.09, 0.42
    m.prism([(sx - 0.37, 1.22), (sx + 0.37, 1.22), (sx + 0.41, 0.64), (sx, 0.08), (sx - 0.41, 0.64)], 0.08, at=f0, plane='xu', col=PLATE_S, bevel=0.03, **shd)
    m.prism([(sx - 0.3, 1.15), (sx + 0.3, 1.15), (sx + 0.33, 0.66), (sx, 0.2), (sx - 0.33, 0.66)], 0.04, at=f0 + 0.05, plane='xu', col=BODY, tint=1, bevel=0.015, **shd)
    for i, u in enumerate((0.9, 0.72, 0.54)):
        w = 0.21 - 0.025 * i
        m.prism([(sx - w, u + 0.1), (sx, u), (sx + w, u + 0.1), (sx + w, u + 0.18), (sx, u + 0.08), (sx - w, u + 0.18)], 0.02, at=f0 + 0.08, plane='xu', col=violet, glow=0.95, bevel=0, **shd)
    for x, u in ((sx - 0.31, 1.17), (sx + 0.31, 1.17), (sx, 0.17)):
        m.ball(P(x, f0 + 0.05, u), 0.03, sub=1, col=PLATE_D, detail=True, **shd)  # rivets
    # Spear with a crystal blade.
    m.limb(P(0.38, 0.12, 0.08), P(0.38, 0.22, 1.5), 0.05, round=True, seg=6, col=(0.24, 0.2, 0.27), **spear)
    m.lathe([(0.065, 0.0), (0.08, 0.035), (0.065, 0.07)], P(0.38, 0.218, 1.44), seg=6, col=PLATE_S, **spear)
    m.lathe([(0.0, 0.0), (0.1, 0.13), (0.0, 0.52)], P(0.38, 0.222, 1.5), seg=4, exact=True, scale=(1, 0.55), col=violet, glow=0.85, **spear)
    m.spike(P(0.38, 0.122, 0.1), P(0.38, 0.115, -0.0), 0.07, seg=4, col=PLATE_S, detail=True, **spear)
    m.limb(P(0.32, 0, 1.0), P(0.38, 0.17, 0.86), (0.13, 0.13), col=BODY_D, tint=1, bevel=0.025, **spear)
    m.box(P(0.38, 0.18, 0.83), (0.15, 0.15, 0.14), col=BODY_L, tint=1, bevel=0.035, **spear)  # gauntlet
    return m


def bomber():
    """A walking reactor crate: armoured hull, lit core, a crystal fuel cell on its flank."""
    m = Model('bomber', rig=RIG_BOMBER, bone='chest')
    cream = (0.94, 0.94, 0.9)
    panel = (0.8, 0.8, 0.79)
    c = 0.66  # height of the hull's centre
    leg = dict(bone='thigh_r', mirror=True)
    m.limb(P(0.18, 0, 0.34), P(0.18, 0.01, 0.1), (0.14, 0.16), (0.12, 0.14), col=PLATE_D, bevel=0.02, **leg)
    m.box(P(0.18, 0.05, 0.05), (0.18, 0.28, 0.1), taper=(0.85, 0.8), col=PLATE_S, bevel=0.03, **leg)
    m.box(P(0, 0, 0.31), (0.6, 0.6, 0.08), col=PLATE_D, bevel=0.02)
    m.box(P(0, 0, c), (0.76, 0.76, 0.72), col=cream, bevel=0.08)  # hull
    for axis, flip, cc in (('f', False, P(0, 0.38, c)), ('x', False, (0.38, 0, c)), ('x', True, (-0.38, 0, c)), ('f', True, P(0, -0.38, c))):
        s = -1 if flip else 1
        back = axis == 'f' and flip
        m.lathe([(0.27, -0.01 * s), (0.25, 0.028 * s)], cc, axis=axis, seg=8, exact=True, turn=22.5, col=panel, detail=back)
        if not back:
            off = P(0, 0.03, 0) if axis == 'f' else (0.03 * s, 0, 0)
            cc2 = tuple(a + b for a, b in zip(cc, off))
            m.lathe([(0.16, 0.0), (0.15, 0.02 * s)], cc2, axis=axis, seg=6, exact=True, col=PLATE_D)
            m.lathe([(0.115, 0.0), (0.1, 0.04 * s)], cc2, axis=axis, seg=6, exact=True, col=W, tint=1, glow=1)  # the core
    for sx in (-1, 1):  # warning lamps at the corners, front and top
        for su in (-1, 1):
            m.prism([(sx * 0.33, c + su * 0.31), (sx * 0.17, c + su * 0.31), (sx * 0.33, c + su * 0.15)][::sx * su], 0.02, at=0.385, plane='xu', col=W, tint=1, glow=0.9, bevel=0, detail=True)
            m.prism([(sx * 0.33, su * 0.33), (sx * 0.17, su * 0.33), (sx * 0.33, su * 0.17)][::sx * su], 0.02, at=c + 0.365, plane='xf', col=W, tint=1, glow=0.9, bevel=0)
    m.box(P(0, 0.385, 0.36), (0.3, 0.02, 0.05), col=ACID, glow=1, bevel=0, detail=True)
    # Top: a dome, an antenna and a halo.
    m.lathe([(0.25, 0.0), (0.25, 0.04), (0.2, 0.065)], P(0, 0, c + 0.36), seg=8, col=PLATE_D)
    m.lathe([(0.19, 0.0), (0.17, 0.07), (0.09, 0.12), (0, 0.13)], P(0, 0, c + 0.42), seg=8, col=W, tint=1, glow=0.35, smooth=180)
    m.limb(P(0, 0, c + 0.54), P(0, 0, c + 0.66), 0.035, round=True, seg=5, col=PLATE_D)
    m.ball(P(0, 0, c + 0.69), 0.065, sub=1, col=(1, 0.9, 0.4), glow=1)
    m.lathe([(0.3, -0.014), (0.33, 0.0), (0.3, 0.014)], P(0, 0, c + 0.6), seg=12, cap=False, col=(1, 0.85, 0.3), glow=1, bone='halo')
    # Fuel cell.
    m.lathe([(0.0, 0.0), (0.105, 0.1), (0.115, 0.42), (0.0, 0.54)], P(0.55, 0.0, 0.5), seg=6, exact=True, col=ACID, glow=0.8)
    for u in (0.66, 0.86):
        m.lathe([(0.13, 0.0), (0.13, 0.05)], P(0.55, 0, u), seg=6, exact=True, col=PLATE_S)
    m.box(P(0.43, 0, 0.78), (0.14, 0.12, 0.09), col=PLATE_D, bevel=0.02)
    m.limb(P(0.55, 0, 0.52), P(0.55, 0, 0.4), 0.07, round=True, seg=6, col=PLATE_D)
    m.limb(P(0.57, 0, 0.41), P(0.36, 0, 0.38), 0.07, round=True, seg=6, col=PLATE_D)
    return m


def heavy(kind):
    """Armoured golem: brute, giant and boss share one frame."""
    m = Model(kind, rig=RIG_HEAVY)
    big = kind != 'brute'
    hot = (1.0, 0.95, 0.85)
    th = dict(bone='thigh_r', mirror=True)
    sh = dict(bone='shin_r', mirror=True)
    m.limb(P(0.22, 0, 0.52), P(0.24, 0, 0.3), (0.3, 0.34), (0.27, 0.31), col=BODY_D, tint=1, bevel=0.035, **th)
    m.limb(P(0.24, 0.0, 0.34), P(0.25, 0, 0.13), (0.33, 0.37), (0.3, 0.34), col=BODY, tint=1, bevel=0.045, **sh)  # shin plate
    m.box(P(0.25, 0.06, 0.085), (0.35, 0.5, 0.17), taper=(0.85, 0.8), col=PLATE_S, bevel=0.05, **sh)  # boot
    if big:
        m.box(P(0.245, 0, 0.36), (0.37, 0.41, 0.08), col=PLATE_S, bevel=0.025, **sh)
        m.prism([(0.245 - 0.07, 0.3), (0.245 + 0.07, 0.3), (0.245, 0.2)], 0.02, at=0.19, plane='xu', col=AMBER, glow=1, bevel=0, **sh)
    m.box(P(0, 0, 0.54), (0.72, 0.5, 0.16), col=PLATE_D, bevel=0.04)  # belt
    m.box(P(0, 0.255, 0.52), (0.22, 0.04, 0.17), taper=(0.7, 1), col=PLATE_S, bevel=0.02)  # buckle
    m.box(P(0, 0.02, 0.68), (0.5, 0.4, 0.2), col=BODY_DD, tint=1, bevel=0.03)  # waist
    m.box(P(0, 0.04, 0.98), (0.62, 0.5, 0.5), rot=(5, 0, 0), taper=(1.75, 1.25), col=BODY, tint=1, bevel=0.07)  # chest
    m.box(P(0, 0.31, 1.0), (0.5, 0.08, 0.34), rot=(5, 0, 0), taper=(1.5, 1), col=BODY_L, tint=1, bevel=0.03)  # chest plate
    m.prism([(-0.11, 1.12), (0.11, 1.12), (0, 0.99)], 0.02, at=0.37, plane='xu', col=hot, glow=1, bevel=0)
    for dx in (-0.06, 0, 0.06):
        m.box(P(dx, 0.35, 0.9), (0.03, 0.02, 0.08), col=MOUTH, bevel=0, detail=True)  # vents
    m.box(P(0, 0.2, 1.36), (0.34, 0.36, 0.26), taper=(0.75, 0.85), col=BODY, tint=1, bevel=0.06)  # head
    m.box(P(0, 0.34, 1.43), (0.3, 0.1, 0.06), rot=(10, 0, 0), col=BODY_D, tint=1, bevel=0.02, detail=True)
    m.box(P(0, 0.34, 1.26), (0.28, 0.14, 0.08), col=BODY_D, tint=1, bevel=0.025)  # jaw
    m.box(P(0, 0.375, 1.31), (0.2, 0.03, 0.035), col=MOUTH, bevel=0, detail=True)
    m.spike(P(0.11, 0.4, 1.27), P(0.135, 0.44, 1.46), 0.07, seg=4, col=BONE, mirror=True)  # tusks
    eyes(m, 0.085, 0.385, 1.375, (0.075, 0.03, 0.045), col=(1, 0.88, 0.55))
    # Pauldrons: faceted steel with a coloured crown.
    R = (0.36, 0.35, 0.29) if big else (0.3, 0.3, 0.24)
    m.ball(P(0.63, 0.02, 1.22), R, sub=1, smooth=0, col=PLATE_S, mirror=True)
    m.ball(P(0.6, 0.02, 1.33), (R[0] * 0.72, R[1] * 0.74, R[2] * 0.7), sub=1, smooth=0, col=BODY_L, tint=1, mirror=True)
    ua = dict(bone='arm_r', mirror=True)
    fa = dict(bone='fore_r', mirror=True)
    m.limb(P(0.66, 0.03, 1.08), P(0.68, 0.05, 0.8), (0.24, 0.28), (0.22, 0.26), col=BODY_D, tint=1, bevel=0.03, **ua)
    m.limb(P(0.68, 0.05, 0.82), P(0.68, 0.12, 0.5), (0.31, 0.35), (0.28, 0.32), col=BODY, tint=1, bevel=0.045, **fa)  # forearm
    m.box(P(0.68, 0.1, 0.62), (0.37, 0.41, 0.09), col=PLATE_S, bevel=0.025, **fa)
    m.box(P(0.68, 0.15, 0.36), (0.39, 0.43, 0.32), col=BODY_D, tint=1, bevel=0.07, **fa)  # fist
    m.box(P(0.68, 0.37, 0.38), (0.31, 0.05, 0.15), col=PLATE_S, bevel=0.02, **fa)
    m.box(P(0.68, 0.4, 0.38), (0.17, 0.02, 0.05), col=AMBER, glow=1, bevel=0, detail=True, **fa)
    if big:
        for sx in (-1, 1):
            light(m, P(sx * 0.63, 0.345, 1.22), 0.13, axis='f')
            light(m, (sx * 0.985, 0, 1.22), 0.12, axis='x', flip=sx < 0)
        m.box(P(0.68, 0.05, 0.95), (0.3, 0.33, 0.07), col=PLATE_S, bevel=0.02, **ua)
        for i in range(3):
            m.spike(P(0.46 + i * 0.15, 0.0, 1.42 - i * 0.03), P(0.5 + i * 0.22, -0.02, 1.8 - i * 0.12), 0.13, seg=5, col=BONE, mirror=True)
            m.spike(P(0, -0.26, 1.3 - i * 0.2), P(0, -0.6, 1.44 - i * 0.2), 0.13, seg=5, col=BONE)
    if kind == 'boss':
        m.limb(P(0.15, 0.18, 1.48), P(0.31, 0.18, 1.64), 0.12, 0.1, round=True, seg=6, col=BONE, mirror=True, bone='head')
        m.spike(P(0.3, 0.18, 1.61), P(0.34, 0.26, 1.94), 0.1, seg=6, col=BONE, mirror=True, bone='head')  # horns
        m.lathe([(0.16, 0), (0.18, 0.07)], P(0, 0.19, 1.5), seg=8, cap=False, col=GOLD, glow=0.9, bone='head')  # burning crown
        for i in range(4):
            a = i * math.pi / 2 + math.pi / 4
            m.spike(P(math.cos(a) * 0.17, 0.19 + math.sin(a) * 0.17, 1.54), P(math.cos(a) * 0.2, 0.19 + math.sin(a) * 0.2, 1.7), 0.065, seg=4, col=GOLD, glow=0.9, bone='head')
        m.ball(P(0, 0.36, 1.0), (0.17, 0.08, 0.17), col=(1, 0.55, 0.15), glow=1)  # chest core
        m.prism([(-0.4, 1.38), (0.4, 1.38), (0.54, 0.3), (0.27, 0.16), (0, 0.32), (-0.27, 0.16), (-0.54, 0.3)], 0.05, at=-0.36, plane='xu',
                col=(0.32, 0.05, 0.1), bevel=0, rot=(-9, 0, 0), rot_at=P(0, -0.36, 1.38))  # cape
        shd = dict(bone='fore_l')
        m.prism([(-0.98, 1.16), (-0.3, 1.16), (-0.24, 0.52), (-0.64, 0.1), (-1.04, 0.52)], 0.09, at=0.52, plane='xu', col=PLATE_S, bevel=0.03, **shd)
        m.prism([(-0.9, 1.09), (-0.38, 1.09), (-0.33, 0.55), (-0.64, 0.22), (-0.95, 0.55)], 0.04, at=0.58, plane='xu', col=BODY, tint=1, bevel=0.015, **shd)
        m.prism([(-0.64, 0.96), (-0.46, 0.74), (-0.64, 0.5), (-0.82, 0.74)], 0.03, at=0.61, plane='xu', col=GOLD, glow=0.9, bevel=0, **shd)  # emblem
        mc = dict(bone='fore_r')
        m.limb(P(0.68, 0.2, 0.42), P(0.68, 0.92, 0.5), 0.085, round=True, seg=6, col=(0.24, 0.2, 0.27), **mc)
        m.ball(P(0.68, 1.0, 0.51), 0.22, sub=1, smooth=0, col=PLATE_S, **mc)
        for dx, df, du in ((1, 0, 0), (-1, 0, 0), (0, 0, 1), (0, 0, -1), (0, 1, 0)):
            m.spike(P(0.68 + dx * 0.17, 1.0 + df * 0.17, 0.51 + du * 0.17), P(0.68 + dx * 0.38, 1.0 + df * 0.38, 0.51 + du * 0.38), 0.11, seg=4, col=(1, 0.6, 0.2), glow=0.8, **mc)
    return m


def spitter():
    """An artillery creature: it carries acid crystals on a steel rack and lobs their charge."""
    m = Model('spitter', rig=RIG_SPITTER)
    th = dict(bone='thigh_r', mirror=True)
    sh = dict(bone='shin_r', mirror=True)
    hd = dict(bone='head')
    m.limb(P(0.17, -0.02, 0.5), P(0.185, -0.01, 0.29), (0.15, 0.17), (0.13, 0.15), col=BODY_D, tint=1, bevel=0.025, **th)
    m.limb(P(0.185, -0.01, 0.31), P(0.2, 0.0, 0.1), (0.13, 0.15), (0.1, 0.12), col=BODY_D, tint=1, bevel=0.025, **sh)
    m.box(P(0.2, 0.06, 0.05), (0.17, 0.32, 0.1), taper=(0.85, 0.8), col=BODY_DD, tint=1, bevel=0.025, **sh)
    m.box(P(0, 0.06, 0.7), (0.4, 0.42, 0.42), rot=(24, 0, 0), taper=(1.2, 1.1), col=BODY, tint=1, bevel=0.06)
    m.box(P(0, -0.12, 0.9), (0.56, 0.34, 0.1), rot=(8, 0, 0), col=PLATE_D, bevel=0.03)  # rack
    m.lathe([(0.0, 0.0), (0.15, 0.12), (0.16, 0.44), (0.0, 0.62)], P(0, -0.14, 0.92), seg=6, exact=True, col=ACID, glow=0.8)
    m.lathe([(0.175, 0.0), (0.175, 0.05)], P(0, -0.14, 1.1), seg=6, exact=True, col=PLATE_S)
    for sx in (-1, 1):
        m.lathe([(0.0, 0.0), (0.1, 0.08), (0.11, 0.3), (0.0, 0.42)], P(sx * 0.23, -0.2, 0.9), seg=6, exact=True, col=ACID, glow=0.8)
        m.lathe([(0.125, 0.0), (0.125, 0.04)], P(sx * 0.23, -0.2, 1.02), seg=6, exact=True, col=PLATE_S, detail=True)
    m.limb(P(0, 0.2, 0.86), P(0, 0.42, 1.18), (0.19, 0.19), (0.15, 0.15), col=SKIN_T, tint=1, bevel=0.03, **hd)  # neck
    m.box(P(0, 0.46, 1.26), (0.3, 0.32, 0.25), taper=(0.8, 0.85), col=SKIN_T, tint=1, bevel=0.05, **hd)
    m.lathe([(0.075, 0.0), (0.17, 0.18)], P(0, 0.58, 1.3), axis='f', seg=6, exact=True, cap=False, col=PLATE_S, **hd)  # mortar mouth
    m.ball(P(0, 0.68, 1.3), (0.11, 0.06, 0.11), sub=1, col=(0.75, 1, 0.35), glow=1, **hd)
    eyes(m, 0.125, 0.56, 1.38, (0.05, 0.05, 0.045), col=(0.8, 1, 0.4), **hd)
    arm = dict(bone='arm_r', mirror=True)
    m.limb(P(0.22, 0.2, 0.82), P(0.27, 0.42, 0.6), (0.1, 0.1), (0.08, 0.08), col=BODY_D, tint=1, bevel=0.02, **arm)
    return m


# ------------------------------------------------------------------ troopers
# Style: a navy undersuit under steel plates, a big crested helmet in the
# rank's colour, and lit accents (visor, emblem, weapon strips) in a pale
# shade of that colour. Each rank adds armour, so a stronger squad looks it.

SUIT = (0.17, 0.2, 0.33)      # navy undersuit
SUIT_D = (0.1, 0.11, 0.18)    # boots, gloves, straps
ARMOR = (0.6, 0.62, 0.72)     # steel plates
ARMOR_L = (0.84, 0.86, 0.93)  # pale plates
ARMOR_D = (0.36, 0.38, 0.48)
LIT = (0.85, 1.0, 1.0)
LIT_KW = dict(col=LIT, tint=0.75, glow=1, bevel=0)  # lit in a pale shade of the rank's colour
NAVY = SUIT
BOOT = SUIT_D


def _helmet(m, tier):
    R = 0.25
    m.bone = 'head'  # everything below rides the head
    cu = 1.13
    m.lathe([(R * 0.9, -0.1), (R, 0.0), (R * 0.92, 0.1), (R * 0.7, 0.18), (R * 0.38, 0.235), (0, 0.25)], P(0, 0, cu), seg=12, scale=(1, 1.06),
            col=BODY, tint=1, smooth=180)
    m.box(P(0, 0.15, cu - 0.1), (0.3, 0.22, 0.12), col=SUIT_D, bevel=0.03)  # face guard
    m.box(P(0, 0.235, cu + 0.005), (0.34, 0.12, 0.075), col=LIT, tint=0.75, glow=1, bevel=0.012)  # visor: one wide lit band
    if tier >= 3:
        m.box(P(0, 0.262, cu - 0.06), (0.06, 0.05, 0.08), **LIT_KW)  # officers' visors drop to a T
    # Crest: a ridge over the crown from brow to nape.
    hi = 0.075 if tier >= 4 else 0.04
    arc = [math.radians(a) for a in range(25, 160, 15)]
    outline = [(math.cos(a) * (R + hi) * 1.06, cu + math.sin(a) * (R + hi)) for a in arc] + \
              [(math.cos(a) * (R - 0.02) * 1.06, cu + math.sin(a) * (R - 0.02)) for a in reversed(arc)]
    m.prism(outline, 0.08, col=BODY_L, tint=1, bevel=0.012)
    for s in (-1, 1):
        m.lathe([(0.075, 0.0), (0.06, 0.04 * s)], (s * R * 0.97, 0, cu - 0.02), axis='x', seg=8, col=ARMOR)  # ear discs
    if tier >= 5:
        tall = 0.16 if tier == 7 else 0.0  # the praetorian's plume stands higher
        m.prism([(0.0, cu + 0.27), (0.07, cu + 0.44 + tall), (-0.08, cu + 0.56 + tall), (-0.2, cu + 0.36)], 0.06, col=BODY_L, tint=1, bevel=0.012)  # commander's fin
    if tier == 8:
        m.lathe([(0.2, -0.014), (0.228, 0.0), (0.2, 0.014)], P(0, 0, cu + 0.44), seg=12, cap=False, col=LIT, tint=0.75, glow=1)  # halo
    m.bone = None  # back to placing parts by position


def trooper(tier):
    """Six ranks, from light rifleman to caped commander."""
    m = Model('inf%d' % tier, face=-1, rig=RIG_TROOPER)
    wide = min(1.18, 1.0 + 0.06 * max(0, tier - 2)) + 0.02 * max(0, tier - 5)
    plate = ARMOR_L if tier in (2, 6) else ARMOR_D if tier == 8 else ARMOR
    top = ARMOR_D if tier == 8 else ARMOR_L  # the high ranks' box pauldrons
    th = dict(bone='thigh_r', mirror=True)
    sh = dict(bone='shin_r', mirror=True)
    m.limb(P(0.13, 0, 0.5), P(0.135, 0, 0.26), (0.2, 0.23), (0.18, 0.21), col=SUIT, bevel=0.03, **th)
    if tier >= 1:
        m.limb(P(0.135, 0.015, 0.3), P(0.135, 0.01, 0.12), (0.21, 0.24), (0.19, 0.22), col=ARMOR, bevel=0.03, **sh)  # greave
    else:
        m.limb(P(0.135, 0, 0.28), P(0.135, 0, 0.12), (0.18, 0.21), (0.17, 0.2), col=SUIT, bevel=0.025, **sh)
    if tier >= 3:
        m.box(P(0.135, 0.12, 0.31), (0.17, 0.06, 0.13), col=ARMOR_L, bevel=0.02, **sh)  # knee
    if tier >= 4:
        m.box(P(0.215, 0, 0.42), (0.07, 0.2, 0.17), col=ARMOR, bevel=0.02, **th)  # thigh plate
    m.box(P(0.135, 0.05, 0.07), (0.22, 0.34, 0.14), taper=(0.88, 0.82), col=SUIT_D, bevel=0.04, **sh)  # boot
    m.box(P(0, 0, 0.53), (0.4 * wide, 0.28, 0.12), col=SUIT_D, bevel=0.025)  # belt
    if tier >= 1:
        m.box(P(0.13, 0.15, 0.52), (0.1, 0.06, 0.1), col=ARMOR_L, bevel=0.018, mirror=True, detail=True)  # pouches
    if tier >= 2:
        m.box(P(0, 0.15, 0.49), (0.13, 0.05, 0.16), taper=(0.7, 1), col=plate, bevel=0.02)  # tasset
    m.box(P(0, 0, 0.76), (0.38 * wide, 0.28, 0.4), taper=(1.3, 1.12), col=SUIT, bevel=0.05)  # torso
    if tier == 0:
        m.box(P(0.11, 0.14, 0.8), (0.07, 0.05, 0.24), col=BODY, tint=1, bevel=0.015, mirror=True)  # webbing in the rank's colour
    else:
        m.box(P(0, 0.15, 0.81), (0.3 * wide, 0.07, 0.26), taper=(1.2, 1), col=plate, bevel=0.03)  # breastplate
        m.box(P(0, 0.01, 0.975), (0.3 * wide, 0.27, 0.07), col=ARMOR, bevel=0.025)  # collar
    # Rank emblem, lit, on the chest.
    f = 0.19
    if tier == 1:
        m.box(P(0, f, 0.82), (0.14, 0.02, 0.04), **LIT_KW)
    elif tier == 2:
        m.prism([(0, 0.89), (0.06, 0.82), (0, 0.75), (-0.06, 0.82)], 0.02, at=f, plane='xu', **LIT_KW)
    elif tier == 3:
        for u in (0.8, 0.72):
            m.prism([(-0.09, u + 0.06), (0, u), (0.09, u + 0.06), (0.09, u + 0.11), (0, u + 0.05), (-0.09, u + 0.11)], 0.02, at=f, plane='xu', **LIT_KW)
    elif tier == 4:
        for u in (0.86, 0.78):
            m.box(P(0, f, u), (0.16, 0.02, 0.04), **LIT_KW)
    elif tier >= 5:
        light(m, P(0, f - 0.005, 0.83), 0.1 + 0.01 * (tier - 5), axis='f', col=LIT, tint=0.75, rim=ARMOR_D)
    # Pauldrons grow with rank.
    sx = 0.27 * wide
    if tier == 0:
        m.ball(P(sx, 0, 0.94), 0.105, sub=2, col=ARMOR, mirror=True)
    elif tier == 1:
        m.ball(P(sx, 0, 0.95), (0.13, 0.14, 0.11), sub=2, col=ARMOR, mirror=True)
    elif tier == 2:
        m.box(P(sx + 0.01, 0, 0.96), (0.2, 0.25, 0.14), taper=(0.75, 0.8), col=ARMOR_L, bevel=0.04, mirror=True)
    elif tier == 3:
        m.ball(P(sx + 0.02, 0, 0.97), (0.19, 0.2, 0.16), sub=2, col=ARMOR, mirror=True)
        m.box(P(sx + 0.05, 0, 0.9), (0.22, 0.3, 0.05), col=ARMOR_D, bevel=0.02, mirror=True)  # rim
    elif tier == 4:
        m.ball(P(sx + 0.03, 0, 0.99), (0.21, 0.22, 0.17), sub=2, col=ARMOR, mirror=True)
        m.box(P(sx + 0.07, 0, 0.89), (0.2, 0.3, 0.09), col=ARMOR_D, bevel=0.03, mirror=True)
        m.box(P(sx + 0.04, 0.0, 1.155), (0.05, 0.2, 0.025), mirror=True, **LIT_KW)  # lit seam over the top
    else:
        m.box(P(sx + 0.07, 0, 1.01), (0.3, 0.34, 0.2), taper=(0.8, 0.85), col=top, bevel=0.045, mirror=True)
        m.box(P(sx + 0.07, 0, 0.89), (0.24, 0.3, 0.07), col=ARMOR_D, bevel=0.025, mirror=True)
        m.box(P(sx + 0.07, 0.165, 1.02), (0.15, 0.02, 0.045), mirror=True, **LIT_KW)
        m.box(P(sx + 0.07, 0.0, 1.115), (0.06, 0.18, 0.02), mirror=True, **LIT_KW)
        if tier == 6:  # tower plates standing off the shoulders
            m.box(P(sx + 0.215, 0, 1.1), (0.06, 0.3, 0.36), col=ARMOR_L, bevel=0.02, mirror=True)
            m.box(P(sx + 0.25, 0, 1.1), (0.012, 0.16, 0.2), mirror=True, **LIT_KW)
        elif tier == 7:  # gilded rims and spikes
            m.box(P(sx + 0.07, 0, 1.12), (0.31, 0.35, 0.03), col=GOLD, bevel=0.01, mirror=True)
            m.spike(P(sx + 0.09, 0, 1.12), P(sx + 0.2, 0, 1.4), 0.11, seg=4, col=GOLD, mirror=True)
        elif tier == 8:  # a lit core in each shoulder
            light(m, P(sx + 0.07, 0, 1.118), 0.12, axis='u', col=LIT, tint=0.75, rim=PLATE_D, mirror=True)
    # What they carry on their backs.
    if tier == 0:
        m.box(P(0, -0.19, 0.78), (0.26, 0.14, 0.28), col=SUIT_D, bevel=0.035)
    elif tier == 2:
        for s in (-1, 1):  # twin canisters
            m.lathe([(0.085, 0.0), (0.1, 0.03), (0.1, 0.3), (0.06, 0.36)], P(s * 0.11, -0.23, 0.6), seg=8, col=LIT, tint=0.75, glow=0.6)
            m.lathe([(0.108, 0.0), (0.108, 0.05)], P(s * 0.11, -0.23, 0.72), seg=8, col=ARMOR_D)
        m.box(P(0, -0.17, 0.8), (0.3, 0.08, 0.24), col=ARMOR_D, bevel=0.025)
    elif tier >= 5:
        m.box(P(0, -0.19, 0.84), (0.3, 0.14, 0.22), col=ARMOR_D, bevel=0.03)
        if tier == 6:  # twin banners
            for sgn in (-1, 1):
                m.prism([(-0.25, 0.92), (-0.3, 1.72), (-0.44, 1.6), (-0.37, 0.9)], 0.035, at=sgn * 0.15, col=BODY, tint=1, bevel=0.008, bone='chest')
                m.prism([(-0.3, 1.72), (-0.44, 1.6), (-0.43, 1.52), (-0.3, 1.62)], 0.04, at=sgn * 0.15, bevel=0, bone='chest', col=LIT, tint=0.75, glow=1)
        elif tier == 8:  # blades of light
            m.prism([(0.12, 1.02), (0.64, 1.56), (0.74, 1.42), (0.32, 0.86)], 0.03, at=-0.28, plane='xu', col=LIT, tint=0.75, glow=0.9, bevel=0, mirror=True, bone='chest')
            m.prism([(0.2, 0.84), (0.66, 1.12), (0.72, 0.98), (0.34, 0.7)], 0.03, at=-0.29, plane='xu', col=LIT, tint=0.75, glow=0.9, bevel=0, mirror=True, bone='chest')
        if tier in (5, 7):
            m.prism([(-0.36, 1.0), (0.36, 1.0), (0.44, 0.2), (0.2, 0.12), (0, 0.22), (-0.2, 0.12), (-0.44, 0.2)], 0.035, at=-0.3, plane='xu',
                    col=BODY, tint=1, bevel=0, rot=(-9, 0, 0), rot_at=P(0, -0.3, 1.0), bone='chest')  # cape
            m.prism([(-0.44, 0.2), (-0.2, 0.12), (0, 0.22), (0.2, 0.12), (0.44, 0.2), (0.42, 0.29), (0.2, 0.21), (0, 0.31), (-0.2, 0.21), (-0.42, 0.29)], 0.04,
                    at=-0.3, plane='xu', col=BODY_L, tint=1, bevel=0, rot=(-9, 0, 0), rot_at=P(0, -0.3, 1.0), detail=True, bone='chest')  # cape trim
    else:
        m.box(P(0, -0.2, 0.78), (0.3 * wide, 0.17, 0.32), col=ARMOR_D, bevel=0.035)
        m.box(P(0, -0.2, 0.945), (0.16, 0.09, 0.02), **LIT_KW)
        if tier == 4:
            m.box(P(0.09, -0.295, 0.8), (0.06, 0.02, 0.16), mirror=True, **LIT_KW)  # reactor vents
    if tier >= 2:
        ax = 0.17 if tier < 5 else -0.2
        m.limb(P(ax, -0.24, 0.9), P(ax, -0.27, 1.52 if tier < 5 else 1.66), 0.035 if tier < 5 else 0.05, round=True, seg=5, col=ARMOR_D)  # antenna
        m.ball(P(ax, -0.27, 1.55 if tier < 5 else 1.69), 0.04, sub=1, col=LIT, tint=0.75, glow=1)
    m.box(P(0, 0.02, 1.02), (0.2, 0.2, 0.1), col=SUIT_D, bevel=0.02, bone='head')  # neck
    _helmet(m, tier)
    return m


def _arms_fn(m, rh, lh, re=None, le=None):
    """Two bent arms from the shoulders to the given hand positions."""
    rs, ls = P(0.27, 0, 0.9), P(-0.27, 0, 0.9)
    re = re or P(0.31, 0.06, 0.7)
    le = le or P(-0.25, 0.2, 0.7)
    for s, e, h in ((rs, re, rh), (ls, le, lh)):
        m.limb(s, e, (0.13, 0.14), (0.12, 0.12), col=SUIT, bevel=0.025)
        m.limb(e, h, (0.15, 0.15), (0.13, 0.13), col=ARMOR, bevel=0.03)  # forearm guard
        m.box(h, (0.14, 0.14, 0.14), col=SUIT_D, bevel=0.035)  # glove


GUN = (0.2, 0.21, 0.28)    # dark gunmetal
GUN2 = (0.52, 0.54, 0.63)  # steel housing


def weapon(kind, arms=True):
    """Arms and gun together, so each weapon gets the right grip."""
    m = Model('w_' + kind, face=-1, rig=RIG_TROOPER, bone='gun')
    _arms = _arms_fn if arms else (lambda *a, **k: None)
    x = 0.17
    if kind == 'rifle':
        _arms(m, P(x, 0.2, 0.73), P(0.1, 0.52, 0.75))
        m.box(P(x, 0.3, 0.79), (0.11, 0.5, 0.15), col=GUN2, bevel=0.025)
        m.box(P(x, -0.02, 0.775), (0.09, 0.2, 0.12), col=GUN, bevel=0.025)  # stock
        m.box(P(x, 0.64, 0.8), (0.09, 0.2, 0.1), col=GUN, bevel=0.02)
        m.limb(P(x, 0.72, 0.8), P(x, 0.92, 0.8), 0.05, round=True, seg=6, col=GUN)
        m.box(P(x, 0.93, 0.8), (0.08, 0.07, 0.08), col=GUN2, bevel=0.015)  # muzzle brake
        m.box(P(x, 0.36, 0.66), (0.07, 0.11, 0.17), rot=(-12, 0, 0), col=GUN, bevel=0.015)  # magazine
        m.box(P(x, 0.32, 0.872), (0.045, 0.3, 0.02), **LIT_KW)  # lit strip, seen from above
        m.box(P(x + 0.058, 0.34, 0.79), (0.012, 0.28, 0.045), detail=True, **LIT_KW)
        m.box(P(x, 0.1, 0.89), (0.05, 0.08, 0.04), col=GUN, bevel=0.01, detail=True)  # sight
    elif kind == 'smg':
        _arms(m, P(x, 0.2, 0.73), P(0.11, 0.42, 0.73))
        m.box(P(x, 0.26, 0.79), (0.11, 0.36, 0.15), col=GUN2, bevel=0.025)
        m.limb(P(x, 0.42, 0.795), P(x, 0.7, 0.795), 0.09, round=True, seg=7, col=GUN)  # suppressor
        m.box(P(x, 0.3, 0.63), (0.06, 0.09, 0.24), col=GUN, bevel=0.015)  # long magazine
        m.limb(P(x, 0.1, 0.82), P(x, -0.08, 0.82), (0.035, 0.035), col=GUN, bevel=0)
        m.box(P(x, -0.09, 0.79), (0.08, 0.035, 0.11), col=GUN, bevel=0.01, detail=True)
        m.box(P(x, 0.26, 0.872), (0.045, 0.2, 0.02), **LIT_KW)
    elif kind == 'shotgun':
        _arms(m, P(x, 0.18, 0.73), P(0.11, 0.58, 0.74))
        m.box(P(x, 0.24, 0.79), (0.11, 0.32, 0.15), col=GUN2, bevel=0.025)
        m.box(P(x, -0.04, 0.765), (0.085, 0.28, 0.13), rot=(-6, 0, 0), col=GUN, bevel=0.03)  # stock
        for dx in (-0.032, 0.032):  # twin barrels
            m.limb(P(x + dx, 0.38, 0.815), P(x + dx, 0.98, 0.815), 0.062, round=True, seg=6, col=GUN)
        m.box(P(x, 0.6, 0.755), (0.13, 0.22, 0.08), col=GUN2, bevel=0.02)  # pump
        m.box(P(x, 0.99, 0.815), (0.14, 0.03, 0.08), col=GUN2, bevel=0.01, detail=True)
        m.box(P(x, 0.22, 0.872), (0.045, 0.14, 0.02), **LIT_KW)
    elif kind == 'mg':
        # Rotary cannon, carried at the hip by its top handle.
        u = 0.66
        _arms(m, P(x, 0.14, 0.84), P(0.04, 0.4, 0.7), re=P(0.33, 0.02, 0.74), le=P(-0.24, 0.2, 0.68))
        m.box(P(x, 0.18, u), (0.2, 0.4, 0.24), col=GUN2, bevel=0.035)  # housing
        m.limb(P(x, 0.04, u + 0.15), P(x, 0.3, u + 0.15), (0.04, 0.04), col=GUN, bevel=0)  # carry handle
        for f in (0.05, 0.3):
            m.limb(P(x, f, u + 0.1), P(x, f, u + 0.16), (0.04, 0.04), col=GUN, bevel=0, detail=True)
        for f in (0.12, 0.22):
            m.box(P(x + 0.103, f, u), (0.012, 0.05, 0.12), detail=True, **LIT_KW)  # lit bars on the flank
            m.box(P(x - 0.06, f, u + 0.123), (0.06, 0.05, 0.012), **LIT_KW)  # and on top
        m.box(P(x - 0.15, 0.16, u - 0.04), (0.12, 0.2, 0.2), col=GUN, bevel=0.025)  # ammunition drum
        m.lathe([(0.115, 0.36), (0.115, 0.43)], P(x, 0, u), axis='f', seg=8, col=GUN)
        for i in range(6):
            a = i * math.pi / 3
            dx, du = math.cos(a) * 0.07, math.sin(a) * 0.07
            m.limb(P(x + dx, 0.42, u + du), P(x + dx, 0.98, u + du), 0.05, round=True, seg=5, col=GUN)
        m.lathe([(0.118, 0.84), (0.118, 0.9)], P(x, 0, u), axis='f', seg=8, col=GUN2)
        m.ball(P(x, 0.985, u), (0.04, 0.02, 0.04), sub=1, col=LIT, tint=0.75, glow=1)
    elif kind == 'laser':
        red = (1.0, 0.32, 0.25)
        _arms(m, P(x, 0.18, 0.73), P(0.1, 0.5, 0.74))
        m.box(P(x, 0.2, 0.79), (0.12, 0.42, 0.16), col=GUN2, bevel=0.025)
        m.box(P(x, -0.04, 0.775), (0.09, 0.16, 0.12), col=GUN, bevel=0.025)
        m.box(P(x - 0.105, 0.16, 0.74), (0.1, 0.2, 0.16), col=GUN, bevel=0.02)  # power cell
        m.limb(P(x, 0.4, 0.8), P(x, 0.98, 0.8), 0.06, round=True, seg=6, col=GUN)
        for f in (0.5, 0.66, 0.82):  # focusing rings
            m.lathe([(0.075, f), (0.088, f + 0.03), (0.075, f + 0.06)], P(x, 0, 0.8), axis='f', seg=8, cap=False, col=red, glow=1)
        m.box(P(x, 0.2, 0.875), (0.05, 0.26, 0.02), col=red, glow=1, bevel=0)
        m.ball(P(x, 1.0, 0.8), (0.05, 0.03, 0.05), sub=1, col=red, glow=1)
    elif kind == 'cluster':
        # A three-tube pod on the shoulder.
        _arms(m, P(0.2, 0.2, 0.86), P(0.1, 0.42, 0.9), re=P(0.32, 0.04, 0.72), le=P(-0.22, 0.24, 0.78))
        m.box(P(0.2, 0.08, 1.0), (0.32, 0.7, 0.22), col=GUN2, bevel=0.035)
        m.box(P(0.2, -0.3, 1.0), (0.28, 0.06, 0.18), col=GUN, bevel=0.02)
        for dx in (-0.095, 0, 0.095):
            m.lathe([(0.042, 0.4), (0.042, 0.5), (0, 0.62)], P(0.2 + dx, 0, 1.0), axis='f', seg=6, col=(0.9, 0.25, 0.2))  # warheads
        m.box(P(0.2, 0.2, 0.88), (0.05, 0.07, 0.12), col=GUN, bevel=0.01)
        m.box(P(0.2, 0.06, 1.115), (0.06, 0.4, 0.02), **LIT_KW)
    elif kind == 'nova':
        sun = (1.0, 0.9, 0.55)
        _arms(m, P(x, 0.14, 0.72), P(0.08, 0.5, 0.72), re=P(0.31, 0.02, 0.7))
        m.box(P(x, 0.06, 0.77), (0.14, 0.34, 0.2), col=GUN, bevel=0.03)
        m.lathe([(0.09, 0.2), (0.11, 0.3), (0.08, 0.5), (0.06, 1.0), (0.05, 1.02)], P(x, 0, 0.78), axis='f', seg=8, col=GUN2)
        for f, r in ((0.36, 0.15), (0.62, 0.12), (0.86, 0.1)):  # emitter rings
            m.lathe([(r, f), (r + 0.016, f + 0.025), (r, f + 0.05)], P(x, 0, 0.78), axis='f', seg=10, cap=False, col=sun, glow=1)
        m.ball(P(x, 1.06, 0.78), 0.07, sub=2, col=sun, glow=1)
        m.ball(P(x, 0.06, 0.9), 0.08, sub=1, col=sun, glow=1)
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


# ------------------------------------------------------------------ beyond level 50
EGG = (1.0, 0.93, 0.5)
ICE = (0.72, 0.96, 1.0)


def brood():
    """A carrier: its back is a clutch of lit egg sacs that burst into whelps when it falls."""
    m = Model('brood', rig=RIG_GRUNT)
    th = dict(bone='thigh_r', mirror=True)
    sh = dict(bone='shin_r', mirror=True)
    ch = dict(bone='chest')
    hd = dict(bone='head')
    m.limb(P(0.14, 0.02, 0.54), P(0.15, 0.02, 0.32), (0.25, 0.27), (0.21, 0.23), col=BODY_D, tint=1, bevel=0.03, **th)
    m.limb(P(0.15, 0.02, 0.34), P(0.16, 0.0, 0.12), (0.21, 0.23), (0.17, 0.19), col=BODY_D, tint=1, bevel=0.03, **sh)
    m.box(P(0.16, 0.07, 0.06), (0.23, 0.36, 0.12), taper=(0.85, 0.8), col=BODY_DD, tint=1, bevel=0.03, **sh)
    m.box(P(0, 0.02, 0.56), (0.48, 0.36, 0.12), col=PLATE_D, bevel=0.03, bone='root')  # belt
    m.box(P(0, 0.1, 0.8), (0.48, 0.4, 0.5), rot=(20, 0, 0), taper=(1.35, 1.2), col=BODY, tint=1, bevel=0.07, **ch)  # stooped torso
    m.box(P(0, 0.31, 0.76), (0.34, 0.08, 0.3), rot=(20, 0, 0), col=BODY_L, tint=1, bevel=0.03, **ch)  # belly plate
    light(m, P(0, 0.375, 0.79), 0.07, axis='f', col=EGG, detail=True, **ch)
    # The clutch: a steel cradle on the back, sacs piled in it, ribs curling over.
    m.box(P(0, -0.1, 1.0), (0.7, 0.42, 0.1), rot=(-14, 0, 0), col=PLATE_D, bevel=0.03, **ch)
    for x, f, u, r in ((0, -0.2, 1.3, 0.27), (0.27, -0.1, 1.14, 0.2), (-0.27, -0.1, 1.14, 0.2), (0, -0.42, 1.08, 0.22),
                       (0.2, -0.34, 0.86, 0.15), (-0.2, -0.34, 0.86, 0.15)):
        m.ball(P(x, f, u), (r, r, r * 1.15), sub=2, col=EGG, glow=0.75, detail=r < 0.16, **ch)
    for sx in (-1, 1):
        m.spike(P(sx * 0.36, 0.0, 1.02), P(sx * 0.2, -0.16, 1.66), 0.09, seg=4, col=BONE, **ch)
        m.spike(P(sx * 0.32, -0.3, 0.96), P(sx * 0.14, -0.52, 1.44), 0.08, seg=4, col=BONE, detail=True, **ch)
    # A small head slung low and forward.
    m.box(P(0, 0.36, 1.1), (0.3, 0.34, 0.26), taper=(0.8, 0.85), col=SKIN_T, tint=1, bevel=0.06, **hd)
    m.box(P(0, 0.5, 1.02), (0.2, 0.1, 0.06), col=MOUTH, bevel=0.012, **hd)
    m.box(P(0, 0.48, 0.96), (0.22, 0.18, 0.08), taper=(0.9, 0.9), col=BODY_D, tint=1, bevel=0.03, **hd)
    m.box(P(0, 0.47, 1.2), (0.3, 0.12, 0.06), rot=(14, 0, 0), col=BODY_D, tint=1, bevel=0.02, detail=True, **hd)
    eyes(m, 0.08, 0.535, 1.12, (0.06, 0.035, 0.045), col=EGG, **hd)
    ua = dict(bone='arm_r', mirror=True)
    fa = dict(bone='fore_r', mirror=True)
    m.limb(P(0.33, 0.12, 0.99), P(0.34, 0.36, 0.86), (0.14, 0.14), (0.12, 0.12), col=BODY, tint=1, bevel=0.03, **ua)
    m.limb(P(0.34, 0.36, 0.86), P(0.26, 0.56, 0.78), (0.13, 0.13), (0.11, 0.11), col=SKIN_T, tint=1, bevel=0.03, **fa)
    m.box(P(0.25, 0.6, 0.77), (0.14, 0.13, 0.12), col=BODY_D, tint=1, bevel=0.03, **fa)
    return m


def ram(kind='ram'):
    """An armoured battering beast. The boss (`beast`) is the same animal grown
    huge, with a crown of horns, a lit spine and a burning brow."""
    m = Model(kind, rig=RIG_HOUND)
    boss = kind == 'beast'
    fu = dict(bone='fleg_r', mirror=True)
    fs = dict(bone='fshin_r', mirror=True)
    hu = dict(bone='hleg_r', mirror=True)
    hs = dict(bone='hshin_r', mirror=True)
    ch = dict(bone='chest')
    rt = dict(bone='root')
    hd = dict(bone='head')
    lit = GOLD if boss else AMBER
    # Legs: thick and plated.
    m.limb(P(0.17, 0.3, 0.5), P(0.18, 0.37, 0.23), (0.2, 0.25), (0.15, 0.18), col=BODY, tint=1, bevel=0.03, **fu)
    m.limb(P(0.18, 0.37, 0.25), P(0.18, 0.34, 0.07), (0.15, 0.18), (0.13, 0.15), col=PLATE_S, bevel=0.025, **fs)
    m.box(P(0.18, 0.39, 0.05), (0.19, 0.26, 0.1), col=PLATE_D, bevel=0.03, **fs)
    m.limb(P(0.17, -0.26, 0.56), P(0.19, -0.42, 0.28), (0.2, 0.29), (0.14, 0.18), col=BODY, tint=1, bevel=0.035, **hu)
    m.limb(P(0.19, -0.42, 0.29), P(0.19, -0.31, 0.07), (0.13, 0.15), (0.115, 0.13), col=BODY_D, tint=1, bevel=0.02, **hs)
    m.box(P(0.19, -0.26, 0.05), (0.18, 0.25, 0.1), col=PLATE_D, bevel=0.03, **hs)
    # Body: a deep chest under a humped, plated shoulder.
    m.box(P(0, 0.2, 0.62), (0.46, 0.52, 0.46), taper=(0.85, 1), col=BODY, tint=1, bevel=0.06, **ch)
    m.box(P(0, 0.17, 0.89), (0.52, 0.5, 0.16), taper=(0.8, 0.9), col=PLATE_S, bevel=0.05, **ch)  # shoulder plate
    m.box(P(0, -0.22, 0.6), (0.38, 0.5, 0.34), rot=(-6, 0, 0), taper=(0.9, 1), col=BODY, tint=1, bevel=0.05, **rt)  # loin
    m.box(P(0, -0.24, 0.8), (0.4, 0.42, 0.1), rot=(-6, 0, 0), col=PLATE_S, bevel=0.035, **rt)  # croup plate
    m.box(P(0, 0.0, 0.44), (0.28, 0.62, 0.12), col=BODY_D, tint=1, bevel=0.025, **rt)  # belly
    for sx in (-1, 1):
        m.lathe([(0.2, 0.0), (0.18, 0.05 * sx)], P(sx * 0.23, 0.2, 0.66), axis='x', seg=6, exact=True, col=BODY_L, tint=1, **ch)
        light(m, P(sx * 0.283, 0.2, 0.66), 0.12, axis='x', flip=sx < 0, col=lit, **ch)
        m.box(P(sx * 0.2, -0.24, 0.64), (0.03, 0.32, 0.06), col=lit, glow=1, bevel=0, detail=not boss, **rt)
    # Head: carried low behind a wedge of steel.
    m.limb(P(0, 0.36, 0.68), P(0, 0.58, 0.64), (0.3, 0.3), (0.27, 0.27), col=BODY, tint=1, bevel=0.04, **hd)  # neck
    m.box(P(0, 0.66, 0.62), (0.34, 0.3, 0.3), taper=(0.85, 0.9), col=SKIN_T, tint=1, bevel=0.05, **hd)  # skull
    # The ram plate: bare steel on a ram, enamelled in its own colour on the boss.
    m.box(P(0, 0.84, 0.66), (0.44, 0.1, 0.44), rot=(-22, 0, 0), taper=(0.8, 0.75), col=BODY_L if boss else PLATE_S, tint=1 if boss else 0, bevel=0.04, **hd)
    m.box(P(0, 0.9, 0.5), (0.34, 0.06, 0.07), col=PLATE_D, bevel=0.02, **hd)  # its cutting edge
    m.prism([(-0.12, 0.84), (0.12, 0.84), (0, 0.64)], 0.02, at=0.915, plane='xu', col=lit, glow=1, bevel=0, rot=(-22, 0, 0), rot_at=P(0, 0.9, 0.7), **hd)
    m.box(P(0, 0.76, 0.46), (0.22, 0.24, 0.07), rot=(-10, 0, 0), col=BODY_D, tint=1, bevel=0.02, bone='jaw')
    m.box(P(0.185, 0.74, 0.7), (0.03, 0.08, 0.05), col=EYE, glow=1, bevel=0, mirror=True, **hd)
    for sx in (-1, 1):  # horns swept forward for the charge
        m.limb(P(sx * 0.17, 0.62, 0.74), P(sx * 0.33, 0.74, 0.88), 0.1, 0.085, round=True, seg=5, col=BONE, **hd)
        m.spike(P(sx * 0.32, 0.73, 0.87), P(sx * 0.36, 1.06, 0.8), 0.085, seg=5, col=BONE, **hd)
    # Spine and tail.
    for i in range(3):
        m.spike(P(0, 0.26 - i * 0.24, 0.94 - i * 0.05), P(0, 0.14 - i * 0.24, 1.2 - i * 0.08), 0.12 - i * 0.015, seg=4, col=BONE, detail=i == 1 and not boss,
                bone='chest' if i < 2 else 'root')
    m.limb(P(0, -0.44, 0.68), P(0, -0.64, 0.78), (0.1, 0.1), (0.07, 0.07), col=BODY_D, tint=1, bevel=0.015, bone='tail')
    m.ball(P(0, -0.7, 0.8), 0.1, sub=1, smooth=0, col=PLATE_S, bone='tail')
    if boss:
        for i in range(4):  # a lit ridge down the back
            m.lathe([(0.0, 0.0), (0.07, 0.07), (0.0, 0.3)], P(0, 0.34 - i * 0.2, 0.96 - i * 0.04), seg=4, exact=True, col=GOLD, glow=0.9,
                    bone='chest' if i < 2 else 'root')
        for sx in (-1, 1):  # a second, higher pair of horns and plated flanks
            m.limb(P(sx * 0.13, 0.56, 0.78), P(sx * 0.24, 0.5, 1.0), 0.09, 0.075, round=True, seg=5, col=BONE, **hd)
            m.spike(P(sx * 0.235, 0.5, 0.98), P(sx * 0.3, 0.7, 1.28), 0.075, seg=5, col=BONE, **hd)
            m.box(P(sx * 0.22, -0.02, 0.62), (0.05, 0.3, 0.22), col=PLATE_D, bevel=0.02, **rt)
            light(m, P(sx * 0.25, -0.02, 0.62), 0.07, axis='x', flip=sx < 0, col=GOLD, **rt)
        m.lathe([(0.12, 0), (0.135, 0.05)], P(0, 0.62, 0.79), seg=8, cap=False, col=GOLD, glow=0.9, **hd)  # burning brow band
        m.ball(P(0, 0.455, 0.52), (0.16, 0.06, 0.14), col=(1, 0.55, 0.15), glow=1, **ch)  # chest core
        for sx in (-1, 1):
            m.spike(P(sx * 0.06, -0.7, 0.86), P(sx * 0.2, -0.78, 1.02), 0.06, seg=4, col=GOLD, glow=0.8, bone='tail')
    return m


def warder():
    """A standard-bearer: the crystal on its pole shields the horde around it."""
    m = Model('warder', rig=RIG_SHIELD)
    th = dict(bone='thigh_r', mirror=True)
    sh = dict(bone='shin_r', mirror=True)
    pole = dict(bone='arm_r')
    hd = dict(bone='head')
    m.limb(P(0.14, 0, 0.54), P(0.14, 0, 0.3), (0.2, 0.22), (0.17, 0.19), col=BODY_D, tint=1, bevel=0.03, **th)
    m.limb(P(0.14, 0.01, 0.33), P(0.14, 0, 0.1), (0.2, 0.22), (0.17, 0.2), col=PLATE_S, bevel=0.03, **sh)
    m.box(P(0.14, 0.05, 0.065), (0.21, 0.34, 0.13), taper=(0.85, 0.8), col=PLATE_D, bevel=0.035, **sh)
    m.box(P(0, 0, 0.56), (0.44, 0.32, 0.1), col=PLATE_D, bevel=0.025, bone='root')
    m.prism([(-0.17, 0.6), (0.17, 0.6), (0.13, 0.24), (0, 0.14), (-0.13, 0.24)], 0.03, at=0.175, plane='xu', col=BODY_L, tint=1, bevel=0.01, bone='root')  # tabard
    m.prism([(-0.17, 0.6), (0.17, 0.6), (0.15, 0.2), (-0.15, 0.2)], 0.03, at=-0.17, plane='xu', col=BODY_D, tint=1, bevel=0.01, bone='root')
    m.box(P(0, 0, 0.84), (0.42, 0.3, 0.48), taper=(1.3, 1.1), col=BODY, tint=1, bevel=0.05, bone='chest')  # cuirass
    light(m, P(0, 0.165, 0.88), 0.1, axis='f', col=ICE, rim=PLATE_S, bone='chest')
    m.box(P(0, 0.02, 1.06), (0.56, 0.34, 0.1), col=PLATE_S, bevel=0.03, bone='chest')  # collar
    m.ball(P(0.34, 0, 1.06), (0.18, 0.18, 0.12), sub=1, smooth=0, col=BODY_L, tint=1, mirror=True, bone='chest')
    # A tall mitre helm with one lit slit.
    m.box(P(0, 0.02, 1.26), (0.28, 0.3, 0.3), taper=(0.85, 0.88), col=PLATE_S, bevel=0.06, **hd)
    m.prism([(-0.15, 1.4), (0.15, 1.4), (0.11, 1.62), (0, 1.8), (-0.11, 1.62)], 0.22, at=0.02, plane='xu', col=BODY_L, tint=1, bevel=0.025, **hd)
    m.prism([(-0.035, 1.46), (0.035, 1.46), (0, 1.7)], 0.02, at=0.135, plane='xu', col=ICE, glow=1, bevel=0, **hd)
    m.box(P(0, 0.175, 1.27), (0.2, 0.03, 0.05), col=ICE, glow=1, bevel=0, **hd)
    # The standard: a pole, a crossbar with a hanging banner, and the shield crystal in a ring.
    px, pf = 0.4, 0.2
    m.limb(P(px, pf - 0.06, 0.06), P(px, pf, 1.78), 0.045, round=True, seg=6, col=(0.24, 0.2, 0.27), **pole)
    m.limb(P(px - 0.2, pf, 1.6), P(px + 0.2, pf, 1.6), 0.035, round=True, seg=5, col=PLATE_S, **pole)
    m.prism([(px - 0.17, 1.6), (px + 0.17, 1.6), (px + 0.17, 1.14), (px, 1.0), (px - 0.17, 1.14)], 0.025, at=pf + 0.03, plane='xu', col=BODY, tint=1, bevel=0.008, **pole)
    m.prism([(px, 1.5), (px + 0.09, 1.36), (px, 1.22), (px - 0.09, 1.36)], 0.02, at=pf + 0.05, plane='xu', col=ICE, glow=0.95, bevel=0, **pole)
    m.lathe([(0.0, 0.0), (0.13, 0.17), (0.0, 0.46)], P(px, pf, 1.8), seg=4, exact=True, col=ICE, glow=0.9, **pole)
    m.lathe([(0.25, -0.016), (0.28, 0.0), (0.25, 0.016)], P(px, pf, 2.0), seg=10, cap=False, col=ICE, glow=1, **pole)
    m.lathe([(0.07, 0.0), (0.085, 0.035), (0.07, 0.07)], P(px, pf, 1.74), seg=6, col=PLATE_S, **pole)
    m.limb(P(0.32, 0, 1.0), P(0.39, 0.17, 0.86), (0.13, 0.13), col=BODY_D, tint=1, bevel=0.025, **pole)
    m.box(P(0.4, 0.19, 0.84), (0.15, 0.15, 0.14), col=PLATE_S, bevel=0.035, **pole)
    # The free hand is raised, palm out.
    off = dict(bone='arm_l')
    m.limb(P(-0.32, 0, 1.0), P(-0.4, 0.2, 0.92), (0.13, 0.13), col=BODY_D, tint=1, bevel=0.025, **off)
    m.box(P(-0.41, 0.27, 0.96), (0.14, 0.06, 0.17), col=PLATE_S, bevel=0.025, **off)
    m.box(P(-0.41, 0.305, 0.96), (0.06, 0.02, 0.06), col=ICE, glow=1, bevel=0, detail=True, **off)
    return m


def queen():
    """The brood's queen: a spitter grown vast, crowned in crystal, dragging her clutch behind her."""
    m = Model('queen', rig=RIG_SPITTER)
    th = dict(bone='thigh_r', mirror=True)
    sh = dict(bone='shin_r', mirror=True)
    hd = dict(bone='head')
    ch = dict(bone='chest')
    rt = dict(bone='root')
    m.limb(P(0.17, -0.02, 0.5), P(0.185, -0.01, 0.29), (0.2, 0.22), (0.17, 0.19), col=BODY_D, tint=1, bevel=0.025, **th)
    m.limb(P(0.185, -0.01, 0.31), P(0.2, 0.0, 0.1), (0.19, 0.21), (0.15, 0.17), col=PLATE_S, bevel=0.025, **sh)
    m.box(P(0.2, 0.06, 0.05), (0.2, 0.34, 0.1), taper=(0.85, 0.8), col=PLATE_D, bevel=0.025, **sh)
    m.box(P(0, 0.06, 0.7), (0.5, 0.48, 0.46), rot=(24, 0, 0), taper=(1.2, 1.1), col=BODY, tint=1, bevel=0.06, **ch)
    m.box(P(0, 0.29, 0.66), (0.36, 0.08, 0.3), rot=(24, 0, 0), col=BODY_L, tint=1, bevel=0.03, **ch)
    light(m, P(0, 0.345, 0.7), 0.09, axis='f', col=ACID, **ch)
    # The clutch she drags: a swollen abdomen banded in steel, studded with eggs.
    m.ball(P(0, -0.44, 0.56), (0.34, 0.44, 0.3), sub=2, smooth=0, col=BODY_D, tint=1, **rt)
    m.lathe([(0.345, -0.03), (0.345, 0.03)], P(0, -0.36, 0.56), axis='f', seg=10, cap=False, scale=(1, 0.88), col=PLATE_S, **rt)
    for x, f, u, r in ((0.2, -0.5, 0.78, 0.14), (-0.2, -0.5, 0.78, 0.14), (0, -0.66, 0.76, 0.15), (0, -0.86, 0.56, 0.16), (0.27, -0.66, 0.56, 0.12), (-0.27, -0.66, 0.56, 0.12)):
        m.ball(P(x, f, u), r, sub=2, col=EGG, glow=0.75, **rt)
    # Crystal rack on the back.
    m.box(P(0, -0.12, 0.9), (0.66, 0.36, 0.1), rot=(8, 0, 0), col=PLATE_D, bevel=0.03, **ch)
    m.lathe([(0.0, 0.0), (0.19, 0.14), (0.2, 0.56), (0.0, 0.8)], P(0, -0.14, 0.92), seg=6, exact=True, col=ACID, glow=0.8, **ch)
    m.lathe([(0.215, 0.0), (0.215, 0.06)], P(0, -0.14, 1.14), seg=6, exact=True, col=PLATE_S, **ch)
    for sx in (-1, 1):
        m.lathe([(0.0, 0.0), (0.12, 0.1), (0.13, 0.38), (0.0, 0.54)], P(sx * 0.27, -0.2, 0.9), seg=6, exact=True, col=ACID, glow=0.8, **ch)
        m.lathe([(0.145, 0.0), (0.145, 0.045)], P(sx * 0.27, -0.2, 1.04), seg=6, exact=True, col=PLATE_S, **ch)
        m.spike(P(sx * 0.36, -0.06, 0.92), P(sx * 0.62, -0.1, 1.26), 0.09, seg=6, col=ACID, glow=0.8, **ch)
    # Neck, head and a wide mortar maw.
    m.limb(P(0, 0.2, 0.86), P(0, 0.42, 1.18), (0.24, 0.24), (0.2, 0.2), col=SKIN_T, tint=1, bevel=0.03, **hd)
    m.box(P(0, 0.46, 1.27), (0.38, 0.36, 0.28), taper=(0.8, 0.85), col=SKIN_T, tint=1, bevel=0.05, **hd)
    m.lathe([(0.09, 0.0), (0.21, 0.2)], P(0, 0.6, 1.3), axis='f', seg=6, exact=True, cap=False, col=PLATE_S, **hd)
    m.ball(P(0, 0.72, 1.3), (0.14, 0.07, 0.14), sub=1, col=(0.75, 1, 0.35), glow=1, **hd)
    eyes(m, 0.15, 0.58, 1.4, (0.05, 0.05, 0.045), col=(0.8, 1, 0.4), **hd)
    eyes(m, 0.19, 0.5, 1.33, (0.03, 0.05, 0.04), col=(0.8, 1, 0.4), detail=True, **hd)
    m.lathe([(0.17, 0), (0.19, 0.06)], P(0, 0.42, 1.41), seg=8, cap=False, col=GOLD, glow=0.9, **hd)  # crown band
    for i in range(5):
        a = math.radians(-90 + (i - 2) * 50)
        cx, cf = math.cos(a) * 0.18, 0.42 - math.sin(a) * 0.18 - 0.36
        m.lathe([(0.0, 0.0), (0.05, 0.06), (0.0, 0.26 if i != 2 else 0.36)], P(cx, cf + 0.36 - 0.0, 1.44), seg=4, exact=True, col=GOLD, glow=0.9, **hd)
    # Two pairs of arms.
    arm = dict(bone='arm_r', mirror=True)
    m.limb(P(0.22, 0.2, 0.82), P(0.3, 0.44, 0.6), (0.12, 0.12), (0.1, 0.1), col=BODY_D, tint=1, bevel=0.02, **arm)
    m.spike(P(0.3, 0.43, 0.61), P(0.3, 0.6, 0.5), 0.07, seg=4, col=BONE, **arm)
    m.limb(P(0.26, 0.1, 0.72), P(0.42, 0.26, 0.5), (0.1, 0.1), (0.08, 0.08), col=BODY_D, tint=1, bevel=0.02, detail=True, **arm)
    return m


ENEMIES = {
    'grunt': (grunt, (0.95, 0.27, 0.3), 1.0),
    'runner': (runner, (1.0, 0.5, 0.14), 0.98),
    'shield': (shield, (0.66, 0.36, 0.95), 1.04),
    'bomber': (bomber, (1.0, 0.78, 0.1), 1.05),
    'spitter': (spitter, (0.42, 0.86, 0.3), 1.08),
    'brute': (lambda: heavy('brute'), (0.88, 0.22, 0.42), 1.12),
    'giant': (lambda: heavy('giant'), (0.74, 0.16, 0.38), 1.95),
    'boss': (lambda: heavy('boss'), (0.78, 0.12, 0.2), 3.1),
    # Past level 50.
    'brood': (brood, (1.0, 0.42, 0.68), 1.35),
    'ram': (lambda: ram('ram'), (0.1, 0.62, 0.55), 1.9),
    'warder': (warder, (0.45, 0.8, 1.0), 1.25),
    'queen': (queen, (0.5, 0.2, 0.8), 3.3),
    'beast': (lambda: ram('beast'), (0.86, 0.42, 0.1), 4.0),
}
LOD_ENEMIES = ['grunt', 'runner', 'shield', 'bomber', 'spitter', 'brute']
INFANTRY = [
    ('recruit', (0.2, 0.62, 1.0)), ('soldier', (0.1, 0.78, 0.86)), ('veteran', (0.16, 0.82, 0.55)),
    ('commando', (0.42, 0.5, 1.0)), ('guard', (0.72, 0.5, 1.0)), ('titan', (1.0, 0.82, 0.25)),
    ('warden', (0.86, 0.94, 1.0)), ('praetor', (0.34, 0.36, 0.52)), ('archon', (0.25, 0.92, 1.0)),
]
WEAPONS = ['rifle', 'smg', 'shotgun', 'mg', 'rail', 'rocket', 'plasma', 'laser', 'cluster', 'nova']
