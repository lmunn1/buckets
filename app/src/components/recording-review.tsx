import { useVideoPlayer, VideoView } from "expo-video";
export function RecordingReview({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri);
  return (
    <VideoView
      testID="recorded-video"
      player={player}
      nativeControls
      contentFit="contain"
      style={{ width: "100%", height: 350 }}
    />
  );
}
