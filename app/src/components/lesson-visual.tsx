import { useState } from "react";
import { View } from "react-native";
import Svg, { Circle, Path, Line, Rect, Ellipse } from "react-native-svg";
import { Copy, Icon, palette, ui } from "./hoop-ui";
import { CourtDiagram } from "./court-diagram";
import { SegmentedControl } from "./ui/beui/segmented-control";
import {
  sourceNodeFor,
  type SkillNode,
  type LessonSection,
} from "@/lib/learning-service";

/** Original schematic guides; never represents unlicensed video frames as lesson photos. */
export function LessonVisual({
  node,
}: {
  node: SkillNode;
  section: Extract<LessonSection, { type: "visual" }>;
}) {
  const [focus, setFocus] = useState("0");
  const source = sourceNodeFor(node.id)!;
  const cues = source.lesson.text.cues;
  const template = source.lesson.practice.cvActivity.template;
  const shoot = node.category === "SH" || node.category === "FN";
  const dribble = node.category === "BH" || node.category === "LM";
  const footwork =
    template === "FOOTWORK_SEQ" ||
    template === "LATERAL_SLIDE" ||
    template === "SEQUENCE";
  const highlight = focus !== "0";
  return (
    <View style={{ gap: 16 }}>
      <View
        style={{
          backgroundColor: palette.backgroundElement,
          borderRadius: 20,
          overflow: "hidden",
          borderWidth: 1,
          borderColor: palette.border,
        }}
      >
        <View
          style={[ui.row, { justifyContent: "space-between", padding: 16 }]}
        >
          <Copy kind="eyebrow" muted>
            MOVEMENT GUIDE
          </Copy>
          <Icon
            name={highlight ? "target" : "focus"}
            size={18}
            color={palette.accent}
          />
        </View>
        {node.category === "IQ" ? (
          <CourtDiagram />
        ) : (
          <Svg
            width="100%"
            height={220}
            viewBox="0 0 320 220"
            accessibilityLabel={`Schematic ${node.category} guide, with lesson-specific coaching cues below`}
          >
            <Path
              d="M16 195H304M40 202H280"
              stroke={palette.border}
              strokeWidth={1}
            />
            <Ellipse
              cx={154}
              cy={191}
              rx={74}
              ry={9}
              fill={palette.backgroundSelected}
            />
            {footwork ? (
              <>
                <Path
                  d="M55 150Q148 176 252 61"
                  fill="none"
                  stroke={palette.accent}
                  strokeDasharray="5 7"
                  strokeWidth={2}
                />
                {[
                  { x: 74, y: 144 },
                  { x: 144, y: 130 },
                  { x: 226, y: 82 },
                ].map((p, i) => (
                  <ViewFoot
                    key={i}
                    x={p.x}
                    y={p.y}
                    active={highlight ? i === 2 : i === 0}
                  />
                ))}
                <Path
                  d="m244 60 15-4-4 16"
                  fill="none"
                  stroke={palette.accent}
                  strokeWidth={2}
                />
              </>
            ) : (
              <>
                <Circle
                  cx={126}
                  cy={shoot && highlight ? 54 : 59}
                  r={15}
                  fill={palette.backgroundSelected}
                  stroke={palette.text}
                  strokeWidth={2.5}
                />
                <Path
                  d={
                    shoot && highlight
                      ? "M125 77 123 132 107 183M123 132 144 183M124 90l27-30 8-27M128 95l38-33"
                      : "M125 77 139 122 112 151 96 184M139 122 172 152 186 184M130 88l38 25 24-8M130 90l-18 28 55 2"
                  }
                  stroke={palette.text}
                  strokeWidth={8}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
                />
                <Path
                  d="M125 77 139 122"
                  stroke={palette.textSecondary}
                  strokeWidth={2}
                  fill="none"
                />
                <Circle
                  cx={shoot && highlight ? 164 : dribble ? 205 : 172}
                  cy={shoot && highlight ? 26 : dribble ? 147 : 116}
                  r={14}
                  fill={palette.accentSoft}
                  stroke={palette.accent}
                  strokeWidth={2}
                />
                <Path
                  d={
                    shoot && highlight
                      ? "M157 25h14m-7-13v27"
                      : dribble
                        ? "M192 147h26m-13-13v26"
                        : "M159 116h26m-13-13v26"
                  }
                  stroke={palette.accent}
                  strokeWidth={1}
                />
                {shoot ? (
                  <>
                    <Path
                      d="M186 32Q240 10 276 87"
                      fill="none"
                      stroke={palette.accent}
                      strokeWidth={1.5}
                      strokeDasharray="4 6"
                    />
                    <Path
                      d="M265 91h31m-26 4 5 20h12l5-20"
                      stroke={palette.textSecondary}
                      strokeWidth={2}
                      fill="none"
                    />
                    <Rect
                      x={291}
                      y={55}
                      width={3}
                      height={38}
                      fill={palette.textSecondary}
                    />
                  </>
                ) : dribble ? (
                  <Path
                    d="M231 129v43m-5-6 5 6 5-6M251 172v-43m-5 6 5-6 5 6"
                    stroke={palette.accent}
                    strokeWidth={2}
                    fill="none"
                  />
                ) : (
                  <>
                    <Path
                      d="M126 149q-8-9-17-4"
                      stroke={palette.accent}
                      strokeWidth={2}
                      fill="none"
                    />
                    <Line
                      x1={89}
                      y1={187}
                      x2={196}
                      y2={187}
                      stroke={palette.accent}
                      strokeWidth={2}
                    />
                  </>
                )}
                {highlight && (
                  <Circle
                    cx={shoot ? 156 : dribble ? 205 : 127}
                    cy={shoot ? 49 : dribble ? 147 : 139}
                    r={28}
                    fill="none"
                    stroke={palette.accent}
                    strokeDasharray="3 5"
                    strokeWidth={1.5}
                  />
                )}
              </>
            )}
          </Svg>
        )}
      </View>
      <SegmentedControl
        label="Technique view"
        value={focus}
        onChange={setFocus}
        options={[
          { value: "0", label: "Setup" },
          { value: "1", label: "Key focus" },
        ]}
      />
      <View
        style={{
          borderLeftWidth: 2,
          borderColor: palette.accent,
          paddingLeft: 16,
          gap: 6,
        }}
      >
        <Copy kind="eyebrow" style={{ color: palette.accent }}>
          {highlight ? "FOCUS ON THE FEEL" : "SET YOUR FOUNDATION"}
        </Copy>
        <Copy>
          {cues[highlight && cues.length > 1 ? 1 : 0] ?? node.lesson.summary}
        </Copy>
      </View>
      <Copy kind="caption" muted>
        Schematic guide. Use the written cues and the coach’s video for the full
        technique.
      </Copy>
    </View>
  );
}
function ViewFoot({ x, y, active }: { x: number; y: number; active: boolean }) {
  return (
    <>
      <Ellipse
        cx={x}
        cy={y}
        rx={11}
        ry={23}
        transform={`rotate(25 ${x} ${y})`}
        fill={active ? palette.accentSoft : palette.backgroundSelected}
        stroke={active ? palette.accent : palette.textSecondary}
        strokeWidth={2}
      />
      <Ellipse
        cx={x + 22}
        cy={y - 25}
        rx={11}
        ry={23}
        transform={`rotate(25 ${x + 22} ${y - 25})`}
        fill={active ? palette.accentSoft : palette.backgroundSelected}
        stroke={active ? palette.accent : palette.textSecondary}
        strokeWidth={2}
      />
    </>
  );
}
