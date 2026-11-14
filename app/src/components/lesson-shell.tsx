import { useLocalSearchParams, useRouter } from "expo-router";
import { Pressable, View } from "react-native";
import { FlowScreen } from "./flow-screen";
import { Action, Copy, Icon, Tag, ui } from "./hoop-ui";
import { categoryFor, catalog } from "@/lib/learning-service";
import type { PropsWithChildren } from "react";

export function useSkill() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return catalog.nodes.find((n) => n.id === id);
}
export function LessonShell({
  children,
  title,
  close = false,
}: PropsWithChildren<{ title: string; close?: boolean }>) {
  const router = useRouter();
  return (
    <FlowScreen>
      <View style={[ui.row, { marginBottom: 24 }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={close ? "Close" : "Go back"}
          onPress={() =>
            router.canGoBack() ? router.back() : router.replace("/(main)/tree")
          }
          style={{ padding: 12, marginLeft: -12 }}
        >
          <Icon name={close ? "close" : "back"} />
        </Pressable>
        <Copy kind="eyebrow" muted>
          {title}
        </Copy>
      </View>
      {children}
    </FlowScreen>
  );
}
export function MissingSkill() {
  const router = useRouter();
  return (
    <LessonShell title="SKILL NOT FOUND">
      <Copy kind="title">This skill isn’t in the catalog.</Copy>
      <Copy muted style={{ marginVertical: 20 }}>
        The curriculum may have changed. Return to the tree to choose a lesson.
      </Copy>
      <Action
        label="Back to skill tree"
        onPress={() => router.replace("/(main)/tree")}
      />
    </LessonShell>
  );
}
export function SkillHeading({
  name,
  category,
}: {
  name: string;
  category: string;
}) {
  return (
    <View style={{ gap: 14, marginBottom: 24 }}>
      <Tag color={categoryFor(category).color}>
        {categoryFor(category).label.toUpperCase()}
      </Tag>
      <Copy kind="title">{name}</Copy>
    </View>
  );
}
