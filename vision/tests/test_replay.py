"""Replay rendering and the /replays route (no MediaPipe: synthetic landmarks on a blank video)."""
import os

import cv2
import numpy as np
import pytest
from fastapi import HTTPException

import debug_video
import engine
import main
import synthetic
from synthetic import FPS


def blank_video(path, n, w=720, h=1280):
    out = cv2.VideoWriter(path, cv2.VideoWriter_fourcc(*"mp4v"), FPS, (w, h))
    for _ in range(n):
        out.write(np.zeros((h, w, 3), np.uint8))
    out.release()


@pytest.fixture
def graded_clip(tmp_path):
    frames = synthetic.jump_shot()
    src = str(tmp_path / "clip.mp4")
    blank_video(src, len(frames))
    spec = engine.load_spec("shoot_form")
    return src, frames, spec, engine.analyze(spec, frames, FPS)


def test_render_writes_playable_h264_at_processed_size(graded_clip, tmp_path):
    src, frames, spec, result = graded_clip
    out = str(tmp_path / "replay.mp4")
    codec = debug_video.render(src, frames, FPS, spec, result, "auto", out)
    cap = cv2.VideoCapture(out)
    assert cap.isOpened()
    w, h = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH)), int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    assert (w, h) == (540, 960)  # 720x1280 scaled to 960 px on the long side
    assert cap.get(cv2.CAP_PROP_FRAME_COUNT) > len(frames)  # slow-mo, freezes, scorecard
    assert codec in ("avc1", "mp4v")


def test_output_size_is_even_and_capped():
    assert debug_video.output_size(2160, 3840) == (540, 960)
    assert debug_video.output_size(721, 1281) == (540, 960)
    assert debug_video.output_size(480, 640) == (480, 640)  # never upscaled


def test_make_replay_saves_under_attempt_id(graded_clip, tmp_path, monkeypatch):
    src, frames, spec, result = graded_clip
    monkeypatch.setattr(main, "REPLAY_DIR", str(tmp_path / "replays"))
    url = main.make_replay(src, frames, FPS, spec, result, "auto", "ab" * 16)
    assert url == f"/replays/{'ab' * 16}.mp4"
    assert os.path.exists(tmp_path / "replays" / f"{'ab' * 16}.mp4")
    assert main.replay("ab" * 16).path.endswith(f"{'ab' * 16}.mp4")


def test_failed_render_keeps_the_grade(graded_clip, tmp_path, monkeypatch):
    src, frames, spec, result = graded_clip
    monkeypatch.setattr(main, "REPLAY_DIR", str(tmp_path / "replays"))

    def boom(*args, **kwargs):
        raise RuntimeError("no encoder")

    monkeypatch.setattr(debug_video, "render", boom)
    assert main.make_replay(src, frames, FPS, spec, result, "auto", "cd" * 16) is None
    assert "no encoder" in result["debug"]["replay_error"]


@pytest.mark.parametrize("bad", ["../main", "ABCDEF", "0" * 31, "0" * 32 + "x"])
def test_replay_route_rejects_bad_ids(bad):
    with pytest.raises(HTTPException) as e:
        main.replay(bad)
    assert e.value.status_code == 404
