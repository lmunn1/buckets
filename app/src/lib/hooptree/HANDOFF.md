# HoopTree: skill tree data for the app

Everything the app needs is in **`basketball_skill_tree_with_videos.json`**: 107 basketball skills,
the connections between them, the full lesson for each skill, and a YouTube video for every lesson.
You don't need any server or API key to use it.

## Files
| File | What it is |
|---|---|
| `basketball_skill_tree_with_videos.json` | All the data (load it with `import tree from "./basketball_skill_tree_with_videos.json"`) |
| `skillTree.ts` | TypeScript types + helpers: unlock logic, placement quiz, XP, edges for drawing |
| `LessonPhotos.tsx` | Drop-in component that shows a lesson's 3 photos + "Look for" caption |
| `LessonVideo.tsx` | Drop-in component that plays a lesson's video inside the app |

## JSON at a glance
```
{
  meta:        { nodeCount: 107, unlockRule, completionRule, lessonFormat, ... },
  tracks:      { FW, BH, SH, FN, PA, DF, LM, IQ }  → name, color, icon, layout (slice of the circle)
  tiers:       { 1..5 }                            → Rookie, Starter, Hooper, All-Star, MVP
  placement:   onboarding quiz: 1-10 self-rating per track → which skills to skip
  dailyWarmup: grip / body / nervous-system warmup lists
  badges:      badge ids, names and how to earn them
  cvTemplates: how each camera-check type works (MediaPipe pose / ball tracking)
  nodes:       [ 107 skills, see below ]
}
```

### One node (skill)
```jsonc
{
  "id": "bh-cross",                       // unique id, used everywhere
  "title": "Stationary Crossover",        // full name
  "label": "Stationary Crossover",        // short name for the map
  "track": "BH",                          // area: FW Footwork, BH Ball Handling, SH Shooting, FN Finishing,
                                          //       PA Passing, DF Defense, LM Live Moves, IQ Basketball IQ
  "tier": 2, "tierName": "Starter", "level": "Beginner",
  "xp": 100,
  "unlock":  { "requiresAll": ["bh-heights"] },   // ALL of these must be done first ([] = starting skill)
  "unlocks": ["bh-btl", "bh-btb", "lm-crossgo"],  // skills this one helps unlock (for drawing arrows)
  "layout":  { "x": 657, "y": -740, "ring": 4 },  // position on the map; the "YOU" hub is at (0, 0)
  "lesson": {
    "text":     { "why": "...", "steps": ["..."], "cues": ["..."], "commonMistakes": ["..."] },
    "visuals": {
      "caption": "Look for: Low and quick, in a V · Stay low",
      "images": [                              // up to 3 photos from the web
        { "url": "https://upload.wikimedia.org/...800px-....jpg", "fallbackUrls": ["https://upload.wikimedia.org/..."],
          "label": "", "source": "web",
          "credit": { "author": "...", "license": "CC BY-SA 4.0", "licenseUrl": "...",
                      "sourceUrl": "https://commons.wikimedia.org/wiki/File:...", "site": "Wikimedia Commons" } },
        ...
      ],
      "videoCredit": null                      // set when frames of the lesson video fill missing photos
    },
    "video": {
      "pinned":     { "videoId": "fuCNf4nmDpM", "url": "...", "title": "...", "channel": "...",
                      "durationSec": 47, "isShort": true },   // isShort → vertical 9:16 player
      "alternates": [ ... ],                                  // backups (0-2) if the main one won't play
      "fallbackSearch": "https://www.youtube.com/results?..." // open this if no video plays
    },
    "practice": {
      "drill": "...",
      "cvActivity": { "template": "CROSSOVER_COUNTER", "checks": "...", "passRule": "..." }
    }
  }
}
```

**Lesson order in the UI:** text → photos → video → camera practice.

## Rules
- **Unlocked** when every id in `unlock.requiresAll` is completed (or skipped by the placement quiz).
- **Completed** when the camera check's `passRule` is met (IQ skills use a quiz instead).
- `skillTree.ts` already implements this: `statusOf()`, `completeNode()`, `applyPlacement()`, `nextUp()`, `edges()`.

## Drawing the skill tree
Every node has `layout.x / layout.y` around a center hub at (0, 0), so no layout code is needed.
Draw a line for each prerequisite, then a circle per node. We used:
- locked → grey circle with a padlock
- unlocked → green glow ("ready to learn")
- completed → filled with the track's color + check mark
- lines between different tracks hidden until a node is selected (keeps it clean)

## Photos
```tsx
import LessonPhotos from "./LessonPhotos";
<LessonPhotos node={node} />
```
Up to 3 photos per lesson, from the web: freely licensed photos from **Wikimedia Commons** (the photo
library behind Wikipedia), chosen per skill. If Commons had fewer than 3 good photos for a skill, the
remaining slots are frames from that lesson's own YouTube video (`source: "video"`).
They're plain image links, so React Native's built-in `<Image>` shows them with nothing to install.

**Credit is required:** Commons photos are free to use as long as the photographer and license are
shown. `LessonPhotos` already prints "Photo: author · license · Wikimedia Commons" under each photo
(tap → the photo's source page). If you build your own UI, keep that line.

## Videos
```bash
npx expo install react-native-webview
npm install react-native-youtube-iframe
```
```tsx
import LessonVideo from "./LessonVideo";
<LessonVideo node={node} />
```
It plays the pinned video inside the app, falls back to the alternates if one won't play, and
otherwise shows a "Watch on YouTube" link. Videos are streamed through YouTube's official player,
not downloaded, which is what YouTube's terms require.
