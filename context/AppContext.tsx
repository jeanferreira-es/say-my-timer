import React, {
  createContext,
  ReactNode,
  useCallback,
  useMemo,
  useState,
} from "react";
import type { AlarmId } from "../config/alarms";
import { DEFAULT_ALARM_ID } from "../config/alarms";
import Colors from "../constants/Colors";

export interface ScoreRow {
  id: string;
  scores: Record<string, string>;
}

export interface ThemeColors {
  background: string;
  surface: string;
  card: string;
  modalBackground: string;
  primary: string;
  accent: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  border: string;
  inputBg: string;
  inputBorder: string;
  placeholder: string;
  cardText: string;
}

export type ThemeMode = "light" | "dark";

export interface AppContextValue {
  counter: number;
  incrementCounter: () => void;
  resetCounter: () => void;
  scores: ScoreRow[];
  scoreColumns: string[];
  participantsByTeam: Record<string, string[]>;
  updateScore: (rowId: string, column: string, value: string) => void;
  addScoreColumn: (name: string) => boolean;
  removeScoreColumn: (teamName: string) => void;
  reorderScoreColumns: (newOrder: string[]) => void;
  moveTeam: (teamIndex: number, direction: "left" | "right") => void;
  addParticipantToTeam: (teamName: string, participantName: string) => boolean;
  removeParticipant: (teamName: string, participantName: string) => void;
  reorderParticipants: (teamName: string, newOrder: string[]) => void;
  themeMode: ThemeMode;
  colors: ThemeColors;
  toggleTheme: () => void;
  selectedAlarmId: AlarmId;
  setSelectedAlarmId: (id: AlarmId) => void;
  secondaryTimerSeconds: number;
  setSecondaryTimerSeconds: (seconds: number) => void;
}

const defaultScores: ScoreRow[] = [
  { id: "R1", scores: {} },
  { id: "R2", scores: {} },
  { id: "RFast", scores: {} },
  { id: "R3", scores: {} },
  { id: "Total", scores: {} },
];

export const lightTheme: ThemeColors = {
  background: Colors.light.background,
  surface: "#f0f0ec",
  card: "#ffffff",
  modalBackground: "#ffffff",
  primary: Colors.light.primary,
  accent: Colors.light.accent,
  text: Colors.light.text,
  textSecondary: "#4a5568",
  textTertiary: "#97a2b3",
  border: "#d0d0cc",
  inputBg: "#ffffff",
  inputBorder: "#c4c4be",
  placeholder: "#6b7280",
  cardText: "#1a1a1a",
};

export const darkTheme: ThemeColors = {
  background: Colors.dark.background,
  surface: "#16213e",
  card: "#0f1c28",
  modalBackground: "#0f1c28",
  primary: Colors.dark.primary,
  accent: Colors.dark.accent,
  text: Colors.dark.text,
  textSecondary: "#a0a0a0",
  textTertiary: "#d0d0cc",
  border: "#1a2d3d",
  inputBg: "#0a1622",
  inputBorder: "#2a3d4d",
  placeholder: "#6b7280",
  cardText: "#f5f5f0",
};

export const AppContext = createContext<AppContextValue | null>(null);

interface AppProviderProps {
  children: ReactNode;
}

