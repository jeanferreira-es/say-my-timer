import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Keyboard,
  Modal,
  Platform,
  ScrollView,
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

import {
  type FindPlayerTeam,
  FormError,
  PlayerSuggestions,
  type SuggestPlayers,
} from "@/components/TeamFormParts";
import { type ThemeColors, useApp } from "@/context/AppContext";
import {
  TEAM_CARD_TEXT,
  type TeamStyle,
  teamTheme,
} from "@/utils/teamGradients";
import { getActiveTeams } from "@/utils/turnOrder";
import {
  findPlayerTeam,
  nextDefaultTeamName,
  sameName,
} from "@/utils/teamRules";

interface ThemedComponentProps {
  colors: ThemeColors;
}

function EmptyTeamsNotice({ colors }: ThemedComponentProps) {
  return (
    <View style={[styles.emptyNotice, { backgroundColor: colors.surface }]}>
      <Text style={[styles.emptyNoticeTitle, { color: colors.text }]}>
        Cadastre um time novo abaixo
      </Text>
      <Text style={[styles.emptyNoticeText, { color: colors.textTertiary }]}>
        Voce pode definir a ordem dos{"\n"}jogadores e dos times
      </Text>
    </View>
  );
}

interface AddTeamTriggerProps extends ThemedComponentProps {
  onPress: () => void;
}

function AddTeamTrigger({ colors, onPress }: AddTeamTriggerProps) {
  return (
    <View style={styles.addSection}>
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.85}
        style={[styles.addTriggerButton, { backgroundColor: colors.primary }]}
      >
        <Text style={[styles.addTriggerButtonText, { color: colors.background }]}>
          Adicionar novo time
        </Text>
      </TouchableOpacity>
    </View>
  );
}

interface RosterPickerProps extends ThemedComponentProps {
  players: string[];
  onSelect: (playerName: string) => void;
  onManageRoster: () => void;
}

