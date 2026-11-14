import { createElement } from "react";
export function RecordingReview({ uri }: { uri: string }) {
  return createElement("video", {
    src: uri,
    controls: true,
    playsInline: true,
    "aria-label": "Your recorded practice",
    style: {
      width: "100%",
      height: 350,
      objectFit: "contain",
      background: "#08090B",
    },
  });
}
