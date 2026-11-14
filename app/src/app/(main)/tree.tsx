import { Reveal } from "@/components/motion";
import { ButtonRoot } from "@/components/ui/beui/button";
import { useCallback, useState } from "react";
import {
  Keyboard,
  Pressable,
  ScrollView,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  useFocusEffect,
  useIsFocused,
  useLocalSearchParams,
} from "expo-router";
import { Action, Copy, Icon, palette, ui } from "@/components/hoop-ui";
import { ConnectedSkillMap } from "@/components/connected-skill-map";
import { SkillDetails } from "@/components/skill-details";
import {
  categories,
  catalog,
  recommend,
  skillState,
} from "@/lib/learning-service";
import { usePlayer } from "@/lib/player-store";

export default function Tree() {
  const focused = useIsFocused();
  const { height } = useWindowDimensions();
  const { player } = usePlayer();
  const params = useLocalSearchParams<{ category?: string; node?: string }>();
  const next = player.profile
    ? recommend(catalog, player.profile, player.progress)
    : undefined;
  const [selection, setSelection] = useState(
    params.node ?? next?.id ?? catalog.nodes[0].id,
  );
  const [category, setCategory] = useState<string | null>(
    params.category ?? null,
  );
  const [query, setQuery] = useState("");
  const [list, setList] = useState(false);
  const [fullPath, setFullPath] = useState(false);
  const [focusVersion, setFocusVersion] = useState(0);
  const [expanded, setExpanded] = useState(false);
  useFocusEffect(
    useCallback(() => {
      if (params.category)
        setCategory(params.category === "all" ? null : params.category);
      const target =
        params.node ??
        catalog.nodes.find((n) => n.category === params.category)?.id;
      if (target) {
        setSelection(target);
        setFocusVersion((v) => v + 1);
      }
    }, [params.category, params.node]),
  );
  const selected =
    catalog.nodes.find((n) => n.id === selection) ?? catalog.nodes[0];
  const searchable = (text: string) =>
    text.toLowerCase().replace(/[^a-z0-9]/g, "");
  const results = catalog.nodes.filter((n) =>
    searchable(n.name).includes(searchable(query)),
  );
  const chooseCategory = (id: string | null) => {
    setCategory(id);
    setExpanded(false);
    if (id) {
      const entry =
        catalog.nodes.find(
          (n) =>
            n.category === id && skillState(n, player.progress) === "available",
        ) ?? catalog.nodes.find((n) => n.category === id);
      if (entry) setSelection(entry.id);
    }
  };
  const select = (id: string, focus = true) => {
    setSelection(id);
    setExpanded(true);
    setQuery("");
    if (focus) setFocusVersion((v) => v + 1);
    Keyboard.dismiss();
  };
  return (
    <SafeAreaView
      aria-hidden={!focused}
      importantForAccessibility={focused ? "auto" : "no-hide-descendants"}
      edges={["top", "left", "right"]}
      style={{ flex: 1, backgroundColor: palette.background }}
    >
      <View style={{ paddingHorizontal: 20, paddingTop: 12, gap: 8 }}>
        <View style={[ui.row, { justifyContent: "space-between" }]}>
          <Copy kind="title" style={{ flex: 1, fontSize: 28 }}>
            Skill tree
          </Copy>
          <ButtonRoot
            accessibilityLabel="Recenter recommended skill"
            onPress={() => select(next?.id ?? selected.id)}
            style={{
              width: 44,
              height: 44,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon name="focus" size={20} color={palette.textSecondary} />
          </ButtonRoot>
          <ButtonRoot
            accessibilityLabel={
              fullPath ? "Showing full path" : "Show full prerequisite path"
            }
            aria-pressed={fullPath}
            onPress={() => setFullPath(!fullPath)}
            style={{
              width: 44,
              height: 44,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 12,
              backgroundColor: fullPath
                ? palette.accentSoft
                : palette.backgroundElement,
            }}
          >
            <Icon
              name="tree"
              size={20}
              color={fullPath ? palette.accent : palette.textSecondary}
            />
          </ButtonRoot>
          <ButtonRoot
            accessibilityLabel={list ? "Map view" : "List view"}
            onPress={() => setList(!list)}
            style={{
              width: 44,
              height: 44,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon
              name={list ? "tree" : "list"}
              size={20}
              color={palette.textSecondary}
            />
          </ButtonRoot>
        </View>
        <Copy kind="caption" muted>
          {catalog.nodes.length} skills. One connected game.
        </Copy>
        <View
          style={[
            ui.row,
            ui.secondary,
            { borderRadius: 12, paddingHorizontal: 12 },
          ]}
        >
          <Icon name="search" size={20} color={palette.textSecondary} />
          <TextInput
            accessibilityLabel="Search skills"
            placeholder="Search skills, e.g. stepback"
            placeholderTextColor={palette.textSecondary}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            onSubmitEditing={() => results[0] && select(results[0].id)}
            style={{
              flex: 1,
              height: 46,
              color: palette.text,
              fontSize: 15,
              fontFamily: "Inter_400Regular",
            }}
          />
          {!!query && (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear search"
              onPress={() => setQuery("")}
              style={{ padding: 10 }}
            >
              <Icon name="close" size={18} />
            </Pressable>
          )}
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
        >
          {[
            { id: "all", short: "All", color: palette.accent },
            ...categories,
          ].map((c) => (
            <ButtonRoot
              key={c.id}
              accessibilityRole="button"
              accessibilityState={{ selected: (category ?? "all") === c.id }}
              onPress={() => chooseCategory(c.id === "all" ? null : c.id)}
              style={{
                minHeight: 48,
                flexDirection: "row",
                alignItems: "center",
                gap: 8,
                paddingHorizontal: 14,
                justifyContent: "center",
                borderRadius: 14,
                borderWidth: 1,
                borderColor:
                  (category ?? "all") === c.id ? c.color : palette.border,
                backgroundColor:
                  (category ?? "all") === c.id
                    ? c.color + "22"
                    : c.color + "0C",
              }}
            >
              <Icon
                name={"icon" in c ? c.icon : "tree"}
                size={18}
                color={c.color}
              />
              <Copy
                kind="caption"
                style={{
                  color: c.color,
                }}
              >
                {c.short}
              </Copy>
            </ButtonRoot>
          ))}
        </ScrollView>
      </View>
      {query.trim() ? (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 20, gap: 8 }}
          keyboardShouldPersistTaps="handled"
        >
          {results.length ? (
            results.map((n) => (
              <Action
                key={n.id}
                label={n.name}
                variant="secondary"
                onPress={() => select(n.id)}
              />
            ))
          ) : (
            <Copy muted>No matching skills. Try “shot” or “dribble”.</Copy>
          )}
        </ScrollView>
      ) : list ? (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: 20, gap: 8 }}
        >
          {catalog.nodes
            .filter((n) => !category || n.category === category)
            .map((n) => (
              <Action
                key={n.id}
                label={`${n.name} · ${skillState(n, player.progress)}`}
                variant="secondary"
                onPress={() => {
                  select(n.id);
                  setList(false);
                }}
              />
            ))}
        </ScrollView>
      ) : (
        <ConnectedSkillMap
          onCategory={chooseCategory}
          focusVersion={focusVersion}
          nodes={catalog.nodes}
          progress={player.progress}
          selected={selected.id}
          category={category}
          fullPath={fullPath}
          onSelect={(id) => select(id, false)}
        />
      )}
      {!query.trim() && !list && (
        <View
          style={{
            maxHeight: expanded ? (height < 650 ? "35%" : "43%") : 56,
            backgroundColor: palette.backgroundElement,
            borderTopWidth: 1,
            borderColor: palette.border,
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              expanded ? "Collapse skill details" : "Expand skill details"
            }
            onPress={() => setExpanded(!expanded)}
            style={{
              minHeight: 44,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <View
              style={{
                width: 36,
                height: 4,
                borderRadius: 2,
                backgroundColor: palette.border,
              }}
            />
            {!expanded && <Copy kind="caption">{selected.name}</Copy>}
          </Pressable>
          {expanded && (
            <ScrollView
              contentContainerStyle={{
                paddingHorizontal: 20,
                paddingBottom: 20,
              }}
            >
              <Reveal key={selected.id}>
                <SkillDetails
                  node={selected}
                  progress={player.progress}
                  onSelect={select}
                />
              </Reveal>
            </ScrollView>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}
