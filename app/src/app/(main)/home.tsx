import { useRouter } from "expo-router";
import { StyleSheet, View } from "react-native";
import { FlowScreen } from "@/components/flow-screen";
import { BasketballArt } from "@/components/basketball-art";
import { TreePreview } from "@/components/tree-preview";
import { ButtonRoot } from "@/components/ui/beui/button";
import { Action, Brand, Copy, Icon, palette, ui } from "@/components/hoop-ui";
import {
  categories,
  categoryFor,
  catalog,
  recommend,
  sourceNodeFor,
  sourceDocument,
  isQuiz,
} from "@/lib/learning-service";
import { usePlayer } from "@/lib/player-store";

export default function Home() {
  const { player } = usePlayer();
  const router = useRouter();
  if (!player.profile) return null;
  const node = recommend(catalog, player.profile, player.progress);
  const source = node && sourceNodeFor(node.id);
  const foundations = catalog.nodes.filter((n) => !n.prerequisites.length);
  const completed = foundations.filter(
    (n) => player.progress.completed[n.id],
  ).length;
  const dailyMinutes =
    sourceDocument.dailyWarmup.minutes +
    (catalog.nodes.some(
      (n) =>
        n.level === "beginner" &&
        player.progress.completed[n.id] &&
        !isQuiz(n.id),
    )
      ? 2
      : 0);
  const resumed = node && (player.progress.lessonSteps[node.id] ?? 0) > 0;
  return (
    <FlowScreen>
      <View
        style={[ui.row, { justifyContent: "space-between", marginBottom: 24 }]}
      >
        <Brand />
        <View style={styles.courtBadge}>
          <View style={styles.dot} />
          <Copy kind="eyebrow" style={{ fontSize: 10 }}>
            YOUR COURT
          </Copy>
        </View>
      </View>
      <Copy kind="display" style={{ marginBottom: 24 }}>
        Ready to get{String.fromCharCode(10)}better?
      </Copy>
      {Object.keys(player.progress.placedOut ?? {}).length > 0 && (
        <View style={{ marginBottom: 18 }}>
          <Copy kind="caption" muted>
            {Object.keys(player.progress.placedOut ?? {}).length} foundations
            placed from your experience. Review any skill on the tree.
          </Copy>
        </View>
      )}
      {node ? (
        <View style={styles.hero}>
          <View
            pointerEvents="none"
            style={{
              position: "absolute",
              right: -116,
              top: -12,
              opacity: 0.8,
            }}
          >
            <BasketballArt size={300} />
          </View>
          <View style={{ gap: 16, padding: 22, paddingBottom: 20 }}>
            <View style={ui.row}>
              <View style={styles.upNext}>
                <Icon name="play" size={12} color={palette.accent} />
                <Copy
                  kind="eyebrow"
                  style={{ color: palette.accent, fontSize: 10 }}
                >
                  {resumed ? "PICK UP WHERE YOU LEFT OFF" : "RECOMMENDED NEXT"}
                </Copy>
              </View>
            </View>
            <Copy
              kind="title"
              style={{ maxWidth: "78%", fontSize: 32, lineHeight: 36 }}
            >
              {source?.label ?? node.name}
            </Copy>
            <Copy
              kind="caption"
              style={{ maxWidth: "70%", color: palette.textSecondary }}
              numberOfLines={3}
            >
              {source?.lesson.text.cues[0] ?? node.lesson.summary}
            </Copy>
            <View style={[ui.row, { marginTop: 4, gap: 8 }]}>
              <Icon
                name={categoryFor(node.category).icon}
                size={16}
                color={palette.textSecondary}
              />
              <Copy kind="caption" muted>
                {categoryFor(node.category).short} ·{" "}
                {source?.tierName ?? "Beginner"}
              </Copy>
            </View>
          </View>
          <View style={{ padding: 12, paddingTop: 0 }}>
            <Action
              label={resumed ? "Continue lesson" : "Start lesson"}
              icon="play"
              onPress={() =>
                router.push({
                  pathname: "/lesson/[id]",
                  params: { id: node.id },
                })
              }
            />
          </View>
        </View>
      ) : (
        <View style={styles.hero}>
          <View style={{ padding: 22, gap: 16 }}>
            <Copy kind="heading">Every available lesson explored.</Copy>
            <Copy muted>Keep your game sharp with a recap.</Copy>
            <Action
              label="Explore skill tree"
              onPress={() => router.push("/(main)/tree")}
            />
          </View>
        </View>
      )}
      <ButtonRoot
        accessibilityLabel="Quick warm up"
        onPress={() =>
          router.push({ pathname: "/daily", params: { minutes: "5" } })
        }
        style={styles.warmup}
      >
        <View style={styles.warmIcon}>
          <Icon name="refresh" size={24} />
        </View>
        <View style={{ flex: 1, gap: 4 }}>
          <Copy style={{ fontWeight: "600", fontSize: 18 }}>Quick warm up</Copy>
          <Copy kind="caption" muted>
            {dailyMinutes} min · Grip, body & rhythm
          </Copy>
        </View>
        <Icon name="arrow" size={18} color={palette.textSecondary} />
      </ButtonRoot>
      <View style={{ marginTop: 28, gap: 14 }}>
        <View style={[ui.row, { justifyContent: "space-between" }]}>
          <Copy kind="heading">Your fundamentals</Copy>
          <Copy kind="caption" muted>
            {completed} / {foundations.length}
          </Copy>
        </View>
        <View
          accessibilityLabel={`${completed} of ${foundations.length} fundamentals completed`}
          style={{ flexDirection: "row", gap: 6 }}
        >
          {foundations.map((n) => (
            <View
              key={n.id}
              style={{
                height: 8,
                flex: 1,
                borderRadius: 3,
                backgroundColor: player.progress.completed[n.id]
                  ? palette.success
                  : palette.backgroundSelected,
              }}
            />
          ))}
        </View>
        <Copy kind="caption" muted>
          {completed
            ? `${foundations.length - completed} foundations to go. Keep building.`
            : "Four starting skills. A whole game ahead of you."}
        </Copy>
      </View>
      <View
        style={[
          ui.row,
          { marginTop: 30, marginBottom: 16, justifyContent: "space-between" },
        ]}
      >
        <Copy kind="heading">Your game, connected.</Copy>
        <Icon name="tree" color={palette.accent} size={20} />
      </View>
      <ButtonRoot
        accessibilityLabel="View skill tree"
        onPress={() => router.push("/(main)/tree")}
        style={styles.mapCard}
      >
        <View
          style={[
            ui.row,
            { padding: 18, paddingBottom: 0, justifyContent: "space-between" },
          ]}
        >
          <Copy kind="eyebrow" muted>
            {catalog.nodes.length} SKILLS · {categories.length} AREAS
          </Copy>
          <Icon name="expand" size={18} color={palette.textSecondary} />
        </View>
        <TreePreview />
        <View
          style={[
            ui.row,
            {
              padding: 18,
              borderTopWidth: 1,
              borderColor: palette.border,
              justifyContent: "space-between",
            },
          ]}
        >
          <View style={{ flex: 1, gap: 4 }}>
            <Copy style={{ fontWeight: "600" }}>
              Explore the full skill tree
            </Copy>
            <Copy kind="caption" muted>
              Find the next piece of your game.
            </Copy>
          </View>
          <Icon name="arrow" color={palette.accent} />
        </View>
      </ButtonRoot>
      <Copy kind="caption" muted style={{ marginTop: 20 }}>
        Progress saved on this device · assessments in preview
      </Copy>
    </FlowScreen>
  );
}
const styles = StyleSheet.create({
  courtBadge: {
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: palette.accent,
  },
  hero: {
    backgroundColor: "#1B1713",
    borderWidth: 1,
    borderColor: "#3B2D23",
    borderRadius: 24,
    borderCurve: "continuous",
    overflow: "hidden",
  },
  upNext: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: palette.accentSoft,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  warmup: {
    flexDirection: "row",
    gap: 14,
    alignItems: "center",
    marginTop: 14,
    padding: 16,
    backgroundColor: palette.backgroundElement,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 20,
  },
  warmIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: palette.backgroundSelected,
  },
  mapCard: {
    backgroundColor: palette.backgroundElement,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 22,
    overflow: "hidden",
  },
});
