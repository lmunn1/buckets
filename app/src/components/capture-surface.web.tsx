import {
  createElement,
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { View } from "react-native";
import { Action, Copy } from "./hoop-ui";
import {
  RECORDING_LIMIT_SECONDS,
  type PracticeRecording,
} from "@/lib/vision-service";
import type { CaptureHandle, CaptureProps } from "./capture-types";

/** Expo Camera records on native; browser recording uses the standard MediaRecorder API. */
export const CaptureSurface = forwardRef<CaptureHandle, CaptureProps>(
  function CaptureSurface({ facing, onReady, onError }, ref) {
    const video = useRef<HTMLVideoElement>(null);
    const stream = useRef<MediaStream | null>(null);
    const recorder = useRef<MediaRecorder | null>(null);
    const limit = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const active = useRef(true);
    const [allowed, setAllowed] = useState(false);
    const [asking, setAsking] = useState(false);
    const stopStream = () => {
      stream.current?.getTracks().forEach((t) => t.stop());
      stream.current = null;
    };
    useEffect(() => {
      active.current = true;
      return () => {
        active.current = false;
        clearTimeout(limit.current);
        if (recorder.current?.state === "recording") recorder.current.stop();
        stopStream();
      };
    }, []);
    const allow = async () => {
      setAsking(true);
      try {
        if (
          !navigator.mediaDevices?.getUserMedia ||
          typeof MediaRecorder === "undefined"
        )
          throw new Error(
            "Use a current browser on HTTPS or localhost to record video.",
          );
        const media = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facing === "back" ? "environment" : "user" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
        if (!active.current) {
          media.getTracks().forEach((t) => t.stop());
          return;
        }
        stream.current = media;
        setAllowed(true);
        media.getVideoTracks().forEach(
          (t) =>
            (t.onended = () => {
              onReady(false);
              onError(
                "Camera access ended. Allow the camera again to continue.",
              );
              setAllowed(false);
            }),
        );
      } catch (error) {
        onError(
          error instanceof Error && error.name === "NotAllowedError"
            ? "Camera access was denied. Allow camera access in your browser settings, then try again."
            : error instanceof Error
              ? error.message
              : "No camera was found.",
        );
      } finally {
        if (active.current) setAsking(false);
      }
    };
    useEffect(() => {
      if (!allowed || !video.current || !stream.current) return;
      video.current.srcObject = stream.current;
      void video.current
        .play()
        .then(() => {
          if (active.current) onReady(true);
        })
        .catch(() =>
          onError("The preview could not play. Try allowing the camera again."),
        );
    }, [allowed, onReady, onError]);
    useImperativeHandle(
      ref,
      () => ({
        record: () =>
          new Promise<PracticeRecording>((resolve, reject) => {
            if (!stream.current?.active) {
              reject(new Error("Allow the camera before recording."));
              return;
            }
            const mimeType = [
              "video/webm;codecs=vp9",
              "video/webm;codecs=vp8",
              "video/mp4",
              "video/webm",
            ].find((t) => MediaRecorder.isTypeSupported(t));
            const chunks: BlobPart[] = [],
              start = Date.now();
            try {
              const media = new MediaRecorder(
                stream.current,
                mimeType ? { mimeType } : undefined,
              );
              recorder.current = media;
              media.ondataavailable = (e) => {
                if (e.data.size) chunks.push(e.data);
              };
              media.onerror = () => {
                clearTimeout(limit.current);
                reject(new Error("Recording failed. Please try again."));
              };
              media.onstop = () => {
                clearTimeout(limit.current);
                const blob = new Blob(chunks, {
                  type: media.mimeType || "video/webm",
                });
                if (!blob.size) {
                  reject(
                    new Error("The recording was empty. Please try again."),
                  );
                  return;
                }
                resolve({
                  uri: URL.createObjectURL(blob),
                  mimeType: blob.type,
                  durationMs: Date.now() - start,
                  recordedAt: new Date(start).toISOString(),
                  facing,
                  platform: "web",
                });
              };
              media.start(250);
              limit.current = setTimeout(() => {
                if (media.state === "recording") media.stop();
              }, RECORDING_LIMIT_SECONDS * 1000);
            } catch {
              reject(
                new Error(
                  "This browser could not record video. Try another browser or the mobile app.",
                ),
              );
            }
          }),
        stop: () => {
          if (recorder.current?.state === "recording") recorder.current.stop();
        },
      }),
      [facing],
    );
    return allowed ? (
      createElement("video", {
        ref: video,
        muted: true,
        autoPlay: true,
        playsInline: true,
        "aria-label": "Live camera preview",
        style: { width: "100%", height: "100%", objectFit: "cover" },
      })
    ) : (
      <View style={{ flex: 1, justifyContent: "center", padding: 24, gap: 18 }}>
        <Copy kind="heading">See yourself in action.</Copy>
        <Copy muted>
          Allow the camera to record your practice. Video stays in this session;
          sound is off.
        </Copy>
        <Action
          label="Allow camera"
          busy={asking}
          onPress={() => void allow()}
        />
      </View>
    );
  },
);
