import { Reveal } from "@/components/motion";
import { useRouter } from "expo-router";
import { View } from "react-native";
import {
  Action,
  Copy,
  Icon,
  palette,
  Panel,
  Section,
  Tag,
} from "@/components/hoop-ui";
import { LessonShell, MissingSkill, useSkill } from "@/components/lesson-shell";
import { catalog, skillState } from "@/lib/learning-service";
import { usePlayer } from "@/lib/player-store";
export default function Complete() {
  const node = useSkill();
  const router = useRouter();
  const { player } = usePlayer();
  if (!node) return <MissingSkill />;
  const completed = !!player.progress.completed[node.id];
  const verified = player.progress.completed[node.id]?.source === "vision";
  // Go forward: clear the lesson flow off the stack first, so neither these
  // buttons nor Back lead into the lesson again.
  const toTree = () => {
    if (router.canDismiss()) router.dismissAll();
    router.navigate("/(main)/tree");
  };
  const toHome = () => {
    if (router.canDismiss()) router.dismissAll();
    router.navigate("/(main)/home");
  };
  const toSkill = (id: string) => {
    toTree();
    router.push({ pathname: "/skill/[id]", params: { id } });
  };
  const unlocked = completed
    ? catalog.nodes.filter(
        (n) =>
          n.prerequisites.includes(node.id) &&
          skillState(n, player.progress) === "available",
      )
    : [];
  return (
    <LessonShell title={verified ? "SKILL CHECK" : "DEMO PROGRESSION"}>
      <Reveal style={{ alignItems: "center", paddingVertical: 32, gap: 20 }}>
        <View
          style={{
            width: 92,
            height: 92,
            borderRadius: 28,
            borderWidth: 2,
            borderColor: palette.success,
            backgroundColor: palette.backgroundElement,
            alignItems: "center",
            justifyContent: "center",
            transform: [{ rotate: "45deg" }],
          }}
        >
          <View style={{ transform: [{ rotate: "-45deg" }] }}>
            <Icon
              name={completed ? "check" : "lock"}
              color={palette.success}
              size={42}
            />
          </View>
        </View>
        <Tag color={palette.success}>
          {verified
            ? "VERIFIED BY CAMERA CHECK"
            : completed
              ? "DEMO SKILL COMPLETE"
              : "NOT COMPLETED"}
        </Tag>
        <Copy kind="title" style={{ textAlign: "center" }}>
          {completed ? "Your path just grew." : "This skill is still waiting."}
        </Copy>
        <Copy muted style={{ textAlign: "center" }}>
          {node.name}
        </Copy>
      </Reveal>
      <Panel>
        <Copy>
          {verified
            ? "Your shot passed every form check, so this skill is complete and saved as verified."
            : "This demonstrates completion and prerequisite unlocks. It is saved as demo progress, not verified basketball mastery."}
        </Copy>
      </Panel>
      <Section
        title={
          unlocked.length
            ? "Now ready to explore"
            : "Keep building your foundations"
        }
        detail={
          unlocked.length
            ? "Every prerequisite for these lessons is now complete."
            : "Some skills need foundations from more than one branch."
        }
      />
      {unlocked.map((n) => (
        <View key={n.id} style={{ marginBottom: 10 }}>
          <Action
            label={n.name}
            variant="secondary"
            onPress={() => toSkill(n.id)}
          />
        </View>
      ))}
      <View style={{ marginTop: 24, gap: 12 }}>
        <Action
          label="See my skill tree"
          onPress={toTree}
        />
        <Action
          label="Back to my court"
          variant="quiet"
          onPress={toHome}
        />
      </View>
    </LessonShell>
  );
}
