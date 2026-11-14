import {
  importedCatalog,
  importedCategories,
  sourceNodes,
  sourceNodeFor,
  importedState,
  isQuiz,
  sourceDocument,
} from "./hooptree-adapter";
/** The single integration seam for the curriculum teammate. No screen reads JSON directly. */
import {
  validateCatalog,
  skillState as legacyState,
  completeSkillDemo as legacyComplete,
  type Catalog,
  type Profile,
  type Progress,
  type SkillNode,
} from "./curriculum";
export {
  blankProgress,
  validateCatalog,
  adaptCatalog,
  layoutBranch,
} from "./curriculum";
export type {
  CategoryId,
  Familiarity,
  Profile,
  Progress,
  SkillNode,
  Catalog,
  Completion,
} from "./curriculum";

export { sourceNodes, sourceNodeFor, isQuiz, sourceDocument };
export type LessonSection =
  | {
      type: "text";
      title: string;
      body: string;
      steps: string[];
      cues?: string[];
      mistakes?: string[];
    }
  | { type: "visual"; title: string; caption: string; imageUrl?: string }
  | { type: "video"; title: string; verifiedUrl?: string }
  | { type: "practice"; title: string; instructions: string };
export type CategoryDefinition = {
  id: string;
  label: string;
  short: string;
  color: string;
  icon:
    | "ball"
    | "target"
    | "hoop"
    | "shield"
    | "move"
    | "brain"
    | "footprints"
    | "passing";
  description: string;
  cue: string;
};
export type LearningPack = {
  version: 1;
  provenance: "demo" | "curriculum";
  categories: readonly CategoryDefinition[];
  catalog: Catalog;
  lessons?: Record<
    string,
    {
      kind: "movement" | "knowledge" | "drill";
      estimatedMinutes?: number;
      sections: LessonSection[];
    }
  >;
};
export type LessonDefinition = NonNullable<LearningPack["lessons"]>[string];
/** Authoring format: hierarchy and reusable lesson content are supplied independently. */
export type CurriculumDocument = {
  categories: CategoryDefinition[];
  skills: {
    id: string;
    title: string;
    category: string;
    prerequisites: string[];
    lessonId: string;
    level?: SkillNode["level"];
    completion?: SkillNode["completion"];
  }[];
  lessons: Record<string, LessonDefinition>;
};
export function packFromCurriculum(document: CurriculumDocument): LearningPack {
  const lessons: Record<string, LessonDefinition> = {};
  const nodes = document.skills.map((skill) => {
    const lesson = document.lessons[skill.lessonId];
    if (!lesson) throw new Error(`Missing lesson: ${skill.lessonId}`);
    const text = lesson.sections.find((s) => s.type === "text");
    const practice = lesson.sections.find((s) => s.type === "practice");
    const video = lesson.sections.find((s) => s.type === "video");
    if (text?.type !== "text" || practice?.type !== "practice")
      throw new Error(`Lesson ${skill.lessonId} needs text and practice`);
    lessons[skill.id] = lesson;
    return {
      id: skill.id,
      name: skill.title,
      category: skill.category,
      prerequisites: skill.prerequisites,
      level: skill.level ?? "beginner",
      lesson: {
        summary: text.body,
        steps: text.steps,
        practice: practice.instructions,
        video_short:
          video?.type === "video" ? (video.verifiedUrl ?? null) : null,
        video_long: null,
      },
      completion: skill.completion ?? {
        type: "self_check" as const,
        criteria: "Assessment integration pending",
        analyzer: null,
      },
    };
  });
  return validateLearningPack({
    version: 1,
    provenance: "curriculum",
    categories: document.categories,
    catalog: { sport: "basketball", nodes },
    lessons,
  });
}
export function validateLearningPack(pack: LearningPack) {
  if (pack.version !== 1) throw new Error("Unsupported learning-pack version");
  if (!pack.catalog.nodes.length || !pack.categories.length)
    throw new Error("Learning pack must contain categories and skills");
  const ids = new Set(pack.categories.map((c) => c.id));
  if (ids.size !== pack.categories.length)
    throw new Error("Duplicate category IDs");
  pack.categories.forEach((c) => {
    if (!/^#[0-9a-f]{6}$/i.test(c.color))
      throw new Error("Category colors must use six-digit hex");
  });
  validateCatalog(pack.catalog);
  pack.catalog.nodes.forEach((n) => {
    if (!ids.has(n.category))
      throw new Error(`Unknown category: ${n.category}`);
    const sections = pack.lessons?.[n.id]?.sections;
    if (
      sections &&
      sections.map((s) => s.type).join(",") !== "text,visual,video,practice"
    )
      throw new Error(`Lesson ${n.id} must follow text,visual,video,practice`);
    const video = sections?.find((s) => s.type === "video");
    if (
      video?.type === "video" &&
      video.verifiedUrl &&
      !video.verifiedUrl.startsWith("https://")
    )
      throw new Error("Verified video URLs must use HTTPS");
  });
  return pack;
}
// The supplied curriculum is now the active source for every screen.
export const learningPack = validateLearningPack({
  version: 1,
  provenance: "curriculum",
  categories: importedCategories,
  catalog: importedCatalog,
  lessons: Object.fromEntries(
    sourceNodes.map((n) => [
      n.id,
      {
        kind:
          n.lesson.practice.cvActivity.template === "QUIZ"
            ? ("knowledge" as const)
            : ("movement" as const),
        sections: [
          {
            type: "text" as const,
            title: "Build the idea",
            body: n.lesson.text.why,
            steps: n.lesson.text.steps,
            cues: n.lesson.text.cues,
            mistakes: n.lesson.text.commonMistakes,
          },
          {
            type: "visual" as const,
            title: "See the technique",
            caption: n.lesson.visuals.caption,
          },
          {
            type: "video" as const,
            title: "Watch the demonstration",
            verifiedUrl: n.lesson.video.pinned?.url,
          },
          {
            type: "practice" as const,
            title: "Take it to the court",
            instructions: n.lesson.practice.drill,
          },
        ],
      },
    ]),
  ),
});
/** Delegate author prerequisites; do not let the preview complete empty quizzes. */
export function skillState(node: SkillNode, progress: Progress) {
  return importedState(node, progress) ?? legacyState(node, progress);
}
export function completeSkillDemo(
  catalog: Catalog,
  progress: Progress,
  id: string,
) {
  if (isQuiz(id)) throw new Error("Quiz content is not available yet");
  return legacyComplete(catalog, progress, id);
}
export const categories: readonly CategoryDefinition[] =
  learningPack.categories;
// Compatibility alias for existing screens; does not imply a production catalog is a fixture.
export const catalog = learningPack.catalog;
export const demoCatalog = catalog;
export const categoryFor = (id: string) =>
  categories.find((c) => c.id === id) ?? categories[0];
export const blankProfile = (): Profile => ({
  goal: "basics",
  familiarity: Object.fromEntries(
    categories.map((c) => [c.id, "new"]),
  ) as Profile["familiarity"],
});
export function recommend(
  catalog: Catalog,
  profile: Profile,
  progress: Progress,
) {
  const available = catalog.nodes.filter(
    (n) => skillState(n, progress) === "available",
  );
  return (
    available.find((n) => n.category === profile.goal) ??
    available.find((n) => profile.familiarity[n.category] === "new") ??
    available[0]
  );
}
export function lessonSections(node: SkillNode): LessonSection[] {
  return (
    learningPack.lessons?.[node.id]?.sections ?? [
      {
        type: "text",
        title: "The key idea",
        body: node.lesson.summary,
        steps: node.lesson.steps,
      },
      {
        type: "visual",
        title: "Picture the movement",
        caption:
          "Sample visual guide. Final coaching illustrations connect through the lesson catalog.",
      },
      {
        type: "video",
        title: "See it in action",
        verifiedUrl:
          node.lesson.video_short ?? node.lesson.video_long ?? undefined,
      },
      {
        type: "practice",
        title: "Put it into practice",
        instructions: node.lesson.practice,
      },
    ]
  );
}
export const fundamentals = () =>
  demoCatalog.nodes.filter((n) => n.prerequisites.length === 0);
