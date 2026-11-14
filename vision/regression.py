"""Old jump_shot.analyze vs engine + specs/shoot_form.json on every clip in clips/.

python regression.py          exit code 1 if anything differs
Values must match within TOL; pass/fail, side and key frames must match exactly.
This tests the engine's logic, not calibration: the spec is run with
jump_shot.TARGETS, so later range changes in shoot_form.json don't count as diffs.
"""
import copy
import sys

import clip_cache
import engine
import jump_shot

TOL = 0.051  # display rounding: seconds now show 2 decimals instead of 1
DEBUG_KEYS = ("release_frame", "set_frame", "dip_frame", "follow_end_frame", "side")


def compare(path, spec):
    frames, fps = clip_cache.load(path)
    old = jump_shot.analyze(frames, fps=fps)
    new = engine.analyze(spec, frames, fps)
    rows, ok = [], True
    for o, n in zip(old["metrics"], new["metrics"]):
        same_val = (o["value"] is None and n["value"] is None) or (
            o["value"] is not None and n["value"] is not None and abs(o["value"] - n["value"]) <= TOL)
        same = o["name"] == n["name"] and same_val and o["ok"] == n["ok"]
        ok &= same
        rows.append((o["name"], o["value"], o["ok"], n["value"], n["ok"], same))
    extra = [("passed", old["passed"], new["passed"]), ("score", old["score"], new["score"]),
             ("feedback", old["feedback"], new["feedback"])]
    extra += [(k, old.get("debug", {}).get(k), new["debug"].get(k)) for k in DEBUG_KEYS]
    for name, a, b in extra:
        ok &= a == b
    ok &= len(old["metrics"]) == len(new["metrics"])
    return rows, extra, ok


def ported_spec():
    """shoot_form.json with the original jump_shot.py target ranges."""
    spec = copy.deepcopy(engine.load_spec("shoot_form"))
    for rule in spec["rules"]:
        rule["target"] = list(jump_shot.TARGETS[rule["name"]])
    return spec


def main():
    spec = ported_spec()
    all_ok = True
    for path in clip_cache.clip_paths():
        rows, extra, ok = compare(path, spec)
        all_ok &= ok
        print(f"\n{path.split('/')[-1]}  {'MATCH' if ok else 'DIFFERENT'}")
        print(f"  {'metric':20} {'old':>8} {'ok':>5} | {'new':>8} {'ok':>5}")
        for name, ov, ook, nv, nok, same in rows:
            print(f"  {name:20} {str(ov):>8} {str(ook):>5} | {str(nv):>8} {str(nok):>5} {'' if same else '  <-- differs'}")
        for name, a, b in extra:
            if name == "feedback":
                print(f"  feedback {'same' if a == b else 'DIFFERS:'}")
                if a != b:
                    print(f"    old: {a}\n    new: {b}")
            else:
                print(f"  {name:20} {str(a):>8}       | {str(b):>8} {'' if a == b else '  <-- differs'}")
    print("\nALL MATCH" if all_ok else "\nMISMATCHES FOUND")
    return 0 if all_ok else 1


if __name__ == "__main__":
    sys.exit(main())
