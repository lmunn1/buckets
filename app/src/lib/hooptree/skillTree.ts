// skillTree.ts — unlock / placement / video-pick logic for the React Native app.
// Usage: import tree from "./basketball_skill_tree.json"; then use the helpers below.
// No dependencies; works in React Native, Expo, or a Node backend.

export type TrackId = "FW" | "BH" | "SH" | "FN" | "PA" | "DF" | "LM" | "IQ";
export interface PinnedVideo {
  videoId: string;      // YouTube video id: pass to the YouTube player
  url: string;          // link to watch on YouTube
  title: string;
  channel: string;      // may be "" for hand-picked videos
  durationSec: number;  // 0 when unknown (hand-picked)
  isShort: boolean;     // true → show the player vertically (9:16)
}
export type NodeStatus = "locked" | "unlocked" | "completed";

export interface SkillNode {
  id: string;
  title: string;
  track: TrackId;
  tier: 1 | 2 | 3 | 4 | 5;
  tierName: string;
  level: "Beginner" | "Intermediate" | "Advanced";
  depth: number;
  label: string; // short name for the node badge
  layout: { x: number; y: number; ring: number }; // precomputed radial position, hub at (0,0)
  unlock: { requiresAll: string[] };
  unlocks: string[];
  xp: number;
  lesson: {
    text: { why: string; steps: string[]; cues: string[]; commonMistakes: string[] };
    visuals: {
      caption: string;                  // "Look for: …" shown under the photos
      images: {                         // up to 3 photos ([] if none found)
        url: string;                    // ~800px image to show
        fallbackUrls: string[];         // try these in order if url fails to load
        label: string;                  // "" for web photos; "Start" / "Middle" / "End" for video frames
        source: "web" | "video";        // web = Wikimedia Commons photo, video = frame of the lesson video
        credit: {                       // web photos only — the license requires showing this
          author: string; license: string; licenseUrl: string | null;
          sourceUrl: string;            // the photo's page on Wikimedia Commons
          site: string;
        } | null;
      }[];
      videoCredit: { text: string; url: string } | null; // when video frames are used
    };
    video: {
      format: "youtube-short";
      searchQuery: string;
      fallbackSearch: string;           // YouTube Shorts search, used until a video is pinned
      pinned: PinnedVideo | null;       // the lesson's video (null → show fallbackSearch link)
      alternates: PinnedVideo[];        // backups if the pinned video is removed or blocked
    };
    practice: {
      drill: string;
      cvActivity: { template: string; checks: string; passRule: string };
    };
  };
}

export interface Progress {
  completed: Record<string, true>; // earned by passing the CV check / quiz
  placedOut: Record<string, true>; // granted by the onboarding placement quiz
}

export const emptyProgress = (): Progress => ({ completed: {}, placedOut: {} });

/** Onboarding: 1-10 self-rating → highest tier to skip in that track. */
export function scoreToTier(score: number): 0 | 1 | 2 | 3 | 4 {
  if (score <= 2) return 0;
  if (score <= 4) return 1;
  if (score <= 6) return 2;
  if (score <= 8) return 3;
  return 4;
}

const isDone = (p: Progress, id: string) => !!(p.completed[id] || p.placedOut[id]);

export function statusOf(node: SkillNode, p: Progress): NodeStatus {
  if (isDone(p, node.id)) return "completed";
  return node.unlock.requiresAll.every((id) => isDone(p, id)) ? "unlocked" : "locked";
}

/** Prerequisites that still block this node (for "Finish X first" messages). */
export function missingPrereqs(node: SkillNode, p: Progress): string[] {
  return node.unlock.requiresAll.filter((id) => !isDone(p, id));
}

/** Mark a node complete and return the ids it newly unlocked (for the celebration toast). */
export function completeNode(nodes: SkillNode[], p: Progress, id: string) {
  const before = new Set(nodes.filter((n) => statusOf(n, p) === "unlocked").map((n) => n.id));
  const next: Progress = { ...p, completed: { ...p.completed, [id]: true } };
  const newlyUnlocked = nodes
    .filter((n) => statusOf(n, next) === "unlocked" && !before.has(n.id))
    .map((n) => n.id);
  const xpGained = nodes.find((n) => n.id === id)?.xp ?? 0;
  return { progress: next, newlyUnlocked, xpGained };
}

/**
 * Onboarding placement. scores: 1-10 self-rating per track
 * (1 never played, 3 played a little, 5 comfortable with basics, 7 plays on a team, 9 advanced).
 * Every node in that track with tier <= scoreToTier(score) is placed out, as long as all its
 * prerequisites are also placed out (so cross-track requirements are respected).
 */
export function applyPlacement(
  nodes: SkillNode[],
  scores: Partial<Record<TrackId, number>>
): Progress {
  const placedOut: Record<string, true> = {};
  for (const n of nodes) {
    if (n.tier <= scoreToTier(scores[n.track] ?? 1)) placedOut[n.id] = true;
  }
  let changed = true;
  while (changed) {
    changed = false;
    for (const id of Object.keys(placedOut)) {
      const n = nodes.find((x) => x.id === id)!;
      if (!n.unlock.requiresAll.every((pre) => placedOut[pre])) {
        delete placedOut[id];
        changed = true;
      }
    }
  }
  return { completed: {}, placedOut };
}

/** The video to play for a lesson: the pinned pick, else the first alternate, else null (use fallbackSearch). */
export function lessonVideo(node: SkillNode): PinnedVideo | null {
  return node.lesson.video.pinned ?? node.lesson.video.alternates[0] ?? null;
}

/** "Next up" list for the home screen: unlocked nodes, easiest first. */
export function nextUp(nodes: SkillNode[], p: Progress, limit = 5): SkillNode[] {
  return nodes
    .filter((n) => statusOf(n, p) === "unlocked")
    .sort((a, b) => a.tier - b.tier || a.depth - b.depth)
    .slice(0, limit);
}

/**
 * Skill-tree screen: nodes already carry layout {x, y} around a hub at (0,0).
 * Render with react-native-svg inside a pan/zoom view: draw <Line> for each prereq edge
 * (hide edges between different tracks until a node is selected), then a <Circle> per node.
 * Glow green when statusOf() === "unlocked", fill with the track color when completed,
 * show a lock icon when locked. Use node.label + `Lv.${node.tier}` above each circle.
 */
export function edges(nodes: SkillNode[]) {
  const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
  return nodes.flatMap((n) =>
    n.unlock.requiresAll.map((p) => ({
      from: p,
      to: n.id,
      crossTrack: byId[p].track !== n.track,
      x1: byId[p].layout.x, y1: byId[p].layout.y, x2: n.layout.x, y2: n.layout.y,
    }))
  );
}
