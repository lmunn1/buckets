"""Jump shot analysis from pose landmarks. Side view, whole body in frame.

Target ranges are rough starting points: calibrate them on real clips.
"""
from pose import L, R, angle

TARGETS = {
    "knee_bend": (90, 140),        # min knee angle during the dip (lower = deeper bend)
    "set_point_elbow": (70, 110),  # elbow angle when the ball is set, before the push
    "release_elbow": (155, 180),   # arm extension at release
    "follow_through_frames": (3, 999),  # frames the wrist stays above the shoulder after release
}


def _shooting_side(frames):
    """Pick the arm whose wrist gets highest (smallest y)."""
    best = {"L": 1.0, "R": 1.0}
    for f in frames:
        if f is None:
            continue
        best["L"] = min(best["L"], f[L["wrist"]].y)
        best["R"] = min(best["R"], f[R["wrist"]].y)
    return L if best["L"] < best["R"] else R


def analyze(frames):
    valid = [i for i, f in enumerate(frames) if f is not None]
    if len(valid) < 10:
        return {"passed": False, "score": 0.0, "metrics": [],
                "feedback": ["Couldn't see your body clearly. Film from the side with your whole body in frame."]}

    S = _shooting_side(frames)

    # Release = frame where the shooting wrist is highest
    release = min(valid, key=lambda i: frames[i][S["wrist"]].y)
    before = [i for i in valid if i <= release]
    after = [i for i in valid if i > release]

    def elbow(i):
        f = frames[i]
        return angle(f[S["shoulder"]], f[S["elbow"]], f[S["wrist"]])

    def knee(i):
        f = frames[i]
        return angle(f[S["hip"]], f[S["knee"]], f[S["ankle"]])

    knee_angles = [k for k in (knee(i) for i in before) if k is not None]
    elbow_before = [(i, e) for i, e in ((i, elbow(i)) for i in before) if e is not None]

    knee_bend = min(knee_angles) if knee_angles else None
    set_point = min(e for _, e in elbow_before) if elbow_before else None
    release_elbow = elbow(release)

    follow = 0
    for i in after:
        f = frames[i]
        if f[S["wrist"]].y < f[S["shoulder"]].y:
            follow += 1
        else:
            break

    values = {
        "knee_bend": knee_bend,
        "set_point_elbow": set_point,
        "release_elbow": release_elbow,
        "follow_through_frames": follow,
    }

    metrics, feedback = [], []
    for name, value in values.items():
        lo, hi = TARGETS[name]
        ok = value is not None and lo <= value <= hi
        metrics.append({"name": name,
                        "value": round(value, 1) if value is not None else None,
                        "target": [lo, hi], "ok": ok})
        if value is None:
            feedback.append(f"Couldn't measure {name.replace('_', ' ')}.")
        elif not ok:
            feedback.append(_tip(name, value, lo, hi))

    score = sum(m["ok"] for m in metrics) / len(metrics)
    if not feedback:
        feedback.append("Clean shot: good dip, set point, extension and follow-through.")
    return {"passed": score >= 0.75, "score": round(score, 2),
            "metrics": metrics, "feedback": feedback}


def _tip(name, v, lo, hi):
    if name == "knee_bend":
        return ("Bend your knees more before you shoot. Your power comes from your legs."
                if v > hi else "You're sinking too low. A smaller dip keeps the shot quick.")
    if name == "set_point_elbow":
        return ("Your elbow is too open at the set point. Bring the ball back so your elbow is near 90°."
                if v > hi else "Your elbow is too tight at the set point. Let it open toward 90°.")
    if name == "release_elbow":
        return "Fully extend your arm at release, reach up toward the rim."
    if name == "follow_through_frames":
        return "Hold your follow-through: keep your wrist up after the ball leaves your hand."
    return f"{name}: {v:.0f} (target {lo}-{hi})"