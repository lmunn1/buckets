import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { Action, Copy, Icon, palette, Tag, ui } from "./hoop-ui";
import {
  categoryFor,
  catalog,
  skillState,
  type Progress,
  type SkillNode,
} from "@/lib/learning-service";
import { closestAvailable } from "@/lib/graph-layout";

export function SkillDetails({
  node,
  progress,
  onSelect,
}: {
  node: SkillNode;
  progress: Progress;
  onSelect: (id: string) => void;
}) {
  const router = useRouter();
  const state = skillState(node, progress);
  const category = categoryFor(node.category);
  const closest = closestAvailable(catalog.nodes, node.id, progress.completed);
  return (
    <View style={{ gap: 12 }}>
      <View style={[ui.row, { justifyContent: "space-between" }]}>
        <Tag color={category.color}>{category.short}</Tag>
        <View style={[ui.row, { gap: 6 }]}>
          <Icon
            name={
              state === "locked"
                ? "lock"
                : state === "completed"
                  ? "check"
                  : "play"
            }
            size={15}
            color={state === "locked" ? palette.textSecondary : palette.success}
          />
          <Copy kind="caption" muted>
            {state === "available"
              ? "Ready to learn"
              : state === "completed"
                ? "Demo completed"
                : "Locked"}
          </Copy>
        </View>
      </View>
      <Copy kind="heading">{node.name}</Copy>
      <Copy kind="caption" muted numberOfLines={2}>
        {node.lesson.summary}
      </Copy>
      {node.prerequisites.length > 0 && (
        <View>
          <Copy kind="caption" style={{ fontWeight: "700", marginBottom: 4 }}>
            Prerequisites · all required
          </Copy>
          {node.prerequisites.map((id) => {
            const parent = catalog.nodes.find((n) => n.id === id)!;
            return (
              <Pressable
                key={id}
                accessibilityRole="button"
                accessibilityLabel={`View prerequisite ${parent.name}`}
                onPress={() => onSelect(id)}
                style={[
                  ui.row,
                  {
                    minHeight: 44,
                    borderBottomWidth: 1,
                    borderColor: palette.border,
                  },
                ]}
              >
                <Icon
                  name={progress.completed[id] ? "check" : "lock"}
                  size={17}
                  color={
                    progress.completed[id]
                      ? palette.success
                      : palette.textSecondary
                  }
                />
                <Copy kind="caption" style={{ flex: 1 }}>
                  {parent.name}
                </Copy>
                <Copy kind="caption" muted>
                  {categoryFor(parent.category).short}
                </Copy>
                <Icon name="arrow" size={15} />
              </Pressable>
            );
          })}
        </View>
      )}
      <Action
        label={
          state === "locked"
            ? "Find an available prerequisite"
            : state === "completed"
              ? "Review lesson"
              : "Start lesson"
        }
        icon="play"
        disabled={state === "locked" && !closest}
        onPress={() => {
          if (state === "locked" && closest) onSelect(closest.id);
          else
            router.push({ pathname: "/lesson/[id]", params: { id: node.id } });
        }}
      />
      <Copy kind="caption" muted>
        Assessment preview · completion is simulated.
      </Copy>
    </View>
  );
}
