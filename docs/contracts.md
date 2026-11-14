# Contracts (change only with all 3 agreeing)

## Skill node (curriculum -> app)
See curriculum/sample.json. prerequisites = ALL required.
completion.type: "vision" | "tally" | "self_check"

## Vision API (app -> vision)
POST /analyze  multipart: video (file), skill_id (string)
Response:
{ "passed": bool, "score": 0-1,
  "metrics": [{ "name": str, "value": num, "target": [min, max], "ok": bool }],
  "feedback": [str] }
GET /health -> { "ok": true }
