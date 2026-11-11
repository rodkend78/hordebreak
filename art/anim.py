"""Animation clips for every rig. A clip is a function from a phase u (0..1)
to a pose: {bone: {'rot': (x, y, z) in degrees, 'move': (right, forward, up)}}.

Rotation about x is a forward lean: for a limb hanging down, negative swings it
forward and positive swings it back; a knee or elbow bends with positive x.
Rotation about z twists, about y rolls to the side."""
import math

TAU = math.tau


def S(u, ph=0.0):
    return math.sin(TAU * (u + ph))


def C(u, ph=0.0):
    return math.cos(TAU * (u + ph))


def K(u, times, values):
    """Ease through keyframes: `values` at `times`, cosine-smoothed between."""
    if u <= times[0]:
        return values[0]
    for (t0, v0), (t1, v1) in zip(zip(times, values), zip(times[1:], values[1:])):
        if u <= t1:
            k = (u - t0) / (t1 - t0)
            k = 0.5 - 0.5 * math.cos(math.pi * k)
            return v0 + (v1 - v0) * k
    return values[-1]


def B(rx=0.0, ry=0.0, rz=0.0, f=0.0, up=0.0, x=0.0):
    """One bone's channels. Forward and up are in the figure's own terms."""
    return {'rot': (rx, ry, rz), 'move': (x, -f, up)}


def biped_walk(u, stride=28, knee=40, bob=0.03, roll=3, twist=6, arm=18, elbow=0, lean=0):
    """A walk cycle for a two-legged rig: thighs scissor, the knee folds as a
    leg comes through, hips drop when the legs are apart and twist with the
    leading leg, and the chest and arms counter them."""
    s, c = S(u), C(u)
    return {
        'root': B(lean, roll * s, -twist * s, up=-bob * s * s),
        'chest': B(0, -roll * 1.2 * s, twist * 1.6 * s),
        'head': B(0, 0, -twist * 0.6 * s),
        'thigh_r': B(-stride * s), 'shin_r': B(knee * max(0.0, c) + 4),
        'thigh_l': B(stride * s), 'shin_l': B(knee * max(0.0, -c) + 4),
        'arm_r': B(arm * s), 'fore_r': B(-elbow - elbow * 0.6 * max(0.0, -s)),
        'arm_l': B(-arm * s), 'fore_l': B(-elbow - elbow * 0.6 * max(0.0, s)),
    }


def lunge(u, t, reach, drop):
    """Legs and hips for a strike: a step back to wind up, then a lunge."""
    return {
        'root': B(f=K(u, t, (0, -0.05, reach, reach)), up=K(u, t, (0, 0.03, -drop, -drop))),
        'thigh_r': B(K(u, t, (-8, 10, -40, -40))), 'shin_r': B(K(u, t, (8, 10, 36, 36))),
        'thigh_l': B(K(u, t, (8, -5, 26, 26))), 'shin_l': B(K(u, t, (5, 8, 14, 14))),
    }


# ---- grunt: a lurching shamble, then both claws brought down ----
def grunt_walk(u):
    p = biped_walk(u, stride=26, knee=38, bob=0.035, roll=6, twist=5, arm=0)
    p['chest'] = B(4 * S(2 * u), -7 * S(u), 8 * S(u))
    p['head'] = B(5 * S(2 * u, 0.1), 4 * S(u), -3 * S(u))
    p['arm_r'] = B(-6 + 9 * S(u, 0.1))  # arms held out, pawing in turn
    p['arm_l'] = B(-6 - 9 * S(u, 0.1))
    p['fore_r'] = B(-8 * max(0.0, S(u, 0.1)))
    p['fore_l'] = B(-8 * max(0.0, -S(u, 0.1)))
    return p


def grunt_attack(u):
    t = (0, 0.45, 0.85, 1)
    p = lunge(u, t, 0.3, 0.08)
    p['chest'] = B(K(u, t, (0, -20, 32, 28)))
    p['head'] = B(K(u, t, (0, -15, 12, 10)))
    for side in ('r', 'l'):
        p['arm_' + side] = B(K(u, t, (-5, -95, 30, 25)))  # up over the head, then down
        p['fore_' + side] = B(K(u, t, (0, -30, 10, 10)))
    return p


