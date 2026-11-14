import { useEffect, useRef, type PointerEvent } from "react";
import { cancelAnimation } from "react-native-reanimated";
import { constrainMap, zoomAt, type MapCamera } from "@/lib/map-camera";
import type { MapGestureSurfaceProps } from "./map-gesture-surface";

/** Browser pointer capture avoids the native library's large web pinch slop.
 * Values update directly; the scene never reconciles on pointer movement.
 */
export function MapGestureSurface({
  children,
  x,
  y,
  scale,
  width,
  height,
  minScale,
  onSettled,
  onTap,
}: MapGestureSurfaceProps) {
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const origin = useRef({
    x: 0,
    y: 0,
    span: 1,
    camera: { x: 0, y: 0, scale: 1 } as MapCamera,
  });
  const moved = useRef(false);
  const wheelEnd = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const surface = useRef<HTMLDivElement>(null);
  useEffect(() => () => clearTimeout(wheelEnd.current), []);
  const read = () => ({ x: x.get(), y: y.get(), scale: scale.get() });
  const apply = (camera: MapCamera) => {
    const next = constrainMap(camera, {
      width: width.get(),
      height: height.get(),
    });
    x.set(next.x);
    y.set(next.y);
    scale.set(next.scale);
  };
  const rebase = () => {
    const [a, b] = [...pointers.current.values()];
    if (!a) return;
    origin.current = {
      x: b ? (a.x + b.x) / 2 : a.x,
      y: b ? (a.y + b.y) / 2 : a.y,
      span: b ? Math.max(1, Math.hypot(b.x - a.x, b.y - a.y)) : 1,
      camera: read(),
    };
  };
  const local = (e: PointerEvent<HTMLDivElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - box.left, y: e.clientY - box.top };
  };
  const down = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    cancelAnimation(x);
    cancelAnimation(y);
    cancelAnimation(scale);
    clearTimeout(wheelEnd.current);
    if (!pointers.current.size) moved.current = false;
    pointers.current.set(e.pointerId, local(e));
    if (pointers.current.size > 1) moved.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    rebase();
  };
  const move = (e: PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, local(e));
    const [a, b] = [...pointers.current.values()],
      start = origin.current;
    if (b) {
      const nextScale = Math.max(
        minScale.get(),
        Math.min(
          2.8,
          (start.camera.scale * Math.hypot(b.x - a.x, b.y - a.y)) / start.span,
        ),
      );
      const next = zoomAt(start.camera, nextScale, start);
      apply({
        ...next,
        x: next.x + (a.x + b.x) / 2 - start.x,
        y: next.y + (a.y + b.y) / 2 - start.y,
      });
    } else {
      const dx = a.x - start.x,
        dy = a.y - start.y;
      if (Math.hypot(dx, dy) > 5) moved.current = true;
      if (moved.current)
        apply({
          ...start.camera,
          x: start.camera.x + dx,
          y: start.camera.y + dy,
        });
    }
  };
  const up = (e: PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(e.pointerId)) return;
    const point = local(e);
    pointers.current.delete(e.pointerId);
    if (e.currentTarget.hasPointerCapture(e.pointerId))
      e.currentTarget.releasePointerCapture(e.pointerId);
    if (pointers.current.size) rebase();
    else {
      onSettled();
      if (!moved.current && e.type !== "pointercancel") {
        const camera = read();
        onTap(point.x, point.y, camera.x, camera.y, camera.scale);
      }
    }
  };
  useEffect(() => {
    const element = surface.current;
    if (!element) return;
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      cancelAnimation(x);
      cancelAnimation(y);
      cancelAnimation(scale);
      const box = element.getBoundingClientRect();
      const delta =
        e.deltaY *
        (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? height.get() : 1);
      const next = constrainMap(
        zoomAt(
          { x: x.get(), y: y.get(), scale: scale.get() },
          Math.max(
            minScale.get(),
            Math.min(2.8, scale.get() * Math.exp(-delta * 0.002)),
          ),
          { x: e.clientX - box.left, y: e.clientY - box.top },
        ),
        { width: width.get(), height: height.get() },
      );
      x.set(next.x);
      y.set(next.y);
      scale.set(next.scale);
      clearTimeout(wheelEnd.current);
      wheelEnd.current = setTimeout(onSettled, 100);
    };
    element.addEventListener("wheel", wheel, { passive: false });
    return () => element.removeEventListener("wheel", wheel);
  }, [x, y, scale, width, height, minScale, onSettled]);
  return (
    <div
      ref={surface}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      style={{
        position: "absolute",
        inset: 0,
        touchAction: "none",
        userSelect: "none",
        overscrollBehavior: "contain",
      }}
    >
      {children}
    </div>
  );
}
