import { useRouter } from "expo-router";
import { View } from "react-native";
import { FlowScreen } from "@/components/flow-screen";
import {
  Action,
  Brand,
  Copy,
  Icon,
  palette,
  Panel,
  Section,
  ui,
} from "@/components/hoop-ui";
import { categories, catalog } from "@/lib/learning-service";
import { usePlayer } from "@/lib/player-store";
export default function Profile() {
  const { player } = usePlayer();
  const router = useRouter();
  const completed = catalog.nodes.filter(
    (n) => player.progress.completed[n.id],
  );
  const recent = [...completed]
    .sort((a, b) =>
      player.progress.completed[b.id].completedAt.localeCompare(
        player.progress.completed[a.id].completedAt,
      ),
    )
    .slice(0, 3);
  return (
    <FlowScreen>
      <Brand />
      <Copy kind="title">Your game is growing.</Copy>
      <Copy muted style={{ marginVertical: 14 }}>
        Small steps. Real practice. Your own pace.
      </Copy>
      <Panel>
        <Copy kind="title">
          {completed.length} <Copy muted>of {catalog.nodes.length}</Copy>
        </Copy>
        <Copy muted>
          Preview skills completed ·{" "}
          {Math.round((completed.length / catalog.nodes.length) * 100)}%
        </Copy>
        <Copy kind="caption" muted>
          {player.progress.practiceCount} practice sessions saved on this device
        </Copy>
      </Panel>
      <Section title="By category" />
      <View style={{ gap: 20 }}>
        {categories.map((c) => {
          const skills = catalog.nodes.filter((n) => n.category === c.id);
          const count = skills.filter(
            (n) => player.progress.completed[n.id],
          ).length;
          return (
            <View key={c.id} style={{ gap: 10 }}>
              <View style={ui.row}>
                <Icon name={c.icon} color={c.color} />
                <Copy style={{ flex: 1 }}>{c.label}</Copy>
                <Copy kind="caption" muted>
                  {count} / {skills.length}
                </Copy>
              </View>
              <View
                style={{
                  height: 6,
                  backgroundColor: palette.backgroundSelected,
                  borderRadius: 4,
                }}
              >
                <View
                  style={{
                    height: 6,
                    width: `${skills.length ? (count / skills.length) * 100 : 0}%`,
                    backgroundColor: palette.success,
                    borderRadius: 4,
                  }}
                />
              </View>
            </View>
          );
        })}
      </View>
      <Section title="Recent lessons" />
      {recent.length ? (
        recent.map((n) => (
          <View key={n.id} style={{ marginBottom: 8 }}>
            <Action
              label={n.name}
              variant="secondary"
              icon="check"
              onPress={() =>
                router.push({ pathname: "/lesson/[id]", params: { id: n.id } })
              }
            />
          </View>
        ))
      ) : (
        <Copy muted>Your first completed lesson will appear here.</Copy>
      )}
      <Section title="Make it yours" />
      <Action
        label="Preferences & local data"
        variant="secondary"
        icon="settings"
        onPress={() => router.push("/settings")}
      />
      <Copy kind="caption" muted style={{ marginTop: 20 }}>
        Demo completions are separate from verified mastery. Your profile and
        progress are stored locally.
      </Copy>
    </FlowScreen>
  );
}