# ---- hound: a bounding gallop, then a pounce ----
def hound_walk(u):
    pitch = 6 * S(u)
    flex = -8 * S(u, 0.16)
    p = {
        'root': B(pitch, up=0.05 * S(u, 0.2)),
        'chest': B(flex),
        'head': B(-(pitch + flex) * 0.8),
        'jaw': B(6 + 5 * S(2 * u)),
        'tail': B(14 * S(u, 0.3)),
    }
    for side, off in (('r', 0.0), ('l', 0.07)):  # the pair lands a beat apart
        p['fleg_' + side] = B(46 * S(u, off))
        p['fshin_' + side] = B(55 * max(0.0, C(u, off)))
        p['hleg_' + side] = B(44 * S(u, 0.45 + off))
        p['hshin_' + side] = B(-38 * max(0.0, C(u, 0.45 + off)))
    return p


def hound_attack(u):
    t = (0, 0.4, 0.85, 1)
    p = {
        'root': B(K(u, t, (0, 14, -26, -18)), f=K(u, t, (0, -0.06, 0.5, 0.55)), up=K(u, t, (0, -0.12, 0.36, 0.26))),
        'chest': B(K(u, t, (0, 6, -8, -4))),
        'head': B(K(u, t, (0, -12, 16, 12))),
        'jaw': B(K(u, t, (4, 10, 42, 38))),
        'tail': B(K(u, t, (0, -20, 28, 20))),
    }
    for side in ('r', 'l'):
        p['fleg_' + side] = B(K(u, t, (0, 30, -72, -60)))  # fore legs thrown out ahead
        p['fshin_' + side] = B(K(u, t, (10, 60, 6, 10)))
        p['hleg_' + side] = B(K(u, t, (0, -42, 52, 44)))  # hind legs coil, then drive
        p['hshin_' + side] = B(K(u, t, (0, 70, -10, -6)))
    return p


# ---- shieldbearer: a steady march behind the shield, then a spear thrust ----
def shield_walk(u):
    p = biped_walk(u, stride=24, knee=34, bob=0.025, roll=2, twist=4, arm=0)
    p['arm_l'] = B(up=0.012 * S(2 * u))
    p['arm_r'] = B(3 * S(u), up=0.015 * S(2 * u, 0.1))
    return p


def shield_attack(u):
    t = (0, 0.45, 0.85, 1)
    p = lunge(u, t, 0.24, 0.06)
    p['chest'] = B(K(u, t, (0, -6, 14, 12)), 0, K(u, t, (0, 14, -16, -14)))
    p['arm_r'] = B(K(u, t, (0, 55, 82, 80)), f=K(u, t, (0, -0.22, 0.5, 0.48)), up=K(u, t, (0, 0.1, -0.12, -0.12)))  # level the spear, drive it
    p['arm_l'] = B(f=K(u, t, (0, 0.05, 0.1, 0.1)), up=K(u, t, (0, 0.06, -0.04, -0.04)))
    return p


# ---- reactor crate: a waddle with its halo turning, then a leap ----
def bomber_walk(u):
    s = S(u)
    return {
        'root': B(0, 9 * s, 0, up=-0.025 * s * s),
        'chest': B(4 * S(2 * u)),
        'thigh_r': B(-38 * s), 'thigh_l': B(38 * s),
        'halo': B(0, 0, 360 * u),
    }


def bomber_attack(u):
    t = (0, 0.5, 0.9, 1)
    return {
        'root': B(K(u, t, (0, -8, 24, 28)), f=K(u, t, (0, 0, 0.3, 0.34)), up=K(u, t, (0, -0.1, 0.38, 0.34))),
        'thigh_r': B(K(u, t, (0, -40, 34, 34))), 'thigh_l': B(K(u, t, (0, -40, 34, 34))),
        'halo': B(0, 0, 720 * u),
    }


# ---- spitter: a hunched trudge; to spit it rears back and snaps forward ----
def spitter_walk(u):
    p = biped_walk(u, stride=26, knee=36, bob=0.04, roll=4, twist=4, arm=14)
    p['head'] = B(6 * S(2 * u))
    return p


