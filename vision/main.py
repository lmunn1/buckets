import os
import tempfile
from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware

from pose import extract
import jump_shot

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# skill_id -> analyzer
ANALYZERS = {
    "shoot_form": jump_shot.analyze,
}


@app.get("/health")
def health():
    return {"ok": True}


@app.post("/analyze")
async def analyze(video: UploadFile = File(...), skill_id: str = Form(...)):
    analyzer = ANALYZERS.get(skill_id)
    if analyzer is None:
        return {"passed": False, "score": 0.0, "metrics": [],
                "feedback": [f"No vision check for skill '{skill_id}' yet."]}
    suffix = os.path.splitext(video.filename or "")[1] or ".mov"
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp.write(await video.read())
        path = tmp.name
    try:
        frames, _ = extract(path)
        return analyzer(frames)
    finally:
        os.remove(path)