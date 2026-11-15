import {
  Image,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type StyleProp,
  type ViewStyle,
  ActivityIndicator,
  type TextProps,
  type ViewProps,
  type ColorValue,
  type TextStyle,
} from "react-native";
import CircleDot from "lucide-react-native/icons/circle-dot";
import Target from "lucide-react-native/icons/target";
import Goal from "lucide-react-native/icons/goal";
import Shield from "lucide-react-native/icons/shield";
import Zap from "lucide-react-native/icons/zap";
import Brain from "lucide-react-native/icons/brain";
import House from "lucide-react-native/icons/house";
import Network from "lucide-react-native/icons/network";
import Check from "lucide-react-native/icons/check";
import LockKeyhole from "lucide-react-native/icons/lock-keyhole";
import ArrowRight from "lucide-react-native/icons/arrow-right";
import ChevronLeft from "lucide-react-native/icons/chevron-left";
import X from "lucide-react-native/icons/x";
import Play from "lucide-react-native/icons/play";
import SlidersHorizontal from "lucide-react-native/icons/sliders-horizontal";
import Search from "lucide-react-native/icons/search";
import Clock3 from "lucide-react-native/icons/clock-3";
import RotateCcw from "lucide-react-native/icons/rotate-ccw";
import UserRound from "lucide-react-native/icons/user-round";
import Footprints from "lucide-react-native/icons/footprints";
import MoveHorizontal from "lucide-react-native/icons/move-horizontal";
import ExternalLink from "lucide-react-native/icons/external-link";
import ChevronDown from "lucide-react-native/icons/chevron-down";
import List from "lucide-react-native/icons/list";
import Maximize2 from "lucide-react-native/icons/maximize-2";
import Plus from "lucide-react-native/icons/plus";
import Minus from "lucide-react-native/icons/minus";
import Crosshair from "lucide-react-native/icons/crosshair";
import Pause from "lucide-react-native/icons/pause";
import CircleCheck from "lucide-react-native/icons/circle-check";
import Trophy from "lucide-react-native/icons/trophy";
import BookOpen from "lucide-react-native/icons/book-open";
import Camera from "lucide-react-native/icons/camera";
import FlipHorizontal2 from "lucide-react-native/icons/flip-horizontal-2";
import Flame from "lucide-react-native/icons/flame";
import Svg, { Circle, Path } from "react-native-svg";
import type { PropsWithChildren } from "react";
import { Colors } from "@/constants/theme";
import { isLoaded } from "expo-font";
import { ButtonRoot } from "./ui/beui/button";

