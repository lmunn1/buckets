import { useRouter } from "expo-router";
import { View } from "react-native";
import { FlowScreen } from "@/components/flow-screen";
import { Action, Brand, Copy, palette, Tag } from "@/components/hoop-ui";
import { BasketballArt } from "@/components/basketball-art";
export default function Welcome() {
  const router = useRouter();
  return (
    <FlowScreen>
      <Brand />
      <Tag>BASKETBALL, FROM THE BASICS</Tag>
      <View style={{ marginTop: 18, gap: 14 }}>
        <Copy kind="display">
          Build your game.{"\n"}
          <Copy kind="display" style={{ color: palette.accent }}>
            One skill at a time.
          </Copy>
        </Copy>
        <Copy muted>
          Short lessons. Purposeful practice. One connected map of everything
          you can learn.
        </Copy>
      </View>
      <View
        pointerEvents="none"
        style={{ alignItems: "center", marginVertical: 24 }}
      >
        <BasketballArt size={230} />
      </View>
      <View style={{ marginTop: "auto", gap: 12, paddingTop: 16 }}>
        <Action
          label="Find my starting point"
          onPress={() => router.push("/setup")}
        />
        <Copy kind="caption" muted style={{ textAlign: "center" }}>
          Made for beginners. Basketball comes first.
        </Copy>
      </View>
    </FlowScreen>
  );
}
