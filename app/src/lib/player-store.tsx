import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type PropsWithChildren,
} from "react";
import {
  blankProfile,
  blankProgress,
  completeSkillDemo,
  catalog,
  categories,
  isValidCompletion,
  placementFor,
  type Profile,
  type Progress,
} from "./learning-service";

type Player = { version: 1; profile: Profile | null; progress: Progress };
const empty = (): Player => ({
  version: 1,
  profile: null,
  progress: blankProgress(),
});
const KEY = "hoop.player.v1";
type Store = {
  player: Player;
  loading: boolean;
  loadFailed: boolean;
  error: string | null;
  busy: boolean;
  draft: Profile;
  setDraft: (p: Profile) => void;
  saveProfile: (p: Profile) => Promise<boolean>;
  completeDemo: (id: string) => Promise<boolean>;
  /** Complete a skill from a passed vision check (same unlock rules as completeDemo). */
  completeVision: (
    id: string,
    attempt: { attemptId: string; spec: string; completedAt: string },
  ) => Promise<boolean>;
  saveStep: (id: string, step: number) => Promise<boolean>;
  logPractice: () => Promise<boolean>;
  reset: () => Promise<boolean>;
  retryLoad: () => void;
};
const Context = createContext<Store | null>(null);
export function PlayerProvider({ children }: PropsWithChildren) {
  const [player, setPlayer] = useState<Player>(empty);
  const current = useRef(player);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const [draft, setDraft] = useState<Profile>(blankProfile);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const saving = useRef(false);
  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        const data: Player = raw ? JSON.parse(raw) : empty();
        if (
          data.version !== 1 ||
          !data.progress ||
          !data.progress.completed ||
          Array.isArray(data.progress.completed) ||
          typeof data.progress.completed !== "object" ||
          (data.progress.placedOut !== undefined &&
            (!data.progress.placedOut ||
              Array.isArray(data.progress.placedOut) ||
              typeof data.progress.placedOut !== "object" ||
              !Object.values(data.progress.placedOut).every(
                (v) => v === true,
              ))) ||
          !data.progress.lessonSteps ||
          !Number.isFinite(data.progress.practiceCount) ||
          data.progress.practiceCount < 0 ||
          !Object.values(data.progress.lessonSteps).every(
            (s) => Number.isInteger(s) && s >= 0 && s <= 3,
          ) ||
          !Object.values(data.progress.completed).every(isValidCompletion)
        )
          throw new Error("Invalid saved player");
        if (
          data.profile &&
          (!data.profile.familiarity ||
            typeof data.profile.familiarity !== "object")
        )
          throw new Error("Invalid profile");
        // Catalog revisions can add/remove categories without stranding an existing learner.
        if (data.profile) {
          const previous = data.profile;
          data.profile = {
            experience: ["new", "some", "experienced"].includes(
              previous.experience ?? "",
            )
              ? previous.experience
              : "new",
            sessionMinutes: [5, 10, 20].includes(previous.sessionMinutes ?? 0)
              ? previous.sessionMinutes
              : 10,
            goal:
              previous.goal === "basics" ||
              categories.some((c) => c.id === previous.goal)
                ? previous.goal
                : "basics",
            familiarity: Object.fromEntries(
              categories.map((c) => [
                c.id,
                ["new", "tried", "learning", "unsure"].includes(
                  previous.familiarity[c.id],
                )
                  ? previous.familiarity[c.id]
                  : "new",
              ]),
            ),
          };
        }
        if (active) {
          current.current = data;
          setPlayer(data);
          setDraft(data.profile ?? blankProfile());
          setError(null);
          setLoadFailed(false);
          setLoading(false);
        }
      })
      .catch(() => {
        if (active) {
          setError(
            "Your saved progress could not be loaded. Retry before continuing.",
          );
          setLoadFailed(true);
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, [loadAttempt]);
  async function commit(data: Player) {
    if (saving.current) return false;
    saving.current = true;
    setBusy(true);
    try {
      await AsyncStorage.setItem(KEY, JSON.stringify(data));
      current.current = data;
      setPlayer(data);
      setError(null);
      return true;
    } catch {
      setError(
        "Could not save on this device. Your current screen is preserved. Please try again.",
      );
      return false;
    } finally {
      saving.current = false;
      setBusy(false);
    }
  }
  return (
    <Context.Provider
      value={{
        player,
        loading,
        loadFailed,
        error,
        busy,
        draft,
        setDraft,
        saveProfile: (p) =>
          commit({
            ...current.current,
            profile: p,
            progress: {
              ...current.current.progress,
              placedOut: placementFor(p),
            },
          }),
        completeDemo: (id) => {
          try {
            return commit({
              ...current.current,
              progress: completeSkillDemo(
                catalog,
                current.current.progress,
                id,
              ),
            });
          } catch {
            setError(
              "This skill still has prerequisites. Return to the tree to review them.",
            );
            return Promise.resolve(false);
          }
        },
        completeVision: (id, attempt) => {
          try {
            // Same guards as completeDemo (unknown, locked, quiz), then record
            // the verified provenance instead of "demo".
            const progress = current.current.progress;
            const next = completeSkillDemo(catalog, progress, id);
            if (next === progress) return Promise.resolve(true); // already complete
            return commit({
              ...current.current,
              progress: {
                ...next,
                completed: {
                  ...next.completed,
                  [id]: { source: "vision", ...attempt },
                },
              },
            });
          } catch {
            setError(
              "This skill still has prerequisites. Return to the tree to review them.",
            );
            return Promise.resolve(false);
          }
        },
        saveStep: (id, step) =>
          commit({
            ...current.current,
            progress: {
              ...current.current.progress,
              lessonSteps: {
                ...current.current.progress.lessonSteps,
                [id]: step,
              },
            },
          }),
        logPractice: () =>
          commit({
            ...current.current,
            progress: {
              ...current.current.progress,
              practiceCount: current.current.progress.practiceCount + 1,
            },
          }),
        reset: async () => {
          const ok = await commit(empty());
          if (ok) {
            setDraft(blankProfile());
            setLoadFailed(false);
          }
          return ok;
        },
        retryLoad: () => {
          setLoading(true);
          setLoadAttempt((n) => n + 1);
        },
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function usePlayer() {
  const store = useContext(Context);
  if (!store) throw new Error("PlayerProvider missing");
  return store;
}
