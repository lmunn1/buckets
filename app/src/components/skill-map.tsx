import { Pressable, ScrollView, View, useWindowDimensions } from "react-native";
import Svg, { Circle, Line, Path } from "react-native-svg";
import { Copy, Icon, palette, ui } from "./hoop-ui";
import {
  categories,
  categoryFor,
  layoutBranch,
  skillState,
  type CategoryId,
  type SkillNode,
  type Progress,
} from "@/lib/learning-service";

export function CategoryMap({
  onSelect,
  preview = false,
}: {
  onSelect: (id: CategoryId) => void;
  preview?: boolean;
}) {
  const { width: screenWidth } = useWindowDimensions();
  const width = Math.min(screenWidth - 48, 512);
  const height = preview ? 300 : 340;
  const cx = width / 2;
  const cy = height / 2;
  const points = categories.map((category, i) => {
    const angle = -Math.PI / 2 + (i * Math.PI * 2) / categories.length;
    return {
      category,
      x: cx + Math.cos(angle) * (width * 0.34),
      y: cy + Math.sin(angle) * (height * 0.34),
    };
  });
  return (
    <View style={{ width: "100%", height, marginVertical: 16 }}>
      <Svg
        width="100%"
        height={height}
        style={{ position: "absolute" }}
        viewBox={`0 0 ${width} ${height}`}
      >
        <Circle
          cx={cx}
          cy={cy}
          r={width * 0.33}
          stroke={palette.border}
          strokeWidth={1}
          fill="none"
          strokeDasharray="3 8"
        />
        {points.map((p) => (
          <Line
            key={p.category.id}
            x1={cx}
            y1={cy}
            x2={p.x}
            y2={p.y}
            stroke={p.category.color}
            strokeOpacity={0.45}
            strokeWidth={1}
          />
        ))}
      </Svg>
      <View
        style={{
          position: "absolute",
          left: cx - 34,
          top: cy - 34,
          width: 68,
          height: 68,
          borderRadius: 34,
          borderWidth: 2,
          borderColor: palette.accent,
          backgroundColor: palette.accentSoft,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon name="hoop" color={palette.accent} size={31} />
        <Copy kind="eyebrow" style={{ fontSize: 9, color: palette.accent }}>
          YOU
        </Copy>
      </View>
      {points.map(({ category: c, x, y }) => (
        <Pressable
          key={c.id}
          accessibilityRole="button"
          accessibilityLabel={`Explore ${c.label}`}
          onPress={() => onSelect(c.id)}
          style={({ pressed }) => ({
            position: "absolute",
            left: x - 48,
            top: y - 31,
            width: 96,
            minHeight: 76,
            alignItems: "center",
            gap: 6,
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <View
            style={{
              width: 50,
              height: 50,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: c.color,
              backgroundColor: palette.backgroundElement,
              alignItems: "center",
              justifyContent: "center",
              transform: [{ rotate: "45deg" }],
            }}
          >
            <View style={{ transform: [{ rotate: "-45deg" }] }}>
              <Icon name={c.icon} color={c.color} size={23} />
            </View>
          </View>
          <Copy
            kind="caption"
            style={{
              textAlign: "center",
              fontWeight: "600",
              backgroundColor: palette.background,
              paddingHorizontal: 4,
            }}
          >
            {c.short}
          </Copy>
        </Pressable>
      ))}
    </View>
  );
}

export function BranchMap({
  nodes,
  progress,
  recommended,
  onSelect,
}: {
  nodes: SkillNode[];
  progress: Progress;
  recommended?: string;
  onSelect: (id: string) => void;
}) {
  const { width: screenWidth } = useWindowDimensions();
  const width = Math.max(340, Math.min(screenWidth - 48, 512));
  const maxRow = nodes.reduce(
    (count, n) =>
      Math.max(
        count,
        nodes.filter(
          (other) => other.prerequisites.join() === n.prerequisites.join(),
        ).length,
      ),
    1,
  );
  const canvasWidth = Math.max(width, maxRow * 150);
  const positions = layoutBranch(nodes, canvasWidth);
  const height = Math.max(220, ...positions.map((p) => p.y + 110));
  if (!nodes.length)
    return <Copy muted>This category is ready for your curriculum.</Copy>;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator
      contentContainerStyle={{ minWidth: "100%" }}
    >
      <View style={{ width: canvasWidth, height }}>
        <Svg
          width={canvasWidth}
          height={height}
          style={{ position: "absolute" }}
        >
          {positions.flatMap((p) =>
            p.node.prerequisites.map((id) => {
              const from = positions.find((point) => point.node.id === id);
              if (!from) return null;
              const color = progress.completed[id]
                ? categoryFor(p.node.category).color
                : palette.border;
              return (
                <Path
                  key={`${id}-${p.node.id}`}
                  d={`M ${from.x} ${from.y + 28} C ${from.x} ${from.y + 95}, ${p.x} ${p.y - 75}, ${p.x} ${p.y - 28}`}
                  stroke={color}
                  strokeWidth={2}
                  fill="none"
                />
              );
            }),
          )}
        </Svg>
        {positions.map(({ node, x, y }) => {
          const state = skillState(node, progress);
          const color = categoryFor(node.category).color;
          const next = node.id === recommended;
          return (
            <Pressable
              key={node.id}
              accessibilityRole="button"
              accessibilityLabel={`${node.name}, ${state}${next ? ", recommended" : ""}`}
              onPress={() => onSelect(node.id)}
              style={({ pressed }) => ({
                position: "absolute",
                left: x - 66,
                top: y - 34,
                width: 132,
                alignItems: "center",
                gap: 8,
                opacity: pressed ? 0.65 : 1,
              })}
            >
              <View
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 20,
                  transform: [{ rotate: "45deg" }],
                  borderWidth: next ? 3 : 1,
                  borderColor: next
                    ? palette.accent
                    : state === "locked"
                      ? palette.border
                      : color,
                  backgroundColor:
                    state === "completed" ? color : palette.backgroundElement,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <View style={{ transform: [{ rotate: "-45deg" }] }}>
                  <Icon
                    name={
                      state === "locked"
                        ? "lock"
                        : state === "completed"
                          ? "check"
                          : categoryFor(node.category).icon
                    }
                    color={
                      state === "completed"
                        ? palette.background
                        : state === "locked"
                          ? palette.textSecondary
                          : color
                    }
                    size={26}
                  />
                </View>
              </View>
              <Copy
                kind="caption"
                style={{
                  fontWeight: "700",
                  textAlign: "center",
                  backgroundColor: palette.background,
                  paddingHorizontal: 3,
                }}
              >
                {node.name}
              </Copy>
              <Copy
                kind="eyebrow"
                style={{
                  fontSize: 9,
                  color: next ? palette.accent : palette.textSecondary,
                }}
              >
                {next
                  ? "START HERE"
                  : state === "completed"
                    ? "DEMO COMPLETE"
                    : state === "available"
                      ? "READY"
                      : "LOCKED"}
              </Copy>
            </Pressable>
          );
        })}
      </View>
    </ScrollView>
  );
}

export function SkillList({
  nodes,
  progress,
  onSelect,
}: {
  nodes: SkillNode[];
  progress: Progress;
  onSelect: (id: string) => void;
}) {
  return (
    <View style={{ gap: 8 }}>
      {nodes.map((node) => (
        <Pressable
          key={node.id}
          accessibilityRole="button"
          onPress={() => onSelect(node.id)}
          style={[ui.panel, ui.row, { padding: 16 }]}
        >
          <Icon
            name={
              skillState(node, progress) === "locked"
                ? "lock"
                : skillState(node, progress) === "completed"
                  ? "check"
                  : categoryFor(node.category).icon
            }
            color={categoryFor(node.category).color}
          />
          <View style={{ flex: 1 }}>
            <Copy style={{ fontWeight: "600" }}>{node.name}</Copy>
            <Copy kind="caption" muted>
              {skillState(node, progress)}
              {node.prerequisites.length
                ? ` · ${node.prerequisites.length} prerequisites`
                : ""}
            </Copy>
          </View>
          <Icon name="arrow" size={17} />
        </Pressable>
      ))}
    </View>
  );
}
