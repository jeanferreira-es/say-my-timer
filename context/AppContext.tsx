import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { AlarmId } from "../config/alarms";
import { ALARM_SOUNDS, DEFAULT_ALARM_ID } from "../config/alarms";
import Colors from "../constants/Colors";
import type { TeamStyle } from "../utils/teamGradients";
import {
  normalizePlayerName,
  validateTeamName,
  validateTeamPlayers,
} from "../utils/teamRules";

export { normalizePlayerName };

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

export interface PlayerNameUsage {
  name: string;
  count: number;
  lastUsedAt: number;
}

type PlayerNameHistory = Record<string, PlayerNameUsage>;

const PLAYER_NAME_HISTORY_KEY = "playerNameHistory";
const ROSTER_PLAYERS_KEY = "rosterPlayers";
const SELECTED_ALARM_KEY = "selectedAlarmId";
const THEME_MODE_KEY = "themeMode";

export interface AppContextValue {
  counter: number;
  incrementCounter: () => void;
  resetCounter: () => void;
  scores: ScoreRow[];
  scoreColumns: string[];
  participantsByTeam: Record<string, string[]>;
  // Tema e ícone escolhidos por time; ausente = padrão pela posição
  teamStyles: Record<string, TeamStyle>;
  setTeamStyle: (teamName: string, style: TeamStyle) => void;
  updateScore: (rowId: string, column: string, value: string) => void;
  // As funções de times retornam a mensagem de erro, ou null em caso de sucesso.
  addTeam: (teamName: string, players: string[]) => string | null;
  renameScoreColumn: (teamName: string, nextName: string) => string | null;
  removeScoreColumn: (teamName: string) => void;
  reorderScoreColumns: (newOrder: string[]) => void;
  moveTeam: (teamIndex: number, direction: "left" | "right") => void;
  setTeamParticipants: (teamName: string, players: string[]) => string | null;
  removeParticipant: (teamName: string, participantName: string) => void;
  reorderParticipants: (teamName: string, newOrder: string[]) => void;
  getPlayerSuggestions: (
    query: string,
    exclude?: string[],
    limit?: number,
  ) => string[];
  rosterPlayers: string[];
  addRosterPlayer: (name: string) => boolean;
  removeRosterPlayer: (name: string) => void;
  themeMode: ThemeMode;
  isThemeReady: boolean;
  colors: ThemeColors;
  toggleTheme: () => void;
  selectedAlarmId: AlarmId;
  setSelectedAlarmId: (id: AlarmId) => void;
  secondaryTimerSeconds: number;
  setSecondaryTimerSeconds: (seconds: number) => void;
}

