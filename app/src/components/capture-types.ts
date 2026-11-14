import type { PracticeRecording } from "@/lib/vision-service";
export type CaptureHandle = {
  record: () => Promise<PracticeRecording>;
  stop: () => void;
};
export type CaptureProps = {
  facing: "front" | "back";
  onReady: (ready: boolean) => void;
  onError: (message: string) => void;
};