def spitter_attack(u):
    t = (0, 0.42, 0.56, 0.78, 1)
    return {
        'root': B(f=K(u, t, (0, -0.05, 0.08, 0.04, 0))),
        'chest': B(K(u, t, (0, -24, 16, 10, 0))),
        'head': B(K(u, t, (0, -30, 26, 14, 0))),
        'arm_r': B(K(u, t, (0, -30, 20, 10, 0))), 'arm_l': B(K(u, t, (0, -30, 20, 10, 0))),
    }


# ---- golems (brute, giant, boss): a heavy stomp, then an overhead smash ----
def heavy_walk(u):
    return biped_walk(u, stride=22, knee=30, bob=0.05, roll=4, twist=8, arm=26, elbow=12)


def heavy_attack(u):
    t = (0, 0.5, 0.85, 1)
    p = lunge(u, t, 0.28, 0.14)
    p['chest'] = B(K(u, t, (0, -18, 38, 34)))
    p['head'] = B(K(u, t, (0, -12, 12, 12)))
    for side in ('r', 'l'):
        p['arm_' + side] = B(K(u, t, (0, -165, -40, -35)))  # fists up over the head, then down
        p['fore_' + side] = B(K(u, t, (-10, -25, -15, -15)))
    return p


# ---- troopers: an aiming march (the gun stays level), and standing ready ----
def trooper_walk(u):
    p = biped_walk(u, stride=27, knee=42, bob=0.022, roll=1.5, twist=4, arm=0)
    p['gun'] = B(1.5 * S(2 * u), 0, -2.4 * S(u), up=0.008 * S(2 * u))  # cancels the chest's twist
    return p


def trooper_idle(u):
    return {'chest': B(up=0.006 * S(u)), 'head': B(0, 0, 3 * S(u)), 'gun': B(0.8 * S(u))}


def fired(base, k):
    """A clip with the weapon's kick laid over it: k = 1 at the shot, 0.5 as it settles."""
    def pose(u):
        p = base(u)
        g = p.get('gun', B())
        c = p.get('chest', B())
        r = p.get('root', B())
        h = p.get('head', B())
        p['gun'] = {'rot': (g['rot'][0] - 9 * k, g['rot'][1], g['rot'][2]), 'move': (g['move'][0], g['move'][1] + 0.07 * k, g['move'][2] + 0.02 * k)}
        p['chest'] = {'rot': (c['rot'][0] - 5 * k, c['rot'][1], c['rot'][2]), 'move': c['move']}
        p['head'] = {'rot': (h['rot'][0] + 3 * k, h['rot'][1], h['rot'][2]), 'move': h['move']}
        p['root'] = {'rot': r['rot'], 'move': (r['move'][0], r['move'][1] + 0.02 * k, r['move'][2])}
        return p
    return pose


# rig name -> clip name -> (pose function, frames, loops?)
CLIPS = {
    'grunt': {'walk': (grunt_walk, 16, True), 'attack': (grunt_attack, 12, False)},
    'hound': {'walk': (hound_walk, 16, True), 'attack': (hound_attack, 12, False)},
    'shield': {'walk': (shield_walk, 16, True), 'attack': (shield_attack, 12, False)},
    'bomber': {'walk': (bomber_walk, 16, True), 'attack': (bomber_attack, 12, False)},
    'spitter': {'walk': (spitter_walk, 16, True), 'attack': (spitter_attack, 14, False)},
    'heavy': {'walk': (heavy_walk, 16, True), 'attack': (heavy_attack, 12, False)},
    'trooper': {
        'walk': (trooper_walk, 16, True), 'idle': (trooper_idle, 8, True),
        # the same two clips mid-recoil and settling: the renderer steps a trooper through them after each volley
        'walk_f2': (fired(trooper_walk, 1.0), 16, True), 'walk_f1': (fired(trooper_walk, 0.45), 16, True),
        'idle_f2': (fired(trooper_idle, 1.0), 8, True), 'idle_f1': (fired(trooper_idle, 0.45), 8, True),
    },
}
