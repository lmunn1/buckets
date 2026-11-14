import type { PropsWithChildren } from "react";
import {
  GestureDetector,
  type useSimultaneousGestures,
} from "react-native-gesture-handler";
import type { SharedValue } from "react-native-reanimated";
export type MapGestureSurfaceProps = PropsWithChildren<{
  gesture: ReturnType<typeof useSimultaneousGestures>;
  x: SharedValue<number>;
  y: SharedValue<number>;
  scale: SharedValue<number>;
  width: SharedValue<number>;
  height: SharedValue<number>;
  minScale: SharedValue<number>;
  onSettled: () => void;
  onTap: (px: number, py: number, x: number, y: number, scale: number) => void;
}>;
export function MapGestureSurface({
  children,
  gesture,
}: MapGestureSurfaceProps) {
  return <GestureDetector gesture={gesture}>{children}</GestureDetector>;
}
