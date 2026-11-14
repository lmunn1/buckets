# Vision server

Setup (once):
    cd vision
    python3 -m venv .venv
    source .venv/bin/activate
    pip install -r requirements.txt
    mkdir -p models clips
    curl -o models/pose_landmarker_full.task https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/latest/pose_landmarker_full.task

Run the server:
    uvicorn main:app --host 0.0.0.0 --port 8000

Test a clip:
    python test_clip.py clips/shot.mov
    python debug_video.py clips/shot.mov

Film from the shooting-hand side, whole body in frame.
Only skill_id "shoot_form" is graded so far.
