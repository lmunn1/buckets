/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://unistyl.es/), etc.
 */

import { Platform } from "react-native";

export const Colors = {
  light: {
    text: "#F4F5F7",
    background: "#0B0C0E",
    backgroundElement: "#17191C",
    backgroundSelected: "#23262B",
    textSecondary: "#AEB3BC",
    accent: "#FF7A00",
    accentSoft: "#302116",
    border: "#2B2E33",
    success: "#99D85A",
  },
  dark: {
    text: "#F4F5F7",
    background: "#0B0C0E",
    backgroundElement: "#17191C",
    backgroundSelected: "#23262B",
    textSecondary: "#AEB3BC",
    accent: "#FF7A00",
    accentSoft: "#302116",
    border: "#2B2E33",
    success: "#99D85A",
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: "system-ui",
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: "ui-serif",
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: "ui-rounded",
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: "ui-monospace",
  },
  default: {
    sans: "normal",
    serif: "serif",
    rounded: "normal",
    mono: "monospace",
  },
  web: {
    sans: "var(--font-display)",
    serif: "var(--font-serif)",
    rounded: "var(--font-rounded)",
    mono: "var(--font-mono)",
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 48,
} as const;

export const Radius = { small: 12, medium: 18, large: 28, pill: 999 } as const;
export const BottomTabInset = 0;
export const MaxContentWidth = 560;

export const Motion = { feedback: 120, change: 180, reveal: 250 } as const;
