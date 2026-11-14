import { useEffect, useState } from "react";
import { ActivityIndicator, Linking, View } from "react-native";
import { sourceNodeFor } from "@/lib/learning-service";
import { Action, Copy, ErrorNotice, Icon, palette, ui } from "./hoop-ui";
import { YouTubePlayer } from "./youtube-player";

export function LessonVideo({
  id,
  eager = false,
}: {
  id: string;
  eager?: boolean;
}) {
  const source = sourceNodeFor(id)!;
  const options = [
    source.lesson.video.pinned,
    ...source.lesson.video.alternates,
  ].filter((v) => v !== null);
  const [index, setIndex] = useState(0);
  const [loaded, setLoaded] = useState(eager);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [width, setWidth] = useState(300);
  const video = options[index];
  useEffect(() => {
    if (!loaded || ready) return;
    const timer = setTimeout(
      () =>
        setError(
          "The player is taking a while. Try another video or watch on YouTube.",
        ),
      15000,
    );
    return () => clearTimeout(timer);
  }, [loaded, ready, index]);
  const open = (url: string) => {
    void Linking.openURL(url).catch(() =>
      setError("Could not open YouTube. Try again when connected."),
    );
  };
  const next = () => {
    setIndex((i) => (i + 1) % options.length);
    setReady(false);
    setError(null);
  };
  return (
    <View
      style={{ gap: 16 }}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
    >
      <View style={[ui.row, { justifyContent: "space-between" }]}>
        <Copy kind="heading">Watch the demonstration</Copy>
        <Icon name="play" color={palette.accent} />
      </View>
      {video && loaded ? (
        <View
          style={{
            width: "100%",
            height: video.isShort
              ? Math.max(280, Math.min(450, (width * 16) / 9))
              : Math.max(200, (width * 9) / 16),
            borderRadius: 20,
            overflow: "hidden",
            backgroundColor: "#000",
          }}
        >
          {!ready && (
            <ActivityIndicator
              accessibilityLabel="Loading YouTube player"
              color={palette.accent}
              style={{ position: "absolute", top: 24, alignSelf: "center" }}
            />
          )}
          <YouTubePlayer
            key={video.videoId}
            videoId={video.videoId}
            title={video.title}
            onReady={() => {
              setReady(true);
              setError(null);
            }}
            onError={() => {
              if (index + 1 < options.length) {
                setIndex(index + 1);
                setReady(false);
              } else
                setError(
                  "This video cannot play here. Watch on YouTube or try another demonstration.",
                );
            }}
          />
        </View>
      ) : (
        <View
          style={{
            minHeight: 176,
            backgroundColor: palette.backgroundElement,
            borderRadius: 20,
            padding: 20,
            gap: 12,
            justifyContent: "center",
          }}
        >
          <View style={[ui.row, { gap: 14 }]}>
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                backgroundColor: palette.accentSoft,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon name="play" color={palette.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Copy style={{ fontWeight: "600" }}>
                {video?.channel || "YouTube demonstration"}
              </Copy>
              <Copy kind="caption" muted>
                {video?.durationSec
                  ? `${video.durationSec} sec`
                  : "Short technique video"}{" "}
                · No autoplay
              </Copy>
            </View>
          </View>
          <Action
            label="Load lesson video"
            icon="play"
            variant="secondary"
            onPress={() => setLoaded(true)}
            disabled={!video}
          />
        </View>
      )}
      <Copy kind="caption">
        {video?.title ?? "Find a demonstration on YouTube"}
      </Copy>
      <ErrorNotice message={error} />
      <View style={{ gap: 8 }}>
        {options.length > 1 && (
          <Action
            label="Try another demonstration"
            icon="refresh"
            variant="secondary"
            onPress={next}
          />
        )}
        <Action
          label="Watch on YouTube"
          icon="external"
          variant="quiet"
          onPress={() => open(video?.url ?? source.lesson.video.fallbackSearch)}
        />
      </View>
      <Copy kind="caption" muted>
        Loading the player connects to YouTube. Videos remain with their
        original creators.
      </Copy>
    </View>
  );
}
