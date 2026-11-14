"""Data-driven grader: runs a spec from vision/specs/<name>.json on pose frames.

A spec lists named moments (key frames), then rules. Each rule takes one
measurement, compares it to a target range and picks a feedback line.
See "Writing a spec" in vision/README.md for the format.

    spec = load_spec("shoot_form")
    result = analyze(spec, frames, fps, hand="auto")
"""
import json
import math
import os
from statistics import median

from pose import L, R, angle

HERE = os.path.dirname(os.path.abspath(__file__))
SPEC_DIR = os.path.join(HERE, "specs")

MIN_VIS = 0.5        # ignore landmarks the model isn't confident about
SMOOTH_K = 5         # median filter width (frames) for joint angles and ankles
NEAREST_FRAMES = 2   # pick "at": use the nearest measured frame within this many
GROUND_MARGIN = 0.03 # feet_on_ground: margin as a fraction of body height

POINTS = ("nose", "shoulder", "elbow", "wrist", "hip", "knee", "ankle")
JOINTS = {"elbow": ("shoulder", "elbow", "wrist"), "knee": ("hip", "knee", "ankle")}
CONDITIONS = ("wrist_above_shoulder", "wrist_above_nose", "feet_on_ground")
MOMENT_TYPES = ("highest", "lowest", "first_when", "last_when")
MEASUREMENTS = ("joint_angle", "arm_direction", "duration", "air_time", "happened")
UNITS = {"joint_angle": "deg", "arm_direction": "deg", "duration": "s",
         "air_time": "s", "happened": "bool"}

DEFAULT_TOO_FEW = "Couldn't see your body clearly. Film from the side with your whole body in frame."
DEFAULT_MISSING = "Couldn't measure {label}. Film from your shooting-hand side so that arm faces the camera."


class SpecError(ValueError):
    """The spec file is invalid. The message says which spec, rule and field."""


# --------------------------------------------------------------------------
# Loading and validation
# --------------------------------------------------------------------------

def spec_names():
    if not os.path.isdir(SPEC_DIR):
        return []
    return sorted(f[:-5] for f in os.listdir(SPEC_DIR) if f.endswith(".json"))


def load_spec(name):
    path = os.path.join(SPEC_DIR, f"{name}.json")
    if not os.path.exists(path):
        raise SpecError(f"No spec named '{name}' (looked for {path})")
    with open(path) as f:
        try:
            spec = json.load(f)
        except json.JSONDecodeError as e:
            raise SpecError(f"{name}: not valid JSON: {e}") from e
    spec.setdefault("name", name)
    validate(spec)
    return spec


def validate(spec):
    """Raise SpecError with a clear message if anything in the spec is wrong."""
    name = spec.get("name", "<spec>")

    def fail(msg):
        raise SpecError(f"{name}: {msg}")

    if not isinstance(spec.get("rules"), list) or not spec["rules"]:
        fail("needs a non-empty 'rules' list")
    if spec.get("pass", "all") != "all":
        fail(f"pass must be \"all\" (got {spec.get('pass')!r})")

    moments = []
    for m in spec.get("moments", []):
        where = f"moment {m.get('name', '?')!r}"
        if not m.get("name"):
            fail("every moment needs a 'name'")
        if m["name"] in moments:
            fail(f"{where}: defined twice")
        t = m.get("type")
        if t not in MOMENT_TYPES:
            fail(f"{where}: unknown type {t!r} (expected one of {', '.join(MOMENT_TYPES)})")
        if t in ("highest", "lowest") and m.get("point") not in POINTS:
            fail(f"{where}: 'point' must be one of {', '.join(POINTS)} (got {m.get('point')!r})")
        if t in ("first_when", "last_when"):
            _check_condition(m.get("condition"), f"{where}: condition", fail)
            if "window" in m:
                _check_window(m["window"], moments, where, fail)
        moments.append(m["name"])

    seen = set()
    for r in spec["rules"]:
        where = f"rule {r.get('name', '?')!r}"
        if not r.get("name"):
            fail("every rule needs a 'name'")
        if r["name"] in seen:
            fail(f"{where}: defined twice")
        seen.add(r["name"])
        t = r.get("target")
        if (not isinstance(t, list) or len(t) != 2
                or not all(isinstance(x, (int, float)) for x in t) or t[0] > t[1]):
            fail(f"{where}: 'target' must be [lo, hi] numbers with lo <= hi (got {t!r})")
        _check_measure(r.get("measure"), moments, where, fail)
        fb = r.get("feedback", {})
        unknown = set(fb) - {"fail", "fail_low", "fail_high", "fail_missing"}
        if unknown:
            fail(f"{where}: unknown feedback keys {sorted(unknown)}")


