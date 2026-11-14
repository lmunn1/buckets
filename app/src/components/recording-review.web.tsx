import { createElement } from "react";
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
  return createElement("video", {
    src: uri,
    controls: true,
    playsInline: true,
    autoPlay,
    muted: autoPlay, // browsers only autoplay muted video; replays have no sound
    loop,
    onError,
    "aria-label": label,
    style: {
      width: "100%",
      height: "100%",
      objectFit: "contain",
      background: "#08090B",
    },
  });
}
