import { sourceNodeFor } from "./hooptree-adapter";

export type Photo = NonNullable<
  ReturnType<typeof sourceNodeFor>
>["lesson"]["visuals"]["images"][number];
const licenses = new Set([
  "Public domain",
  "CC0",
  "CC BY 2.0",
  "CC BY 4.0",
  "CC BY-SA 2.0",
  "CC BY-SA 3.0",
  "CC BY-SA 4.0",
]);
/** Video-frame slots lack an open reuse license. Keep them in source, not the gallery. */
export function licensedPhotos(id: string) {
  return (
    sourceNodeFor(id)?.lesson.visuals.images.filter(
      (p) =>
        p.source === "web" &&
        p.credit &&
        licenses.has(p.credit.license) &&
        p.credit.sourceUrl.startsWith("https://commons.wikimedia.org/"),
    ) ?? []
  );
}