def _check_measure(m, moments, where, fail):
    if not isinstance(m, dict):
        fail(f"{where}: needs a 'measure' object")
    t = m.get("type")
    if t not in MEASUREMENTS:
        fail(f"{where}: unknown measurement {t!r} (expected one of {', '.join(MEASUREMENTS)})")

    def need_moment(key):
        if m.get(key) not in moments:
            fail(f"{where}: '{key}' must name a moment defined above (got {m.get(key)!r}; "
                 f"moments: {', '.join(moments) or 'none'})")

    if t == "joint_angle":
        if m.get("joint") not in JOINTS:
            fail(f"{where}: 'joint' must be one of {', '.join(JOINTS)} (got {m.get('joint')!r})")
        pick = m.get("pick")
        if pick not in ("min", "max", "at"):
            fail(f"{where}: 'pick' must be min, max or at (got {pick!r})")
        if pick == "at":
            need_moment("at")
        else:
            _check_window(m.get("window"), moments, where, fail)
        if "only_when" in m:
            _check_condition(m["only_when"], f"{where}: only_when", fail)
    elif t == "arm_direction":
        need_moment("at")
    elif t == "duration":
        _check_condition(m.get("condition"), f"{where}: condition", fail)
        need_moment("from")
        if m.get("direction", "forward") not in ("forward", "around"):
            fail(f"{where}: 'direction' must be forward or around (got {m.get('direction')!r})")
    elif t == "air_time":
        _check_window(m.get("window"), moments, where, fail)
    elif t == "happened":
        need_moment("moment")


def _check_condition(c, where, fail):
    if c not in CONDITIONS:
        fail(f"{where} must be one of {', '.join(CONDITIONS)} (got {c!r})")


def _check_window(w, moments, where, fail):
    if w == "all":
        return
    if not isinstance(w, dict):
        fail(f"{where}: 'window' must be \"all\" or {{\"moment\": ..., \"offset_s\": [start, end]}} (got {w!r})")
    if w.get("moment") not in moments:
        fail(f"{where}: window moment must be defined above (got {w.get('moment')!r}; "
             f"moments: {', '.join(moments) or 'none'})")
    o = w.get("offset_s")
    if (not isinstance(o, list) or len(o) != 2
            or not all(isinstance(x, (int, float)) for x in o) or o[0] > o[1]):
        fail(f"{where}: window 'offset_s' must be [start, end] seconds with start <= end (got {o!r})")


# --------------------------------------------------------------------------
# Shared signal processing (same as jump_shot.py)
# --------------------------------------------------------------------------

def pick_side(hand, frames):
    """Shooting side. auto = the arm facing the camera (higher visibility).

    We tell users to film from their shooting-hand side, so the near arm is the
    shooting arm. This also makes mirrored front-camera video work.
    """
    if hand == "left":
        return L
    if hand == "right":
        return R

    def vis(side):
        vals = [f[side[j]].visibility for f in frames if f is not None
                for j in ("shoulder", "elbow", "wrist")
                if f[side[j]].visibility is not None]
        return sum(vals) / len(vals) if vals else None

    vl, vr = vis(L), vis(R)
    if vl is not None and vr is not None and abs(vl - vr) > 0.05:
        return L if vl > vr else R
    # fallback: the arm whose wrist gets highest
    best = {"L": 1e9, "R": 1e9}
    for f in frames:
        if f is None:
            continue
        best["L"] = min(best["L"], f[L["wrist"]].y)
        best["R"] = min(best["R"], f[R["wrist"]].y)
    return L if best["L"] < best["R"] else R


def visible(f, *idx):
    return all((f[i].visibility is None) or (f[i].visibility >= MIN_VIS) for i in idx)


