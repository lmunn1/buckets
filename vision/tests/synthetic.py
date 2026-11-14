"""Build synthetic MediaPipe-style landmark sequences for tests (no video needed).

The right side faces the camera (visibility 0.99), the left side is hidden
(0.3), so side selection picks the right arm. Forward is +x, up is -y.
"""
import math
from types import SimpleNamespace

FPS = 30
UPPER_ARM = 0.13
FOREARM = 0.13
SHIN = 0.2  # hip->knee and knee->ankle (vertical half-lengths)


def _pt(x, y, vis=0.99):
    return SimpleNamespace(x=x, y=y, visibility=vis)


def frame(knee_deg=175, upper_deg=-60, fore_deg=60, lift=0.0):
    """One frame of 33 landmarks.

    knee_deg: knee angle (180 = straight leg).
    upper_deg / fore_deg: direction of the upper arm and forearm in degrees above
        horizontal (0 = pointing forward, 90 = straight up).
    lift: how far the whole body is raised (jumping), in normalized units.
    """
    ankle = (0.5, 0.95 - lift)
    # Push the knee forward so hip-knee-ankle makes the requested angle.
    d = SHIN * math.tan(math.radians((180 - knee_deg) / 2))
    knee = (0.5 + d, ankle[1] - SHIN)
    hip = (0.5, ankle[1] - 2 * SHIN)
    shoulder = (0.5, hip[1] - 0.25)
    nose = (0.52, shoulder[1] - 0.1)
    elbow = (shoulder[0] + UPPER_ARM * math.cos(math.radians(upper_deg)),
             shoulder[1] - UPPER_ARM * math.sin(math.radians(upper_deg)))
    wrist = (elbow[0] + FOREARM * math.cos(math.radians(fore_deg)),
             elbow[1] - FOREARM * math.sin(math.radians(fore_deg)))

    lm = [_pt(0.5, 0.5, 0.3) for _ in range(33)]
    lm[0] = _pt(*nose)
    right = {12: shoulder, 14: elbow, 16: wrist, 24: hip, 26: knee, 28: ankle}
    for idx, p in right.items():
        lm[idx] = _pt(*p)
    # Hidden left side: same body, low visibility. Ankle stays visible for ground detection.
    left = {11: shoulder, 13: shoulder, 15: shoulder, 23: hip, 25: knee}
    for idx, p in left.items():
        lm[idx] = _pt(p[0] - 0.02, p[1], 0.3)
    lm[27] = _pt(ankle[0] - 0.02, ankle[1])
    return lm


def lerp(a, b, t):
    return a + (b - a) * t


def jump_shot(push=False):
    """60 frames at 30 fps, release at frame 30.

    Clean: dip with knees at 120, set point with the elbow at 90 above the
    shoulder, jump, release with the arm up, hold 0.5 s.
    push=True: the ball never goes above the shoulder and the arm finishes forward.
    """
    frames = []
    for i in range(60):
        lift = max(0.0, 0.05 * (1 - ((i - 30) / 5) ** 2))
        if i < 15:
            knee, up, fore = 175, -60, 60          # holding the ball at the chest
        elif i < 25:
            knee = 120                             # dip
            up, fore = (-60, 60) if push else (30, 120)   # set point (elbow 90)
        elif i <= 30:
            t = (i - 24) / 6
            knee = lerp(120, 170, t)
            if push:
                up, fore = lerp(-60, 20, t), lerp(60, 25, t)
            else:
                up, fore = lerp(30, 70, t), lerp(120, 72, t)
        elif i <= 45:
            knee = 170
            up, fore = (20, 25) if push else (70, 72)     # follow-through
        else:
            knee, up, fore = 175, -60, 60
        frames.append(frame(knee, up, fore, lift))
    return frames


def shot_fake(jump=False):
    """60 frames at 30 fps. Knees at 130, ball up above the head for 0.5 s (frames 20-34).

    jump=True: the player leaves the floor during the fake.
    """
    frames = []
    for i in range(60):
        up_now = 20 <= i <= 34
        lift = 0.08 if (jump and 22 <= i <= 32) else 0.0
        up, fore = (60, 100) if up_now else (-60, 60)
        frames.append(frame(130, up, fore, lift))
    return frames
