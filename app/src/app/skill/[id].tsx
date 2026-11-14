import { useRouter } from "expo-router";
import { Pressable, View } from "react-native";
import {
  Action,
  Copy,
  Icon,
  palette,
  Panel,
  Section,
  ui,
} from "@/components/hoop-ui";
import {
  LessonShell,
  MissingSkill,
  SkillHeading,
  useSkill,
} from "@/components/lesson-shell";
import { categoryFor, catalog, skillState } from "@/lib/learning-service";
import { usePlayer } from "@/lib/player-store";
import { closestAvailable } from "@/lib/graph-layout";
export default function Skill() {
  const node = useSkill();
  const router = useRouter();
  const { player } = usePlayer();
  if (!node) return <MissingSkill />;
  const state = skillState(node, player.progress);
  const closest = closestAvailable(catalog.nodes, node.id, player.progress.completed);
  return (
    <LessonShell title="LESSON PREVIEW" close>
      <SkillHeading name={node.name} category={node.category} />
      <Copy>{node.lesson.summary}</Copy>
      <Section title="What you’ll do" />
      <View style={{ gap: 18 }}>
        {[
          "Learn the key idea",
          "See the movement",
          "Watch a demonstration",
          "Try it yourself",
        ].map((s, i) => (
          <View key={s} style={ui.row}>
            <Copy kind="eyebrow" style={{ color: palette.accent }}>
              {String(i + 1).padStart(2, "0")}
            </Copy>
            <Copy>{s}</Copy>
          </View>
        ))}
      </View>
      <Section
        title={
          node.prerequisites.length
            ? "Before this lesson"
            : "Ready when you are"
        }
        detail={
          node.prerequisites.length
            ? "Every prerequisite needs completion."
            : "This foundation has no prerequisites."
        }
      />
      {node.prerequisites.map((id) => {
        const prerequisite = catalog.nodes.find((n) => n.id === id);
        return (
          <Pressable
            key={id}
            accessibilityRole="button"
            onPress={() =>
              router.push({ pathname: "/skill/[id]", params: { id } })
            }
            style={[
              ui.row,
              {
                paddingVertical: 14,
                borderBottomWidth: 1,
                borderBottomColor: palette.border,
              },
            ]}
          >
            <Icon
              name={player.progress.completed[id] ? "check" : "lock"}
              color={
                player.progress.completed[id]
                  ? palette.success
                  : palette.textSecondary
              }
            />
            <View style={{ flex: 1 }}>
              <Copy>{prerequisite?.name ?? id}</Copy>
              <Copy kind="caption" muted>
                {prerequisite
                  ? categoryFor(prerequisite.category).label
                  : "Unknown prerequisite"}
              </Copy>
            </View>
            <Icon name="arrow" size={18} />
          </Pressable>
        );
      })}
      <Panel style={{ marginTop: 24 }}>
        <Copy kind="caption" muted>
          Demo lesson · videos and final assessment criteria will be populated
          later. Completion here is explicitly simulated.
        </Copy>
      </Panel>
      <View style={{ marginTop: 24, gap: 12 }}>
        <Action
          disabled={state === "locked" && !closest}
          label={
            state === "locked"
              ? "Start with an available prerequisite"
              : state === "completed"
                ? "Revisit lesson"
                : "Start lesson"
          }
          onPress={() =>
            router.replace({
              pathname: "/lesson/[id]",
              params: { id: state === "locked" && closest ? closest.id : node.id },
            })
          }
        />
        {state === "locked" && (
          <Action
            label="Explore other skills"
            variant="quiet"
            onPress={() => router.dismissTo("/(main)/tree")}
          />
        )}
      </View>
    </LessonShell>
  );
}
