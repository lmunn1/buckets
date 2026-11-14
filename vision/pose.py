"""Extract per-frame body landmarks from a video with MediaPipe Pose Landmarker."""
import math
from types import SimpleNamespace
import cv2
import mediapipe as mp
from mediapipe.tasks import python as mp_python
from mediapipe.tasks.python import vision as mp_vision

MODEL_PATH = "models/pose_landmarker_full.task"
MAX_SIDE = 960  # px; frames are downscaled to this before MediaPipe

# MediaPipe landmark indices
L = {"nose": 0, "shoulder": 11, "elbow": 13, "wrist": 15, "hip": 23, "knee": 25, "ankle": 27}
R = {"nose": 0, "shoulder": 12, "elbow": 14, "wrist": 16, "hip": 24, "knee": 26, "ankle": 28}


def downscale(frame, max_side=MAX_SIDE):
    """Shrink so the longer side is at most max_side px. Phone video is often 4K,
    which makes MediaPipe slow without helping accuracy. Keeps the aspect ratio,
    so the x scaling in extract() stays correct."""
    h, w = frame.shape[:2]
    s = max_side / max(h, w)
    if s >= 1:
        return frame
    return cv2.resize(frame, (round(w * s), round(h * s)), interpolation=cv2.INTER_AREA)


def extract(video_path, model_path=MODEL_PATH):
    """Returns (frames, fps). frames[i] is a list of 33 landmarks or None."""
    opts = mp_vision.PoseLandmarkerOptions(
        base_options=mp_python.BaseOptions(model_asset_path=model_path),
        running_mode=mp_vision.RunningMode.VIDEO,
    )
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        raise ValueError(f"Could not open video: {video_path}")
    fps = cap.get(cv2.CAP_PROP_FPS) or 30
    frames, i = [], 0
    with mp_vision.PoseLandmarker.create_from_options(opts) as lm:
        while True:
            ok, frame = cap.read()
            if not ok:
                break
            frame = downscale(frame)
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            img = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
            res = lm.detect_for_video(img, int(i * 1000 / fps))
            if res.pose_landmarks:
                # Landmarks are normalized separately by width and height, which
                # distorts angles on non-square video. Scale x by the aspect ratio
                # so x and y use the same unit (y stays 0-1).
                h, w = frame.shape[:2]
                aspect = w / h
                frames.append([SimpleNamespace(x=p.x * aspect, y=p.y,
                                               visibility=getattr(p, "visibility", None))
                               for p in res.pose_landmarks[0]])
            else:
                frames.append(None)
            i += 1
    cap.release()
    return frames, fps


def angle(a, b, c):
    """Angle ABC in degrees, from three landmarks (uses x, y only)."""
    ab = (a.x - b.x, a.y - b.y)
    cb = (c.x - b.x, c.y - b.y)
    dot = ab[0] * cb[0] + ab[1] * cb[1]
    mag = math.hypot(*ab) * math.hypot(*cb)
    if mag == 0:
        return None
    return math.degrees(math.acos(max(-1.0, min(1.0, dot / mag))))