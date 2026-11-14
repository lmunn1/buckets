"""Run the jump-shot analysis on a local clip.

python test_clip.py clips/shot1.mov [left|right|auto] [--csv]
--csv also prints per-frame elbow/knee angles so you can see what's going on.
"""
import json
import sys
from pose import extract
import jump_shot

path = sys.argv[1]
hand = next((a for a in sys.argv[2:] if a in ("left", "right", "auto")), "auto")

frames, fps = extract(path)
print(f"{len(frames)} frames at {fps:.0f} fps, pose found in {sum(f is not None for f in frames)}")
result = jump_shot.analyze(frames, fps=fps, hand=hand)
print(json.dumps(result, indent=2))

if "--csv" in sys.argv:
    S = jump_shot.L if result["debug"]["side"] == "left" else jump_shot.R
    elbow, knee = jump_shot.joint_series(frames, S)
    print("frame,time_s,elbow,knee,wrist_y,wrist_vis,elbow_vis")
    for i, f in enumerate(frames):
        if f is None:
            continue
        e, k = elbow.get(i), knee.get(i)
        print(f"{i},{i/fps:.2f},{'' if e is None else round(e)},{'' if k is None else round(k)},{f[S['wrist']].y:.3f},{f[S['wrist']].visibility},{f[S['elbow']].visibility}")