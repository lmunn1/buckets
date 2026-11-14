/**
 * Adapted from beUI Native's MIT-licensed ButtonRoot.
 * Copyright (c) 2026 beUI and Saurabh. Full notice: ./LICENSE.
 * Source: starc007/beui-native@ab3e58aa751bffccb725208db2c3740eb2bf643b
 * Uniwind classes map to the caller's StyleSheet tokens. Optional ripple and
 * cascade-label features are omitted; native press, hover, and reduced motion remain.
 */
import { useEffect } from "react";
import {
  Pressable,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useReducedMotionPreference } from "./use-reduced-motion";

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const spring = {
  stiffness: 500,
  damping: 30,
  mass: 0.6,
  reduceMotion: ReduceMotion.System,
} as const;

export function ButtonRoot({
  children,
  disabled = false,
  style,
  accessibilityState,
  onPressIn,
  onPressOut,
  onHoverIn,
  onHoverOut,
  ...props
}: Omit<PressableProps, "style"> & { style?: StyleProp<ViewStyle> }) {
  const reduce = useReducedMotionPreference();
  const scale = useSharedValue(1);
  const pressed = useSharedValue(false);
  const hovered = useSharedValue(false);
  useEffect(() => {
    if (reduce || disabled) scale.set(1);
  }, [reduce, disabled, scale]);
  const animatedStyle = useAnimatedStyle(
    () => ({
      transform: [{ scale: scale.get() }],
      opacity: disabled ? 0.42 : reduce && pressed.get() ? 0.7 : 1,
    }),
    [reduce, disabled],
  );
  return (
    <AnimatedPressable
      {...props}
      accessibilityRole="button"
      accessibilityState={{ ...accessibilityState, disabled }}
      disabled={disabled}
      style={[style, animatedStyle]}
      onPressIn={(event) => {
        pressed.set(true);
        if (!reduce) scale.set(withSpring(0.97, spring));
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        pressed.set(false);
        if (!reduce) scale.set(withSpring(hovered.get() ? 1.01 : 1, spring));
        onPressOut?.(event);
      }}
      onHoverIn={(event) => {
        hovered.set(true);
        if (!reduce && !pressed.get()) scale.set(withSpring(1.01, spring));
        onHoverIn?.(event);
      }}
      onHoverOut={(event) => {
        hovered.set(false);
        if (!reduce && !pressed.get()) scale.set(withSpring(1, spring));
        onHoverOut?.(event);
      }}
    >
      {children}
    </AnimatedPressable>
  );
}
