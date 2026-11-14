import { memo, useEffect, useMemo, useRef, useState } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import {
  usePanGesture,
  usePinchGesture,
  useTapGesture,
  useSimultaneousGestures,
} from "react-native-gesture-handler";
import Animated, {
  cancelAnimation,
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
import { constrainMap, fitMap, zoomAt, type MapCamera } from "@/lib/map-camera";
import { MapGestureSurface } from "./map-gesture-surface";
import { Copy, Icon, palette, ui } from "./hoop-ui";
import { ButtonRoot } from "./ui/beui/button";
import { useReducedMotionPreference } from "./ui/beui/use-reduced-motion";

type SceneProps = {
  nodes: SkillNode[];
  progress: Progress;
  selected: string;
  category: string | null;
  fullPath: boolean;
  onSelect: (id: string) => void;
};
// No per-frame React updates or inverse node resizing: the whole scene transforms together.
const MapScene = memo(function MapScene({
  nodes,
  progress,
  selected,
  category,
  fullPath,
  detailed,
  onSelect,
}: SceneProps & { detailed: boolean }) {
  const points = useMemo(() => layoutGraph(nodes), [nodes]);
  const byId = useMemo(
    () => new Map(points.map((p) => [p.node.id, p])),
    [points],
  );
  const related = useMemo(
    () => neighborhood(nodes, selected, fullPath),
    [nodes, selected, fullPath],
  );
  const labels = useMemo(() => {
    const boxes: { x: number; y: number }[] = [];
    return new Set(
      points
        .filter((p) => related.has(p.node.id))
        .sort(
          (a, b) =>
            Number(b.node.id === selected) - Number(a.node.id === selected),
        )
        .filter((p) => {
          if (
            boxes.some(
              (b) => Math.abs(b.x - p.x) < 105 && Math.abs(b.y - p.y) < 42,
            )
          )
            return false;
          boxes.push(p);
          return true;
        })
        .map((p) => p.node.id),
    );
  }, [points, related, selected]);
  return (
    <>
      <Svg
        pointerEvents="none"
        width={MAP_SIZE}
        height={MAP_SIZE}
        viewBox="0 0 1400 1400"
      >
        {categories.map((c) => {
          const t =
            sourceDocument.tracks[c.id as keyof typeof sourceDocument.tracks]
              .layout;
          const a = t.angleStart,
            b = t.angleEnd;
          return (
            <Path
              key={c.id}
              d={`M700 700 L${700 + Math.cos(a) * 670} ${700 + Math.sin(a) * 670} A670 670 0 0 1 ${700 + Math.cos(b) * 670} ${700 + Math.sin(b) * 670} Z`}
              fill={c.color}
              fillOpacity={category && category !== c.id ? 0.025 : 0.095}
              stroke={c.color}
              strokeOpacity={0.18}
            />
          );
        })}
        {points.flatMap((p) =>
          p.node.prerequisites.map((id) => {
            const parent = byId.get(id)!;
            const active = related.has(id) && related.has(p.node.id);
            const dim =
              category &&
              p.node.category !== category &&
              parent.node.category !== category &&
              !active;
            return (
              <Line
                key={`${id}-${p.node.id}`}
                x1={parent.x}
                y1={parent.y}
                x2={p.x}
                y2={p.y}
                stroke={
                  active ? palette.accent : categoryFor(p.node.category).color
                }
                strokeWidth={active ? 2.2 : 1.4}
                strokeOpacity={dim ? 0.12 : active ? 0.95 : 0.48}
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
              stroke={categoryFor(p.node.category).color}
              strokeWidth={1.4}
              strokeOpacity={0.5}
              strokeDasharray="4 6"
            />
          ))}
        <Circle
          cx={700}
          cy={700}
          r={22}
          fill={palette.accentSoft}
          stroke={palette.accent}
          strokeWidth={2}
        />
        <SvgText
          x={700}
          y={704}
          fontSize={10}
          fontWeight="700"
          textAnchor="middle"
          fill={palette.accent}
        >
          YOU
        </SvgText>
      </Svg>
      {points.map((p) => {
        const state = skillState(p.node, progress),
          active = p.node.id === selected;
        const c = categoryFor(p.node.category);
        const dim =
          !!category && category !== p.node.category && !related.has(p.node.id);
        return (
          <Pressable
            key={p.node.id}
            accessibilityRole="button"
            accessibilityLabel={`${p.node.name}, ${state}`}
            accessibilityState={{ selected: active }}
            aria-pressed={active}
            onPress={() => onSelect(p.node.id)}
            style={{
              position: "absolute",
              left: p.x - 22,
              top: p.y - 22,
              width: 44,
              height: 44,
              alignItems: "center",
              justifyContent: "center",
              opacity: dim ? 0.2 : 1,
            }}
          >
            <View
              style={{
                width: active ? 38 : 26,
                height: active ? 38 : 26,
                borderRadius: 22,
                borderWidth: active ? 2.5 : 1.5,
                borderColor: active ? palette.accent : c.color,
                backgroundColor: active
                  ? palette.accentSoft
                  : palette.backgroundElement,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon
                name={
                  state === "completed"
                    ? "check"
                    : state === "locked"
                      ? "lock"
                      : c.icon
                }
                color={active ? palette.accent : c.color}
                size={active ? 20 : 13}
              />
              {state === "available" && (
                <View
                  style={{
                    position: "absolute",
                    right: -3,
                    bottom: -2,
                    width: 7,
                    height: 7,
                    borderRadius: 4,
                    backgroundColor: palette.success,
                    borderWidth: 1,
                    borderColor: palette.background,
                  }}
                />
              )}
            </View>
            {detailed && labels.has(p.node.id) && (
              <Copy
                pointerEvents="none"
                kind="caption"
                style={{
                  position: "absolute",
                  top: 44,
                  width: 108,
                  fontSize: 12,
                  lineHeight: 16,
                  fontWeight: "600",
                  textAlign: "center",
                  backgroundColor: palette.background,
                }}
              >
                {sourceNodeFor(p.node.id)?.label ?? p.node.name}
              </Copy>
            )}
          </Pressable>
        );
      })}
    </>
  );
});
export function ConnectedSkillMap({
  nodes,
  progress,
  selected,
  category,
  fullPath,
  focusVersion = 0,
  onSelect,
  onCategory,
}: SceneProps & { focusVersion?: number; onCategory: (id: string) => void }) {
  const points = useMemo(() => layoutGraph(nodes), [nodes]);
  const size = useRef({ width: 360, height: 350 });
  const initialized = useRef(false);
  const [detailed, setDetailed] = useState(false);
  const x = useSharedValue(0),
    y = useSharedValue(0),
    scale = useSharedValue(0.25);
  const width = useSharedValue(360),
    height = useSharedValue(350),
    minScale = useSharedValue(0.12);
  const panX = useSharedValue(0),
    panY = useSharedValue(0);
  const pinchX = useSharedValue(0),
    pinchY = useSharedValue(0),
    pinchScale = useSharedValue(1);
  const anchorX = useSharedValue(0),
    anchorY = useSharedValue(0),
    pinching = useSharedValue(false);
  const reduced = useReducedMotionPreference();
  const finish = () => {
    "worklet";
    scheduleOnRN(setDetailed, scale.get() >= 0.65);
  };
  const pan = usePanGesture({
    minDistance: 6,
    maxPointers: 1,
    onActivate: () => {
      cancelAnimation(x);
      cancelAnimation(y);
      cancelAnimation(scale);
      panX.set(x.get());
      panY.set(y.get());
    },
    onUpdate: (e) => {
      if (pinching.get()) return;
      const next = constrainMap(
        {
          x: panX.get() + e.translationX,
          y: panY.get() + e.translationY,
          scale: scale.get(),
        },
        { width: width.get(), height: height.get() },
      );
      x.set(next.x);
      y.set(next.y);
    },
    onDeactivate: finish,
  });
  const pinch = usePinchGesture({
    onActivate: (e) => {
      cancelAnimation(x);
      cancelAnimation(y);
      cancelAnimation(scale);
      pinching.set(true);
      pinchX.set(x.get());
      pinchY.set(y.get());
      pinchScale.set(scale.get());
      anchorX.set(e.focalX);
      anchorY.set(e.focalY);
    },
    onUpdate: (e) => {
      const nextScale = Math.max(
        minScale.get(),
        Math.min(2.8, pinchScale.get() * e.scale),
      );
      const next = constrainMap(
        {
          scale: nextScale,
          x:
            e.focalX -
            ((anchorX.get() - pinchX.get()) * nextScale) / pinchScale.get(),
          y:
            e.focalY -
            ((anchorY.get() - pinchY.get()) * nextScale) / pinchScale.get(),
        },
        { width: width.get(), height: height.get() },
      );
      scale.set(next.scale);
      x.set(next.x);
      y.set(next.y);
    },
    onDeactivate: () => {
      pinching.set(false);
      finish();
    },
  });
  const selectNearest = (
    px: number,
    py: number,
    tx: number,
    ty: number,
    zoom: number,
  ) => {
    const nearest = points
      .map((p) => ({
        p,
        distance: Math.hypot(p.x * zoom + tx - px, p.y * zoom + ty - py),
      }))
      .sort((a, b) => a.distance - b.distance)[0];
    if (nearest && nearest.distance <= 26) onSelect(nearest.p.node.id);
  };
  // Screen-sized hit radius stays usable even when the world is zoomed out.
  const tap = useTapGesture({
    maxDistance: 6,
    maxDuration: 300,
    onActivate: (e) => {
      scheduleOnRN(selectNearest, e.x, e.y, x.get(), y.get(), scale.get());
    },
  });
  const gesture = useSimultaneousGestures(pan, pinch, tap);
  const world = useAnimatedStyle(() => ({
    transform: [
      { translateX: x.get() },
      { translateY: y.get() },
      { scale: scale.get() },
    ],
  }));
  const move = (camera: MapCamera, animate = true) => {
    const next = constrainMap(camera, size.current);
    const config = {
      duration: reduced || !animate ? 0 : 230,
      easing: Easing.out(Easing.cubic),
    };
    x.set(withTiming(next.x, config));
    y.set(withTiming(next.y, config));
    scale.set(withTiming(next.scale, config));
    setDetailed(next.scale >= 0.65);
  };
  const focus = () => {
    const p = points.find((p) => p.node.id === selected)!;
    move({
      scale: 1.35,
      x: size.current.width / 2 - p.x * 1.35,
      y: (size.current.height - 50) / 2 - p.y * 1.35,
    });
  };
  const zoom = (
    factor: number,
    anchor = { x: size.current.width / 2, y: size.current.height / 2 },
  ) => {
    move(
      zoomAt(
        { x: x.get(), y: y.get(), scale: scale.get() },
        Math.max(minScale.get(), Math.min(2.8, scale.get() * factor)),
        anchor,
      ),
    );
  };
  // Node taps preserve context. Search/recenter explicitly request a focus.
  useEffect(() => {
    if (initialized.current && focusVersion) focus();
  }, [focusVersion]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (initialized.current)
      move(
        fitMap(
          size.current,
          category
            ? points.filter((p) => p.node.category === category)
            : points,
        ),
      );
  }, [category]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <View
      style={{
        flex: 1,
        minHeight: 0,
        overflow: "hidden",
        backgroundColor: palette.background,
      }}
      onLayout={(e) => {
        const next = e.nativeEvent.layout;
        if (next.width <= 0 || next.height <= 0) return;
        const previous = size.current;
        size.current = { width: next.width, height: next.height };
        width.set(next.width);
        height.set(next.height);
        minScale.set(Math.min(next.width, next.height) / 1650);
        if (!initialized.current) {
          initialized.current = true;
          if (focusVersion) focus();
          else
            move(
              fitMap(
                size.current,
                category
                  ? points.filter((p) => p.node.category === category)
                  : points,
              ),
              false,
            );
        } else if (
          previous.width !== next.width ||
          previous.height !== next.height
        ) {
          move(
            {
              x: x.get() + (next.width - previous.width) / 2,
              y: y.get() + (next.height - previous.height) / 2,
              scale: scale.get(),
            },
            false,
          );
        }
      }}
    >
      <MapGestureSurface
        gesture={gesture}
        x={x}
        y={y}
        scale={scale}
        width={width}
        height={height}
        minScale={minScale}
        onSettled={() => setDetailed(scale.get() >= 0.65)}
        onTap={selectNearest}
      >
        <View testID="skill-map-canvas" style={StyleSheet.absoluteFill}>
          <Animated.View
            testID="skill-map-world"
            style={[
              {
                position: "absolute",
                width: MAP_SIZE,
                height: MAP_SIZE,
                transformOrigin: [0, 0, 0],
                ...(Platform.OS === "web"
                  ? { willChange: "transform" as const }
                  : {}),
              },
              world,
            ]}
          >
            <MapScene
              nodes={nodes}
              progress={progress}
              selected={selected}
              category={category}
              fullPath={fullPath}
              detailed={detailed}
              onSelect={onSelect}
            />
          </Animated.View>
        </View>
      </MapGestureSurface>
      {!category &&
        !detailed &&
        categories.map((c) => (
          <RegionBadge
            key={c.id}
            category={c}
            x={x}
            y={y}
            scale={scale}
            width={width}
            height={height}
            onPress={() => onCategory(c.id)}
          />
        ))}
      <View
        pointerEvents="none"
        style={{
          position: "absolute",
          top: 12,
          left: 16,
          backgroundColor: palette.background + "E8",
          padding: 8,
          borderRadius: 8,
        }}
      >
        <Copy kind="caption" muted style={{ fontSize: 11 }}>
          Drag to explore · Pinch to zoom
        </Copy>
        <Copy kind="caption" style={{ fontSize: 11, color: palette.success }}>
          ● Ready{" "}
          <Copy kind="caption" muted style={{ fontSize: 11 }}>
            ✓ Complete · Lock = prerequisite needed
          </Copy>
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
          onPress={() => move(fitMap(size.current, points))}
          style={[
            ui.secondary,
            {
              height: 46,
              borderRadius: 12,
              paddingHorizontal: 12,
              justifyContent: "center",
            },
          ]}
        >
          <Copy kind="caption">Overview</Copy>
        </ButtonRoot>
        <ButtonRoot
          accessibilityLabel="Recenter selected skill"
          onPress={() => focus()}
          style={[ui.secondary, controlStyle]}
        >
          <Icon name="focus" size={18} />
        </ButtonRoot>
        <ButtonRoot
          accessibilityLabel="Zoom out"
          onPress={() => zoom(0.8)}
          style={[ui.secondary, controlStyle]}
        >
          <Icon name="minus" size={18} />
        </ButtonRoot>
        <ButtonRoot
          accessibilityLabel="Zoom in"
          onPress={() => zoom(1.25)}
          style={[ui.secondary, controlStyle]}
        >
          <Icon name="plus" size={18} />
        </ButtonRoot>
      </View>
    </View>
  );
}

const controlStyle = {
  width: 46,
  height: 46,
  borderRadius: 12,
  alignItems: "center" as const,
  justifyContent: "center" as const,
};

function RegionBadge({
  category,
  x,
  y,
  scale,
  width,
  height,
  onPress,
}: {
  category: (typeof categories)[number];
  x: import("react-native-reanimated").SharedValue<number>;
  y: import("react-native-reanimated").SharedValue<number>;
  scale: import("react-native-reanimated").SharedValue<number>;
  width: import("react-native-reanimated").SharedValue<number>;
  height: import("react-native-reanimated").SharedValue<number>;
  onPress: () => void;
}) {
  const t =
    sourceDocument.tracks[category.id as keyof typeof sourceDocument.tracks]
      .layout;
  const angle = (t.angleStart + t.angleEnd) / 2;
  const px = 700 + Math.cos(angle) * 650,
    py = 700 + Math.sin(angle) * 650;
  const position = useAnimatedStyle(() => ({
    opacity: scale.get() < 0.65 ? 1 : 0,
    transform: [
      {
        translateX: Math.max(
          8,
          Math.min(width.get() - 112, px * scale.get() + x.get() - 52),
        ),
      },
      {
        translateY: Math.max(
          62,
          Math.min(height.get() - 110, py * scale.get() + y.get() - 22),
        ),
      },
    ],
  }));
  return (
    <Animated.View
      style={[{ position: "absolute", top: 0, left: 0 }, position]}
    >
      <ButtonRoot
        accessibilityLabel={`Explore ${category.label}`}
        onPress={onPress}
        style={{
          width: 104,
          minHeight: 44,
          paddingHorizontal: 8,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: category.color + "88",
          backgroundColor: palette.background + "F2",
          flexDirection: "row",
          gap: 6,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon name={category.icon} size={15} color={category.color} />
        <Copy
          kind="caption"
          style={{ fontSize: 11, fontWeight: "600", color: category.color }}
        >
          {category.short}
        </Copy>
      </ButtonRoot>
    </Animated.View>
  );
}
