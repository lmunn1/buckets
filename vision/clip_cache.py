"""Cache pose landmarks per clip so repeated test runs skip MediaPipe.

Cache files live in clips/.cache/ (gitignored with clips/). A cache entry is
rebuilt when the clip is newer than it.
"""
import glob
import os
import pickle

from pose import extract

HERE = os.path.dirname(os.path.abspath(__file__))
CLIPS = os.path.join(HERE, "clips")


def clip_paths():
    """Every source clip in clips/ (not the rendered *_debug.mp4 replays)."""
    paths = []
    for ext in ("mov", "mp4", "MOV", "MP4"):
        paths += glob.glob(os.path.join(CLIPS, f"*.{ext}"))
    return sorted(p for p in set(paths) if not p.endswith("_debug.mp4"))


def load(path):
    """(frames, fps) for a clip, from the cache when it's fresh."""
    cache_dir = os.path.join(os.path.dirname(os.path.abspath(path)), ".cache")
    cache = os.path.join(cache_dir, os.path.basename(path) + ".pkl")
    if os.path.exists(cache) and os.path.getmtime(cache) >= os.path.getmtime(path):
        with open(cache, "rb") as f:
            return pickle.load(f)
    frames, fps = extract(path)
    os.makedirs(cache_dir, exist_ok=True)
    with open(cache, "wb") as f:
        pickle.dump((frames, fps), f)
    return frames, fps
