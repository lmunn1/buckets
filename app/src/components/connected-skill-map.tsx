import { useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import {
  GestureDetector,
  usePanGesture,
  usePinchGesture,
  useSimultaneousGestures,
} from "react-native-gesture-handler";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { scheduleOnRN } from "react-native-worklets";
import Svg, { Circle, Line, Path, Text as SvgText } from "react-native-svg";
import {
  categories,
  categoryFor,
  sourceDocument,
  sourceNodeFor,
  skillState,
  type Progress,
  type SkillNode,
} from "@/lib/learning-service";
import { layoutGraph, MAP_SIZE, neighborhood } from "@/lib/graph-layout";
import { Copy, Icon, palette, ui } from "./hoop-ui";
import { ButtonRoot } from "./ui/beui/button";
import { useReducedMotionPreference } from "./ui/beui/use-reduced-motion";

type Camera = { x: number; y: number; scale: number };
const ease = Easing.bezier(0.23, 1, 0.32, 1);
export function ConnectedSkillMap({
  nodes,
  progress,
  selected,
  category,
  fullPath,
  onSelect,
}: {
  nodes: SkillNode[];
  progress: Progress;
  selected: string;
  category: string | null;
  fullPath: boolean;
  onSelect: (id: string) => void;
}) {
  const points = useMemo(() => layoutGraph(nodes), [nodes]);
  const byId = useMemo(
    () => new Map(points.map((p) => [p.node.id, p])),
    [points],
  );
  const related = useMemo(
    () => neighborhood(nodes, selected, fullPath),
    [nodes, selected, fullPath],
  );
  const [size, setSize] = useState({ width: 360, height: 350 });
  const [camera, setCamera] = useState<Camera>({ x: 0, y: 0, scale: 1.7 });
  const x = useSharedValue(0),
    y = useSharedValue(0),
    scale = useSharedValue(1.7);
  const panX = useSharedValue(0),
    panY = useSharedValue(0);
  const pinchX = useSharedValue(0),
    pinchY = useSharedValue(0),
    pinchScale = useSharedValue(1.7);
  const anchorX = useSharedValue(0),
    anchorY = useSharedValue(0),
    pinching = useSharedValue(false);
  const reduced = useReducedMotionPreference();
  const pan = usePanGesture({
    minDistance: 7,
    maxPointers: 1,
    onActivate: () => {
      panX.set(x.get());
      panY.set(y.get());
    },
    onUpdate: (e) => {
      if (!pinching.get()) {
        x.set(panX.get() + e.translationX);
        y.set(panY.get() + e.translationY);
      }
    },
    onDeactivate: () => {
      scheduleOnRN(setCamera, { x: x.get(), y: y.get(), scale: scale.get() });
    },
  });
  const pinch = usePinchGesture({
    onActivate: (e) => {
      pinching.set(true);
      pinchX.set(x.get());
      pinchY.set(y.get());
      pinchScale.set(scale.get());
      anchorX.set(e.focalX);
      anchorY.set(e.focalY);
    },
    onUpdate: (e) => {
      const next = Math.max(0.12, Math.min(3, pinchScale.get() * e.scale));
      scale.set(next);
      x.set(
        e.focalX - ((anchorX.get() - pinchX.get()) * next) / pinchScale.get(),
      );
      y.set(
        e.focalY - ((anchorY.get() - pinchY.get()) * next) / pinchScale.get(),
      );
    },
    onDeactivate: () => {
      pinching.set(false);
      scheduleOnRN(setCamera, { x: x.get(), y: y.get(), scale: scale.get() });
    },
  });
  const gesture = useSimultaneousGestures(pan, pinch);
  const world = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.get() },
      { translateY: y.get() },
      { scale: scale.get() },
    ],
  }));
  const move = (next: Camera, animate = true) => {
    const config = { duration: reduced || !animate ? 0 : 250, easing: ease };
    x.set(withTiming(next.x, config));
    y.set(withTiming(next.y, config));
    scale.set(withTiming(next.scale, config));
    setCamera(next);
  };
  const focus = (width = size.width, height = size.height) => {
    const p = byId.get(selected)!;
    move(
      { scale: 1.7, x: width / 2 - p.x * 1.7, y: height * 0.4 - p.y * 1.7 },
      false,
    );
  };
  const zoom = (factor: number) => {
    const previous = scale.get();
    const next = Math.max(0.12, Math.min(3, previous * factor));
    move({
      scale: next,
      x: size.width / 2 - ((size.width / 2 - x.get()) * next) / previous,
      y: size.height / 2 - ((size.height / 2 - y.get()) * next) / previous,
    });
  };
  const labels = useMemo(() => {
    if (camera.scale < 0.7) return new Set<string>();
    const ordered = points
      .filter((p) => related.has(p.node.id))
      .sort(
        (a, b) =>
          Number(b.node.id === selected) - Number(a.node.id === selected),
      );
    const boxes: { x: number; y: number }[] = [];
    const visible = new Set<string>();
    for (const p of ordered) {
      const px = p.x * camera.scale + camera.x,
        py = p.y * camera.scale + camera.y + 28;
      if (
        boxes.some((b) => Math.abs(b.x - px) < 110 && Math.abs(b.y - py) < 42)
      )
        continue;
      boxes.push({ x: px, y: py });
      visible.add(p.node.id);
    }
    return visible;
  }, [points, related, selected, camera]);
  const inverse = 1 / camera.scale;
  return (
    <View
      style={{
        flex: 1,
        minHeight: 0,
        overflow: "hidden",
        backgroundColor: palette.background,
      }}
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        setSize({ width, height });
        focus(width, height);
      }}
    >
      <GestureDetector gesture={gesture}>
        <View testID="skill-map-canvas" style={StyleSheet.absoluteFill}>
          <Animated.View
            testID="skill-map-world"
            style={[
              {
                position: "absolute",
                width: MAP_SIZE,
                height: MAP_SIZE,
                transformOrigin: [0, 0, 0],
              },
              world,
            ]}
          >
            <Svg width={MAP_SIZE} height={MAP_SIZE} viewBox="0 0 1400 1400">
              {categories.map((c) => {
                const track =
                  sourceDocument.tracks[
                    c.id as keyof typeof sourceDocument.tracks
                  ];
                const a = track.layout.angleStart,
                  b = track.layout.angleEnd;
                return (
                  <Path
                    key={c.id}
                    d={`M700 700 L${700 + Math.cos(a) * 660} ${700 + Math.sin(a) * 660} A660 660 0 0 1 ${700 + Math.cos(b) * 660} ${700 + Math.sin(b) * 660} Z`}
                    fill={c.color}
                    fillOpacity={category && category !== c.id ? 0.012 : 0.035}
                    stroke={c.color}
                    strokeOpacity={0.09}
                  />
                );
              })}
              {[180, 330, 480, 630].map((r) => (
                <Circle
                  key={r}
                  cx={700}
                  cy={700}
                  r={r}
                  fill="none"
                  stroke={palette.border}
                  strokeWidth={1}
                  strokeOpacity={0.5}
                  strokeDasharray="2 12"
                />
              ))}
              {points.flatMap((p) =>
                p.node.prerequisites.map((id) => {
                  const parent = byId.get(id)!;
                  const active = related.has(id) && related.has(p.node.id);
                  return (
                    <Line
                      key={`${id}-${p.node.id}`}
                      x1={parent.x}
                      y1={parent.y}
                      x2={p.x}
                      y2={p.y}
                      stroke={
                        active
                          ? palette.accent
                          : categoryFor(p.node.category).color
                      }
                      strokeWidth={active ? 1.8 : 0.8}
                      strokeOpacity={
                        active
                          ? 0.9
                          : category &&
                              category !== p.node.category &&
                              category !== parent.node.category
                            ? 0.09
                            : 0.12
                      }
                    />
                  );
                }),
              )}
              {points
                .filter((p) => !p.node.prerequisites.length)
                .map((p) => (
                  <Line
                    key={p.node.id}
                    x1={700}
                    y1={700}
                    x2={p.x}
                    y2={p.y}
                    stroke={palette.accent}
                    strokeWidth={1}
                    strokeOpacity={0.3}
                    strokeDasharray="3 6"
                  />
                ))}
              <Circle
                cx={700}
                cy={700}
                r={18}
                fill={palette.accentSoft}
                stroke={palette.accent}
                strokeWidth={2}
              />
              <SvgText
                fontFamily="Inter_500Medium"
                x={700}
                y={704}
                fontSize={9}
                fontWeight="700"
                textAnchor="middle"
                fill={palette.accent}
              >
                YOU
              </SvgText>
              {camera.scale < 0.6 &&
                size.height > 320 &&
                categories.map((c) => {
                  const t =
                    sourceDocument.tracks[
                      c.id as keyof typeof sourceDocument.tracks
                    ].layout;
                  const angle = (t.angleStart + t.angleEnd) / 2;
                  return (
                    <SvgText
                fontFamily="Inter_500Medium"
                      key={c.id}
                      x={700 + Math.cos(angle) * 645}
                      y={700 + Math.sin(angle) * 645}
                      fontSize={11 * inverse}
                      fill={c.color}
                      textAnchor="middle"
                    >
                      {c.short}
                    </SvgText>
                  );
                })}
            </Svg>
            {points.map((p) => {
              const state = skillState(p.node, progress),
                active = p.node.id === selected;
              const dim =
                category &&
                category !== p.node.category &&
                !related.has(p.node.id);
              const color = active
                ? palette.accent
                : state === "locked"
                  ? palette.textSecondary
                  : palette.success;
              const diameter =
                camera.scale < 0.6 ? (active ? 12 : 6) : active ? 46 : 30;
              const label = labels.has(p.node.id);
              return (
                <View
                  key={p.node.id}
                  style={{
                    position: "absolute",
                    left: p.x - 24 * inverse,
                    top: p.y - 24 * inverse,
                    width: 48 * inverse,
                    alignItems: "center",
                    opacity: dim
                      ? 0.2
                      : state === "locked" && !related.has(p.node.id)
                        ? 0.5
                        : 1,
                  }}
                >
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${p.node.name}, ${state}`}
                    accessibilityState={{ selected: active }}
                    onPress={() => onSelect(p.node.id)}
                    style={{
                      width: 48 * inverse,
                      height: 48 * inverse,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <View
                      style={{
                        width: diameter * inverse,
                        height: diameter * inverse,
                        borderRadius: 24 * inverse,
                        borderWidth: (active ? 2 : 1.2) * inverse,
                        borderColor: color,
                        backgroundColor: active
                          ? palette.accentSoft
                          : palette.backgroundElement,
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      {camera.scale >= 0.6 && (
                        <Icon
                          name={
                            state === "completed"
                              ? "check"
                              : state === "locked"
                                ? "lock"
                                : categoryFor(p.node.category).icon
                          }
                          size={(active ? 23 : 14) * inverse}
                          color={color}
                        />
                      )}
                    </View>
                  </Pressable>
                  {label && (
                    <Copy
                      pointerEvents="none"
                      kind="caption"
                      style={{
                        width: 110 * inverse,
                        fontSize: 12 * inverse,
                        lineHeight: 16 * inverse,
                        fontWeight: "600",
                        textAlign: "center",
                        backgroundColor: palette.background,
                      }}
                    >
                      {sourceNodeFor(p.node.id)?.label ?? p.node.name}
                    </Copy>
                  )}
                </View>
              );
            })}
          </Animated.View>
        </View>
      </GestureDetector>
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: 12,
          left: 16,
          backgroundColor: palette.background + "E8",
          paddingHorizontal: 8,
          paddingVertical: 4,
          borderRadius: 8,
        }}
      >
        <Copy kind="caption" muted style={{ fontSize: 11 }}>
          Drag to explore · Pinch to zoom
        </Copy>
      </View>
      <View
        style={{
          position: "absolute",
          bottom: 12,
          right: 16,
          flexDirection: "row",
          gap: 6,
        }}
      >
        <ButtonRoot
          accessibilityLabel="Show whole graph"
          onPress={() => {
            const next = Math.min(size.width / 1500, size.height / 1450);
            move({
              scale: next,
              x: size.width / 2 - 700 * next,
              y: size.height / 2 - 700 * next,
            });
          }}
          style={[
            ui.secondary,
            {
              minHeight: 48,
              borderRadius: 12,
              paddingHorizontal: 12,
              justifyContent: "center",
            },
          ]}
        >
          <Copy kind="caption">Overview</Copy>
        </ButtonRoot>
        {[
          {
            label: "Recenter selected skill",
            icon: "focus" as const,
            press: () => focus(),
          },
          {
            label: "Zoom out",
            icon: "minus" as const,
            press: () => zoom(0.75),
          },
          { label: "Zoom in", icon: "plus" as const, press: () => zoom(1.33) },
        ].map((b) => (
          <ButtonRoot
            key={b.label}
            accessibilityLabel={b.label}
            onPress={b.press}
            style={[
              ui.secondary,
              {
                width: 48,
                height: 48,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 12,
              },
            ]}
          >
            <Icon name={b.icon} size={18} />
          </ButtonRoot>
        ))}
      </View>
    </View>
  );
}
