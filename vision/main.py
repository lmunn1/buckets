"""Vision server: grades skill-test videos with the specs in vision/specs/.

Run from vision/:  uvicorn main:app --host 0.0.0.0 --port 8000
"""
import json
import os
import tempfile
import uuid
from datetime import datetime, timezone

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

import engine
from pose import extract

HERE = os.path.dirname(os.path.abspath(__file__))
SKILLS_PATH = os.path.join(HERE, "..", "app", "data", "skills.json")
ALIASES_PATH = os.path.join(HERE, "skill_ids.json")
MODEL_PATH = os.path.join(HERE, "models", "pose_landmarker_full.task")
SPEC_ALIASES = {"jump_shot": "shoot_form"}
NO_CHECK = "No vision check for this skill yet."

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


# --- small JSON files, reloaded when they change on disk -----------------

_files = {}


def read_json(path, default):
    """Parsed JSON, re-read only when the file's modification time changes."""
    try:
        mtime = os.path.getmtime(path)
    except OSError:
        return default
    cached = _files.get(path)
    if cached and cached[0] == mtime:
        return cached[1]
    with open(path) as f:
        data = json.load(f)
    _files[path] = (mtime, data)
    return data


def skills_by_id():
    return {s["id"]: s for s in read_json(SKILLS_PATH, [])}


_specs = {}


def get_spec(name):
    """Loaded spec, cached until its file changes."""
    path = os.path.join(engine.SPEC_DIR, f"{name}.json")
    mtime = os.path.getmtime(path)
    if name not in _specs or _specs[name][0] != mtime:
        _specs[name] = (mtime, engine.load_spec(name))
    return _specs[name][1]


def resolve(skill_id):
    """skill_id -> (spec name or None, skill dict or None).

    skill_id can be an app id ("sh-beef", via skill_ids.json), a skills.json id
    ("shoot_beef_form"), or a spec name ("shoot_form", or the alias "jump_shot").
    """
    sid = read_json(ALIASES_PATH, {}).get(skill_id, skill_id)
    skill = skills_by_id().get(sid)
    if skill is not None:
        completion = skill.get("completion") or {}
        if completion.get("type") != "vision":
            return None, skill
        spec = completion.get("spec")
    else:
        spec = skill_id
    spec = SPEC_ALIASES.get(spec, spec)
    if spec and spec in engine.spec_names():
        return spec, skill
    return None, skill


# --- routes ---------------------------------------------------------------

@app.get("/health")
def health():
    return {"ok": True}


@app.get("/specs")
def specs():
    return engine.spec_names()


@app.get("/skills")
def gradable_skills():
    """App skill ids that can be graded right now, with what the app needs to show."""
    out = {}
    for app_id in read_json(ALIASES_PATH, {}):
        spec, skill = resolve(app_id)
        if spec:
            c = skill.get("completion") or {}
            out[app_id] = {"spec": spec, "name": skill.get("name"), "setup": skill.get("setup"),
                           "criteria": c.get("criteria"), "mistakes": c.get("mistakes") or []}
    return out


@app.post("/analyze")
def analyze(video: UploadFile = File(...), skill_id: str = Form(...), hand: str = Form("auto")):
    # Plain def: FastAPI runs it in a worker thread, so MediaPipe doesn't block the server.
    if hand not in ("auto", "left", "right"):
        raise HTTPException(400, f"hand must be auto, left or right (got {hand!r})")
    meta = {"skill_id": skill_id, "attempt_id": uuid.uuid4().hex,
            "analyzed_at": datetime.now(timezone.utc).isoformat(timespec="seconds")}
    spec_name, _ = resolve(skill_id)
    if spec_name is None:
        return {"graded": False, "spec": None, "passed": False, "score": 0.0,
                "metrics": [], "feedback": [NO_CHECK], "debug": {}, **meta}
    try:
        spec = get_spec(spec_name)
    except engine.SpecError as e:
        raise HTTPException(500, f"Spec error: {e}")

    suffix = os.path.splitext(video.filename or "")[1] or ".mov"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(video.file.read())
        path = tmp.name
    try:
        try:
            frames, fps = extract(path, model_path=MODEL_PATH)
        except ValueError as e:
            raise HTTPException(400, f"Couldn't read the video: {e}")
        result = engine.analyze(spec, frames, fps=fps, hand=hand)
    finally:
        os.remove(path)
    return {"graded": True, "spec": spec_name, **result, **meta}