function RosterPicker({
  colors,
  onManageRoster,
  onSelect,
  players,
}: RosterPickerProps) {
  return (
    <View style={styles.rosterSection}>
      <View style={styles.rosterHeader}>
        <Text style={[styles.rosterTitle, { color: colors.textSecondary }]}>
          Jogadores cadastrados
        </Text>
        <TouchableOpacity onPress={onManageRoster} activeOpacity={0.7}>
          <Text style={[styles.rosterManage, { color: colors.primary }]}>
            Gerenciar
          </Text>
        </TouchableOpacity>
      </View>
      {players.length === 0 ? (
        <Text style={[styles.rosterEmpty, { color: colors.textTertiary }]}>
          Nenhum jogador disponível
        </Text>
      ) : (
        <View style={styles.suggestionsList}>
          {players.map((player) => (
            <TouchableOpacity
              key={player}
              onPress={() => onSelect(player)}
              activeOpacity={0.8}
              style={[styles.rosterChip, { backgroundColor: colors.surface }]}
            >
              <Ionicons name="add" size={14} color={colors.primary} />
              <Text
                numberOfLines={1}
                style={[styles.suggestionChipText, { color: colors.text }]}
              >
                {player}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

interface AddTeamModalProps extends ThemedComponentProps {
  visible: boolean;
  onClose: () => void;
  onAddTeam: (teamName: string, players: string[]) => string | null;
  onManageRoster: () => void;
  findTeamOfPlayer: FindPlayerTeam;
  rosterPlayers: string[];
  suggestPlayers: SuggestPlayers;
  teamNames: string[];
}

function useKeyboardOffset() {
  const offset = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";

    const handleShow = (event: { endCoordinates: { height: number }; duration?: number }) => {
      Animated.timing(offset, {
        toValue: event.endCoordinates.height,
        duration: event.duration || 250,
        useNativeDriver: true,
      }).start();
    };

    const handleHide = (event: { duration?: number }) => {
      Animated.timing(offset, {
        toValue: 0,
        duration: event.duration || 200,
        useNativeDriver: true,
      }).start();
    };

    const showSubscription = Keyboard.addListener(showEvent, handleShow);
    const hideSubscription = Keyboard.addListener(hideEvent, handleHide);

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, [offset]);

  return offset;
}

function AddTeamModal({
  colors,
  findTeamOfPlayer,
  onAddTeam,
  onClose,
  onManageRoster,
  rosterPlayers,
  suggestPlayers,
  teamNames,
  visible,
}: AddTeamModalProps) {
  const [teamName, setTeamName] = useState(() => nextDefaultTeamName(teamNames));
  const [playerName, setPlayerName] = useState("");
  const [players, setPlayers] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const playerInputRef = useRef<TextInputInstance>(null);
  const keyboardOffset = useKeyboardOffset();

  // Só reinicia o formulário ao abrir o modal.
  const teamNamesRef = useRef(teamNames);
  teamNamesRef.current = teamNames;
  useEffect(() => {
    if (visible) {
      setTeamName(nextDefaultTeamName(teamNamesRef.current));
      setPlayerName("");
      setPlayers([]);
      setError(null);
    }
  }, [visible]);

  const trimmedTeamName = teamName.trim();
  const playerSuggestions = suggestPlayers(playerName, players);
  const availableRosterPlayers = rosterPlayers.filter(
    (rosterPlayer) => !players.some((player) => sameName(player, rosterPlayer)),
  );

  const addDraftPlayer = (name: string) => {
    const trimmedPlayerName = name.trim();
    if (!trimmedPlayerName) return;
    if (players.some((player) => sameName(player, trimmedPlayerName))) {
      setError(`${trimmedPlayerName} já está neste time`);
      return;
    }
    const otherTeam = findTeamOfPlayer(trimmedPlayerName);
    if (otherTeam) {
      setError(`${trimmedPlayerName} já está no time ${otherTeam}`);
      return;
    }
    setError(null);
    setPlayers((current) => [...current, trimmedPlayerName]);
    setPlayerName("");
    playerInputRef.current?.focus();
  };

  const removeDraftPlayer = (player: string) => {
    setPlayers((current) => current.filter((existing) => existing !== player));
  };

  const addTeam = () => {
    if (!trimmedTeamName) return;
    const addError = onAddTeam(trimmedTeamName, players);
    if (addError) {
      setError(addError);
      return;
    }
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={onClose}
        />
        <Animated.View
          style={[
            styles.modalKeyboardWrapper,
            { transform: [{ translateY: Animated.multiply(keyboardOffset, -1) }] },
          ]}
        >
          <View
            style={[
              styles.modalSheet,
              { backgroundColor: colors.modalBackground, borderColor: colors.border },
            ]}
          >
            <View style={[styles.modalHandle, { backgroundColor: colors.border }]} />

            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Novo time
              </Text>
              <TouchableOpacity
                onPress={onClose}
                activeOpacity={0.8}
                style={[styles.modalCloseButton, { backgroundColor: colors.surface }]}
              >
                <Ionicons name="close" size={18} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalBody}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <FormError colors={colors} message={error} />
              <TextInput
                value={teamName}
                onChangeText={(value) => {
                  setTeamName(value);
                  setError(null);
                }}
                placeholder="Digite o nome do time"
                placeholderTextColor={colors.placeholder}
                returnKeyType="next"
                style={[styles.teamInput, { color: colors.text }]}
              />

              {players.length === 0 ? (
                <Text
                  style={[styles.playersEmpty, { color: colors.textSecondary }]}
                >
                  Nenhum jogador adicionado
                </Text>
              ) : (
                <View style={styles.playersList}>
                  {players.map((player) => (
                    <View
                      key={player}
                      style={[
                        styles.playerPill,
                        { backgroundColor: colors.surface },
                      ]}
                    >
                      <Text
                        style={[styles.playerPillText, { color: colors.text }]}
                        numberOfLines={1}
                      >
                        {player}
                      </Text>
                      <TouchableOpacity
                        onPress={() => removeDraftPlayer(player)}
                        activeOpacity={0.7}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        style={styles.playerPillRemove}
                      >
                        <Ionicons
                          name="close"
                          size={13}
                          color={colors.textTertiary}
                        />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              <View style={styles.playerInputRow}>
                <TextInput
                  ref={playerInputRef}
                  value={playerName}
                  onChangeText={setPlayerName}
                  placeholder="Digite o nome do jogador"
                  placeholderTextColor={colors.placeholder}
                  returnKeyType="done"
                  submitBehavior="submit"
                  onSubmitEditing={() => addDraftPlayer(playerName)}
                  style={[
                    styles.playerInput,
                    { backgroundColor: colors.inputBg, color: colors.text },
                  ]}
                />
                <TouchableOpacity
                  onPress={() => addDraftPlayer(playerName)}
                  activeOpacity={0.82}
                  style={[
                    styles.addPlayerButton,
                    { backgroundColor: colors.primary },
                  ]}
                >
                  <Ionicons
                    name="person-add-outline"
                    size={21}
                    color={colors.background}
                  />
                </TouchableOpacity>
              </View>
              <PlayerSuggestions
                colors={colors}
                suggestions={playerSuggestions}
                onSelect={addDraftPlayer}
              />
              <RosterPicker
                colors={colors}
                players={availableRosterPlayers}
                onSelect={addDraftPlayer}
                onManageRoster={onManageRoster}
              />
              <TouchableOpacity
                onPress={addTeam}
                activeOpacity={0.85}
                disabled={!trimmedTeamName}
                style={[
                  styles.submitButton,
                  { backgroundColor: colors.primary },
                  !trimmedTeamName && styles.submitButtonDisabled,
                ]}
              >
                <Text style={[styles.submitButtonText, { color: colors.background }]}>
                  Cadastrar time
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

function formatPlayers(players: string[]) {
  if (players.length === 0) return "Toque para adicionar jogadores";
  if (players.length === 1) return players[0];
  return `${players.slice(0, -1).join(", ")} e ${players[players.length - 1]}`;
}

interface TeamGradientCardProps {
  team: string;
  teamIndex: number;
  teamStyle?: TeamStyle;
  participants: string[];
  isDragging: boolean;
  onPress: () => void;
  onLongPress: () => void;
}

function TeamGradientCard({
  isDragging,
  onLongPress,
  onPress,
  participants,
  team,
  teamIndex,
  teamStyle,
}: TeamGradientCardProps) {
  const theme = teamTheme(teamIndex, teamStyle);
  return (
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={250}
      disabled={isDragging}
      style={isDragging && styles.teamCardDragging}
    >
      <LinearGradient
        colors={theme.gradient}
        start={{ x: 0, y: 1 }}
        end={{ x: 1, y: 0 }}
        style={styles.teamCard}
      >
        <Ionicons
          name={theme.icon}
          size={110}
          color="rgba(255, 255, 255, 0.55)"
          style={styles.teamCardIcon}
        />
        <View style={styles.teamCardPill}>
          <Ionicons name="people-outline" size={16} color={TEAM_CARD_TEXT} />
          <Text style={styles.teamCardPillText}>
            {teamIndex + 1}º ·{" "}
            {participants.length === 1
              ? "1 jogador"
              : `${participants.length} jogadores`}
          </Text>
        </View>
        <Text numberOfLines={1} style={styles.teamCardName}>
          {team}
        </Text>
        <Text numberOfLines={2} style={styles.teamCardPlayers}>
          {formatPlayers(participants)}
        </Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

export default function TeamsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    addTeam,
    colors,
    getPlayerSuggestions,
    participantsByTeam,
    reorderScoreColumns,
    rosterPlayers,
    scoreColumns,
    teamStyles,
  } = useApp();

  const hasTeams = scoreColumns.length > 0;
  const [isAddTeamModalOpen, setIsAddTeamModalOpen] = useState(false);

  const contentStyle = useMemo(
    () => [
      styles.content,
      {
        paddingBottom: Math.max(insets.bottom, 20) + 24,
      },
    ],
    [insets.bottom],
  );

  // Players already in a team are never suggested again.
  const assignedPlayers = Object.values(participantsByTeam).flat();
  const suggestPlayers: SuggestPlayers = (query, exclude) =>
    getPlayerSuggestions(query, [...assignedPlayers, ...exclude]);
  const availableRosterPlayers = rosterPlayers
    .filter(
      (rosterPlayer) =>
        !assignedPlayers.some((player) => sameName(player, rosterPlayer)),
    )
    .sort((a, b) => a.localeCompare(b, "pt-BR", { sensitivity: "base" }));

  const openRoster = () => {
    setIsAddTeamModalOpen(false);
    router.push("/players");
  };

  const findTeamOfPlayer: FindPlayerTeam = (playerName, exceptTeam) =>
    findPlayerTeam(participantsByTeam, playerName, exceptTeam);

  const emptyTeams = scoreColumns.filter(
    (team) => (participantsByTeam[team] ?? []).length === 0,
  );
  const activeTeamsCount = getActiveTeams(scoreColumns, participantsByTeam).length;
  const orderWarning = !hasTeams
    ? null
    : activeTeamsCount < 2
      ? "Cadastre pelo menos 2 times com jogadores para alternar as jogadas entre os times."
      : emptyTeams.length > 0
        ? `${emptyTeams.join(", ")} sem jogadores: ${emptyTeams.length === 1 ? "fica" : "ficam"} de fora da ordem das jogadas.`
        : null;

  return (
    <>
      <View style={[styles.screen, { backgroundColor: colors.background }]}>
        <NestableScrollContainer
          style={{ backgroundColor: colors.background }}
          contentContainerStyle={contentStyle}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={{ flex: 1, justifyContent: "space-between" }}>
            <View>
              {!hasTeams ? (
                <EmptyTeamsNotice colors={colors} />
              ) : (
                <>
                  <Text
                    style={[styles.reorderHint, { color: colors.textTertiary }]}
                  >
                    Segure e arraste um time para mudar a ordem das jogadas.
                  </Text>
                  <NestableDraggableFlatList
                    data={scoreColumns}
                    keyExtractor={(team) => team}
                    containerStyle={styles.teamsList}
                    onDragEnd={({ data }) => reorderScoreColumns(data)}
                    renderItem={({
                      item: team,
                      drag,
                      getIndex,
                      isActive,
                    }: RenderItemParams<string>) => {
                      const teamIndex = getIndex() ?? 0;
                      return (
                        <View
                          style={[
                            styles.teamCardFrame,
                            teamIndex > 0 && styles.teamCardStacked,
                            { borderColor: colors.background },
                          ]}
                        >
                          <TeamGradientCard
                            team={team}
                            teamIndex={teamIndex}
                            teamStyle={teamStyles[team]}
                            participants={participantsByTeam[team] ?? []}
                            isDragging={isActive}
                            onLongPress={drag}
                            onPress={() =>
                              router.push({
                                pathname: "/team-settings",
                                params: { team },
                              })
                            }
                          />
                        </View>
                      );
                    }}
                  />
                </>
              )}
              {orderWarning ? (
                <Text
                  style={[styles.orderWarning, { color: colors.textTertiary }]}
                >
                  {orderWarning}
                </Text>
              ) : null}
            </View>

            <AddTeamTrigger
              colors={colors}
              onPress={() => setIsAddTeamModalOpen(true)}
            />
          </View>
        </NestableScrollContainer>
      </View>
      <AddTeamModal
        colors={colors}
        visible={isAddTeamModalOpen}
        onClose={() => setIsAddTeamModalOpen(false)}
        onAddTeam={addTeam}
        onManageRoster={openRoster}
        findTeamOfPlayer={findTeamOfPlayer}
        rosterPlayers={availableRosterPlayers}
        suggestPlayers={suggestPlayers}
        teamNames={scoreColumns}
      />
    </>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    // paddingHorizontal: 40,
    gap: 28,
  },
  emptyNotice: {
    minHeight: 170,
    marginTop: 28,
    marginHorizontal: 38,
    paddingHorizontal: 18,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyNoticeTitle: {
    fontSize: 20,
    fontWeight: "400",
    lineHeight: 31,
    textAlign: "center",
  },
  emptyNoticeText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: "400",
    textAlign: "center",
  },
  reorderHint: {
    marginTop: 8,
    marginHorizontal: 20,
    fontSize: 13,
    textAlign: "center",
  },
  teamsList: {
    marginTop: 12,
    paddingHorizontal: 16,
  },
  teamCardDragging: {
    opacity: 0.85,
    transform: [{ scale: 1.03 }],
  },
  // Borda na cor do fundo separa os cards sobrepostos
  teamCardFrame: {
    borderRadius: 34,
    borderWidth: 4,
  },
  teamCardStacked: {
    marginTop: -26,
  },
  teamCard: {
    minHeight: 200,
    borderRadius: 30,
    padding: 22,
    overflow: "hidden",
  },
  teamCardIcon: {
    position: "absolute",
    top: -4,
    right: 6,
    transform: [{ rotate: "-12deg" }],
  },
  teamCardPill: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "rgba(255, 255, 255, 0.6)",
  },
  teamCardPillText: {
    fontSize: 14,
    fontWeight: "500",
    color: TEAM_CARD_TEXT,
  },
  teamCardName: {
    marginTop: "auto",
    paddingTop: 28,
    fontSize: 30,
    fontWeight: "800",
    color: TEAM_CARD_TEXT,
  },
  teamCardPlayers: {
    marginTop: 6,
    fontSize: 16,
    lineHeight: 22,
    color: TEAM_CARD_TEXT,
  },
  addSection: {
    marginHorizontal: 10,
    paddingHorizontal: 20,
    marginTop: 20,
  },
  addTriggerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 52,
    borderRadius: 16,
  },
  addTriggerButtonText: {
    fontSize: 16,
    fontWeight: "800",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.45)",
  },
  modalBackdrop: StyleSheet.absoluteFill,
  modalKeyboardWrapper: {
    width: "100%",
    maxHeight: "70%",
  },
  modalSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderBottomWidth: 0,
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 22,
  },
  modalHandle: {
    alignSelf: "center",
    width: 40,
    height: 4,
    borderRadius: 2,
    marginBottom: 14,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "800",
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  modalBody: {
    flexShrink: 1,
    flexGrow: 0,
  },
  teamInput: {
    fontSize: 20,
    fontWeight: "400",
    minHeight: 42,
    padding: 0,
  },
  playersEmpty: {
    fontSize: 18,
    fontWeight: "400",
    lineHeight: 27,
    marginTop: 8,
    marginBottom: 30,
  },
  playersList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
    marginBottom: 30,
  },
  playerPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    maxWidth: "100%",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  playerPillText: {
    flexShrink: 1,
    fontSize: 14,
    fontWeight: "700",
  },
  playerPillRemove: {
    alignItems: "center",
    justifyContent: "center",
  },
  playerInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  playerInput: {
    flex: 1,
    minWidth: 0,
    height: 37,
    borderRadius: 8,
    fontSize: 16,
    paddingHorizontal: 12,
    paddingVertical: 0,
    borderWidth: 1,
    borderColor: "gray",
  },
  addPlayerButton: {
    width: 37,
    height: 37,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  suggestionsList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 10,
  },
  rosterSection: {
    marginTop: 18,
  },
  rosterHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  rosterTitle: {
    fontSize: 13,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  rosterManage: {
    fontSize: 13,
    fontWeight: "800",
  },
  rosterEmpty: {
    marginTop: 8,
    fontSize: 14,
    fontWeight: "600",
  },
  rosterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    maxWidth: "100%",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  suggestionChipText: {
    flexShrink: 1,
    fontSize: 13,
    fontWeight: "700",
  },
  submitButton: {
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: "800",
  },
  submitButtonDisabled: {
    opacity: 0.55,
  },
  orderWarning: {
    marginTop: 16,
    marginHorizontal: 20,
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
});