def smooth(series, k=SMOOTH_K):
    """Median filter over a list of (frame, value) pairs. Removes one-frame spikes."""
    vals = [v for _, v in series]
    out = []
    for j, (i, _) in enumerate(series):
        lo, hi = max(0, j - k // 2), min(len(vals), j + k // 2 + 1)
        out.append((i, median(vals[lo:hi])))
    return out


def joint_series(frames, S, joint):
    """Smoothed joint angle per frame: dict frame -> degrees (visible frames only)."""
    a_name, b_name, c_name = JOINTS[joint]
    a, b, c = S[a_name], S[b_name], S[c_name]
    out = []
    for i, f in enumerate(frames):
        if f is None or not visible(f, a, b, c):
            continue
        v = angle(f[a], f[b], f[c])
        if v is not None:
            out.append((i, v))
    return dict(smooth(out))


# --------------------------------------------------------------------------
# Clip: everything a spec can ask about one video
# --------------------------------------------------------------------------

class Clip:
    def __init__(self, frames, fps, hand="auto"):
        self.frames = frames
        self.fps = fps
        self.valid = [i for i, f in enumerate(frames) if f is not None]
        self.S = pick_side(hand, frames) if self.valid else R
        self._joints = {}
        self._ground = None

    def joint(self, name):
        if name not in self._joints:
            self._joints[name] = joint_series(self.frames, self.S, name)
        return self._joints[name]

    def frames_for(self, seconds):
        """Seconds -> frame offset, truncated toward zero like jump_shot.py."""
        return int(seconds * self.fps)

    # --- conditions: True / False, or None when unknown -------------------

    def condition(self, name, i):
        f = self.frames[i]
        if f is None:
            return None
        S = self.S
        if name == "wrist_above_shoulder":
            return f[S["wrist"]].y < f[S["shoulder"]].y
        if name == "wrist_above_nose":
            return f[S["wrist"]].y < f[S["nose"]].y
        if name == "feet_on_ground":
            return self.ground().get(i)
        raise SpecError(f"unknown condition {name!r}")

    def ground(self):
        """dict frame -> True (on the ground) / False (both visible feet up).

        Each ankle's y is median-filtered over its visible frames. Its resting
        level is the median over the clip. A foot is up when it's higher than its
        resting level by more than GROUND_MARGIN x body height (nose to ankle).
        Frames with no visible ankle are left out (unknown).
        """
        if self._ground is not None:
            return self._ground
        ankles = (L["ankle"], R["ankle"])
        series = {a: dict(smooth([(i, self.frames[i][a].y) for i in self.valid
                                  if visible(self.frames[i], a)])) for a in ankles}
        rest = {a: median(s.values()) for a, s in series.items() if s}
        heights = [max(f[a].y for a in ankles) - f[0].y for f in (self.frames[i] for i in self.valid)
                   if visible(f, 0, *ankles)]
        body = median(heights) if heights else None
        self._ground = {}
        if not rest or not body or body <= 0:
            return self._ground
        margin = GROUND_MARGIN * body
        for i in self.valid:
            seen = [a for a in rest if i in series[a]]
            if not seen:
                continue
            both_up = all(series[a][i] < rest[a] - margin for a in seen)
            self._ground[i] = not both_up
        return self._ground

    # --- moments and windows --------------------------------------------

    def find_moment(self, m, moments):
        if not self.valid:
            return None
        t = m["type"]
        if t in ("highest", "lowest"):
            idx = self.S[m["point"]]
            key = lambda i: self.frames[i][idx].y
            return min(self.valid, key=key) if t == "highest" else max(self.valid, key=key)
        candidates = self.window(m.get("window", "all"), moments)
        hits = [i for i in candidates if self.condition(m["condition"], i)]
        if not hits:
            return None
        return hits[0] if t == "first_when" else hits[-1]

    def window(self, w, moments):
        """Frames in a window, both ends included. Empty if its moment wasn't found."""
        if w == "all":
            return list(range(len(self.frames)))
        center = moments.get(w["moment"])
        if center is None:
            return []
        lo = max(0, center + self.frames_for(w["offset_s"][0]))
        hi = min(len(self.frames) - 1, center + self.frames_for(w["offset_s"][1]))
        return list(range(lo, hi + 1))


# --------------------------------------------------------------------------
# Measurements: each returns (value or None, picked_frame or None)
# --------------------------------------------------------------------------

def measure(clip, m, moments):
    return MEASURE_FNS[m["type"]](clip, m, moments)


def m_joint_angle(clip, m, moments):
    series = clip.joint(m["joint"])
    cond = m.get("only_when")
    if m["pick"] == "at":
        at = moments.get(m["at"])
        if at is None:
            return None, None
        near = [i for i in series if abs(i - at) <= NEAREST_FRAMES]
        if cond:
            near = [i for i in near if clip.condition(cond, i)]
        if not near:
            return None, None
        i = min(near, key=lambda i: (abs(i - at), i))
        return series[i], i
    frames = set(clip.window(m["window"], moments))
    items = [(i, v) for i, v in series.items() if i in frames]
    if cond:
        items = [(i, v) for i, v in items if clip.condition(cond, i)]
    if not items:
        return None, None
    pick = min if m["pick"] == "min" else max
    i, v = pick(items, key=lambda t: t[1])
    return v, i


def m_arm_direction(clip, m, moments):
    """Angle of the shoulder->wrist line above horizontal (90 = straight up)."""
    at = moments.get(m["at"])
    if at is None or clip.frames[at] is None:
        return None, at
    f, S = clip.frames[at], clip.S
    dx = abs(f[S["wrist"]].x - f[S["shoulder"]].x)
    dy = f[S["shoulder"]].y - f[S["wrist"]].y  # positive when the wrist is above the shoulder
    if not (dx or dy):
        return None, at
    return math.degrees(math.atan2(dy, dx)), at


def m_duration(clip, m, moments):
    """Seconds a condition holds from a moment.

    forward: counted from the frame after the moment until it stops holding.
    around:  the unbroken run that contains the moment (0 if false there).
    picked_frame is where the run ends.
    """
    start = moments.get(m["from"])
    if start is None:
        return None, None
    cond = m["condition"]
    if m.get("direction", "forward") == "forward":
        count = 0
        for i in clip.valid:
            if i <= start:
                continue
            if clip.condition(cond, i):
                count += 1
            else:
                break
        return round(count / clip.fps, 2), start + count
    if not clip.condition(cond, start):
        return 0.0, start
    pos = clip.valid.index(start) if start in clip.valid else None
    if pos is None:
        return None, None
    lo = hi = pos
    while lo > 0 and clip.condition(cond, clip.valid[lo - 1]):
        lo -= 1
    while hi < len(clip.valid) - 1 and clip.condition(cond, clip.valid[hi + 1]):
        hi += 1
    return round((hi - lo + 1) / clip.fps, 2), clip.valid[hi]


def m_air_time(clip, m, moments):
    """Seconds with both feet off the ground in the window. picked_frame = first frame in the air."""
    ground = clip.ground()
    frames = [i for i in clip.window(m["window"], moments) if i in ground]
    if not frames:
        return None, None
    air = [i for i in frames if ground[i] is False]
    return round(len(air) / clip.fps, 2), (air[0] if air else None)


def m_happened(clip, m, moments):
    at = moments.get(m["moment"])
    return (1 if at is not None else 0), at


MEASURE_FNS = {"joint_angle": m_joint_angle, "arm_direction": m_arm_direction,
               "duration": m_duration, "air_time": m_air_time, "happened": m_happened}


# --------------------------------------------------------------------------
# Rules -> result
# --------------------------------------------------------------------------

def feedback_for(rule, value, ok):
    if ok:
        return None
    fb = rule.get("feedback", {})
    lo, hi = rule["target"]
    if value is None:
        return fb.get("fail_missing") or DEFAULT_MISSING.format(label=rule["name"].replace("_", " "))
    if value < lo:
        return fb.get("fail_low") or fb.get("fail") or f"{rule['name']}: {value:.0f} (target {lo}-{hi})"
    return fb.get("fail_high") or fb.get("fail") or f"{rule['name']}: {value:.0f} (target {lo}-{hi})"


def display_value(value, unit):
    if value is None:
        return None
    return round(value, 2) if unit == "s" else round(value, 1)


def analyze(spec, frames, fps=30, hand="auto"):
    clip = Clip(frames, fps, hand)
    debug = {"side": "left" if clip.S is L else "right", "fps": round(fps),
             "spec": spec["name"], "moments": {}, "picked_frames": {}}

    if len(clip.valid) < spec.get("min_frames", 10):
        return {"passed": False, "score": 0.0, "metrics": [],
                "feedback": [spec.get("too_few_frames", DEFAULT_TOO_FEW)], "debug": debug}

    moments = {}
    for m in spec.get("moments", []):
        moments[m["name"]] = clip.find_moment(m, moments)
        debug["moments"][m["name"]] = moments[m["name"]]
        debug[f"{m['name']}_frame"] = moments[m["name"]]

    metrics, feedback = [], []
    for rule in spec["rules"]:
        value, picked = measure(clip, rule["measure"], moments)
        lo, hi = rule["target"]
        ok = value is not None and lo <= value <= hi
        unit = UNITS[rule["measure"]["type"]]
        metrics.append({"name": rule["name"], "label": rule.get("label", rule["name"].replace("_", " ")),
                        "value": display_value(value, unit), "unit": unit,
                        "target": [lo, hi], "ok": ok})
        tip = feedback_for(rule, value, ok)
        if tip:
            feedback.append(tip)
        debug["picked_frames"][rule["name"]] = picked
        if rule.get("debug_frame"):
            debug[rule["debug_frame"]] = picked

    if not feedback and spec.get("success"):
        feedback.append(spec["success"])
    return {"passed": all(m["ok"] for m in metrics),
            "score": round(sum(m["ok"] for m in metrics) / len(metrics), 2),
            "metrics": metrics, "feedback": feedback, "debug": debug}
