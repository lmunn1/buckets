import { useEffect, useState } from "react";
import { Image, Linking, Pressable, ScrollView, View } from "react-native";
import { Copy, Icon, palette } from "./hoop-ui";

import { licensedPhotos, type Photo } from "@/lib/lesson-media";
export { licensedPhotos } from "@/lib/lesson-media";
function PhotoCard({ photo, index }: { photo: Photo; index: number }) {
  const urls = [photo.url, ...photo.fallbackUrls];
  const [attempt, setAttempt] = useState(0);
  const [loadedAttempt, setLoadedAttempt] = useState<number | null>(null);
  const [linkError, setLinkError] = useState(false);
  useEffect(() => {
    if (attempt >= urls.length || loadedAttempt === attempt) return;
    const timer = setTimeout(() => setAttempt((value) => value + 1), 12000);
    return () => clearTimeout(timer);
  }, [attempt, urls.length, loadedAttempt]);
  const c = photo.credit!;
  return (
    <View style={{ width: 248, gap: 10 }}>
      {attempt < urls.length ? (
        <Image
          source={{ uri: urls[attempt] }}
          accessibilityLabel={photo.label || `Technique reference ${index + 1}`}
          onError={() => setAttempt((v) => v + 1)}
          onLoad={() => setLoadedAttempt(attempt)}
          resizeMode="contain"
          style={{
            width: 248,
            height: 190,
            backgroundColor: palette.backgroundElement,
            borderRadius: 16,
          }}
        />
      ) : (
        <View
          style={{
            height: 190,
            borderRadius: 16,
            backgroundColor: palette.backgroundElement,
            justifyContent: "center",
            alignItems: "center",
            gap: 12,
          }}
        >
          <Icon name="target" />
          <Copy kind="caption" muted>
            Photo unavailable. Use the cues.
          </Copy>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Retry photo ${index + 1}`}
            onPress={() => {
              setLoadedAttempt(null);
              setAttempt(0);
            }}
            style={{ minHeight: 48, justifyContent: "center" }}
          >
            <Copy kind="caption" style={{ color: palette.accent }}>
              Retry photo
            </Copy>
          </Pressable>
        </View>
      )}
      {!!photo.label && <Copy kind="caption">{photo.label}</Copy>}
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={`Photo credit: ${c.author}, ${c.license}`}
        onPress={() => {
          void Linking.openURL(c.sourceUrl).catch(() => setLinkError(true));
        }}
        style={{ minHeight: 48, justifyContent: "center" }}
      >
        <Copy kind="caption" muted>
          Photo: {c.author} · {c.license} · {c.site}
        </Copy>
      </Pressable>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={`Read ${c.license} license`}
        onPress={() => {
          void Linking.openURL(c.licenseUrl ?? c.sourceUrl).catch(() =>
            setLinkError(true),
          );
        }}
      >
        <Copy kind="caption" style={{ color: palette.accent }}>
          License details ↗
        </Copy>
      </Pressable>
      {linkError && (
        <Copy kind="caption" muted>
          Could not open the source. Try again.
        </Copy>
      )}
    </View>
  );
}
export function LessonPhotos({ id }: { id: string }) {
  const photos = licensedPhotos(id);
  if (!photos.length) return null;
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ gap: 12, paddingVertical: 8 }}
    >
      {photos.map((photo, index) => (
        <PhotoCard key={photo.url} photo={photo} index={index} />
      ))}
    </ScrollView>
  );
}
