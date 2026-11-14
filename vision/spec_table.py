"""Run one spec on every clip in clips/ and print a table.

python spec_table.py shot_fake [left|right]
"""
import sys

import clip_cache
import engine


def main():
    name = sys.argv[1] if len(sys.argv) > 1 else "shoot_form"
    hand = next((a for a in sys.argv[2:] if a in ("left", "right", "auto")), "auto")
    spec = engine.load_spec(name)
    rule_names = [r["name"] for r in spec["rules"]]
    print(f"{'clip':16} {'side':6} {'pass':6} " + " ".join(f"{n:>16}" for n in rule_names))
    for path in clip_cache.clip_paths():
        frames, fps = clip_cache.load(path)
        r = engine.analyze(spec, frames, fps, hand)
        cells = []
        for m in r["metrics"]:
            cells.append(f"{str(m['value']) + (' ok' if m['ok'] else ' X'):>16}")
        print(f"{path.split('/')[-1]:16} {r['debug']['side']:6} {str(r['passed']):6} " + " ".join(cells))
    print("\ntargets: " + ", ".join(f"{r['name']} {r['target']}" for r in spec["rules"]))


if __name__ == "__main__":
    main()
