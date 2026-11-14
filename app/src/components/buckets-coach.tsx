import { useEffect, useRef, useState, type ComponentRef } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ArrowUp from "lucide-react-native/icons/arrow-up";
import { Copy, Icon, palette } from "./hoop-ui";
import { useReducedMotionPreference } from "./ui/beui/use-reduced-motion";
import {
  askBuckets,
  BucketsError,
  type ChatMessage,
} from "@/lib/buckets-ai";
import type { SkillNode } from "@/lib/hooptree/skillTree";

const mascot = require("../../assets/images/buckets.png");
const QUICK_REPLIES = ["Explain it simpler", "Common mistakes?", "Quiz me"];

/** Render with `key={skill.id}` so each lesson starts a fresh conversation. */
export function BucketsCoach({ skill }: { skill: SkillNode }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const insets = useSafeAreaInsets();

  useEffect(() => () => abort.current?.abort(), []);

  const greeting: ChatMessage = {
    role: "buckets",
    text: `Yo! I'm Buckets 🏀 Let's lock in ${skill.title}. Ask me anything about it — or tap a button below.`,
  };

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || thinking) return;
    const next = [...messages, { role: "user" as const, text: trimmed }];
    setMessages(next);
    setDraft("");
    setError(null);
    setThinking(true);
    abort.current = new AbortController();
    try {
      const reply = await askBuckets(skill, next, abort.current.signal);
      setMessages((m) => [...m, { role: "buckets", text: reply }]);
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
      setError(
        e instanceof BucketsError ? e.message : "Something went wrong — try again.",
      );
    } finally {
      setThinking(false);
    }
  }

  const all = [greeting, ...messages];

  return (
    <>
      <MascotButton
        onPress={() => setOpen(true)}
        bottom={insets.bottom + 16}
        hidden={open}
      />
      <Modal
        visible={open}
        transparent
        animationType="slide"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable
          style={styles.backdrop}
          onPress={() => setOpen(false)}
          accessibilityLabel="Close Buckets"
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.sheetWrap}
          pointerEvents="box-none"
        >
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 12 }]}>
            <View style={styles.header}>
              <Image source={mascot} style={styles.headerAvatar} />
              <View style={{ flex: 1 }}>
                <Copy kind="heading" style={{ fontSize: 18, lineHeight: 24 }}>
                  Buckets
                </Copy>
                <Copy kind="caption" muted numberOfLines={1}>
                  Coaching you on {skill.title}
                </Copy>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Close"
                onPress={() => setOpen(false)}
                hitSlop={12}
                style={{ padding: 6 }}
              >
                <Icon name="close" size={22} />
              </Pressable>
            </View>

            <ScrollView
              ref={scroll}
              style={styles.thread}
              contentContainerStyle={{ gap: 10, paddingVertical: 12 }}
              keyboardShouldPersistTaps="handled"
              onContentSizeChange={() =>
                scroll.current?.scrollToEnd({ animated: true })
              }
            >
              {all.map((m, i) => (
                <Bubble key={i} message={m} />
              ))}
              {thinking && (
                <View style={[styles.bubble, styles.coachBubble, { paddingVertical: 12 }]}>
                  <ActivityIndicator size="small" color={palette.accent} />
                </View>
              )}
              {error && (
                <Copy kind="caption" style={{ color: palette.accent, textAlign: "center" }}>
                  {error}
                </Copy>
              )}
            </ScrollView>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ gap: 8, paddingBottom: 10 }}
              keyboardShouldPersistTaps="handled"
            >
              {QUICK_REPLIES.map((q) => (
                <Pressable
                  key={q}
                  accessibilityRole="button"
                  onPress={() => send(q)}
                  disabled={thinking}
                  style={({ pressed }) => [
                    styles.chip,
                    (pressed || thinking) && { opacity: 0.5 },
                  ]}
                >
                  <Copy kind="caption" style={{ color: palette.accent }}>
                    {q}
                  </Copy>
                </Pressable>
              ))}
            </ScrollView>

            <View style={styles.inputRow}>
              <TextInput
                value={draft}
                onChangeText={setDraft}
                placeholder="Ask Buckets…"
                placeholderTextColor={palette.textSecondary}
                style={styles.input}
                multiline
                maxLength={500}
                onSubmitEditing={() => send(draft)}
                submitBehavior="submit"
                returnKeyType="send"
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Send"
                onPress={() => send(draft)}
                disabled={!draft.trim() || thinking}
                style={[
                  styles.send,
                  (!draft.trim() || thinking) && { opacity: 0.4 },
                ]}
              >
                <ArrowUp size={20} color={palette.background} strokeWidth={2.4} />
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

function Bubble({ message }: { message: ChatMessage }) {
  const mine = message.role === "user";
  return (
    <View style={[styles.bubble, mine ? styles.userBubble : styles.coachBubble]}>
      <Copy style={mine ? { color: palette.background } : undefined}>
        {message.text}
      </Copy>
    </View>
  );
}

function MascotButton({
  onPress,
  bottom,
  hidden,
}: {
  onPress: () => void;
  bottom: number;
  hidden: boolean;
}) {
  const reduced = useReducedMotionPreference();
  const y = useSharedValue(0);
  useEffect(() => {
    if (reduced) {
      cancelAnimation(y);
      y.value = 0;
      return;
    }
    // A slow, subtle dribble-bounce so he feels alive without being distracting.
    y.value = withRepeat(
      withSequence(
        withTiming(-5, { duration: 900, easing: Easing.inOut(Easing.quad) }),
        withTiming(0, { duration: 900, easing: Easing.inOut(Easing.quad) }),
      ),
      -1,
    );
    return () => cancelAnimation(y);
  }, [reduced, y]);
  const bounce = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));

  if (hidden) return null;
  return (
    <Animated.View style={[styles.fab, { bottom }, bounce]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Ask Buckets, your coach"
        onPress={onPress}
        style={({ pressed }) => ({ transform: [{ scale: pressed ? 0.92 : 1 }] })}
      >
        <Image source={mascot} style={styles.fabImage} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    right: 20,
    width: 64,
    height: 64,
    borderRadius: 32,
    shadowColor: "#000",
    shadowOpacity: 0.45,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  fabImage: { width: 64, height: 64 },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: "#000000A0" },
  sheetWrap: { flex: 1, justifyContent: "flex-end" },
  sheet: {
    maxHeight: "78%",
    width: "100%",
    maxWidth: 640,
    alignSelf: "center",
    backgroundColor: palette.backgroundElement,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: palette.border,
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderColor: palette.border,
  },
  headerAvatar: { width: 40, height: 40 },
  thread: { flexGrow: 0, minHeight: 160 },
  bubble: {
    maxWidth: "85%",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  coachBubble: {
    alignSelf: "flex-start",
    backgroundColor: palette.backgroundSelected,
    borderBottomLeftRadius: 6,
  },
  userBubble: {
    alignSelf: "flex-end",
    backgroundColor: palette.accent,
    borderBottomRightRadius: 6,
  },
  chip: {
    borderWidth: 1,
    borderColor: palette.accent + "65",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  inputRow: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    backgroundColor: palette.background,
    color: palette.text,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: palette.border,
    paddingHorizontal: 16,
    paddingTop: 11,
    paddingBottom: 11,
    fontSize: 16,
  },
  send: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: palette.accent,
    alignItems: "center",
    justifyContent: "center",
  },
});
