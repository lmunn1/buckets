import { useState } from "react";
import { View } from "react-native";
import { Action, Copy } from "@/components/hoop-ui";
import { LessonShell, MissingSkill, useSkill } from "@/components/lesson-shell";
import { PracticeRecorder } from "@/components/practice-recorder";
import { DemoAssessment } from "@/components/demo-assessment";
import { isQuiz, skillState } from "@/lib/learning-service";
import { usePlayer } from "@/lib/player-store";
import { serverVisionService } from "@/lib/vision";
export default function PracticeCapture() {
  const node = useSkill();
  const { player } = usePlayer();
  const [demo, setDemo] = useState(false);
  if (!node) return <MissingSkill />;
  if (isQuiz(node.id) || skillState(node, player.progress) === "locked")
    return (
      <LessonShell title="PRACTICE">
        <Copy kind="heading">
          {isQuiz(node.id)
            ? "Quiz coming soon"
            : "Finish the prerequisites first."}
        </Copy>
      </LessonShell>
    );
  return (
    <LessonShell title={node.name}>
      {demo ? <DemoAssessment node={node} /> : <PracticeRecorder node={node} service={serverVisionService} />}
      <View style={{ marginTop: 28 }}>
        <Action
          label={
            demo ? "Back to camera" : "Developer demo: simulated completion"
          }
          variant="quiet"
          onPress={() => setDemo((v) => !v)}
        />
      </View>
    </LessonShell>
  );
}
