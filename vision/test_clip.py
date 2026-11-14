"""Run the jump-shot analysis on a local clip: python test_clip.py clips/shot1.mov"""
import json
import sys
from pose import extract
import jump_shot

frames, fps = extract(sys.argv[1])
print(f"{len(frames)} frames at {fps:.0f} fps, pose found in {sum(f is not None for f in frames)}")
print(json.dumps(jump_shot.analyze(frames), indent=2))