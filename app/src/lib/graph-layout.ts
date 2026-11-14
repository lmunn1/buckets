// Presentation only: no curriculum, prerequisite, or unlock decisions live here.
import { categories, sourceNodeFor, type SkillNode } from "./learning-service";
export type MapPoint = { node: SkillNode; x: number; y: number };
export const MAP_SIZE = 1400;
export function layoutGraph(nodes: SkillNode[]): MapPoint[] {
  // Preserve author positions and relative distances; normalize only the viewport.
  if (nodes.every((n) => sourceNodeFor(n.id))) {
    const extent = Math.max(
      1,
      ...nodes.map((n) => {
        const p = sourceNodeFor(n.id)!.layout;
        return Math.hypot(p.x, p.y);
      }),
    );
    const scale = 610 / extent;
    return nodes.map((node) => {
      const p = sourceNodeFor(node.id)!.layout;
      return { node, x: 700 + p.x * scale, y: 700 + p.y * scale };
    });
  }
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const depth = new Map<string, number>();
  function rank(n: SkillNode): number {
    if (depth.has(n.id)) return depth.get(n.id)!;
    const value = n.prerequisites.length
      ? 1 +
        Math.max(
          ...n.prerequisites.map((id) =>
            byId.has(id) ? rank(byId.get(id)!) : 0,
          ),
        )
      : 0;
    depth.set(n.id, value);
    return value;
  }
  nodes.forEach(rank);
  const positions = nodes.map((node) => {
    const categoryIndex = categories.findIndex((c) => c.id === node.category);
    const peers = nodes.filter(
      (n) => n.category === node.category && rank(n) === rank(node),
    );
    const index = peers.findIndex((n) => n.id === node.id);
    const ring = Math.floor(index / 3);
    const angle =
      -Math.PI / 2 +
      (categoryIndex * Math.PI * 2) / categories.length +
      ((index % 3) - (Math.min(peers.length, 3) - 1) / 2) * 0.46;
    const maxRank = Math.max(1, ...depth.values());
    const radius = 155 + rank(node) * Math.min(72, 360 / maxRank) + ring * 46;
    return {
      node,
      x: MAP_SIZE / 2 + Math.cos(angle) * radius,
      y: MAP_SIZE / 2 + Math.sin(angle) * radius,
    };
  });
  const extent = Math.max(
    1,
    ...positions.map((p) => Math.hypot(p.x - 700, p.y - 700)),
  );
  const fit = Math.min(1, 610 / extent);
  return positions.map((p) => ({
    ...p,
    x: 700 + (p.x - 700) * fit,
    y: 700 + (p.y - 700) * fit,
  }));
}
export function neighborhood(
  nodes: SkillNode[],
  id: string,
  ancestors = false,
): Set<string> {
  const result = new Set([id]);
  const addParents = (target: string) => {
    nodes
      .find((n) => n.id === target)
      ?.prerequisites.forEach((parent) => {
        if (!result.has(parent)) {
          result.add(parent);
          if (ancestors) addParents(parent);
        }
      });
  };
  addParents(id);
  if (!ancestors)
    nodes
      .filter((n) => n.prerequisites.includes(id))
      .forEach((n) => result.add(n.id));
  return result;
}
export function closestAvailable(
  nodes: SkillNode[],
  id: string,
  completed: Record<string, unknown>,
): SkillNode | undefined {
  const seen = new Set<string>();
  const visit = (target: string): SkillNode | undefined => {
    if (seen.has(target) || completed[target]) return;
    seen.add(target);
    const node = nodes.find((n) => n.id === target);
    if (!node) return;
    if (node.prerequisites.every((p) => !!completed[p])) return node;
    for (const p of node.prerequisites) {
      const found = visit(p);
      if (found) return found;
    }
  };
  return visit(id);
}
