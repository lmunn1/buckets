/**
 * Adapted from beUI Native TabsList/TabsTrigger (MIT, beUI and Saurabh).
 * Source: starc007/beui-native@ab3e58aa751bffccb725208db2c3740eb2bf643b
 * Full notice: ./LICENSE. Keeps measured indicator + controlled selection;
 * removes Uniwind, scrolling, clipped label layers, and content switching.
 */
import { useEffect, useState } from "react";
import { Pressable, View, type LayoutRectangle } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { Copy, palette } from "@/components/hoop-ui";
import { useReducedMotionPreference } from "./use-reduced-motion";

export function SegmentedControl({
  value,
  options,
  onChange,
  label,
}: {
  value: string;
  options: { value: string; label: string; hint?: string }[];
  onChange: (value: string) => void;
  label: string;
}) {
  const [layouts, setLayouts] = useState<Record<string, LayoutRectangle>>({});
  const reduced = useReducedMotionPreference();
  const x = useSharedValue(0),
    width = useSharedValue(0),
    height = useSharedValue(0);
  useEffect(() => {
    const box = layouts[value];
    if (!box) return;
    const config = {
      duration: reduced ? 0 : 180,
      easing: Easing.bezier(0.77, 0, 0.175, 1),
    };
    x.set(withTiming(box.x, config));
    width.set(withTiming(box.width, config));
    height.set(box.height);
  }, [value, layouts, reduced, x, width, height]);
  const indicator = useAnimatedStyle(() => ({
    width: width.get(),
    height: height.get(),
    transform: [{ translateX: x.get() }],
  }));
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={label}
      style={{
        flexDirection: "row",
        padding: 4,
        borderRadius: 16,
        backgroundColor: palette.backgroundElement,
        borderWidth: 1,
        borderColor: palette.border,
      }}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: "absolute",
            left: 4,
            top: 4,
            backgroundColor: palette.accentSoft,
            borderWidth: 1,
            borderColor: palette.accent,
            borderRadius: 12,
          },
          indicator,
        ]}
      />
      {options.map((option) => (
        <Pressable
          key={option.value}
          accessibilityRole="radio"
          accessibilityLabel={
            option.hint ? `${option.label} ${option.hint}` : option.label
          }
          aria-checked={value === option.value}
          accessibilityState={{ checked: value === option.value }}
          onPress={() => onChange(option.value)}
          onLayout={(event) => {
            const box = event.nativeEvent.layout;
            setLayouts((previous) => {
              const old = previous[option.value];
              return old &&
                old.x === box.x - 4 &&
                old.width === box.width &&
                old.height === box.height
                ? previous
                : { ...previous, [option.value]: { ...box, x: box.x - 4 } };
            });
          }}
          style={({ pressed }) => ({
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            minHeight: option.hint ? 74 : 48,
            paddingHorizontal: 8,
            paddingVertical: 12,
            gap: 2,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Copy
            style={{
              fontWeight: "600",
              fontSize: option.hint ? 22 : 14,
              color: value === option.value ? palette.accent : palette.text,
            }}
          >
            {option.label}
          </Copy>
          {option.hint && (
            <Copy kind="caption" muted>
              {option.hint}
            </Copy>
          )}
        </Pressable>
      ))}
    </View>
  );
}
