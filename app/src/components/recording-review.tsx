import { useEffect } from "react";
import { useVideoPlayer, VideoView } from "expo-video";
export function RecordingReview({
  uri,
  autoPlay = false,
  loop = false,
  onError,
  label = "Your recorded practice",
}: {
  uri: string;
  autoPlay?: boolean;
  loop?: boolean;
  /** Called if the video can't be loaded (e.g. a remote replay). */
  onError?: () => void;
  label?: string;
}) {
  const player = useVideoPlayer(uri, (p) => {
    p.loop = loop;
    if (autoPlay) p.play();
  });
  useEffect(() => {
    if (!onError) return;
    const sub = player.addListener("statusChange", ({ status }) => {
      if (status === "error") onError();
    });
    return () => sub.remove();
  }, [player, onError]);
  return (
    <VideoView
      testID="recorded-video"
      accessibilityLabel={label}
      player={player}
      nativeControls
      contentFit="contain"
      style={{ width: "100%", height: "100%" }}
    />
  );
}
