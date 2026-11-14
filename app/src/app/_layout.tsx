import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useFonts } from "expo-font";
import { Inter_400Regular } from "@expo-google-fonts/inter/400Regular";
import { Inter_500Medium } from "@expo-google-fonts/inter/500Medium";
import { Inter_600SemiBold } from "@expo-google-fonts/inter/600SemiBold";
import { Inter_700Bold } from "@expo-google-fonts/inter/700Bold";

import { Colors } from "@/constants/theme";
import { PlayerProvider, usePlayer } from "@/lib/player-store";
import { View, ActivityIndicator } from "react-native";
import { Copy, Action, ErrorNotice } from "@/components/hoop-ui";

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  if (!fontsLoaded && !fontError)
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: Colors.dark.background,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <ActivityIndicator color={Colors.dark.accent} />
      </View>
    );
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PlayerProvider>
        <Navigator />
      </PlayerProvider>
    </GestureHandlerRootView>
  );
}

function Navigator() {
  const { player, loading, loadFailed, error, retryLoad } = usePlayer();
  if (loading)
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: Colors.dark.background,
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
        }}
      >
        <ActivityIndicator color={Colors.dark.accent} />
        <Copy>Opening your court…</Copy>
      </View>
    );
  if (loadFailed)
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: Colors.dark.background,
          padding: 24,
          justifyContent: "center",
          gap: 16,
        }}
      >
        <ErrorNotice message={error} />
        <Action label="Retry loading" onPress={retryLoad} />
      </View>
    );
  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.dark.background },
        }}
      >
        {/* redirectTo: with a saved profile, "/" would otherwise fall back to the
            (main) group, which has no index route -> "Unmatched route" on launch. */}
        <Stack.Protected guard={!player.profile} redirectTo="/home">
          <Stack.Screen name="index" />
        </Stack.Protected>
        <Stack.Screen name="setup" />
        <Stack.Protected guard={!!player.profile}>
          <Stack.Screen name="(main)" />
          <Stack.Screen name="skill/[id]" options={{ presentation: "modal" }} />
          <Stack.Screen name="lesson/[id]" />
          <Stack.Screen name="practice/[id]" />
          <Stack.Screen name="complete/[id]" />
          <Stack.Screen name="daily" />
          <Stack.Screen name="settings" />
        </Stack.Protected>
      </Stack>
      <StatusBar style="light" />
    </>
  );
}
