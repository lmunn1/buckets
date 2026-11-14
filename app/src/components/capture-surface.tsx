import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { Linking, Platform, StyleSheet, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Action, Copy } from "./hoop-ui";
import { RECORDING_LIMIT_SECONDS } from "@/lib/vision-service";
import type { CaptureHandle, CaptureProps } from "./capture-types";

export const CaptureSurface = forwardRef<CaptureHandle, CaptureProps>(
  function CaptureSurface({ facing, onReady, onError }, ref) {
    const [permission, requestPermission] = useCameraPermissions();
    const [asking, setAsking] = useState(false);
    const camera = useRef<CameraView>(null);
    useEffect(() => {
      onReady(false);
    }, [facing, onReady]);
    useImperativeHandle(
      ref,
      () => ({
        async record() {
          if (!camera.current) throw new Error("The camera is not ready.");
          const start = Date.now();
          const result = await camera.current.recordAsync({
            maxDuration: RECORDING_LIMIT_SECONDS,
            maxFileSize: 40 * 1024 * 1024,
          });
          if (!result?.uri)
            throw new Error("No video was saved. Please try again.");
          return {
            uri: result.uri,
            mimeType: /\.mov$/i.test(result.uri)
              ? "video/quicktime"
              : "video/mp4",
            durationMs: Date.now() - start,
            recordedAt: new Date(start).toISOString(),
            facing,
            platform: Platform.OS === "ios" ? "ios" : "android",
          };
        },
        stop() {
          camera.current?.stopRecording();
        },
      }),
      [facing],
    );
    if (!permission?.granted)
      return (
        <View
          style={{ flex: 1, justifyContent: "center", padding: 24, gap: 18 }}
        >
          <Copy kind="heading">See yourself in action.</Copy>
          <Copy muted>
            Allow the camera to record your practice. Video stays on this
            device; sound is off.
          </Copy>
          <Action
            label={
              permission?.canAskAgain === false
                ? "Open camera settings"
                : "Allow camera"
            }
            busy={asking}
            onPress={() => {
              if (permission?.canAskAgain === false) {
                void Linking.openSettings();
                return;
              }
              setAsking(true);
              void requestPermission()
                .catch(() =>
                  onError(
                    "Camera access could not be requested. Try again in Settings.",
                  ),
                )
                .finally(() => setAsking(false));
            }}
          />
        </View>
      );
    return (
      <CameraView
        key={facing}
        ref={camera}
        style={StyleSheet.absoluteFill}
        mode="video"
        mute
        facing={facing}
        mirror={false}
        videoQuality="720p"
        onCameraReady={() => onReady(true)}
        onMountError={() => {
          onReady(false);
          onError(
            "Camera preview could not start. Check camera access and try again.",
          );
        }}
      />
    );
  },
);
