import { LessonShell } from "@/components/lesson-shell";
import { Warmup } from "@/components/warmup";
export default function Daily() {
  return (
    <LessonShell title="QUICK WARM UP">
      <Warmup daily />
    </LessonShell>
  );
}
