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
import { categoryFor } from "@/lib/learning-service";
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
        <Copy kind="caption" muted>
          {player.profile?.experience === "experienced"
            ? "Plays regularly"
            : player.profile?.experience === "some"
              ? "Knows some basics"
              : "Starting with foundations"}
          {" / "}
          {player.profile?.sessionMinutes ?? 10}-minute sessions
        </Copy>
        <Copy kind="caption" muted>
          {Object.keys(player.progress.placedOut ?? {}).length} foundations
          placed from experience. Placement is separate from earned completion.
        </Copy>
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
          Your experience sets foundation placement; your focus guides the next
          lesson and your time sets practice length. Completed demo skills stay
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
