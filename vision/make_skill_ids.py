"""Generate vision/skill_ids.json: app skill id -> app/data/skills.json id.

The app uses the ids in app/src/lib/hooptree/curriculum.json (e.g. "sh-beef").
The lessons file app/data/skills.json has the same skills, in the same order,
under different ids (e.g. "shoot_beef_form"). This pairs them by position and
refuses to write anything unless names and prerequisites agree.

python make_skill_ids.py        (re-run whenever either file changes)
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
APP = os.path.join(HERE, "..", "app")
HOOPTREE = os.path.join(APP, "src", "lib", "hooptree", "curriculum.json")
SKILLS = os.path.join(APP, "data", "skills.json")
OUT = os.path.join(HERE, "skill_ids.json")

# Pairs whose names differ slightly, checked by hand.
CONFIRMED_RENAMES = {
    "fw-gather": "foot_shot_footwork",     # "Shot Footwork" / "Shot Footwork: Hop vs 1-2"
    "sh-bank": "shoot_bank_shots",         # "Short-Range Bank Shots" / "Bank Shots"
    "pa-skip": "drib_skip_outlet",         # "Skip & Outlet" / "Skip & Outlet Passes"
    "pa-flashy": "drib_behind_back_pass",  # "Behind-Back Pass" / "Behind-the-Back Pass"
}


def build():
    with open(HOOPTREE) as f:
        app_nodes = json.load(f)["nodes"]
    with open(SKILLS) as f:
        skills = json.load(f)
    errors = []
    if len(app_nodes) != len(skills):
        errors.append(f"different skill counts: app {len(app_nodes)}, skills.json {len(skills)}")
    mapping = {a["id"]: s["id"] for a, s in zip(app_nodes, skills)}
    for a, s in zip(app_nodes, skills):
        names = {a["title"].lower(), a.get("label", "").lower()}
        if s["name"].lower() not in names and CONFIRMED_RENAMES.get(a["id"]) != s["id"]:
            errors.append(f"name mismatch at {a['id']} ({a['title']!r}) vs {s['id']} ({s['name']!r})")
        prereqs = sorted(mapping.get(p, "?" + p) for p in a["unlock"]["requiresAll"])
        if prereqs != sorted(s["prerequisites"]):
            errors.append(f"prerequisites differ for {a['id']} / {s['id']}: {prereqs} vs {sorted(s['prerequisites'])}")
    if len(set(mapping.values())) != len(mapping):
        errors.append("two app ids map to the same skills.json id")
    return mapping, errors


def main():
    mapping, errors = build()
    if errors:
        print("Not writing skill_ids.json. The two curriculum files disagree:")
        for e in errors:
            print("  -", e)
        return 1
    with open(OUT, "w") as f:
        json.dump(mapping, f, indent=1, sort_keys=True)
        f.write("\n")
    print(f"Wrote {len(mapping)} ids to {OUT}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
