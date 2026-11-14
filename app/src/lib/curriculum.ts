// Frontend contract adapter. Production graph/content remain owned by curriculum/.
export const categories = [
  {
    id: "handling",
    label: "Ball handling",
    short: "Handling",
    color: "#E7AD5A",
    icon: "ball",
    description: "Get comfortable with the ball.",
    cue: "Keeping a dribble under control",
  },
  {
    id: "shooting",
    label: "Shooting",
    short: "Shooting",
    color: "#99D85A",
    icon: "target",
    description: "Build a repeatable shot.",
    cue: "Setting up and releasing a close shot",
  },
  {
    id: "finishing",
    label: "Finishing",
    short: "Finishing",
    color: "#71CBD2",
    icon: "hoop",
    description: "Find your feet near the basket.",
    cue: "Taking the steps for a layup",
  },
  {
    id: "defense",
    label: "Defense",
    short: "Defense",
    color: "#ED8C88",
    icon: "shield",
    description: "Move with balance and purpose.",
    cue: "Staying balanced while moving sideways",
  },
  {
    id: "moves",
    label: "Game moves",
    short: "Moves",
    color: "#E8CD69",
    icon: "move",
    description: "Put your foundations together.",
    cue: "Changing direction with the ball",
  },
  {
    id: "iq",
    label: "Basketball IQ",
    short: "Game IQ",
    color: "#C5B8EF",
    icon: "brain",
    description: "Understand what happens on court.",
    cue: "Knowing the basic rules and court markings",
  },
] as const;
export type CategoryId = string;
export type Familiarity = "new" | "tried" | "learning" | "unsure";
export type Profile = {
  goal: CategoryId | "basics";
  familiarity: Record<CategoryId, Familiarity>;
  experience?: "new" | "some" | "experienced";
  sessionMinutes?: 5 | 10 | 20;
};
export type SkillNode = {
  id: string;
  name: string;
  category: string;
  level: "beginner" | "intermediate" | "advanced";
  prerequisites: string[];
  lesson: {
    summary: string;
    steps: string[];
    practice: string;
    video_long: string | null;
    video_short: string | null;
  };
  completion: {
    type: "vision" | "tally" | "self_check";
    criteria: string;
    analyzer: string | null;
  };
};
export type Catalog = { sport: string; nodes: SkillNode[] };
export type Completion = { source: "demo"; completedAt: string };
export type Progress = {
  completed: Record<string, Completion>;
  placedOut?: Record<string, true>;
  lessonSteps: Record<string, number>;
  practiceCount: number;
};
export const blankProgress = (): Progress => ({
  completed: {},
  lessonSteps: {},
  practiceCount: 0,
});
export const blankProfile = (): Profile => ({
  goal: "basics",
  familiarity: Object.fromEntries(
    categories.map((c) => [c.id, "new"]),
  ) as Profile["familiarity"],
});
const fixture = (
  id: string,
  name: string,
  category: CategoryId,
  prerequisites: string[],
  summary: string,
  steps: string[],
  practice: string,
): SkillNode => ({
  id,
  name,
  category,
  prerequisites,
  level: "beginner",
  lesson: { summary, steps, practice, video_long: null, video_short: null },
  completion: {
    type: "self_check",
    criteria:
      "Demo completion only. Assessment criteria will come from the curriculum team.",
    analyzer: null,
  },
});
// Illustrative wireframe content, not the final curriculum or vision criteria.
export const demoCatalog: Catalog = {
  sport: "basketball",
  nodes: [
    fixture(
      "ball-control",
      "Meet the ball",
      "handling",
      [],
      "Get a feel for the ball before adding movement.",
      [
        "Start in a comfortable, balanced stance.",
        "Hold and move the ball between your hands.",
        "Keep your movements slow and controlled.",
      ],
      "Explore how the ball feels in each hand.",
    ),
    fixture(
      "low-dribble",
      "Your first dribble",
      "handling",
      ["ball-control"],
      "Explore a steady dribble while standing still.",
      [
        "Keep your knees comfortably bent.",
        "Push the ball down using your fingertips.",
        "Try each hand at a pace you can control.",
      ],
      "Try a short set of stationary dribbles with each hand.",
    ),
    fixture(
      "switch-hands",
      "Switch hands",
      "handling",
      ["ball-control"],
      "Learn the feeling of transferring control.",
      [
        "Begin with a low, steady dribble.",
        "Guide the bounce across your body.",
        "Receive the ball with your other hand.",
      ],
      "Try controlled hand changes while standing still.",
    ),
    fixture(
      "balanced-stance",
      "Find your balance",
      "shooting",
      [],
      "Build a comfortable base for a close-range shot.",
      [
        "Stand facing the hoop.",
        "Set your feet in a comfortable stance.",
        "Keep your knees relaxed and your body balanced.",
      ],
      "Rehearse setting up in a balanced stance.",
    ),
    fixture(
      "release",
      "A gentle release",
      "shooting",
      ["balanced-stance"],
      "Explore a smooth release close to the basket.",
      [
        "Begin from a balanced stance.",
        "Guide the ball upward with your shooting hand.",
        "Finish with a relaxed wrist and follow-through.",
      ],
      "Rehearse the motion slowly before adding a close shot.",
    ),
    fixture(
      "close-shot",
      "Put the shot together",
      "shooting",
      ["balanced-stance", "release"],
      "Connect your stance and release.",
      [
        "Settle into your stance.",
        "Move smoothly through the shooting motion.",
        "Hold your finish and notice your balance.",
      ],
      "Practice a few comfortable, close-range shots.",
    ),
    fixture(
      "layup-steps",
      "Learn the steps",
      "finishing",
      [],
      "Get familiar with layup footwork before adding a shot.",
      [
        "Start without a ball.",
        "Walk through two controlled approach steps.",
        "Pause and find your balance.",
      ],
      "Rehearse your approach slowly on both sides.",
    ),
    fixture(
      "layup",
      "Your first layup",
      "finishing",
      ["layup-steps"],
      "Bring the ball into your approach.",
      [
        "Start close to the basket.",
        "Walk through your approach with the ball.",
        "Reach up toward the basket with control.",
      ],
      "Rehearse the approach and finish at an easy pace.",
    ),
    fixture(
      "defense-stance",
      "Ready position",
      "defense",
      [],
      "Find a balanced position you can move from.",
      [
        "Keep your feet comfortably apart.",
        "Bend your knees without leaning forward.",
        "Keep your head up.",
      ],
      "Find a stance that feels balanced and comfortable.",
    ),
    fixture(
      "defense-slide",
      "Move side to side",
      "defense",
      ["defense-stance"],
      "Stay balanced as you move sideways.",
      [
        "Begin in your ready position.",
        "Take a small sideways step.",
        "Bring your other foot across without crossing your legs.",
      ],
      "Try a few controlled steps in each direction.",
    ),
    fixture(
      "change-direction",
      "Change direction",
      "moves",
      ["low-dribble", "switch-hands"],
      "Combine control and hand changes.",
      [
        "Begin with a steady dribble.",
        "Slow down before changing direction.",
        "Switch hands and reset your balance.",
      ],
      "Rehearse a slow change of direction with space around you.",
    ),
    fixture(
      "court-basics",
      "Know your court",
      "iq",
      [],
      "Recognize the court and the aim of the game.",
      [
        "Find the basket, sidelines, and baseline.",
        "Notice the free-throw line and three-point arc.",
        "The aim is to score in the opponent’s basket.",
      ],
      "Point out the key markings on a real court or the diagram.",
    ),
    fixture(
      "basic-rules",
      "Play within the lines",
      "iq",
      ["court-basics"],
      "Get familiar with possession and boundaries.",
      [
        "Keep the ball within the court boundaries.",
        "Dribble when moving with the ball.",
        "Pause and ask when a rule feels unfamiliar.",
      ],
      "Review the court boundaries and the purpose of dribbling.",
    ),
    fixture(
      "triple-threat",
      "Triple threat",
      "iq",
      ["ball-control", "balanced-stance"],
      "Be ready to pass, shoot, or dribble from one balanced position.",
      [
        "Catch with two hands.",
        "Bend your knees and protect the ball.",
        "Face the basket before choosing your next action.",
      ],
      "Catch, face the hoop, and pause in triple threat five times.",
    ),
    fixture(
      "jump-stop",
      "Jump stop",
      "iq",
      ["balanced-stance", "basic-rules"],
      "Come to a controlled stop with both feet.",
      [
        "Begin with a slow walk.",
        "Make a small hop and land on both feet.",
        "Absorb the landing with bent knees.",
      ],
      "Walk into five soft, balanced jump stops.",
    ),
    fixture(
      "pivot",
      "Protect and pivot",
      "iq",
      ["jump-stop", "ball-control"],
      "Change your view while keeping your pivot foot planted.",
      [
        "Choose one foot to stay on the ground.",
        "Hold the ball close.",
        "Step around slowly with your other foot.",
      ],
      "Try five forward and reverse pivots on each foot.",
    ),
    fixture(
      "beef-form",
      "BEEF shooting form",
      "shooting",
      ["release", "ball-control"],
      "Connect balance, eyes, elbow, and follow-through into a repeatable shot.",
      [
        "Balance your feet and look at the rim.",
        "Bring your elbow comfortably under the ball.",
        "Extend smoothly and hold a relaxed follow-through.",
      ],
      "Take five close-range shots, resetting your balance before each rep.",
    ),
    fixture(
      "set-point",
      "Find your set point",
      "shooting",
      ["beef-form"],
      "Find a comfortable position before extending into your shot.",
      [
        "Start close to the hoop.",
        "Bring the ball above your shooting eye.",
        "Keep your guide hand relaxed.",
      ],
      "Rehearse five slow lifts to your set point.",
    ),
    fixture(
      "jump-shot",
      "Basic jump shot",
      "shooting",
      ["close-shot", "jump-stop"],
      "Add a small, balanced jump to your shooting motion.",
      [
        "Set your feet.",
        "Rise straight up with a small jump.",
        "Land softly near where you started.",
      ],
      "Try five easy jump shots close to the rim.",
    ),
    fixture(
      "catch-shoot",
      "Catch and shoot",
      "shooting",
      ["set-point", "triple-threat"],
      "Move from a catch into a balanced shot.",
      [
        "Show your hands for the pass.",
        "Catch with your feet ready.",
        "Flow into your shooting motion.",
      ],
      "With a partner or a gentle self-toss, rehearse five catches into shots.",
    ),
    fixture(
      "pound-dribble",
      "Pound dribble",
      "handling",
      ["low-dribble"],
      "Build control over a firmer stationary bounce.",
      [
        "Stay low and balanced.",
        "Push firmly with your fingertips.",
        "Keep the bounce beside your body.",
      ],
      "Dribble for 20 seconds with each hand at a controllable pace.",
    ),
    fixture(
      "eyes-up",
      "Dribble with eyes up",
      "handling",
      ["pound-dribble", "court-basics"],
      "Keep control while noticing the space around you.",
      [
        "Begin with a comfortable dribble.",
        "Look toward a fixed point ahead.",
        "Slow down whenever you lose control.",
      ],
      "Try three short sets looking forward instead of at the ball.",
    ),
    fixture(
      "crossover",
      "Controlled crossover",
      "handling",
      ["switch-hands", "pound-dribble"],
      "Guide the ball across your body with control.",
      [
        "Begin with a low bounce.",
        "Send the ball across below your knees.",
        "Receive it softly with your other hand.",
      ],
      "Try ten slow crossovers without moving your feet.",
    ),
    fixture(
      "stepback-dribble",
      "Stepback dribble",
      "handling",
      ["change-direction", "jump-stop"],
      "Create a little space while keeping your balance.",
      [
        "Begin at walking speed.",
        "Push back into open space with a controlled dribble.",
        "Stop in balance without rushing.",
      ],
      "Rehearse five slow stepbacks with plenty of room.",
    ),
    fixture(
      "stepback-jumper",
      "Stepback jumper",
      "moves",
      ["stepback-dribble", "jump-shot"],
      "Combine space creation with a balanced jump shot.",
      [
        "Set up with a controlled dribble.",
        "Step back and settle your feet.",
        "Rise into a smooth shot.",
      ],
      "Walk through the sequence, then try five close-range repetitions.",
    ),
    fixture(
      "drive-finish",
      "Drive and finish",
      "finishing",
      ["layup", "eyes-up"],
      "Bring ball control into a simple approach to the rim.",
      [
        "Start a few steps from the hoop.",
        "Dribble at walking speed.",
        "Gather and use your layup footwork.",
      ],
      "Try five easy approaches on each side.",
    ),
    fixture(
      "weak-hand-layup",
      "Other-hand layup",
      "finishing",
      ["layup", "switch-hands"],
      "Build confidence finishing on your other side.",
      [
        "Walk through the approach without a ball.",
        "Lift the ball with your other hand.",
        "Aim softly at the backboard.",
      ],
      "Rehearse five slow finishes on your less familiar side.",
    ),
    fixture(
      "closeout",
      "Balanced closeout",
      "defense",
      ["defense-slide", "jump-stop"],
      "Approach a shooter and stop under control.",
      [
        "Move toward an imaginary shooter.",
        "Shorten your steps as you approach.",
        "Finish balanced with one hand raised.",
      ],
      "Mark two spots and practice five controlled approaches.",
    ),
    fixture(
      "help-defense",
      "See ball and player",
      "defense",
      ["defense-stance", "court-basics"],
      "Position yourself to notice both the ball and your opponent.",
      [
        "Stand where you can see both.",
        "Keep your body open to the court.",
        "Adjust with small balanced steps.",
      ],
      "Use two markers to rehearse a position that keeps both in view.",
    ),
    fixture(
      "give-go",
      "Give and go",
      "moves",
      ["pivot", "drive-finish", "basic-rules"],
      "Pass, move into space, and receive the ball again.",
      [
        "Face your partner from a balanced stance.",
        "Pass and move into open space.",
        "Show your hands for the return pass.",
      ],
      "Walk through five give-and-go sequences with a partner.",
    ),
  ],
};
export const categoryFor = (id: string) =>
  categories.find((c) => c.id === id) ?? categories[0];
