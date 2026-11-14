"""Render an annotated replay of a jump shot.

python debug_video.py clips/shot1.mov [left|right|auto]
Writes clips/<name>_debug.mp4

What it draws:
- Full skeleton; the shooting side is bold, the other side faded
- Angle arcs at the elbow and knee, green when in range, red when not
- Wrist trail so you can see the shot path
- Phase label (DIP / SET / RELEASE / FOLLOW-THROUGH)
- Slow motion around release, then a freeze frame at each key moment
- Scorecard panel at the end
"""
import math
import os
import sys

import cv2

import jump_shot
from pose import extract

GREEN = (90, 220, 120)
RED = (80, 80, 240)
WHITE = (255, 255, 255)
GREY = (170, 170, 170)
ACCENT = (102, 124, 14)  # teal #0E7C66 in BGR
DARK = (20, 20, 20)
FONT = cv2.FONT_HERSHEY_DUPLEX

BONES = [(11, 12), (11, 23), (12, 24), (23, 24),
         (11, 13), (13, 15), (12, 14), (14, 16),
         (23, 25), (25, 27), (24, 26), (26, 28)]


def metric_ok(result):
    return {m["name"]: m["ok"] for m in result["metrics"]}, {m["name"]: m["value"] for m in result["metrics"]}


def text(img, s, org, scale, color=WHITE, thick=2, bg=True):
    (tw, th), base = cv2.getTextSize(s, FONT, scale, thick)
    x, y = org
    if bg:
        pad = int(10 * scale)
        overlay = img.copy()
        cv2.rectangle(overlay, (x - pad, y - th - pad), (x + tw + pad, y + base + pad), DARK, -1)
        cv2.addWeighted(overlay, 0.6, img, 0.4, 0, img)
    cv2.putText(img, s, (x, y), FONT, scale, color, thick, cv2.LINE_AA)


def draw_arc(img, a, b, c, value, ok, scale):
    """Arc at joint b between rays b->a and b->c, with the angle value."""
    r = int(45 * scale)
    ang_a = math.degrees(math.atan2(a[1] - b[1], a[0] - b[0]))
    ang_c = math.degrees(math.atan2(c[1] - b[1], c[0] - b[0]))
    start, end = ang_a, ang_c
    if (end - start) % 360 > 180:
        start, end = end, start
    if end < start:
        end += 360
    color = GREEN if ok else RED
    cv2.ellipse(img, b, (r, r), 0, start, end, color, max(2, int(4 * scale)), cv2.LINE_AA)
    mid = math.radians((start + end) / 2)
    tx = int(b[0] + (r + 25 * scale) * math.cos(mid))
    ty = int(b[1] + (r + 25 * scale) * math.sin(mid))
    text(img, f"{round(value)}", (tx - int(20 * scale), ty + int(10 * scale)), 0.9 * scale, color, max(1, int(2 * scale)))


def phase_at(i, dbg):
    rel, st, dip, fol = dbg["release_frame"], dbg.get("set_frame"), dbg.get("dip_frame"), dbg.get("follow_end_frame")
    if abs(i - rel) <= 2:
        return "RELEASE"
    if i > rel and fol and i <= fol:
        return "FOLLOW-THROUGH"
    if st is not None and abs(i - st) <= 2:
        return "SET POINT"
    if dip is not None and abs(i - dip) <= 2:
        return "DIP"
    return None


