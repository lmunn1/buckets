import { SegmentedControl } from "./ui/beui/segmented-control";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { useRouter } from "expo-router";
import {
  Action,
  Copy,
  ErrorNotice,
  Icon,
  palette,
  Panel,
  Section,
  Tag,
  ui,
} from "./hoop-ui";
import {
  catalog,
  lessonSections,
  skillState,
  isQuiz,
  sourceDocument,
} from "@/lib/learning-service";
import { usePlayer } from "@/lib/player-store";
export function Warmup({
  initialMinutes = 5,
  daily = false,
}: {
  initialMinutes?: number;
  daily?: boolean;
}) {
  const { player, logPractice, error, busy } = usePlayer();
  const router = useRouter();
  const [minutes, setMinutes] = useState(
    [5, 10, 20].includes(initialMinutes) ? initialMinutes : 5,
  );
  const [stage, setStage] = useState<"plan" | "active" | "summary" | "saved">(
    "plan",
  );
  const [index, setIndex] = useState(0);
  const [performed, setPerformed] = useState(0);
  const [remaining, setRemaining] = useState(0);
  const [end, setEnd] = useState<number | null>(null);
  const eligible = [...catalog.nodes]
    .filter((n) => !isQuiz(n.id) && skillState(n, player.progress) !== "locked")
    .sort(
      (a, b) =>
        Number(!!player.progress.completed[b.id]) -
        Number(!!player.progress.completed[a.id]),
    );
  const reviews = eligible.filter(
    (n) => n.level === "beginner" && player.progress.completed[n.id],
  );
  // Stable per day and learner; rerenders must not reshuffle the review.
  const [day] = useState(() => Math.floor(Date.now() / 86400000));
  const review = reviews.length ? reviews[day % reviews.length] : undefined;
  const totalMinutes = daily
    ? sourceDocument.dailyWarmup.minutes + (review ? 2 : 0)
    : minutes;
  const skillCount = Math.min(eligible.length, minutes === 5 ? 3 : 5);
  const skills = daily
    ? [
        {
          id: "grip",
          name: "Wake up your hands",
          instructions: sourceDocument.dailyWarmup.grip.join("\n"),
          seconds: 180,
          lessonId: undefined as string | undefined,
        },
        {
          id: "body",
          name: "Find your movement",
          instructions: sourceDocument.dailyWarmup.body.join("\n"),
          seconds: 180,
          lessonId: undefined as string | undefined,
        },
        {
          id: "rhythm",
          name: "Switch on your rhythm",
          instructions: sourceDocument.dailyWarmup.nervousSystem.join("\n"),
          seconds: 120,
          lessonId: undefined as string | undefined,
        },
        ...(review
          ? [
              {
                id: review.id,
                name: `Stay sharp: ${review.name}`,
                instructions: review.lesson.practice,
                seconds: 120,
                lessonId: review.id,
              },
            ]
          : []),
      ]
    : eligible
        .slice(0, skillCount)
        .map((n) => ({
          id: n.id,
          name: n.name,
          instructions: lessonSections(n).find((s) => s.type === "practice")!
            .instructions,
          seconds: Math.round((minutes * 60) / Math.max(1, skillCount)),
          lessonId: n.id,
        }));
  useEffect(() => {
    if (!end) return;
    const update = () => {
      const value = Math.max(0, Math.ceil((end - Date.now()) / 1000));
      setRemaining(value);
      if (!value) setEnd(null);
    };
    update();
    const timer = setInterval(update, 500);
    return () => clearInterval(timer);
  }, [end]);
  const startTimer = (target = index) => {
    const duration = skills[target]?.seconds ?? 0;
    setRemaining(duration);
    setEnd(Date.now() + duration * 1000);
  };
  const advance = (didPractice: boolean) => {
    setPerformed((n) => n + Number(didPractice));
    if (index + 1 === skills.length) {
      setStage("summary");
      setEnd(null);
    } else {
      setIndex((n) => n + 1);
      startTimer(index + 1);
    }
  };
  const drill = skills[index];
  const instructions = (drill: (typeof skills)[number]) => drill.instructions;
  return (
    <View style={{ gap: 16 }}>
      <Tag>
        {stage === "plan"
          ? "A LITTLE EVERY DAY"
          : stage === "active"
            ? `DRILL ${index + 1} OF ${skills.length}`
            : "SESSION RECAP"}
      </Tag>
      <Copy kind="title">
        {stage === "plan"
          ? daily
            ? "Get ready to play."
            : "Keep your game fresh."
          : stage === "active"
            ? drill?.name
            : stage === "saved"
              ? "Practice, in the books."
              : "Nice work showing up."}
      </Copy>
      {stage === "plan" ? (
        <>
          <Copy muted>
            {daily
              ? "Eight minutes to prepare your hands, body, and rhythm. The same foundation, every day."
              : Object.keys(player.progress.completed).length
                ? "Revisit familiar skills with a short, focused session."
                : "Start with a few beginner basics. No experience needed."}
          </Copy>
          {!daily && (
            <SegmentedControl
              label="Practice duration"
              value={String(minutes)}
              onChange={(v) => setMinutes(Number(v))}
              options={[5, 10, 20].map((m) => ({
                value: String(m),
                label: String(m),
                hint: "minutes",
              }))}
            />
          )}
          <Section
            title="Today's lineup"
            detail="Suggested timing. Take breaks whenever you need."
          />
          {skills.map((n, i) => (
            <Panel key={n.id}>
              <View style={ui.row}>
                <Copy style={{ color: palette.accent }}>
                  {String(i + 1).padStart(2, "0")}
                </Copy>
                <Copy style={{ flex: 1, fontWeight: "700" }}>{n.name}</Copy>
                <Copy kind="caption" muted>
                  {Math.round(n.seconds / 60)} min
                </Copy>
              </View>
              <Copy kind="caption" muted numberOfLines={daily ? 2 : undefined}>
                {instructions(n)}
              </Copy>
            </Panel>
          ))}
          <Action
            label={`Start ${totalMinutes}-min warmup`}
            icon="play"
            disabled={!skills.length}
            onPress={() => {
              setStage("active");
              startTimer();
            }}
          />
        </>
      ) : stage === "active" && drill ? (
        <>
          <Copy>{instructions(drill)}</Copy>
          <Panel style={{ alignItems: "center", paddingVertical: 32 }}>
            <Copy kind="display" accessibilityLiveRegion="none">
              {Math.floor(remaining / 60)}:
              {String(remaining % 60).padStart(2, "0")}
            </Copy>
            <Copy muted>
              {remaining
                ? "Go at your own pace"
                : "Time's up. Finish your last rep."}
            </Copy>
            <Action
              label={end ? "Pause timer" : "Resume timer"}
              variant="secondary"
              onPress={() =>
                end
                  ? setEnd(null)
                  : setEnd(Date.now() + Math.max(1, remaining) * 1000)
              }
            />
          </Panel>
          <Action
            label="I practiced this · Next"
            icon="check"
            onPress={() => advance(true)}
          />
          <Action
            label="Skip this drill"
            variant="quiet"
            onPress={() => advance(false)}
          />
          {!!drill.lessonId && (
            <Action
              label="Review the lesson"
              variant="secondary"
              onPress={() => {
                setEnd(null);
                router.push({
                  pathname: "/lesson/[id]",
                  params: { id: drill.lessonId! },
                });
              }}
            />
          )}
        </>
      ) : (
        <>
          <Panel>
            <Icon name="check" size={36} color={palette.success} />
            <Copy kind="heading">
              {performed} of {skills.length} drills practiced
            </Copy>
            <Copy muted>
              {stage === "saved"
                ? "Your session is saved on this device."
                : "Save this session to your practice history."}
            </Copy>
            <Copy kind="caption" muted>
              Practice does not complete skills or unlock prerequisites.
            </Copy>
          </Panel>
          <ErrorNotice message={error} />
          {stage !== "saved" && (
            <Action
              label="Save practice session"
              disabled={!performed}
              busy={busy}
              onPress={() => {
                void logPractice().then((ok) => {
                  if (ok) setStage("saved");
                });
              }}
            />
          )}
          <Action
            label={
              stage === "saved" ? "Another session" : "Choose another session"
            }
            variant="secondary"
            onPress={() => {
              setStage("plan");
              setIndex(0);
              setPerformed(0);
            }}
          />
          <Action
            label="Back to Home"
            variant="quiet"
            onPress={() => router.dismissTo("/(main)/home")}
          />
        </>
      )}
      <Copy kind="caption" muted>
        Practice session · no recording or camera analysis.
      </Copy>
    </View>
  );
}