export function adaptCatalog(raw: Catalog): Catalog {
  const aliases: Record<string, CategoryId> = {
    handling: "handling",
    dribbling: "handling",
    "ball-handling": "handling",
    ball_handling: "handling",
    shooting: "shooting",
    finishing: "finishing",
    layups: "finishing",
    finishes: "finishing",
    defense: "defense",
    defending: "defense",
    moves: "moves",
    iq: "iq",
  };
  const catalog = {
    ...raw,
    nodes: raw.nodes.map((node) => {
      const category = aliases[node.category];
      if (!category) throw new Error(`Unknown category: ${node.category}`);
      return { ...node, category };
    }),
  };
  validateCatalog(catalog);
  return catalog;
}
export function completeSkillDemo(
  catalog: Catalog,
  progress: Progress,
  id: string,
): Progress {
  const node = catalog.nodes.find((n) => n.id === id);
  if (!node) throw new Error("Unknown skill");
  if (skillState(node, progress) === "locked")
    throw new Error("Prerequisites remaining");
  if (progress.completed[id]) return progress;
  return {
    ...progress,
    completed: {
      ...progress.completed,
      [id]: { source: "demo", completedAt: new Date().toISOString() },
    },
  };
}
export function skillState(
  node: SkillNode,
  progress: Progress,
): "completed" | "available" | "locked" {
  if (progress.completed[node.id] || progress.placedOut?.[node.id])
    return "completed";
  return node.prerequisites.every(
    (id) => !!(progress.completed[id] || progress.placedOut?.[id]),
  )
    ? "available"
    : "locked";
}
export function recommend(
  catalog: Catalog,
  profile: Profile,
  progress: Progress,
) {
  const available = catalog.nodes.filter(
    (n) => skillState(n, progress) === "available",
  );
  const preferred = available.filter((n) => n.category === profile.goal);
  const candidates = preferred.length ? preferred : available;
  // Among foundations, prioritize categories the learner has not tried.
  return [...candidates].sort(
    (a, b) =>
      Number(profile.familiarity[categoryFor(a.category).id] !== "new") -
      Number(profile.familiarity[categoryFor(b.category).id] !== "new"),
  )[0];
}
export function validateCatalog(catalog: Catalog) {
  const nodes = new Map(catalog.nodes.map((n) => [n.id, n]));
  if (nodes.size !== catalog.nodes.length)
    throw new Error("Duplicate skill IDs");
  const done = new Set<string>();
  const visiting = new Set<string>();
  const visit = (id: string) => {
    if (visiting.has(id)) throw new Error("Circular skill prerequisites");
    if (done.has(id)) return;
    const node = nodes.get(id);
    if (!node) throw new Error(`Missing prerequisite: ${id}`);
    visiting.add(id);
    node.prerequisites.forEach(visit);
    visiting.delete(id);
    done.add(id);
  };
  catalog.nodes.forEach((n) => visit(n.id));
}
export function layoutBranch(nodes: SkillNode[], width: number) {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const ranks = new Map<string, number>();
  const rank = (node: SkillNode): number => {
    if (ranks.has(node.id)) return ranks.get(node.id)!;
    const local = node.prerequisites
      .map((id) => byId.get(id))
      .filter((n): n is SkillNode => !!n);
    const value = local.length ? Math.max(...local.map(rank)) + 1 : 0;
    ranks.set(node.id, value);
    return value;
  };
  nodes.forEach(rank);
  const groups = new Map<number, SkillNode[]>();
  nodes.forEach((n) =>
    groups.set(rank(n), [...(groups.get(rank(n)) ?? []), n]),
  );
  return nodes.map((node) => {
    const group = groups.get(rank(node))!;
    return {
      node,
      x: ((group.indexOf(node) + 1) * width) / (group.length + 1),
      y: 65 + rank(node) * 154,
    };
  });
}
validateCatalog(demoCatalog);
