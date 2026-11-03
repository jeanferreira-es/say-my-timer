import { Ionicons } from "@expo/vector-icons";
import { useMemo, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type TextInputInstance,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { normalizePlayerName, useApp } from "@/context/AppContext";

// Several players can be typed at once: "Ana, Bruno; Carla"
function splitPlayerNames(value: string): string[] {
  return value
    .split(/[,;\n]/)
    .map((name) => name.trim())
    .filter(Boolean);
}

export default function PlayersScreen() {
  const insets = useSafeAreaInsets();
  const {
    addRosterPlayer,
    colors,
    participantsByTeam,
    removeRosterPlayer,
    rosterPlayers,
  } = useApp();
  const [playerName, setPlayerName] = useState("");
  const [feedback, setFeedback] = useState<string | null>(null);
  const inputRef = useRef<TextInputInstance>(null);

  const sortedPlayers = useMemo(
    () =>
      [...rosterPlayers].sort((a, b) =>
        a.localeCompare(b, "pt-BR", { sensitivity: "base" }),
      ),
    [rosterPlayers],
  );

  const teamByPlayer = useMemo(() => {
    const result: Record<string, string> = {};
    Object.entries(participantsByTeam).forEach(([team, participants]) => {
      participants.forEach((participant) => {
        result[normalizePlayerName(participant)] = team;
      });
    });
    return result;
  }, [participantsByTeam]);

  const addPlayers = () => {
    const names = splitPlayerNames(playerName);
    if (names.length === 0) return;

    const skipped = names.filter((name) => !addRosterPlayer(name));
    setPlayerName("");
    setFeedback(
      skipped.length > 0 ? `Já cadastrado: ${skipped.join(", ")}` : null,
    );
    inputRef.current?.focus();
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={[styles.screen, { backgroundColor: colors.background }]}
    >
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        {rosterPlayers.length === 0
          ? "Nenhum jogador cadastrado"
          : rosterPlayers.length === 1
            ? "1 jogador cadastrado"
            : `${rosterPlayers.length} jogadores cadastrados`}
      </Text>

      <View style={styles.form}>
        <View style={styles.inputRow}>
          <TextInput
            ref={inputRef}
            value={playerName}
            onChangeText={(value) => {
              setPlayerName(value);
              setFeedback(null);
            }}
            placeholder="Nome do jogador"
            placeholderTextColor={colors.placeholder}
            returnKeyType="done"
            submitBehavior="submit"
            onSubmitEditing={addPlayers}
            style={[
              styles.input,
              {
                backgroundColor: colors.inputBg,
                borderColor: colors.inputBorder,
                color: colors.text,
              },
            ]}
          />
          <TouchableOpacity
            onPress={addPlayers}
            activeOpacity={0.82}
            style={[styles.addButton, { backgroundColor: colors.primary }]}
          >
            <Ionicons
              name="person-add-outline"
              size={21}
              color={colors.background}
            />
          </TouchableOpacity>
        </View>
        <Text
          style={[
            styles.hint,
            { color: feedback ? colors.accent : colors.textSecondary },
          ]}
        >
          {feedback ?? "Separe por vírgula para cadastrar vários de uma vez"}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.list,
          { paddingBottom: Math.max(insets.bottom, 20) + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {sortedPlayers.length === 0 ? (
          <View
            style={[styles.emptyNotice, { backgroundColor: colors.surface }]}
          >
            <Text style={[styles.emptyNoticeTitle, { color: colors.text }]}>
              Cadastre os jogadores de sempre
            </Text>
            <Text
              style={[styles.emptyNoticeText, { color: colors.textTertiary }]}
            >
              Depois é só tocar no nome{"\n"}para colocá-lo em um time
            </Text>
          </View>
        ) : (
          sortedPlayers.map((player) => {
            const team = teamByPlayer[normalizePlayerName(player)];
            return (
              <View
                key={player}
                style={[
                  styles.playerRow,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                <View
                  style={[
                    styles.playerInitials,
                    { borderColor: colors.primary },
                  ]}
                >
                  <Text
                    style={[styles.playerInitialsText, { color: colors.primary }]}
                  >
                    {player.slice(0, 2).toUpperCase()}
                  </Text>
                </View>
                <Text
                  numberOfLines={1}
                  style={[styles.playerName, { color: colors.text }]}
                >
                  {player}
                </Text>
                {team ? (
                  <View
                    style={[styles.teamBadge, { backgroundColor: colors.surface }]}
                  >
                    <Text
                      numberOfLines={1}
                      style={[styles.teamBadgeText, { color: colors.textSecondary }]}
                    >
                      {team}
                    </Text>
                  </View>
                ) : null}
                <TouchableOpacity
                  onPress={() => removeRosterPlayer(player)}
                  activeOpacity={0.7}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  style={styles.removeButton}
                >
                  <Ionicons name="trash-outline" size={17} color={colors.accent} />
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  form: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 12,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  input: {
    flex: 1,
    minWidth: 0,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 16,
    paddingHorizontal: 14,
    paddingVertical: 0,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  hint: {
    marginTop: 8,
    fontSize: 13,
    fontWeight: "600",
  },
  list: {
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 8,
  },
  emptyNotice: {
    minHeight: 150,
    marginTop: 16,
    marginHorizontal: 18,
    paddingHorizontal: 18,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyNoticeTitle: {
    fontSize: 18,
    fontWeight: "400",
    lineHeight: 28,
    textAlign: "center",
  },
  emptyNoticeText: {
    marginTop: 10,
    fontSize: 15,
    fontWeight: "400",
    textAlign: "center",
  },
  playerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 52,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
  },
  playerInitials: {
    minWidth: 30,
    height: 30,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  playerInitialsText: {
    fontSize: 11,
    fontWeight: "900",
  },
  playerName: {
    flex: 1,
    minWidth: 0,
    fontSize: 16,
    fontWeight: "800",
  },
  teamBadge: {
    maxWidth: 110,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  teamBadgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  removeButton: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
});
