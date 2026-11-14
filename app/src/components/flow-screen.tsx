import type { PropsWithChildren, ReactNode } from "react";
import { useIsFocused } from "expo-router";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Colors, MaxContentWidth, Spacing } from "@/constants/theme";

export function FlowScreen({
  children,
  overlay,
}: PropsWithChildren<{ overlay?: ReactNode }>) {
  const focused = useIsFocused();
  return (
    <SafeAreaView
      style={styles.safeArea}
      aria-hidden={!focused}
      importantForAccessibility={focused ? "auto" : "no-hide-descendants"}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.content, overlay ? { paddingBottom: 112 } : null]}>
          {children}
        </View>
      </ScrollView>
      {overlay}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.dark.background },
  scrollContent: { flexGrow: 1, alignItems: "center" },
  content: {
    width: "100%",
    maxWidth: MaxContentWidth,
    flexGrow: 1,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.five,
  },
});
