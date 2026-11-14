import Svg, { Circle, Line, Path, Rect } from "react-native-svg";
import { View } from "react-native";
import { Copy, palette } from "./hoop-ui";
export function CourtDiagram() {
  return (
    <View
      style={{
        backgroundColor: palette.backgroundElement,
        borderRadius: 18,
        padding: 18,
        gap: 12,
      }}
    >
      <Svg
        width="100%"
        height={200}
        viewBox="0 0 300 200"
        accessibilityLabel="Half court illustration showing the basket, key, free throw line and three point arc"
      >
        <Rect
          x={20}
          y={10}
          width={260}
          height={180}
          rx={3}
          fill="none"
          stroke={palette.border}
          strokeWidth={2}
        />
        <Rect
          x={108}
          y={10}
          width={84}
          height={100}
          fill="none"
          stroke={palette.textSecondary}
        />
        <Circle
          cx={150}
          cy={110}
          r={42}
          fill="none"
          stroke={palette.textSecondary}
        />
        <Path
          d="M 30 10 L 30 40 Q 150 250 270 40 L 270 10"
          fill="none"
          stroke={palette.textSecondary}
        />
        <Line
          x1={132}
          y1={27}
          x2={168}
          y2={27}
          stroke={palette.accent}
          strokeWidth={3}
        />
        <Circle
          cx={150}
          cy={37}
          r={8}
          fill="none"
          stroke={palette.accent}
          strokeWidth={3}
        />
      </Svg>
      <Copy kind="caption" muted>
        Orientation diagram · movement illustrations will be added with the
        lesson content.
      </Copy>
    </View>
  );
}
