"""Jump shot analysis from pose landmarks. Side view, whole body in frame.

Target ranges are rough starting points: calibrate them on real clips.
"""
from statistics import median
from pose import L, R, angle

TARGETS = {
    "knee_bend": (90, 140),        # min knee angle during the dip (lower = deeper bend)
    "set_point_elbow": (60, 110),  # elbow angle when the ball is set, before the push
    "release_elbow": (150, 180),   # arm extension at release
    "release_arm_angle": (55, 95), # shoulder->wrist angle above horizontal at release (up, not forward)
    "follow_through_s": (0.3, 99),  # seconds the wrist stays above the shoulder after release
}

SET_WINDOW_S = 0.6     # look for the set point / dip this long before release
RELEASE_WINDOW_S = 0.1 # look for max extension within this window around release
MIN_VIS = 0.5          # ignore landmarks the model isn't confident about


def _side(hand, frames):
    if hand == "left":
        return L
    if hand == "right":
        return R
    # auto: the arm facing the camera (higher MediaPipe confidence).
    # We tell users to film from their shooting-hand side, so the near arm is the
    # shooting arm. This also makes mirrored front-camera video work.
    def vis(side):
        vals = [f[side[j]].visibility for f in frames if f is not None
                for j in ("shoulder", "elbow", "wrist")
                if f[side[j]].visibility is not None]
        return sum(vals) / len(vals) if vals else None
    vl, vr = vis(L), vis(R)
    if vl is not None and vr is not None and abs(vl - vr) > 0.05:
        return L if vl > vr else R
    # fallback: arm whose wrist gets highest
    best = {"L": 1e9, "R": 1e9}
    for f in frames:
        if f is None:
            continue
        best["L"] = min(best["L"], f[L["wrist"]].y)
        best["R"] = min(best["R"], f[R["wrist"]].y)
    return L if best["L"] < best["R"] else R


def _visible(f, *pts):
    return all((p.visibility is None) or (p.visibility >= MIN_VIS) for p in (f[i] for i in pts))


def _smooth(series, k=5):
    """Median filter over a list of (frame, value) pairs. Removes one-frame spikes."""
    vals = [v for _, v in series]
    out = []
    for j, (i, _) in enumerate(series):
        lo, hi = max(0, j - k // 2), min(len(vals), j + k // 2 + 1)
        out.append((i, median(vals[lo:hi])))
    return out


def joint_series(frames, S):
    """Per-frame smoothed elbow and knee angles: dict frame -> value."""
    elbow, knee = [], []
    for i, f in enumerate(frames):
        if f is None:
            continue
        if _visible(f, S["shoulder"], S["elbow"], S["wrist"]):
            a = angle(f[S["shoulder"]], f[S["elbow"]], f[S["wrist"]])
            if a is not None:
                elbow.append((i, a))
        if _visible(f, S["hip"], S["knee"], S["ankle"]):
            a = angle(f[S["hip"]], f[S["knee"]], f[S["ankle"]])
            if a is not None:
                knee.append((i, a))
    return dict(_smooth(elbow)), dict(_smooth(knee))


def analyze(frames, fps=30, hand="auto"):
    valid = [i for i, f in enumerate(frames) if f is not None]
    if len(valid) < 10:
        return {"passed": False, "score": 0.0, "metrics": [],
                "feedback": ["Couldn't see your body clearly. Film from the side with your whole body in frame."]}

    S = _side(hand, frames)
    elbow, knee = joint_series(frames, S)

    # Release = frame where the shooting wrist is highest
    release = min(valid, key=lambda i: frames[i][S["wrist"]].y)

    set_lo = release - int(SET_WINDOW_S * fps)
    rel_w = max(1, int(RELEASE_WINDOW_S * fps))

    # Set point: only frames where the ball (wrist) is already above the shoulder,
    # so the low "loading" from the chest doesn't count as the set point.
    set_items = [(i, v) for i, v in elbow.items()
                 if set_lo <= i < release and frames[i][S["wrist"]].y < frames[i][S["shoulder"]].y]
    dip_items = [(i, v) for i, v in knee.items() if set_lo <= i <= release]
    rel_items = [(i, v) for i, v in elbow.items() if release - rel_w <= i <= release + rel_w]
    set_frame, set_point = min(set_items, key=lambda t: t[1]) if set_items else (None, None)
    dip_frame, knee_bend = min(dip_items, key=lambda t: t[1]) if dip_items else (None, None)
    release_elbow = max(v for _, v in rel_items) if rel_items else None

    # Release arm angle: is the arm pointing up at the rim, or pushing forward?
    import math
    fr = frames[release]
    dx = abs(fr[S["wrist"]].x - fr[S["shoulder"]].x)
    dy = fr[S["shoulder"]].y - fr[S["wrist"]].y  # positive when wrist is above shoulder
    release_arm = math.degrees(math.atan2(dy, dx)) if (dx or dy) else None

    follow = 0
    for i in valid:
        if i <= release:
            continue
        f = frames[i]
        if f[S["wrist"]].y < f[S["shoulder"]].y:
            follow += 1
        else:
            break

    values = {
        "knee_bend": knee_bend,
        "set_point_elbow": set_point,
        "release_elbow": release_elbow,
        "release_arm_angle": release_arm,
        "follow_through_s": round(follow / fps, 2),
    }

    metrics, feedback = [], []
    for name, value in values.items():
        lo, hi = TARGETS[name]
        ok = value is not None and lo <= value <= hi
        metrics.append({"name": name,
                        "value": round(value, 1) if value is not None else None,
                        "target": [lo, hi], "ok": ok})
        if value is None:
            if name == "set_point_elbow":
                feedback.append("No set point found: bring the ball up above your shoulder before you shoot, don't push it from your chest.")
            else:
                feedback.append(f"Couldn't measure {name.replace('_', ' ')}. Film from your shooting-hand side so that arm faces the camera.")
        elif not ok:
            feedback.append(_tip(name, value, lo, hi))

    score = sum(m["ok"] for m in metrics) / len(metrics)
    if not feedback:
        feedback.append("Clean shot: good dip, set point, extension and follow-through.")
    # A form test passes only if every check passes.
    return {"passed": all(m["ok"] for m in metrics), "score": round(score, 2),
            "metrics": metrics, "feedback": feedback,
            "debug": {"release_frame": release, "set_frame": set_frame, "dip_frame": dip_frame,
                      "follow_end_frame": release + follow,
                      "side": "left" if S is L else "right", "fps": round(fps)}}


def _tip(name, v, lo, hi):
    if name == "knee_bend":
        return ("Bend your knees more before you shoot. Your power comes from your legs."
                if v > hi else "You're sinking too low. A smaller dip keeps the shot quick.")
    if name == "set_point_elbow":
        return ("Your elbow is too open at the set point. Bring the ball back so your elbow is near 90°."
                if v > hi else "Your elbow is too tight at the set point. Let it open toward 90°.")
    if name == "release_arm_angle":
        return ("You're pushing the ball forward. Shoot up at the rim: your arm should finish pointing high."
                if v < lo else "Your arm is going straight up. Aim slightly forward toward the rim.")
    if name == "release_elbow":
        return "Fully extend your arm at release, reach up toward the rim."
    if name == "follow_through_s":
        return "Hold your follow-through: keep your wrist up after the ball leaves your hand."
    return f"{name}: {v:.0f} (target {lo}-{hi})"