import { View } from "react-native";
import { useState } from "react";
import { useRouter } from "expo-router";
import {
  Action,
  Copy,
  ErrorNotice,
  Panel,
  Section,
} from "@/components/hoop-ui";
import { LessonShell } from "@/components/lesson-shell";
import { categories, categoryFor } from "@/lib/learning-service";
import { usePlayer } from "@/lib/player-store";
export default function Settings() {
  const { player, setDraft, reset, busy, error } = usePlayer();
  const router = useRouter();
  const [confirmReset, setConfirmReset] = useState(false);
  return (
    <LessonShell title="YOUR STARTING POINT">
      <Copy kind="title">Make this your game.</Copy>
      <Section title="Your focus" />
      <Panel>
        <Copy>
          {player.profile?.goal === "basics"
            ? "Learn the basics"
            : categoryFor(player.profile?.goal ?? "handling").label}
        </Copy>
        {categories.map((c) => (
          <View
            key={c.id}
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              gap: 12,
            }}
          >
            <Copy kind="caption" muted>
              {c.label}
            </Copy>
            <Copy kind="caption">
              {player.profile?.familiarity[c.id] ?? "new"}
            </Copy>
          </View>
        ))}
      </Panel>
      <View style={{ gap: 12, marginTop: 24 }}>
        <Action
          label="Edit my starting point"
          variant="secondary"
          onPress={() => {
            if (player.profile) setDraft(player.profile);
            router.push("/setup");
          }}
        />
        <Copy kind="caption" muted>
          Your answers guide recommendations. Completed demo skills stay
          completed when you edit your preferences.
        </Copy>
      </View>
      <Section title="This preview" />
      <Copy muted>
        Your profile and demo progress are saved only on this device. The
        curriculum and camera assessment are integration points for your
        teammates.
      </Copy>
      <View style={{ marginTop: 24, gap: 16 }}>
        <ErrorNotice message={error} />
        <Action
          label="Reset this demo"
          variant="secondary"
          busy={busy}
          onPress={() => setConfirmReset(true)}
        />
      </View>
      {confirmReset && (
        <Panel>
          <Copy kind="heading">Reset this demo?</Copy>
          <Copy muted>
            This clears the local profile, practice sessions, lesson positions
            and simulated completions.
          </Copy>
          <Action
            label="Keep my progress"
            variant="secondary"
            onPress={() => setConfirmReset(false)}
          />
          <Action
            label="Clear local demo data"
            busy={busy}
            onPress={() => {
              void reset().then((ok) => {
                if (ok) router.replace("/");
              });
            }}
          />
        </Panel>
      )}
    </LessonShell>
  );
}
