"""Grade a local clip with a spec and print the result.

python test_clip.py clips/shot.mov [--spec shoot_form] [left|right] [--csv]
--csv also prints per-frame angles, wrist height, conditions and visibility.
"""
import argparse
import json

import engine
from pose import extract


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("path")
    ap.add_argument("hand", nargs="?", default="auto", choices=["auto", "left", "right"])
    ap.add_argument("--spec", default="shoot_form")
    ap.add_argument("--csv", action="store_true")
    args = ap.parse_args()

    spec = engine.load_spec(args.spec)
    frames, fps = extract(args.path)
    print(f"{len(frames)} frames at {fps:.0f} fps, pose found in {sum(f is not None for f in frames)}")
    result = engine.analyze(spec, frames, fps=fps, hand=args.hand)
    print(json.dumps(result, indent=2))

    if args.csv:
        clip = engine.Clip(frames, fps, args.hand)
        S, elbow, knee, ground = clip.S, clip.joint("elbow"), clip.joint("knee"), clip.ground()
        print("frame,time_s,elbow,knee,wrist_y,above_shoulder,above_nose,on_ground,wrist_vis,elbow_vis")
        for i, f in enumerate(frames):
            if f is None:
                continue
            e, k = elbow.get(i), knee.get(i)
            print(f"{i},{i / fps:.2f},{'' if e is None else round(e)},{'' if k is None else round(k)},"
                  f"{f[S['wrist']].y:.3f},{int(clip.condition('wrist_above_shoulder', i))},"
                  f"{int(clip.condition('wrist_above_nose', i))},{'' if ground.get(i) is None else int(ground[i])},"
                  f"{f[S['wrist']].visibility:.2f},{f[S['elbow']].visibility:.2f}")


if __name__ == "__main__":
    main()
