import { useState } from "react";
import { useRouter } from "expo-router";
import { Pressable, View } from "react-native";
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
import { ButtonRoot } from "@/components/ui/beui/button";
import { SegmentedControl } from "@/components/ui/beui/segmented-control";
import { Reveal } from "@/components/motion";
import {
  catalog,
  categories,
  categoryFor,
  placementFor,
  recommend,
  type Profile,
} from "@/lib/learning-service";
import { usePlayer } from "@/lib/player-store";

export default function Setup() {
  const { draft, setDraft, saveProfile, busy, error, player } = usePlayer();
  const router = useRouter();
  const [step, setStep] = useState(0);
  const experience = draft.experience ?? "new";
  const placedOut = placementFor(draft);
  const next = recommend(catalog, draft, { ...player.progress, placedOut });
  const patch = (p: Partial<Profile>) => setDraft({ ...draft, ...p });
  const finish = async () => {
    if (await saveProfile(draft)) router.replace("/(main)/home");
  };
  return (
    <FlowScreen>
      <Brand />
      <View style={[ui.row, { marginBottom: 28 }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => (step ? setStep(step - 1) : router.back())}
          style={{ padding: 12, marginLeft: -12 }}
        >
          <Icon name="back" />
        </Pressable>
        <View style={{ flex: 1, flexDirection: "row", gap: 6 }}>
          {[0, 1, 2].map((i) => (
            <View
              key={i}
              style={{
                flex: 1,
                height: 4,
                borderRadius: 4,
                backgroundColor: i <= step ? palette.accent : palette.border,
              }}
            />
          ))}
        </View>
        <Copy kind="caption" muted>
          {step + 1} / 3
        </Copy>
      </View>
      <Reveal key={step} style={{ gap: 12 }}>
        <Copy kind="eyebrow" style={{ color: palette.accent }}>
          {["YOUR STARTING POINT", "YOUR GAME", "YOUR PACE"][step]}
        </Copy>
        <Copy kind="display" style={{ fontSize: 34, lineHeight: 39 }}>
          {
            [
              "How's your game?",
              "What do you want\nto work on?",
              "Make room for\na little progress.",
            ][step]
          }
        </Copy>
        <Copy muted style={{ marginBottom: 16 }}>
          {
            [
              "We'll start at a level that feels right. You can revisit any foundation.",
              "Pick one focus. Your full skill tree stays open to explore.",
              "Choose a usual session length. You can change it every time.",
            ][step]
          }
        </Copy>
        {step === 0 && (
          <View style={{ gap: 12 }}>
            {[
              {
                id: "new",
                label: "Brand new",
                hint: "Start with the essentials. No experience needed.",
                icon: "ball",
              },
              {
                id: "some",
                label: "Know some basics",
                hint: "I've played a little. Move past first steps.",
                icon: "target",
              },
              {
                id: "experienced",
                label: "Play regularly",
                hint: "I'm comfortable with the basics. Build from there.",
                icon: "trophy",
              },
            ].map((o) => (
              <Choice
                key={o.id}
                label={o.label}
                hint={o.hint}
                icon={o.icon as IconName}
                selected={experience === o.id}
                onPress={() =>
                  patch({ experience: o.id as Profile["experience"] })
                }
              />
            ))}
            <Copy kind="caption" muted style={{ marginTop: 8 }}>
              {experience === "new"
                ? "You'll begin with the foundations, one clear lesson at a time."
                : `${Object.keys(placedOut).length} foundations placed from your experience. This is a starting estimate, not a skill assessment.`}
            </Copy>
          </View>
        )}
        {step === 1 && (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>
            {[
              {
                id: "basics",
                short: "All-round game",
                icon: "ball",
                color: palette.accent,
              },
              ...categories,
            ].map((c) => (
              <ButtonRoot
                key={c.id}
                accessibilityRole="radio"
                accessibilityLabel={c.short}
                accessibilityState={{ checked: draft.goal === c.id }}
                onPress={() => patch({ goal: c.id as Profile["goal"] })}
                style={{
                  width: "48%",
                  minHeight: 90,
                  padding: 14,
                  gap: 10,
                  borderRadius: 16,
                  borderWidth: 1,
                  borderColor: draft.goal === c.id ? c.color : palette.border,
                  backgroundColor:
                    draft.goal === c.id
                      ? c.color + "18"
                      : palette.backgroundElement,
                }}
              >
                <View style={[ui.row, { justifyContent: "space-between" }]}>
                  <Icon name={c.icon as IconName} color={c.color} size={23} />
                  {draft.goal === c.id && (
                    <Icon name="check" size={16} color={c.color} />
                  )}
                </View>
                <Copy style={{ fontWeight: "600", fontSize: 14 }}>
                  {c.short}
                </Copy>
              </ButtonRoot>
            ))}
          </View>
        )}
        {step === 2 && (
          <View style={{ gap: 24 }}>
            <SegmentedControl
              label="Usual practice time"
              value={String(draft.sessionMinutes ?? 10)}
              onChange={(v) =>
                patch({ sessionMinutes: Number(v) as 5 | 10 | 20 })
              }
              options={[
                { value: "5", label: "5", hint: "min" },
                { value: "10", label: "10", hint: "min" },
                { value: "20", label: "20", hint: "min" },
              ]}
            />
            <View
              style={[
                ui.panel,
                { padding: 22, gap: 14, borderColor: palette.accent + "66" },
              ]}
            >
              <View style={ui.row}>
                <Icon name="play" color={palette.accent} size={18} />
                <Copy kind="eyebrow" style={{ color: palette.accent }}>
                  YOUR FIRST STEP
                </Copy>
              </View>
              <Copy kind="heading">
                {next?.name ?? "Explore your skill tree"}
              </Copy>
              <Copy muted>
                {next?.lesson.summary ?? "Find a skill you'd like to learn."}
              </Copy>
              <Copy kind="caption" muted>
                {draft.goal === "basics"
                  ? "All-round foundations"
                  : categoryFor(draft.goal).label}{" "}
                · {draft.sessionMinutes ?? 10}-minute practice sessions
              </Copy>
              <View
                style={{
                  gap: 10,
                  borderTopWidth: 1,
                  borderColor: palette.border,
                  paddingTop: 16,
                }}
              >
                {[
                  "Understand the idea",
                  "Watch the demonstration",
                  "Try it on court",
                ].map((label, i) => (
                  <View key={label} style={ui.row}>
                    <Copy kind="caption" style={{ color: palette.accent }}>
                      0{i + 1}
                    </Copy>
                    <Copy kind="caption">{label}</Copy>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}
      </Reveal>
      <View style={{ marginTop: "auto", gap: 12, paddingTop: 28 }}>
        <ErrorNotice message={error} />
        <Action
          label={step === 2 ? "Let's play" : "Continue"}
          icon="arrow"
          busy={busy}
          onPress={() => (step === 2 ? void finish() : setStep(step + 1))}
        />
        <Copy kind="caption" muted style={{ textAlign: "center" }}>
          You can change your starting point in Settings.
        </Copy>
      </View>
    </FlowScreen>
  );
}
function Choice({
  label,
  hint,
  icon,
  selected,
  onPress,
}: {
  label: string;
  hint: string;
  icon: IconName;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <ButtonRoot
      accessibilityRole="radio"
      accessibilityLabel={label}
      accessibilityState={{ checked: selected }}
      onPress={onPress}
      style={[
        ui.row,
        {
          padding: 18,
          minHeight: 96,
          borderRadius: 18,
          borderWidth: 1,
          borderColor: selected ? palette.accent : palette.border,
          backgroundColor: selected
            ? palette.accentSoft
            : palette.backgroundElement,
        },
      ]}
    >
      <Icon
        name={icon}
        color={selected ? palette.accent : palette.textSecondary}
        size={26}
      />
      <View style={{ flex: 1, gap: 5 }}>
        <Copy style={{ fontWeight: "600" }}>{label}</Copy>
        <Copy kind="caption" muted>
          {hint}
        </Copy>
      </View>
      {selected && <Icon name="success" color={palette.accent} size={22} />}
    </ButtonRoot>
  );
}
