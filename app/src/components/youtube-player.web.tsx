import type { PlayerProps } from "./youtube-player";
export function YouTubePlayer({
  videoId,
  title,
  onError,
  onReady,
}: PlayerProps) {
  return (
    <iframe
      title={title}
      src={`https://www.youtube.com/embed/${encodeURIComponent(videoId)}?playsinline=1&rel=0`}
      allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
      allowFullScreen
      referrerPolicy="strict-origin-when-cross-origin"
      onLoad={onReady}
      onError={onError}
      style={{ border: 0, width: "100%", height: "100%", background: "#000" }}
    />
  );
}