export function AppProvider({ children }: AppProviderProps) {
  const [counter, setCounter] = useState(0);
  const [scores, setScores] = useState<ScoreRow[]>(defaultScores);
  const [scoreColumns, setScoreColumns] = useState<string[]>([]);
  const [participantsByTeam, setParticipantsByTeam] = useState<
    Record<string, string[]>
  >({});
  const [themeMode, setThemeMode] = useState<ThemeMode>("dark");
  const [selectedAlarmId, setSelectedAlarmId] =
    useState<AlarmId>(DEFAULT_ALARM_ID);
  const [secondaryTimerSeconds, setSecondaryTimerSeconds] =
    useState<number>(15);

  const colors = useMemo(
    () => (themeMode === "light" ? lightTheme : darkTheme),
    [themeMode],
  );

  const toggleTheme = useCallback(() => {
    setThemeMode((prev) => (prev === "light" ? "dark" : "light"));
  }, []);

  const incrementCounter = useCallback(() => setCounter((c) => c + 1), []);
  const resetCounter = useCallback(() => setCounter(0), []);

  const updateScore = useCallback(
    (rowId: string, column: string, value: string) => {
      setScores((prev) =>
        prev.map((row) =>
          row.id === rowId
            ? {
                ...row,
                scores: {
                  ...row.scores,
                  [column]: value,
                },
              }
            : row,
        ),
      );
    },
    [],
  );

  const addScoreColumn = useCallback((name: string) => {
    const trimmedName = name.trim();

    if (!trimmedName) {
      return false;
    }

    let wasAdded = false;

    setScoreColumns((prev) => {
      const alreadyExists = prev.some(
        (column) => column.toLowerCase() === trimmedName.toLowerCase(),
      );

      if (alreadyExists) {
        return prev;
      }

      wasAdded = true;
      setParticipantsByTeam((current) => ({
        ...current,
        [trimmedName]: current[trimmedName] ?? [],
      }));
      return [...prev, trimmedName];
    });

    return wasAdded;
  }, []);

  const removeScoreColumn = useCallback((teamName: string) => {
    const trimmed = teamName.trim();
    if (!trimmed) return;
    setScoreColumns((prev) => prev.filter((col) => col !== trimmed));
    setParticipantsByTeam((prev) => {
      const next = { ...prev };
      delete next[trimmed];
      return next;
    });
    setScores((prev) =>
      prev.map((row) => {
        const { [trimmed]: _, ...rest } = row.scores;
        return { ...row, scores: rest };
      }),
    );
  }, []);

  const reorderScoreColumns = useCallback((newOrder: string[]) => {
    if (!newOrder.length) return;
    setScoreColumns(() => [...newOrder]);
  }, []);

  const moveTeam = useCallback(
    (teamIndex: number, direction: "left" | "right") => {
      setScoreColumns((prev) => {
        const len = prev.length;
        if (len < 2) return prev;
        const nextIndex = direction === "left" ? teamIndex - 1 : teamIndex + 1;
        if (nextIndex < 0 || nextIndex >= len) return prev;
        const next = [...prev];
        const a = next[teamIndex];
        next[teamIndex] = next[nextIndex];
        next[nextIndex] = a;
        return next;
      });
    },
    [],
  );

  const addParticipantToTeam = useCallback(
    (teamName: string, participantName: string) => {
      const trimmedTeamName = teamName.trim();
      const trimmedParticipantName = participantName.trim();

      if (!trimmedTeamName || !trimmedParticipantName) {
        return false;
      }

      let wasAdded = false;

      setParticipantsByTeam((prev) => {
        const currentParticipants = prev[trimmedTeamName] ?? [];
        const alreadyExists = currentParticipants.some(
          (participant) =>
            participant.toLowerCase() === trimmedParticipantName.toLowerCase(),
        );

        if (alreadyExists) {
          return prev;
        }

        wasAdded = true;

        return {
          ...prev,
          [trimmedTeamName]: [...currentParticipants, trimmedParticipantName],
        };
      });

      return wasAdded;
    },
    [],
  );

  const removeParticipant = useCallback(
    (teamName: string, participantName: string) => {
      const trimmed = teamName.trim();
      if (!trimmed) return;
      setParticipantsByTeam((prev) => {
        const list = prev[trimmed] ?? [];
        const nextList = list.filter((p) => p !== participantName);
        if (nextList.length === list.length) return prev;
        return { ...prev, [trimmed]: nextList };
      });
    },
    [],
  );

  const reorderParticipants = useCallback(
    (teamName: string, newOrder: string[]) => {
      const trimmed = teamName.trim();
      if (!trimmed) return;
      setParticipantsByTeam((prev) => ({ ...prev, [trimmed]: [...newOrder] }));
    },
    [],
  );

  const value = useMemo<AppContextValue>(
    () => ({
      counter,
      incrementCounter,
      resetCounter,
      scores,
      scoreColumns,
      participantsByTeam,
      updateScore,
      addScoreColumn,
      removeScoreColumn,
      reorderScoreColumns,
      moveTeam,
      addParticipantToTeam,
      removeParticipant,
      reorderParticipants,
      themeMode,
      colors,
      toggleTheme,
      selectedAlarmId,
      setSelectedAlarmId,
      secondaryTimerSeconds,
      setSecondaryTimerSeconds,
    }),
    [
      counter,
      incrementCounter,
      resetCounter,
      scores,
      scoreColumns,
      participantsByTeam,
      updateScore,
      addScoreColumn,
      removeScoreColumn,
      reorderScoreColumns,
      moveTeam,
      addParticipantToTeam,
      removeParticipant,
      reorderParticipants,
      themeMode,
      colors,
      toggleTheme,
      selectedAlarmId,
      secondaryTimerSeconds,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = React.useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
