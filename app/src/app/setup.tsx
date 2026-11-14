import { useState } from "react";
import { Pressable, View } from "react-native";
import { useRouter } from "expo-router";
import { FlowScreen } from "@/components/flow-screen";
import {
  Action,
  Brand,
  Copy,
  ErrorNotice,
  Icon,
  palette,
  ui,
  type IconName,
} from "@/components/hoop-ui";
import { categories, type Familiarity } from "@/lib/learning-service";
import { usePlayer } from "@/lib/player-store";
const options = [
  { id: "new", label: "New" },
  { id: "tried", label: "Tried it" },
  { id: "learning", label: "Learning" },
] as const;
export default function Setup() {
  const { draft, setDraft, saveProfile, busy, error, player } = usePlayer();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [answered, setAnswered] = useState<string[]>(
    player.profile ? categories.map((c) => c.id) : [],
  );
  const lastStep = Math.ceil(categories.length / 3);
  const visible = categories.slice((step - 1) * 3, step * 3);
  const answer = (
    id: (typeof categories)[number]["id"],
    value: Familiarity,
  ) => {
    setDraft({ ...draft, familiarity: { ...draft.familiarity, [id]: value } });
    setAnswered((a) => [...new Set([...a, id])]);
  };
  const finish = async (beginner = false) => {
    const profile = beginner
      ? {
          ...draft,
          familiarity: Object.fromEntries(
            categories.map((c) => [c.id, "new"]),
          ) as typeof draft.familiarity,
        }
      : draft;
    setDraft(profile);
    if (await saveProfile(profile)) router.replace("/(main)/home");
  };
  return (
    <FlowScreen>
      <Brand />
      <View style={[ui.row, { marginBottom: 24 }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => (step ? setStep(step - 1) : router.back())}
          style={{ padding: 12, marginLeft: -12 }}
        >
          <Icon name="back" />
        </Pressable>
        <View style={{ flex: 1, flexDirection: "row", gap: 6 }}>
          {Array.from({ length: lastStep + 1 }, (_, n) => n).map((n) => (
            <View
              key={n}
              style={{
                height: 4,
                borderRadius: 2,
                flex: 1,
                backgroundColor: n <= step ? palette.accent : palette.border,
              }}
            />
          ))}
        </View>
        <Copy kind="caption" muted>
          {step + 1} / {lastStep + 1}
        </Copy>
      </View>
      <Copy kind="title">
        {step === 0
          ? "What brings you to the court?"
          : step === 1
            ? "Start where you are."
            : "A little more about your game."}
      </Copy>
      <Copy muted style={{ marginTop: 10, marginBottom: 24 }}>
        {step === 0
          ? "Pick what you’d like to build first. You can explore every category."
          : "Everyone starts somewhere. This helps us choose your first foundations."}
      </Copy>
      {step === 0 ? (
        <View style={{ gap: 10 }}>
          {[
            { id: "basics", label: "Learn the basics", icon: "ball" },
            ...categories.map((c) => ({
              id: c.id,
              label: c.label,
              icon: c.icon,
            })),
          ].map((g) => (
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ selected: draft.goal === g.id }}
              key={g.id}
              onPress={() =>
                setDraft({ ...draft, goal: g.id as typeof draft.goal })
              }
              style={[
                ui.panel,
                ui.row,
                {
                  padding: 16,
                  borderColor:
                    draft.goal === g.id ? palette.accent : palette.border,
                },
              ]}
            >
              <Icon
                name={g.icon as IconName}
                color={
                  draft.goal === g.id ? palette.accent : palette.textSecondary
                }
              />
              <Copy style={{ flex: 1, fontWeight: "600" }}>{g.label}</Copy>
              {draft.goal === g.id && (
                <Icon name="check" color={palette.accent} size={18} />
              )}
            </Pressable>
          ))}
        </View>
      ) : (
        <View style={{ gap: 24 }}>
          {visible.map((c) => (
            <View key={c.id} style={{ gap: 10 }}>
              <View style={ui.row}>
                <Icon name={c.icon} color={c.color} />
                <Copy kind="heading">{c.label}</Copy>
              </View>
              <Copy kind="caption" muted>
                {c.cue}
              </Copy>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {options.map((o) => (
                  <Pressable
                    accessibilityRole="radio"
                    accessibilityState={{
                      selected:
                        answered.includes(c.id) &&
                        draft.familiarity[c.id] === o.id,
                    }}
                    key={o.id}
                    onPress={() => answer(c.id, o.id)}
                    style={{
                      minHeight: 48,
                      flex: 1,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor:
                        answered.includes(c.id) &&
                        draft.familiarity[c.id] === o.id
                          ? c.color
                          : palette.border,
                      backgroundColor: palette.backgroundElement,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Copy kind="caption" style={{ fontWeight: "600" }}>
                      {o.label}
                    </Copy>
                  </Pressable>
                ))}
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={() => answer(c.id, "unsure")}
                style={{ minHeight: 44, justifyContent: "center" }}
              >
                <Copy
                  kind="caption"
                  style={{
                    color:
                      answered.includes(c.id) &&
                      draft.familiarity[c.id] === "unsure"
                        ? c.color
                        : palette.textSecondary,
                  }}
                >
                  Not sure
                  {answered.includes(c.id) &&
                  draft.familiarity[c.id] === "unsure"
                    ? " · selected"
                    : ""}
                </Copy>
              </Pressable>
            </View>
          ))}
        </View>
      )}
      <View style={{ marginTop: "auto", paddingTop: 24, gap: 12 }}>
        <ErrorNotice message={error} />
        {step > 0 && (
          <Copy kind="caption" muted>
            New = first time · Tried it = familiar · Learning = practicing the
            basics.
          </Copy>
        )}
        <Action
          label={step === lastStep ? "Build my path" : "Continue"}
          busy={busy}
          disabled={step > 0 && !visible.every((c) => answered.includes(c.id))}
          onPress={() =>
            step === lastStep ? void finish() : setStep(step + 1)
          }
        />
        {step > 0 && (
          <Action
            label="I’m new to all of these"
            variant="quiet"
            busy={busy}
            onPress={() => void finish(true)}
          />
        )}
      </View>
    </FlowScreen>
  );
}
