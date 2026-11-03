import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type TextInputInstance,
} from "react-native";
import {
  NestableDraggableFlatList,
  NestableScrollContainer,
  type RenderItemParams,
} from "react-native-draggable-flatlist";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FormError, PlayerSuggestions } from "@/components/TeamFormParts";
import { useApp } from "@/context/AppContext";
import {
  TEAM_CARD_TEXT,
  TEAM_GRADIENTS,
  TEAM_ICONS,
  type TeamStyle,
  defaultTeamStyle,
  teamTheme,
} from "@/utils/teamGradients";
import { findPlayerTeam, sameName } from "@/utils/teamRules";

// Linha da lista de jogadores. O id é estável enquanto o nome é editado,
// para o campo de texto não ser recriado (e perder o foco) a cada tecla.
interface PlayerItem {
  id: string;
  name: string;
}

let nextDraftId = 0;
const toDraftItems = (names: string[]): PlayerItem[] =>
  names.map((name) => ({ id: `draft-${nextDraftId++}`, name }));

export default function TeamSettingsScreen() {
  const { team = "" } = useLocalSearchParams<{ team: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const {
    colors,
    getPlayerSuggestions,
    moveTeam,
    participantsByTeam,
    removeScoreColumn,
    renameScoreColumn,
    scoreColumns,
    setTeamParticipants,
    setTeamStyle,
    teamStyles,
  } = useApp();

  const teamIndex = scoreColumns.indexOf(team);
  const participants = participantsByTeam[team] ?? [];
  const participantsKey = participants.join("\n");
  const savedStyle = teamStyles[team] ?? defaultTeamStyle(Math.max(teamIndex, 0));

  const [teamDraft, setTeamDraft] = useState(team);
  const [playerDrafts, setPlayerDrafts] = useState<PlayerItem[]>(() =>
    toDraftItems(participants),
  );
  const [styleDraft, setStyleDraft] = useState<TeamStyle>(savedStyle);
  const [newPlayerName, setNewPlayerName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const newPlayerInputRef = useRef<TextInputInstance>(null);

  useEffect(() => setTeamDraft(team), [team]);
  useEffect(
    () => setStyleDraft(savedStyle),
    [savedStyle.gradientIndex, savedStyle.icon],
  );
  useEffect(() => {
    setPlayerDrafts(toDraftItems(participantsKey ? participantsKey.split("\n") : []));
  }, [participantsKey]);

  if (teamIndex < 0) return null;

  const theme = teamTheme(teamIndex, styleDraft);
  const draftNames = playerDrafts.map((item) => item.name);
  const nameChanged = teamDraft.trim() !== team;
  const playersChanged = draftNames.join("\n") !== participantsKey;
  const styleChanged =
    styleDraft.gradientIndex !== savedStyle.gradientIndex ||
    styleDraft.icon !== savedStyle.icon;
  const hasChanges = nameChanged || playersChanged || styleChanged;

  // Jogadores já escalados em qualquer time não são sugeridos de novo
  const assignedPlayers = Object.values(participantsByTeam).flat();
  const playerSuggestions = getPlayerSuggestions(newPlayerName, [
    ...assignedPlayers,
    ...draftNames,
  ]).slice(0, 3);

  const addPlayer = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (draftNames.some((player) => sameName(player, trimmed))) {
      setError(`${trimmed} já está neste time`);
      return;
    }
    const otherTeam = findPlayerTeam(participantsByTeam, trimmed, team);
    if (otherTeam) {
      setError(`${trimmed} já está no time ${otherTeam}`);
      return;
    }
    setError(null);
    setNewPlayerName("");
    setPlayerDrafts((current) => [...current, ...toDraftItems([trimmed])]);
    newPlayerInputRef.current?.focus();
  };

  const updatePlayerDraft = (id: string, value: string) => {
    setPlayerDrafts((current) =>
      current.map((item) => (item.id === id ? { ...item, name: value } : item)),
    );
  };

  const removePlayerDraft = (id: string) => {
    setPlayerDrafts((current) => current.filter((item) => item.id !== id));
  };

  // Nada é aplicado antes de salvar. Os jogadores são gravados antes do nome,
  // porque a troca de nome leva junto a lista já atualizada.
  const save = () => {
    if (playersChanged) {
      const playersError = setTeamParticipants(team, draftNames);
      if (playersError) {
        setError(playersError);
        return;
      }
    }
    if (styleChanged) setTeamStyle(team, styleDraft);
    if (nameChanged) {
      const renameError = renameScoreColumn(team, teamDraft);
      if (renameError) {
        setError(renameError);
        return;
      }
      router.setParams({ team: teamDraft.trim() });
    }
    setError(null);
  };

  const confirmRemove = () => {
    Alert.alert("Remover time", `Remover o time ${team}?`, [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Remover",
        style: "destructive",
        onPress: () => {
          router.back();
          removeScoreColumn(team);
        },
      },
    ]);
  };

  const canMoveUp = teamIndex > 0;
  const canMoveDown = teamIndex < scoreColumns.length - 1;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={[styles.screen, { backgroundColor: colors.background }]}
    >
      <NestableScrollContainer
        contentContainerStyle={[
          styles.content,
          { paddingBottom: Math.max(insets.bottom, 20) + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <LinearGradient
          colors={theme.gradient}
          start={{ x: 0, y: 1 }}
          end={{ x: 1, y: 0 }}
          style={styles.banner}
        >
          <Ionicons
            name={theme.icon}
            size={92}
            color="rgba(255, 255, 255, 0.55)"
            style={styles.bannerIcon}
          />
          <Text style={styles.bannerLabel}>Nome do time</Text>
          <TextInput
            value={teamDraft}
            onChangeText={(value) => {
              setTeamDraft(value);
              setError(null);
            }}
            placeholder="Nome do time"
            placeholderTextColor="rgba(22, 22, 29, 0.45)"
            returnKeyType="done"
            style={styles.bannerInput}
          />
        </LinearGradient>

        <FormError colors={colors} message={error} />

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            Tema
          </Text>
          <View style={styles.optionsGrid}>
            {TEAM_GRADIENTS.map((gradient, gradientIndex) => {
              const selected = styleDraft.gradientIndex === gradientIndex;
              return (
                <TouchableOpacity
                  key={gradient.join("-")}
                  activeOpacity={0.8}
                  onPress={() =>
                    setStyleDraft((current) => ({ ...current, gradientIndex }))
                  }
                  style={[
                    styles.optionRing,
                    { borderColor: selected ? colors.text : "transparent" },
                  ]}
                >
                  <LinearGradient
                    colors={gradient}
                    start={{ x: 0, y: 1 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.swatch}
                  />
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            Ícone de destaque
          </Text>
          <View style={styles.optionsGrid}>
            {TEAM_ICONS.map((icon) => {
              const selected = styleDraft.icon === icon;
              return (
                <TouchableOpacity
                  key={icon}
                  activeOpacity={0.8}
                  onPress={() => setStyleDraft((current) => ({ ...current, icon }))}
                  style={[
                    styles.optionRing,
                    { borderColor: selected ? colors.text : "transparent" },
                  ]}
                >
                  <View
                    style={[styles.iconOption, { backgroundColor: colors.surface }]}
                  >
                    <Ionicons
                      name={icon}
                      size={22}
                      color={selected ? colors.text : colors.textSecondary}
                    />
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            Jogadores
          </Text>
          <Text style={[styles.sectionHint, { color: colors.textTertiary }]}>
            Segure e arraste para mudar a ordem de jogada.
          </Text>

          <NestableDraggableFlatList
            data={playerDrafts}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.playerList}
            activationDistance={12}
            onDragEnd={({ data }) => setPlayerDrafts(data)}
            ListEmptyComponent={
              <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
                Nenhum jogador adicionado
              </Text>
            }
            renderItem={({
              item,
              drag,
              isActive,
            }: RenderItemParams<PlayerItem>) => (
              <View
                style={[
                  styles.playerRow,
                  { backgroundColor: colors.surface },
                  isActive && styles.playerRowActive,
                ]}
              >
                <TouchableOpacity
                  onLongPress={drag}
                  disabled={isActive}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons
                    name="reorder-three"
                    size={22}
                    color={colors.textTertiary}
                  />
                </TouchableOpacity>
                <TextInput
                  value={item.name}
                  onChangeText={(value) => {
                    updatePlayerDraft(item.id, value);
                    setError(null);
                  }}
                  placeholder="Nome do jogador"
                  placeholderTextColor={colors.placeholder}
                  returnKeyType="done"
                  style={[styles.playerInput, { color: colors.text }]}
                />
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => removePlayerDraft(item.id)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close" size={18} color={colors.textTertiary} />
                </TouchableOpacity>
              </View>
            )}
          />

          <View style={styles.addRow}>
            <TextInput
              ref={newPlayerInputRef}
              value={newPlayerName}
              onChangeText={(value) => {
                setNewPlayerName(value);
                setError(null);
              }}
              onSubmitEditing={() => addPlayer(newPlayerName)}
              placeholder="Novo jogador"
              placeholderTextColor={colors.placeholder}
              returnKeyType="done"
              submitBehavior="submit"
              style={[
                styles.addInput,
                { backgroundColor: colors.inputBg, color: colors.text },
              ]}
            />
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => addPlayer(newPlayerName)}
              style={[styles.addButton, { backgroundColor: colors.primary }]}
            >
              <Ionicons
                name="person-add-outline"
                size={20}
                color={colors.background}
              />
            </TouchableOpacity>
          </View>
          <PlayerSuggestions
            colors={colors}
            suggestions={playerSuggestions}
            onSelect={addPlayer}
          />
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
            Ordem dos times
          </Text>
          <View style={[styles.orderRow, { backgroundColor: colors.surface }]}>
            <TouchableOpacity
              activeOpacity={0.7}
              disabled={!canMoveUp}
              onPress={() => moveTeam(teamIndex, "left")}
              style={!canMoveUp && styles.disabled}
            >
              <Ionicons name="arrow-up" size={20} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.orderText, { color: colors.text }]}>
              {teamIndex + 1}º de {scoreColumns.length}
            </Text>
            <TouchableOpacity
              activeOpacity={0.7}
              disabled={!canMoveDown}
              onPress={() => moveTeam(teamIndex, "right")}
              style={!canMoveDown && styles.disabled}
            >
              <Ionicons name="arrow-down" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>
        </View>

        <TouchableOpacity
          activeOpacity={0.85}
          disabled={!hasChanges}
          onPress={save}
          style={[
            styles.saveButton,
            { backgroundColor: colors.primary },
            !hasChanges && styles.disabled,
          ]}
        >
          <Text style={[styles.saveButtonText, { color: colors.background }]}>
            Salvar alterações
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.7}
          onPress={confirmRemove}
          style={styles.removeButton}
        >
          <Ionicons name="trash-outline" size={18} color={colors.accent} />
          <Text style={[styles.removeButtonText, { color: colors.accent }]}>
            Remover time
          </Text>
        </TouchableOpacity>
      </NestableScrollContainer>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  banner: {
    borderRadius: 28,
    padding: 22,
    paddingTop: 70,
    overflow: "hidden",
  },
  bannerIcon: {
    position: "absolute",
    top: -6,
    right: 8,
    transform: [{ rotate: "-12deg" }],
  },
  bannerLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(22, 22, 29, 0.6)",
  },
  bannerInput: {
    marginTop: 4,
    padding: 0,
    fontSize: 28,
    fontWeight: "800",
    color: TEAM_CARD_TEXT,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  optionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  optionRing: {
    borderRadius: 999,
    borderWidth: 2,
    padding: 3,
  },
  swatch: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  iconOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionHint: {
    marginTop: 4,
    marginBottom: 12,
    fontSize: 13,
  },
  playerList: {
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: "600",
  },
  playerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    height: 48,
    borderRadius: 14,
    paddingHorizontal: 12,
  },
  playerRowActive: {
    opacity: 0.6,
  },
  playerInput: {
    flex: 1,
    minWidth: 0,
    fontSize: 16,
    fontWeight: "600",
    padding: 0,
  },
  addRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
  },
  addInput: {
    flex: 1,
    minWidth: 0,
    height: 44,
    borderRadius: 14,
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
  orderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 48,
    borderRadius: 14,
    paddingHorizontal: 16,
    marginTop: 12,
  },
  orderText: {
    fontSize: 16,
    fontWeight: "700",
  },
  disabled: {
    opacity: 0.35,
  },
  saveButton: {
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 32,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "800",
  },
  removeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 48,
    marginTop: 8,
  },
  removeButtonText: {
    fontSize: 15,
    fontWeight: "700",
  },
});
