import type { PropsWithChildren } from "react";
import { useMemo } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import Animated, {
  Easing,
  FadeIn,
  FadeInDown,
  LinearTransition,
} from "react-native-reanimated";
import { useReducedMotionPreference } from "./ui/beui/use-reduced-motion";
import { Motion } from "@/constants/theme";

/** Occasional content reveals: state indication, never a delay before interaction. */
export function Reveal({
  children,
  style,
}: PropsWithChildren<{ style?: StyleProp<ViewStyle> }>) {
  const reduced = useReducedMotionPreference();
  const entering = useMemo(
    () =>
      reduced
        ? FadeIn.duration(Motion.feedback)
        : FadeInDown.duration(Motion.reveal).easing(
            Easing.bezier(0.23, 1, 0.32, 1),
          ),
    [reduced],
  );
  return (
    <Animated.View entering={entering} style={style}>
      {children}
    </Animated.View>
  );
}
export const contentChange = LinearTransition.duration(Motion.change);