const defaultScores: ScoreRow[] = [
  { id: "1ª Rodada", scores: {} },
  { id: "2ª Rodada", scores: {} },
  { id: "Rodada Relâmpago", scores: {} },
  { id: "3ª Rodada", scores: {} },
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
  const [teamStyles, setTeamStyles] = useState<Record<string, TeamStyle>>({});
  const [themeMode, setThemeMode] = useState<ThemeMode>("dark");
  // A splash só some depois de ler o tema salvo, para não abrir no tema errado
  const [isThemeReady, setIsThemeReady] = useState(false);
  const [selectedAlarmId, setSelectedAlarmIdState] =
    useState<AlarmId>(DEFAULT_ALARM_ID);
  const alarmChosenBeforeLoad = useRef(false);
  const [secondaryTimerSeconds, setSecondaryTimerSeconds] =
    useState<number>(15);
  const [playerNameHistory, setPlayerNameHistory] =
    useState<PlayerNameHistory>({});
  const playerNameHistoryLoaded = useRef(false);
  useEffect(() => {
    AsyncStorage.getItem(SELECTED_ALARM_KEY)
      .then((stored) => {
        // Ignore unknown ids (e.g. an alarm removed in a later version).
        if (alarmChosenBeforeLoad.current || !stored || !(stored in ALARM_SOUNDS)) {
          return;
        }
        setSelectedAlarmIdState(stored as AlarmId);
      })
      .catch(() => {});
  }, []);

  const setSelectedAlarmId = useCallback((id: AlarmId) => {
    alarmChosenBeforeLoad.current = true;
    setSelectedAlarmIdState(id);
    AsyncStorage.setItem(SELECTED_ALARM_KEY, id).catch(() => {});
  }, []);

  const [rosterPlayers, setRosterPlayers] = useState<string[]>([]);
  const rosterPlayersLoaded = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem(ROSTER_PLAYERS_KEY)
      .then((stored) => {
        if (!stored) return;
        const parsed: string[] = JSON.parse(stored);
        // Players added before loading finished are kept after stored ones.
        setRosterPlayers((current) => [
          ...parsed,
          ...current.filter(
            (name) =>
              !parsed.some(
                (storedName) =>
                  normalizePlayerName(storedName) === normalizePlayerName(name),
              ),
          ),
        ]);
      })
      .catch(() => {})
      .finally(() => {
        rosterPlayersLoaded.current = true;
      });
  }, []);

  useEffect(() => {
    if (!rosterPlayersLoaded.current) return;
    AsyncStorage.setItem(
      ROSTER_PLAYERS_KEY,
      JSON.stringify(rosterPlayers),
    ).catch(() => {});
  }, [rosterPlayers]);

  const addRosterPlayer = useCallback(
    (name: string) => {
      const trimmed = name.trim();
      const key = normalizePlayerName(trimmed);
      if (!key) return false;

      const alreadyExists = rosterPlayers.some(
        (player) => normalizePlayerName(player) === key,
      );
      if (alreadyExists) return false;

      setRosterPlayers((prev) => [...prev, trimmed]);
      return true;
    },
    [rosterPlayers],
  );

  const removeRosterPlayer = useCallback((name: string) => {
    const key = normalizePlayerName(name);
    setRosterPlayers((prev) =>
      prev.filter((player) => normalizePlayerName(player) !== key),
    );
  }, []);

  useEffect(() => {
    AsyncStorage.getItem(PLAYER_NAME_HISTORY_KEY)
      .then((stored) => {
        if (!stored) return;
        const parsed: PlayerNameHistory = JSON.parse(stored);
        // Names recorded before loading finished win over stored ones.
        setPlayerNameHistory((current) => ({ ...parsed, ...current }));
      })
      .catch(() => {})
      .finally(() => {
        playerNameHistoryLoaded.current = true;
      });
  }, []);

  useEffect(() => {
    if (!playerNameHistoryLoaded.current) return;
    AsyncStorage.setItem(
      PLAYER_NAME_HISTORY_KEY,
      JSON.stringify(playerNameHistory),
    ).catch(() => {});
  }, [playerNameHistory]);

  const recordPlayerName = useCallback((name: string) => {
    const trimmed = name.trim();
    const key = normalizePlayerName(trimmed);
    if (!key) return;
    setPlayerNameHistory((prev) => ({
      ...prev,
      [key]: {
        name: trimmed,
        count: (prev[key]?.count ?? 0) + 1,
        lastUsedAt: Date.now(),
      },
    }));
  }, []);

  const getPlayerSuggestions = useCallback(
    (query: string, exclude: string[] = [], limit = 5) => {
      const normalizedQuery = normalizePlayerName(query);
      if (!normalizedQuery) return [];

      const excluded = new Set(exclude.map(normalizePlayerName));

      // Roster players are suggested even before they were ever used.
      const candidates: PlayerNameHistory = { ...playerNameHistory };
      rosterPlayers.forEach((player) => {
        const key = normalizePlayerName(player);
        candidates[key] ??= { name: player, count: 0, lastUsedAt: 0 };
      });

      return Object.entries(candidates)
        .filter(
          ([key]) =>
            key !== normalizedQuery &&
            !excluded.has(key) &&
            key.includes(normalizedQuery),
        )
        .sort(([keyA, a], [keyB, b]) => {
          const prefixA = keyA.startsWith(normalizedQuery) ? 0 : 1;
          const prefixB = keyB.startsWith(normalizedQuery) ? 0 : 1;
          return (
            prefixA - prefixB ||
            b.count - a.count ||
            b.lastUsedAt - a.lastUsedAt
          );
        })
        .slice(0, limit)
        .map(([, usage]) => usage.name);
    },
    [playerNameHistory, rosterPlayers],
  );

  const colors = useMemo(
    () => (themeMode === "light" ? lightTheme : darkTheme),
    [themeMode],
  );

  useEffect(() => {
    AsyncStorage.getItem(THEME_MODE_KEY)
      .then((stored) => {
        if (stored === "light" || stored === "dark") setThemeMode(stored);
      })
      .catch(() => {})
      .finally(() => setIsThemeReady(true));
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeMode((prev) => {
      const next = prev === "light" ? "dark" : "light";
      AsyncStorage.setItem(THEME_MODE_KEY, next).catch(() => {});
      return next;
    });
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

  const addTeam = useCallback(
    (teamName: string, players: string[]) => {
      const name = teamName.trim();
      const nameError = validateTeamName(scoreColumns, name);
      if (nameError) return nameError;
      const playersError = validateTeamPlayers(participantsByTeam, name, players);
      if (playersError) return playersError;

      const trimmedPlayers = players.map((player) => player.trim());
      setScoreColumns((prev) => [...prev, name]);
      setParticipantsByTeam((prev) => ({ ...prev, [name]: trimmedPlayers }));
      trimmedPlayers.forEach(recordPlayerName);
      return null;
    },
    [participantsByTeam, recordPlayerName, scoreColumns],
  );

  const removeScoreColumn = useCallback((teamName: string) => {
    const trimmed = teamName.trim();
    if (!trimmed) return;
    setScoreColumns((prev) => prev.filter((col) => col !== trimmed));
    setParticipantsByTeam((prev) => {
      const next = { ...prev };
      delete next[trimmed];
      return next;
    });
    setTeamStyles((prev) => {
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

  const renameScoreColumn = useCallback(
    (teamName: string, nextName: string) => {
      const trimmed = teamName.trim();
      const next = nextName.trim();
      if (!scoreColumns.includes(trimmed)) return "Time não encontrado";
      const nameError = validateTeamName(scoreColumns, next, trimmed);
      if (nameError) return nameError;
      if (trimmed === next) return null;

      setScoreColumns((prev) =>
        prev.map((column) => (column === trimmed ? next : column)),
      );
      setParticipantsByTeam((prev) => {
        const { [trimmed]: currentParticipants = [], ...rest } = prev;
        return {
          ...rest,
          [next]: currentParticipants,
        };
      });
      setTeamStyles((prev) => {
        const { [trimmed]: currentStyle, ...rest } = prev;
        return currentStyle ? { ...rest, [next]: currentStyle } : rest;
      });
      setScores((prev) =>
        prev.map((row) => {
          const { [trimmed]: currentScore, ...rest } = row.scores;
          return {
            ...row,
            scores:
              currentScore === undefined
                ? rest
                : {
                    ...rest,
                    [next]: currentScore,
                  },
          };
        }),
      );

      return null;
    },
    [scoreColumns],
  );

  const setTeamStyle = useCallback((teamName: string, style: TeamStyle) => {
    setTeamStyles((prev) => ({ ...prev, [teamName.trim()]: style }));
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

  const setTeamParticipants = useCallback(
    (teamName: string, players: string[]) => {
      const name = teamName.trim();
      if (!scoreColumns.includes(name)) return "Time não encontrado";
      const playersError = validateTeamPlayers(participantsByTeam, name, players);
      if (playersError) return playersError;

      const current = participantsByTeam[name] ?? [];
      const trimmedPlayers = players.map((player) => player.trim());
      setParticipantsByTeam((prev) => ({ ...prev, [name]: trimmedPlayers }));
      trimmedPlayers
        .filter(
          (player) =>
            !current.some(
              (existing) =>
                normalizePlayerName(existing) === normalizePlayerName(player),
            ),
        )
        .forEach(recordPlayerName);
      return null;
    },
    [participantsByTeam, recordPlayerName, scoreColumns],
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
      teamStyles,
      setTeamStyle,
      updateScore,
      addTeam,
      renameScoreColumn,
      removeScoreColumn,
      reorderScoreColumns,
      moveTeam,
      setTeamParticipants,
      removeParticipant,
      reorderParticipants,
      getPlayerSuggestions,
      rosterPlayers,
      addRosterPlayer,
      removeRosterPlayer,
      themeMode,
      isThemeReady,
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
      teamStyles,
      setTeamStyle,
      updateScore,
      addTeam,
      renameScoreColumn,
      removeScoreColumn,
      reorderScoreColumns,
      moveTeam,
      setTeamParticipants,
      removeParticipant,
      reorderParticipants,
      getPlayerSuggestions,
      rosterPlayers,
      addRosterPlayer,
      removeRosterPlayer,
      themeMode,
      isThemeReady,
      colors,
      toggleTheme,
      selectedAlarmId,
      setSelectedAlarmId,
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