def render(path, frames, fps, result, out_path):
    S = jump_shot.L if result["debug"]["side"] == "left" else jump_shot.R
    O = jump_shot.R if S is jump_shot.L else jump_shot.L
    elbow, knee = jump_shot.joint_series(frames, S)
    oks, vals = metric_ok(result)
    dbg = result["debug"]
    release = dbg["release_frame"]

    cap = cv2.VideoCapture(path)
    w, h = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)), int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    aspect = w / h
    scale = max(0.6, min(w, h) / 1080 * 1.4)
    out = cv2.VideoWriter(out_path, cv2.VideoWriter_fourcc(*"mp4v"), fps, (w, h))

    side_ids = {v for v in S.values()}
    slow_lo, slow_hi = release - int(0.4 * fps), release + int(0.3 * fps)
    freeze = {f for f in (dbg.get("dip_frame"), dbg.get("set_frame"), release) if f is not None}
    trail = []
    last = None

    i = 0
    while True:
        ok, img = cap.read()
        if not ok:
            break
        f = frames[i] if i < len(frames) else None
        if f is not None:
            px = lambda idx: (int(f[idx].x / aspect * w), int(f[idx].y * h))

            # faded off-side + torso
            for a, b in BONES:
                if a in side_ids and b in side_ids:
                    continue
                cv2.line(img, px(a), px(b), GREY, max(2, int(3 * scale)), cv2.LINE_AA)

            # wrist trail
            trail.append(px(S["wrist"]))
            trail = trail[-int(0.6 * fps):]
            for k in range(1, len(trail)):
                alpha = k / len(trail)
                cv2.line(img, trail[k - 1], trail[k], ACCENT, max(1, int(6 * scale * alpha)), cv2.LINE_AA)

            # bold shooting side
            for a, b in [("shoulder", "elbow"), ("elbow", "wrist"), ("shoulder", "hip"), ("hip", "knee"), ("knee", "ankle")]:
                cv2.line(img, px(S[a]), px(S[b]), WHITE, max(3, int(7 * scale)), cv2.LINE_AA)
            for name in S:
                cv2.circle(img, px(S[name]), max(4, int(9 * scale)), ACCENT, -1, cv2.LINE_AA)
                cv2.circle(img, px(S[name]), max(4, int(9 * scale)), WHITE, max(1, int(2 * scale)), cv2.LINE_AA)

            # angle arcs; color by the metric that phase is judged on
            ph = phase_at(i, dbg)
            e, k = elbow.get(i), knee.get(i)
            # Live coloring: everything starts green and turns red at the moment
            # a check is judged and fails, then stays red.
            set_f, dip_f = dbg.get("set_frame"), dbg.get("dip_frame")
            elbow_ok = True
            if set_f is not None and i >= set_f and not oks["set_point_elbow"]:
                elbow_ok = False
            if i >= release - 2 and not (oks["set_point_elbow"] and oks["release_elbow"]
                                        and oks.get("release_arm_angle", True)):
                elbow_ok = False
            knee_judge = dip_f if dip_f is not None else release
            knee_ok = not (i >= knee_judge and not oks["knee_bend"])
            if e is not None:
                draw_arc(img, px(S["shoulder"]), px(S["elbow"]), px(S["wrist"]), e, elbow_ok, scale)
            if k is not None:
                draw_arc(img, px(S["hip"]), px(S["knee"]), px(S["ankle"]), k, knee_ok, scale)

            if ph:
                color = WHITE
                if ph == "SET POINT":
                    color = GREEN if oks["set_point_elbow"] else RED
                elif ph == "DIP":
                    color = GREEN if oks["knee_bend"] else RED
                elif ph == "RELEASE":
                    color = GREEN if oks["release_elbow"] else RED
                elif ph == "FOLLOW-THROUGH":
                    color = GREEN if oks["follow_through_s"] else RED
                text(img, ph, (int(40 * scale), int(130 * scale)), 1.5 * scale, color, max(2, int(3 * scale)))

        text(img, "BUCKETS  |  Jump shot", (int(40 * scale), int(50 * scale)), 0.8 * scale, WHITE, max(1, int(2 * scale)))

        out.write(img)
        if slow_lo <= i <= slow_hi:
            out.write(img)
            out.write(img)  # 3x slow-mo around release
        if i in freeze:
            for _ in range(int(0.8 * fps)):
                out.write(img)
        last = img
        i += 1
    cap.release()

    # scorecard
    if last is not None:
        card = last.copy()
        overlay = card.copy()
        cv2.rectangle(overlay, (0, 0), (w, h), DARK, -1)
        cv2.addWeighted(overlay, 0.75, card, 0.25, 0, card)
        y = int(h * 0.25)
        verdict = "PASSED" if result["passed"] else "KEEP WORKING"
        text(card, verdict, (int(60 * scale), y), 2.0 * scale, GREEN if result["passed"] else RED, max(2, int(4 * scale)), bg=False)
        y += int(90 * scale)
        labels = {"knee_bend": "Knee bend", "set_point_elbow": "Set point elbow",
                  "release_elbow": "Release extension", "release_arm_angle": "Release direction", "follow_through_s": "Follow-through"}
        for m in result["metrics"]:
            v = "-" if m["value"] is None else (f"{m['value']:.2f} s" if m["name"] == "follow_through_s" else f"{m['value']:.0f} deg")
            mark = "OK " if m["ok"] else "FIX"
            text(card, f"{mark}  {labels.get(m['name'], m['name'])}: {v}", (int(60 * scale), y),
                 1.0 * scale, GREEN if m["ok"] else RED, max(1, int(2 * scale)), bg=False)
            y += int(60 * scale)
        y += int(30 * scale)
        for tip in result["feedback"][:3]:
            for line in wrap(tip, 34):
                text(card, line, (int(60 * scale), y), 0.85 * scale, WHITE, max(1, int(2 * scale)), bg=False)
                y += int(45 * scale)
            y += int(15 * scale)
        for _ in range(int(3 * fps)):
            out.write(card)
    out.release()


def wrap(s, n):
    words, lines, cur = s.split(), [], ""
    for wd in words:
        if len(cur) + len(wd) + 1 > n:
            lines.append(cur)
            cur = wd
        else:
            cur = (cur + " " + wd).strip()
    if cur:
        lines.append(cur)
    return lines


if __name__ == "__main__":
    path = sys.argv[1]
    hand = sys.argv[2] if len(sys.argv) > 2 else "auto"
    frames, fps = extract(path)
    result = jump_shot.analyze(frames, fps=fps, hand=hand)
    out_path = os.path.splitext(path)[0] + "_debug.mp4"
    render(path, frames, fps, result, out_path)
    print(f"Wrote {out_path}")