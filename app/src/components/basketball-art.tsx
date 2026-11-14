import Svg, {
  Circle,
  ClipPath,
  Defs,
  G,
  Path,
  Pattern,
  RadialGradient,
  Stop,
} from "react-native-svg";

/** Original, local vector art. No remote image, paid asset, or image-generation service. */
export function BasketballArt({ size = 300 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 300 300">
      <Defs>
        <RadialGradient id="ball-material" cx="35%" cy="24%" r="85%">
          <Stop offset="0" stopColor="#E5742B" />
          <Stop offset=".45" stopColor="#A74612" />
          <Stop offset=".8" stopColor="#542009" />
          <Stop offset="1" stopColor="#20120B" />
        </RadialGradient>
        <Pattern
          id="ball-grain"
          width="9"
          height="9"
          patternUnits="userSpaceOnUse"
        >
          <Circle cx={2} cy={2} r={1.15} fill="#2B160E" opacity={0.4} />
          <Circle cx={6.4} cy={6.4} r={1.2} fill="#2B160E" opacity={0.4} />
          <Circle cx={2} cy={0.8} r={0.6} fill="#FFB26B" opacity={0.4} />
        </Pattern>
        <ClipPath id="ball-crop">
          <Circle cx={150} cy={150} r={140} />
        </ClipPath>
      </Defs>
      <G clipPath="url(#ball-crop)">
        <Circle cx={150} cy={150} r={140} fill="url(#ball-material)" />
        <Circle cx={150} cy={150} r={140} fill="url(#ball-grain)" />
        <G
          transform="rotate(-22 150 150)"
          fill="none"
          stroke="#24170F"
          strokeWidth={9}
        >
          <Path d="M-5 150H305M150-5V305M43 23C220 72 220 227 43 277M257 23C80 72 80 227 257 277" />
        </G>
        <Circle
          cx={150}
          cy={150}
          r={138}
          fill="none"
          stroke="#FFAB61"
          strokeOpacity={0.18}
          strokeWidth={3}
        />
      </G>
    </Svg>
  );
}
