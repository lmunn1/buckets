import Svg, { Circle, Line } from "react-native-svg";
import { sourceNodes, categoryFor } from "@/lib/learning-service";
import { palette } from "./hoop-ui";
/** A true miniature of the same graph, not three disconnected category paths. */
export function TreePreview() {
  const byId = new Map(sourceNodes.map((n) => [n.id, n]));
  const x = (v: number) => 180 + v * 0.082;
  const y = (v: number) => 110 + v * 0.075;
  return (
    <Svg
      width="100%"
      height={202}
      viewBox="0 0 360 220"
      accessibilityLabel="Preview of all 107 connected basketball skills"
    >
      {[45, 75, 105].map((r) => (
        <Circle
          key={r}
          cx={180}
          cy={110}
          r={r}
          stroke={palette.border}
          strokeDasharray="2 8"
          fill="none"
        />
      ))}
      {sourceNodes.flatMap((n) =>
        n.unlock.requiresAll.map((id) => {
          const p = byId.get(id)!;
          return (
            <Line
              key={`${id}-${n.id}`}
              x1={x(p.layout.x)}
              y1={y(p.layout.y)}
              x2={x(n.layout.x)}
              y2={y(n.layout.y)}
              stroke={categoryFor(n.track).color}
              strokeOpacity={0.25}
              strokeWidth={0.8}
            />
          );
        }),
      )}
      {sourceNodes.map((n) => (
        <Circle
          key={n.id}
          cx={x(n.layout.x)}
          cy={y(n.layout.y)}
          r={n.tier === 1 ? 3.5 : 2.2}
          fill={categoryFor(n.track).color}
          stroke={categoryFor(n.track).color}
          strokeOpacity={n.tier === 1 ? 1 : 0.55}
          strokeWidth={0.8}
        />
      ))}
      <Circle
        cx={180}
        cy={110}
        r={9}
        fill={palette.accentSoft}
        stroke={palette.accent}
        strokeWidth={1.5}
      />
      <Circle cx={180} cy={110} r={3} fill={palette.accent} />
    </Svg>
  );
}
