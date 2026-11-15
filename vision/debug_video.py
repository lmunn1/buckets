"""Render an annotated replay of a clip graded with any spec.

python debug_video.py clips/shot.mov [--spec shoot_form] [left|right]
Writes clips/<name>_<spec>_debug.mp4

What it draws:
- Full skeleton; the shooting side is bold, the other side faded
- Wrist trail so you can see the path of the ball
- Angle arcs at the joints the spec measures (elbow and/or knee). They start
  green and turn red from the frame where a failed rule was judged, then stay red
- A label at each rule's judged frame (green = passed, red = failed) and at each moment
- Slow motion around the spec's first moment, a freeze at each judged frame
- Scorecard at the end

Output is H.264 (playable on iPhones) at the resolution the grader used
(pose.MAX_SIDE on the long side), with the index moved to the front of the
file (faststart) when ffmpeg is installed so phones can stream it.
"""
import argparse
import math
import os
import shutil
import subprocess

import cv2

import engine
from pose import MAX_SIDE, extract

GREEN = (90, 220, 120)
RED = (80, 80, 240)
WHITE = (255, 255, 255)
GREY = (170, 170, 170)
ACCENT = (102, 124, 14)  # teal #0E7C66 in BGR
DARK = (20, 20, 20)
FONT = cv2.FONT_HERSHEY_DUPLEX
LABEL_FRAMES = 2  # show a label this many frames either side of its frame

BONES = [(11, 12), (11, 23), (12, 24), (23, 24),
         (11, 13), (13, 15), (12, 14), (14, 16),
         (23, 25), (25, 27), (24, 26), (26, 28)]
BOLD = [("shoulder", "elbow"), ("elbow", "wrist"), ("shoulder", "hip"), ("hip", "knee"), ("knee", "ankle")]
ARC_JOINTS = {"elbow": ("shoulder", "elbow", "wrist"), "knee": ("hip", "knee", "ankle")}


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
    start = math.degrees(math.atan2(a[1] - b[1], a[0] - b[0]))
    end = math.degrees(math.atan2(c[1] - b[1], c[0] - b[0]))
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


def arc_rules(spec):
    """joint -> rules drawn on that joint's arc. arm_direction is shown on the elbow."""
    out = {"elbow": [], "knee": []}
    for r in spec["rules"]:
        m = r["measure"]
        if m["type"] == "joint_angle":
            out[m["joint"]].append(r["name"])
        elif m["type"] == "arm_direction":
            out["elbow"].append(r["name"])
    return {j: names for j, names in out.items() if names}


def red_from(result, rule_names, fallback):
    """First frame from which the arc is red: the earliest judged frame of a failed rule."""
    ok = {m["name"]: m["ok"] for m in result["metrics"]}
    picked = result["debug"].get("picked_frames", {})
    frames = [picked.get(n) if picked.get(n) is not None else fallback
              for n in rule_names if not ok.get(n, True)]
    frames = [f for f in frames if f is not None]
    return min(frames) if frames else None


def labels_at(i, result):
    """(text, color) labels to show on frame i."""
    out = []
    for name, f in result["debug"].get("moments", {}).items():
        if f is not None and abs(i - f) <= LABEL_FRAMES:
            out.append((name.replace("_", " ").upper(), WHITE))
    picked = result["debug"].get("picked_frames", {})
    for m in result["metrics"]:
        f = picked.get(m["name"])
        if f is not None and abs(i - f) <= LABEL_FRAMES:
            out.append((m["label"].upper(), GREEN if m["ok"] else RED))
    return out


def format_value(m):
    if m["value"] is None:
        return "-"
    if m["unit"] == "s":
        return f"{m['value']:.2f} s"
    if m["unit"] == "bool":
        return "yes" if m["value"] else "no"
    return f"{m['value']:.0f} deg"


