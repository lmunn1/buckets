import document from "./hooptree/curriculum.json";
import { statusOf, type SkillNode as SourceNode } from "./hooptree/skillTree";
import type { Catalog, Progress, SkillNode } from "./curriculum";

/** Immutable author export. All presentation conversions stay outside teammate rules. */
export const sourceNodes = document.nodes as SourceNode[];
export const sourceNodeFor = (id: string) =>
  sourceNodes.find((n) => n.id === id);
export const sourceDocument = document;
const icons = {
  FW: "footprints",
  BH: "ball",
  SH: "target",
  FN: "hoop",
  PA: "passing",
  DF: "shield",
  LM: "move",
  IQ: "brain",
} as const;
const accents = {
  FW: "#64CBAF",
  BH: "#F4A340",
  SH: "#8EDB4F",
  FN: "#52CEDA",
  PA: "#72A6F5",
  DF: "#F17B79",
  LM: "#F0CE53",
  IQ: "#BC91EF",
};
const shorts = {
  FW: "Footwork",
  BH: "Handling",
  SH: "Shooting",
  FN: "Finishing",
  PA: "Passing",
  DF: "Defense",
  LM: "Live moves",
  IQ: "Game IQ",
};
export const importedCategories = Object.entries(document.tracks).map(
  ([key, track]) => {
    const id = key as keyof typeof icons;
    return {
      id,
      label: track.name,
      short: shorts[id],
      icon: icons[id],
      color: accents[id],
      description: `Develop your ${shorts[id].toLowerCase()}.`,
      cue: `Your confidence with ${shorts[id].toLowerCase()}`,
    };
  },
);
export const importedCatalog: Catalog = {
  sport: "basketball",
  nodes: sourceNodes.map((n) => ({
    id: n.id,
    name: n.title,
    category: n.track,
    level: n.level.toLowerCase() as SkillNode["level"],
    prerequisites: [...n.unlock.requiresAll],
    lesson: {
      summary: n.lesson.text.why,
      steps: n.lesson.text.steps,
      practice: n.lesson.practice.drill,
      video_long: null,
      video_short: n.lesson.video.pinned?.url ?? null,
    },
    completion: {
      type:
        n.lesson.practice.cvActivity.template === "QUIZ"
          ? "self_check"
          : "vision",
      criteria: n.lesson.practice.cvActivity.passRule,
      analyzer: n.lesson.practice.cvActivity.template,
    },
  })),
};
export const isQuiz = (id: string) =>
  sourceNodeFor(id)?.lesson.practice.cvActivity.template === "QUIZ";
export function importedState(node: SkillNode, progress: Progress) {
  const source = sourceNodeFor(node.id);
  if (!source) return undefined;
  const result = statusOf(source, {
    completed: Object.fromEntries(
      Object.keys(progress.completed).map((id) => [id, true as const]),
    ),
    placedOut: progress.placedOut ?? {},
  });
  return result === "unlocked" ? ("available" as const) : result;
}
