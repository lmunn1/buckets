from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

@app.get("/health")
def health():
    return {"ok": True}

@app.post("/analyze")
async def analyze(video: UploadFile = File(...), skill_id: str = Form(...)):
    # MOCK: replace with real pose analysis
    return {
        "passed": True, "score": 0.82,
        "metrics": [{"name": "elbow_angle", "value": 88, "target": [80, 100], "ok": True}],
        "feedback": ["Elbow is tucked, good.", "Release a bit higher."],
    }