def render(path, frames, fps, spec, result, hand, out_path):
    clip = engine.Clip(frames, fps, hand)
    S = clip.S
    dbg = result["debug"]
    moments = dbg.get("moments", {})
    main_moment = next((f for f in moments.values() if f is not None), None)
    arcs = {j: (clip.joint(j), red_from(result, names, main_moment)) for j, names in arc_rules(spec).items()}
    freeze = {f for f in dbg.get("picked_frames", {}).values() if f is not None}
    if main_moment is not None:
        freeze.add(main_moment)
        slow_lo, slow_hi = main_moment - int(0.4 * fps), main_moment + int(0.3 * fps)
    else:
        slow_lo = slow_hi = -1

    cap = cv2.VideoCapture(path)
    w, h = output_size(int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)), int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT)))
    aspect = w / h
    scale = max(0.6, min(w, h) / 1080 * 1.4)
    out, codec = open_writer(out_path, fps, (w, h))
    side_ids = {S[k] for k in ("shoulder", "elbow", "wrist", "hip", "knee", "ankle")}
    trail, last, i = [], None, 0

    while True:
        ok, img = cap.read()
        if not ok:
            break
        if img.shape[1] != w or img.shape[0] != h:
            img = cv2.resize(img, (w, h), interpolation=cv2.INTER_AREA)
        # Only usable frames get a skeleton: excluded ones (walking in/out) show bare video.
        f = clip.frames[i] if i < len(clip.frames) else None
        if f is not None:
            px = lambda idx: (int(f[idx].x / aspect * w), int(f[idx].y * h))
            for a, b in BONES:  # faded off-side and torso
                if not (a in side_ids and b in side_ids):
                    cv2.line(img, px(a), px(b), GREY, max(2, int(3 * scale)), cv2.LINE_AA)
            trail.append(px(S["wrist"]))
            trail = trail[-int(0.6 * fps):]
            for k in range(1, len(trail)):
                cv2.line(img, trail[k - 1], trail[k], ACCENT, max(1, int(6 * scale * k / len(trail))), cv2.LINE_AA)
            for a, b in BOLD:
                cv2.line(img, px(S[a]), px(S[b]), WHITE, max(3, int(7 * scale)), cv2.LINE_AA)
            for k in ("shoulder", "elbow", "wrist", "hip", "knee", "ankle"):
                cv2.circle(img, px(S[k]), max(4, int(9 * scale)), ACCENT, -1, cv2.LINE_AA)
                cv2.circle(img, px(S[k]), max(4, int(9 * scale)), WHITE, max(1, int(2 * scale)), cv2.LINE_AA)
            for joint, (series, red) in arcs.items():
                v = series.get(i)
                if v is not None:
                    a, b, c = ARC_JOINTS[joint]
                    draw_arc(img, px(S[a]), px(S[b]), px(S[c]), v, red is None or i < red, scale)
            y = int(130 * scale)
            for label, color in labels_at(i, result):
                text(img, label, (int(40 * scale), y), 1.2 * scale, color, max(2, int(3 * scale)))
                y += int(60 * scale)

        text(img, f"BUCKETS  |  {spec.get('title', spec['name'])}", (int(40 * scale), int(50 * scale)),
             0.8 * scale, WHITE, max(1, int(2 * scale)))
        out.write(img)
        if slow_lo <= i <= slow_hi:
            out.write(img)
            out.write(img)  # 3x slow-mo around the main moment
        if i in freeze:
            for _ in range(int(0.8 * fps)):
                out.write(img)
        last = img
        i += 1
    cap.release()

    if last is not None:
        write_scorecard(out, last, w, h, scale, fps, result)
    out.release()
    faststart(out_path)
    return codec


def output_size(w, h, max_side=MAX_SIDE):
    """Same scale as pose.downscale, rounded down to even numbers (H.264 needs them)."""
    s = min(1.0, max_side / max(w, h))
    return int(w * s) // 2 * 2, int(h * s) // 2 * 2


def open_writer(out_path, fps, size):
    """H.264 (avc1) when this OpenCV build supports it, else MPEG-4 (not playable on iPhones)."""
    for code in ("avc1", "mp4v"):
        out = cv2.VideoWriter(out_path, cv2.VideoWriter_fourcc(*code), fps, size)
        if out.isOpened():
            return out, code
        out.release()
    raise RuntimeError(f"Could not open a video writer for {out_path}")


def faststart(path):
    """Move the MP4 index to the front so players can start before the download ends.
    Needs ffmpeg; without it the file is left as is (it still plays once downloaded)."""
    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        return
    tmp = path + ".faststart.mp4"
    done = subprocess.run([ffmpeg, "-loglevel", "error", "-y", "-i", path, "-c", "copy",
                           "-movflags", "+faststart", tmp], capture_output=True)
    if done.returncode == 0:
        os.replace(tmp, path)
    elif os.path.exists(tmp):
        os.remove(tmp)


def write_scorecard(out, last, w, h, scale, fps, result):
    card = last.copy()
    overlay = card.copy()
    cv2.rectangle(overlay, (0, 0), (w, h), DARK, -1)
    cv2.addWeighted(overlay, 0.75, card, 0.25, 0, card)
    y = int(h * 0.25)
    verdict = "PASSED" if result["passed"] else "KEEP WORKING"
    text(card, verdict, (int(60 * scale), y), 2.0 * scale, GREEN if result["passed"] else RED, max(2, int(4 * scale)), bg=False)
    y += int(90 * scale)
    for m in result["metrics"]:
        mark = "OK " if m["ok"] else "FIX"
        text(card, f"{mark}  {m['label']}: {format_value(m)}", (int(60 * scale), y),
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


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("path")
    ap.add_argument("hand", nargs="?", default="auto", choices=["auto", "left", "right"])
    ap.add_argument("--spec", default="shoot_form")
    args = ap.parse_args()
    spec = engine.load_spec(args.spec)
    frames, fps = extract(args.path)
    result = engine.analyze(spec, frames, fps=fps, hand=args.hand)
    out_path = f"{os.path.splitext(args.path)[0]}_{args.spec}_debug.mp4"
    codec = render(args.path, frames, fps, spec, result, args.hand, out_path)
    print(f"Wrote {out_path} ({codec})")


if __name__ == "__main__":
    main()
