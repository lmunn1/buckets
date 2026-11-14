import copy

import pytest

import engine
import synthetic
from synthetic import FPS


@pytest.fixture(scope="module")
def shoot_form():
    return engine.load_spec("shoot_form")


@pytest.fixture(scope="module")
def shot_fake():
    return engine.load_spec("shot_fake")


def metrics(result):
    return {m["name"]: m for m in result["metrics"]}


# --- shoot_form ----------------------------------------------------------

def test_clean_shot_passes(shoot_form):
    r = engine.analyze(shoot_form, synthetic.jump_shot(), FPS)
    m = metrics(r)
    assert r["passed"], r["feedback"]
    assert r["debug"]["side"] == "right"
    assert r["debug"]["release_frame"] == 30
    assert m["knee_bend"]["value"] == pytest.approx(120, abs=1)
    assert m["set_point_elbow"]["value"] == pytest.approx(90, abs=1)
    assert m["release_arm_angle"]["value"] > 55
    assert m["follow_through_s"]["value"] >= 0.3
    assert r["feedback"] == [shoot_form["success"]]


def test_push_shot_fails_release_direction(shoot_form):
    r = engine.analyze(shoot_form, synthetic.jump_shot(push=True), FPS)
    m = metrics(r)
    assert not r["passed"]
    assert not m["release_arm_angle"]["ok"]
    assert m["release_arm_angle"]["value"] < 55
    assert any("pushing the ball forward" in f for f in r["feedback"])


def test_response_format(shoot_form):
    r = engine.analyze(shoot_form, synthetic.jump_shot(), FPS)
    assert set(r) == {"passed", "score", "metrics", "feedback", "debug"}
    for m in r["metrics"]:
        assert set(m) == {"name", "label", "value", "unit", "target", "ok"}
    for key in ("release_frame", "set_frame", "dip_frame", "follow_end_frame", "side", "fps",
                "moments", "picked_frames"):
        assert key in r["debug"]


def test_too_few_frames_still_has_debug(shoot_form):
    r = engine.analyze(shoot_form, synthetic.jump_shot()[:5], FPS)
    assert not r["passed"] and r["metrics"] == []
    assert r["debug"]["side"] in ("left", "right")


# --- shot_fake -----------------------------------------------------------

def test_good_fake_passes(shot_fake):
    r = engine.analyze(shot_fake, synthetic.shot_fake(), FPS)
    m = metrics(r)
    assert r["passed"], r["feedback"]
    assert m["air_time_s"]["value"] == 0
    assert m["knee_at_top"]["value"] == pytest.approx(130, abs=1)
    assert m["fake_length_s"]["value"] == pytest.approx(0.5, abs=0.04)


def test_jumping_on_the_fake_fails_air_time(shot_fake):
    r = engine.analyze(shot_fake, synthetic.shot_fake(jump=True), FPS)
    m = metrics(r)
    assert not m["air_time_s"]["ok"]
    assert m["air_time_s"]["value"] > 0.3
    assert "You left your feet. A fake only works if you stay grounded." in r["feedback"]


def test_real_jump_shot_fails_fake_air_time(shot_fake):
    r = engine.analyze(shot_fake, synthetic.jump_shot(), FPS)
    assert not metrics(r)["air_time_s"]["ok"]


# --- invalid specs -------------------------------------------------------

def base_spec():
    return {"name": "t", "moments": [{"name": "top", "type": "highest", "point": "wrist"}],
            "rules": [{"name": "r", "target": [0, 1],
                       "measure": {"type": "happened", "moment": "top"}}]}


@pytest.mark.parametrize("change, message", [
    (lambda s: s["rules"][0]["measure"].update(type="speed"), "unknown measurement 'speed'"),
    (lambda s: s["rules"][0]["measure"].update(moment="release"), "must name a moment defined above"),
    (lambda s: s["rules"][0].pop("target"), "'target' must be [lo, hi]"),
    (lambda s: s["rules"][0].update(target=[5, 1]), "lo <= hi"),
    (lambda s: s["moments"][0].update(type="fastest"), "unknown type 'fastest'"),
    (lambda s: s["moments"][0].update(point="elbowz"), "'point' must be one of"),
    (lambda s: s.update(rules=[]), "non-empty 'rules'"),
    (lambda s: s["rules"][0].update(measure={"type": "joint_angle", "joint": "hip", "pick": "min", "window": "all"}),
     "'joint' must be one of"),
    (lambda s: s["rules"][0].update(measure={"type": "duration", "condition": "ball_in_hand", "from": "top"}),
     "condition must be one of"),
    (lambda s: s["rules"][0].update(feedback={"fial": "typo"}), "unknown feedback keys"),
])
def test_invalid_spec_has_clear_error(change, message):
    spec = copy.deepcopy(base_spec())
    change(spec)
    with pytest.raises(engine.SpecError) as e:
        engine.validate(spec)
    assert message in str(e.value)
    assert str(e.value).startswith("t:")


def test_missing_spec_file():
    with pytest.raises(engine.SpecError, match="No spec named 'nope'"):
        engine.load_spec("nope")


def test_all_shipped_specs_are_valid():
    for name in engine.spec_names():
        engine.load_spec(name)