export const palette = Colors.dark;
export const type = StyleSheet.create({
  display: {
    fontSize: 38,
    lineHeight: 42,
    fontWeight: "700",
    letterSpacing: -1.2,
  },
  title: {
    fontSize: 32,
    lineHeight: 39,
    fontWeight: "700",
    letterSpacing: -0.9,
  },
  heading: {
    fontSize: 21,
    lineHeight: 28,
    fontWeight: "600",
    letterSpacing: -0.4,
  },
  body: { fontSize: 16, lineHeight: 24 },
  caption: { fontSize: 14, lineHeight: 21 },
  eyebrow: {
    fontSize: 12,
    lineHeight: 18,
    fontWeight: "700",
    letterSpacing: 1.1,
  },
});
export function Copy({
  kind = "body",
  muted = false,
  style,
  ...props
}: TextProps & { kind?: keyof typeof type; muted?: boolean }) {
  const resolved = (StyleSheet.flatten([
    type[kind],
    { color: muted ? palette.textSecondary : palette.text },
    style,
  ]) ?? {}) as TextStyle;
  const weight =
    resolved.fontWeight === "bold" ? 700 : Number(resolved.fontWeight) || 400;
  const fontFamily =
    weight >= 700
      ? "Inter_700Bold"
      : weight >= 600
        ? "Inter_600SemiBold"
        : weight >= 500
          ? "Inter_500Medium"
          : "Inter_400Regular";
  const loaded = isLoaded(fontFamily);
  return (
    <Text
      {...props}
      style={[resolved, loaded && { fontFamily, fontWeight: "normal" }]}
    />
  );
}
const iconSet = {
  ball: CircleDot,
  target: Target,
  hoop: Goal,
  shield: Shield,
  move: Zap,
  brain: Brain,
  home: House,
  tree: Network,
  check: Check,
  lock: LockKeyhole,
  arrow: ArrowRight,
  back: ChevronLeft,
  close: X,
  play: Play,
  settings: SlidersHorizontal,
  search: Search,
  clock: Clock3,
  refresh: RotateCcw,
  profile: UserRound,
  footprints: Footprints,
  passing: MoveHorizontal,
  external: ExternalLink,
  down: ChevronDown,
  list: List,
  expand: Maximize2,
  plus: Plus,
  minus: Minus,
  focus: Crosshair,
  pause: Pause,
  success: CircleCheck,
  trophy: Trophy,
  book: BookOpen,
  flame: Flame,
  camera: Camera,
  flip: FlipHorizontal2,
} as const;
export type IconName = keyof typeof iconSet;
/** One open-source native SVG icon family throughout the app. */
export function Icon({
  name,
  size = 22,
  color = palette.text,
}: {
  name: IconName;
  size?: number;
  color?: ColorValue;
}) {
  // Hoop's original basketball mark complements the native Lucide UI family.
  if (name === "ball")
    return (
      <Svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      >
        <Circle cx={12} cy={12} r={9} />
        <Path d="M3 12h18M12 3v18M5.5 5.5q13 6.5 0 13M18.5 5.5q-13 6.5 0 13" />
      </Svg>
    );
  const Component = iconSet[name];
  return <Component size={size} color={color} strokeWidth={1.8} />;
}
export function Action({
  label,
  onPress,
  variant = "primary",
  busy = false,
  disabled = false,
  icon = "arrow",
}: {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "quiet";
  busy?: boolean;
  disabled?: boolean;
  icon?: IconName;
}) {
  const fg = variant === "primary" ? palette.background : palette.text;
  return (
    <ButtonRoot
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || busy, busy }}
      disabled={disabled || busy}
      onPress={onPress}
      style={[
        ui.action,
        variant === "primary"
          ? ui.primary
          : variant === "secondary"
            ? ui.secondary
            : ui.quiet,
      ]}
    >
      {busy ? (
        <ActivityIndicator color={fg} />
      ) : (
        <Icon name={icon} color={fg} size={19} />
      )}
      <Copy
        style={{
          color: fg,
          fontSize: 17,
          lineHeight: 24,
          fontWeight: "600",
          flexShrink: 1,
          textAlign: "center",
        }}
      >
        {label}
      </Copy>
    </ButtonRoot>
  );
}
export function Panel({
  children,
  style,
  ...props
}: PropsWithChildren<ViewProps>) {
  return (
    <View {...props} style={[ui.panel, style]}>
      {children}
    </View>
  );
}
const LOGO = require("@/assets/images/hoopquest-logo.png");
const LOGO_HEIGHT_PER_WIDTH = 341 / 1759; // the PNG is 1759 x 341
/** Logo width (pt) per placement. */
const BRAND_WIDTH = { header: 140, profile: 210, hero: 260 } as const;
/**
 * The HoopQuest wordmark, at an explicit width and height so it never takes
 * the PNG's intrinsic size. header: top-left of a screen (in a row with other
 * controls); profile / hero: centered. Never wider than the screen minus the
 * page gutters. Callers add any margin with `style`.
 */
export function Brand({
  size = "header",
  style,
}: {
  size?: keyof typeof BRAND_WIDTH;
  style?: StyleProp<ViewStyle>;
}) {
  const { width: screenWidth } = useWindowDimensions();
  const width = Math.min(BRAND_WIDTH[size], screenWidth - 48);
  const height = Math.round(width * LOGO_HEIGHT_PER_WIDTH);
  return (
    <View
      accessible
      accessibilityRole="header"
      accessibilityLabel="HoopQuest"
      style={[
        { width, height, alignSelf: size === "header" ? "flex-start" : "center" },
        style,
      ]}
    >
      <Image source={LOGO} resizeMode="contain" style={{ width, height }} />
    </View>
  );
}
export function Tag({
  children,
  color = palette.accent,
}: PropsWithChildren<{ color?: string }>) {
  return (
    <View
      style={{
        alignSelf: "flex-start",
        borderWidth: 1,
        borderColor: color + "65",
        borderRadius: 7,
        paddingHorizontal: 8,
        paddingVertical: 4,
      }}
    >
      <Copy kind="eyebrow" style={{ color, fontSize: 12 }}>
        {children}
      </Copy>
    </View>
  );
}
export function ErrorNotice({ message }: { message: string | null }) {
  return message ? (
    <Panel style={{ borderColor: palette.accent }}>
      <Copy>{message}</Copy>
    </Panel>
  ) : null;
}
export function Section({ title, detail }: { title: string; detail?: string }) {
  return (
    <View style={{ gap: 5, marginTop: 24, marginBottom: 14 }}>
      <Copy kind="heading">{title}</Copy>
      {detail && (
        <Copy kind="caption" muted>
          {detail}
        </Copy>
      )}
    </View>
  );
}
export const ui = StyleSheet.create({
  panel: {
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.backgroundElement,
    borderRadius: 20,
    borderCurve: "continuous",
    padding: 20,
    gap: 12,
  },
  action: {
    minHeight: 56,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 14,
    borderCurve: "continuous",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  primary: {
    backgroundColor: palette.accent,
    borderWidth: 1,
    borderColor: "#FF9A3C",
  },
  secondary: {
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.backgroundElement,
  },
  quiet: { backgroundColor: "transparent" },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  stack: { gap: 16 },
});
