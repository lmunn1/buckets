/** Screen = world * scale + translation. Shared by gestures and controls. */
export type MapCamera = { x: number; y: number; scale: number };
export type Viewport = { width: number; height: number };
export function zoomAt(
  camera: MapCamera,
  scale: number,
  anchor: { x: number; y: number },
): MapCamera {
  "worklet";
  const ratio = scale / camera.scale;
  return {
    scale,
    x: anchor.x - (anchor.x - camera.x) * ratio,
    y: anchor.y - (anchor.y - camera.y) * ratio,
  };
}
export function fitMap(
  size: Viewport,
  points: { x: number; y: number }[],
): MapCamera {
  const minX = Math.min(...points.map((p) => p.x)) - 90;
  const maxX = Math.max(...points.map((p) => p.x)) + 90;
  const minY = Math.min(...points.map((p) => p.y)) - 110;
  const maxY = Math.max(...points.map((p) => p.y)) + 110;
  const scale = Math.min(
    1.35,
    size.width / (maxX - minX),
    Math.max(80, size.height - 64) / (maxY - minY),
  );
  return {
    scale,
    x: size.width / 2 - ((minX + maxX) / 2) * scale,
    y: (size.height - 48) / 2 - ((minY + maxY) / 2) * scale,
  };
}
export function constrainMap(camera: MapCamera, size: Viewport): MapCamera {
  "worklet";
  const margin = 60;
  return {
    ...camera,
    x: Math.max(
      margin - 1400 * camera.scale,
      Math.min(size.width - margin, camera.x),
    ),
    y: Math.max(
      margin - 1400 * camera.scale,
      Math.min(size.height - margin, camera.y),
    ),
  };
}
