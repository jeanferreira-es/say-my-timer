import { FontAwesome6, Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type ScrollViewInstance,
  type TextInputInstance,
} from "react-native";
import {
  NestableDraggableFlatList,
  NestableScrollContainer,
  RenderItemParams,
} from "react-native-draggable-flatlist";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { type ThemeColors, useApp } from "@/context/AppContext";
import { getActiveTeams } from "@/utils/turnOrder";
import {
  findPlayerTeam,
  nextDefaultTeamName,
  sameName,
} from "@/utils/teamRules";

interface ThemedComponentProps {
  colors: ThemeColors;
}

interface HeaderActionProps extends ThemedComponentProps {
  icon: "dice" | "user-group";
  onPress: () => void;
}

function HeaderAction({ colors, icon, onPress }: HeaderActionProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={[styles.headerAction, { backgroundColor: colors.surface }]}
    >
      <FontAwesome6 name={icon} size={24} color={colors.text} />
    </TouchableOpacity>
  );
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

type SuggestPlayers = (query: string, exclude: string[]) => string[];
// Time em que o jogador já está (ignorando `exceptTeam`), ou null.
type FindPlayerTeam = (playerName: string, exceptTeam?: string) => string | null;

function FormError({ colors, message }: ThemedComponentProps & { message: string | null }) {
  if (!message) return null;
  return (
    <Text style={[styles.formError, { color: colors.accent }]}>{message}</Text>
  );
}

interface PlayerSuggestionsProps extends ThemedComponentProps {
  suggestions: string[];
  onSelect: (playerName: string) => void;
}

function PlayerSuggestions({
  colors,
  onSelect,
  suggestions,
}: PlayerSuggestionsProps) {
  if (suggestions.length === 0) return null;

  return (
    <View style={styles.suggestionsList}>
      {suggestions.map((suggestion) => (
        <TouchableOpacity
          key={suggestion}
          onPress={() => onSelect(suggestion)}
          activeOpacity={0.8}
          style={[styles.suggestionChip, { borderColor: colors.primary }]}
        >
          <Ionicons name="time-outline" size={12} color={colors.primary} />
          <Text
            numberOfLines={1}
            style={[styles.suggestionChipText, { color: colors.text }]}
          >
            {suggestion}
          </Text>
        </TouchableOpacity>
      ))}
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
              <View style={styles.modalHeaderActions}>
                <TouchableOpacity
                  onPress={onClose}
                  activeOpacity={0.8}
                  style={[styles.modalCloseButton, { backgroundColor: colors.surface }]}
                >
                  <Ionicons name="close" size={18} color={colors.text} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={addTeam}
                  activeOpacity={0.85}
                  disabled={!trimmedTeamName}
                  style={[
                    styles.modalCloseButton,
                    { backgroundColor: colors.primary },
                    !trimmedTeamName && styles.submitButtonDisabled,
                  ]}
                >
                  <Ionicons name="checkmark" size={18} color={colors.background} />
                </TouchableOpacity>
              </View>
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
            </ScrollView>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

interface TeamCardProps extends ThemedComponentProps {
  team: string;
  teamIndex: number;
  totalTeams: number;
  participants: string[];
  findTeamOfPlayer: FindPlayerTeam;
  onMoveTeam: (teamIndex: number, direction: "left" | "right") => void;
  onRemoveTeam: (teamName: string) => void;
  onRenameTeam: (teamName: string, nextName: string) => string | null;
  onReorderParticipants: (teamName: string, newOrder: string[]) => void;
  onSaveParticipants: (teamName: string, players: string[]) => string | null;
  suggestPlayers: SuggestPlayers;
}

// Linha da lista de jogadores. O id é estável enquanto o nome é editado,
// para o campo de texto não ser recriado (e perder o foco) a cada tecla.
interface PlayerItem {
  id: string;
  name: string;
}

let nextDraftId = 0;
const toDraftItems = (names: string[]): PlayerItem[] =>
  names.map((name) => ({ id: `draft-${nextDraftId++}`, name }));

function TeamCard({
  colors,
  findTeamOfPlayer,
  onMoveTeam,
  onRemoveTeam,
  onRenameTeam,
  onReorderParticipants,
  onSaveParticipants,
  participants,
  suggestPlayers,
  team,
  teamIndex,
  totalTeams,
}: TeamCardProps) {
  const [editingTeam, setEditingTeam] = useState(false);
  const [editingPlayers, setEditingPlayers] = useState(false);
  const [teamDraft, setTeamDraft] = useState(team);
  const [playerDrafts, setPlayerDrafts] = useState<PlayerItem[]>([]);
  const [newPlayerName, setNewPlayerName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const newPlayerInputRef = useRef<TextInputInstance>(null);

  const canMoveLeft = totalTeams > 1 && teamIndex > 0;
  const canMoveRight = totalTeams > 1 && teamIndex < totalTeams - 1;
  const draftNames = playerDrafts.map((item) => item.name);
  const listItems: PlayerItem[] = editingPlayers
    ? playerDrafts
    : participants.map((name) => ({ id: `saved-${name}`, name }));

  const beginTeamEdit = () => {
    setTeamDraft(team);
    setError(null);
    setEditingTeam(true);
  };

  const saveTeamName = () => {
    const renameError = onRenameTeam(team, teamDraft);
    setError(renameError);
    if (!renameError) setEditingTeam(false);
  };

  const beginPlayerEdit = () => {
    setPlayerDrafts(toDraftItems(participants));
    setNewPlayerName("");
    setError(null);
    setEditingPlayers(true);
  };

  // Nada é aplicado ao time antes de salvar: renomear, remover, adicionar e
  // reordenar são validados e gravados juntos.
  const savePlayerDrafts = () => {
    const saveError = onSaveParticipants(team, draftNames);
    setError(saveError);
    if (!saveError) setEditingPlayers(false);
  };

  const playerSuggestions = editingPlayers
    ? suggestPlayers(newPlayerName, draftNames).slice(0, 3)
    : [];

  const addPlayer = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (draftNames.some((player) => sameName(player, trimmed))) {
      setError(`${trimmed} já está neste time`);
      return;
    }
    const otherTeam = findTeamOfPlayer(trimmed, team);
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

  return (
    <View
      style={[
        styles.teamCard,
        {
          backgroundColor: colors.card,
          borderColor: colors.primary,
        },
      ]}
    >
      <View style={styles.teamCardHeader}>
        {editingTeam ? (
          <TextInput
            value={teamDraft}
            onChangeText={setTeamDraft}
            onSubmitEditing={saveTeamName}
            placeholder="Nome do time"
            placeholderTextColor={colors.placeholder}
            returnKeyType="done"
            style={[
              styles.teamNameInput,
              { color: colors.text, borderColor: colors.border },
            ]}
          />
        ) : (
          <Text
            numberOfLines={1}
            style={[styles.teamCardName, { color: colors.text }]}
          >
            {team}
          </Text>
        )}

        <View style={styles.teamActions}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={editingTeam ? saveTeamName : beginTeamEdit}
            style={[styles.teamActionButton, { backgroundColor: colors.surface }]}
          >
            <Ionicons
              name={editingTeam ? "checkmark" : "create-outline"}
              size={16}
              color={colors.text}
            />
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={editingPlayers ? savePlayerDrafts : beginPlayerEdit}
            style={[styles.teamActionButton, { backgroundColor: colors.surface }]}
          >
            <Ionicons
              name={editingPlayers ? "checkmark-done" : "people-outline"}
              size={16}
              color={colors.text}
            />
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => onRemoveTeam(team)}
            style={[styles.teamActionButton, { backgroundColor: colors.surface }]}
          >
            <Ionicons name="trash-outline" size={16} color={colors.accent} />
          </TouchableOpacity>
        </View>
      </View>

      <FormError colors={colors} message={error} />

      <NestableDraggableFlatList
        data={listItems}
        keyExtractor={(item) => item.id}
        style={styles.participantsCardList}
        contentContainerStyle={styles.participantsCardListContent}
        activationDistance={12}
        containerStyle={{ flexGrow: 0 }}
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
        onDragEnd={({ data }) => {
          if (editingPlayers) {
            setPlayerDrafts(data);
          } else {
            onReorderParticipants(team, data.map((item) => item.name));
          }
        }}
        ListEmptyComponent={
          !editingPlayers ? (
            <Text
              style={[styles.teamCardEmpty, { color: colors.textTertiary }]}
            >
              Nenhum jogador adicionado
            </Text>
          ) : undefined
        }
        renderItem={({ item, drag, isActive }: RenderItemParams<PlayerItem>) => {
          const participant = item.name;
          return (
            <View style={[styles.teamPlayerRow, isActive && styles.teamPlayerRowActive]}>
              <TouchableOpacity
                onLongPress={drag}
                disabled={isActive}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons
                  name="reorder-three"
                  size={18}
                  color={colors.textTertiary}
                />
              </TouchableOpacity>
            {editingPlayers ? (
              <>
                <TextInput
                  value={participant}
                  onChangeText={(value) => updatePlayerDraft(item.id, value)}
                  placeholder="Nome do jogador"
                  placeholderTextColor={colors.placeholder}
                  returnKeyType="done"
                  style={[
                    styles.playerEditInput,
                    {
                      backgroundColor: colors.inputBg,
                      color: colors.text,
                    },
                  ]}
                />
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => removePlayerDraft(item.id)}
                  style={styles.playerDeleteButton}
                >
                  <Ionicons
                    name="close"
                    size={16}
                    color={colors.textTertiary}
                  />
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text
                  numberOfLines={1}
                  style={[styles.teamPlayerName, { color: colors.text }]}
                >
                  {participant}
                </Text>
                <View
                  style={[
                    styles.playerInitials,
                    { borderColor: colors.primary },
                  ]}
                >
                  <Text
                    style={[
                      styles.playerInitialsText,
                      { color: colors.primary },
                    ]}
                  >
                    {participant.slice(0, 2).toUpperCase()}
                  </Text>
                </View>
              </>
            )}
            </View>
          );
        }}
      />

      {editingPlayers ? (
        <View style={styles.cardPlayerInputRow}>
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
              styles.cardPlayerInput,
              { backgroundColor: colors.inputBg, color: colors.text },
            ]}
          />
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => addPlayer(newPlayerName)}
            style={[styles.cardPlayerAddButton, { backgroundColor: colors.primary }]}
          >
            <Ionicons name="add" size={18} color={colors.background} />
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={savePlayerDrafts}
            style={[styles.cardPlayerAddButton, { backgroundColor: colors.primary }]}
          >
            <Ionicons name="checkmark" size={18} color={colors.background} />
          </TouchableOpacity>
        </View>
      ) : null}

      <PlayerSuggestions
        colors={colors}
        suggestions={playerSuggestions}
        onSelect={addPlayer}
      />

      <View style={[styles.teamCardFooter, { borderTopColor: colors.border }]}>
        <TouchableOpacity
          activeOpacity={0.8}
          disabled={!canMoveLeft}
          onPress={() => onMoveTeam(teamIndex, "left")}
          style={!canMoveLeft && styles.teamMoveButtonDisabled}
        >
          <Ionicons name="chevron-back" size={20} color={colors.textTertiary} />
        </TouchableOpacity>
        <Text style={[styles.teamCardMeta, { color: colors.textTertiary }]}>
          {participants.length === 1
            ? "1 jogador"
            : `${participants.length} jogadores`}
        </Text>
        <TouchableOpacity
          activeOpacity={0.8}
          disabled={!canMoveRight}
          onPress={() => onMoveTeam(teamIndex, "right")}
          style={!canMoveRight && styles.teamMoveButtonDisabled}
        >
          <Ionicons
            name="chevron-forward"
            size={20}
            color={colors.textTertiary}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

interface TeamsPreviewProps extends ThemedComponentProps {
  teams: string[];
  participantsByTeam: Record<string, string[]>;
  findTeamOfPlayer: FindPlayerTeam;
  onMoveTeam: (teamIndex: number, direction: "left" | "right") => void;
  onRemoveTeam: (teamName: string) => void;
  onRenameTeam: (teamName: string, nextName: string) => string | null;
  onReorderParticipants: (teamName: string, newOrder: string[]) => void;
  onSaveParticipants: (teamName: string, players: string[]) => string | null;
  suggestPlayers: SuggestPlayers;
}

function TeamsPreview({
  colors,
  findTeamOfPlayer,
  onMoveTeam,
  onRemoveTeam,
  onRenameTeam,
  onReorderParticipants,
  onSaveParticipants,
  participantsByTeam,
  suggestPlayers,
  teams,
}: TeamsPreviewProps) {
  const scrollRef = useRef<ScrollViewInstance>(null);
  const previousTeamsCountRef = useRef(teams.length);

  useEffect(() => {
    if (teams.length > previousTeamsCountRef.current) {
      scrollRef.current?.scrollToEnd({ animated: true });
    }
    previousTeamsCountRef.current = teams.length;
  }, [teams.length]);

  if (teams.length === 0) return null;

  return (
    <ScrollView
      ref={scrollRef}
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.teamsPreview}
    >
      {teams.map((team, teamIndex) => {
        const participants = participantsByTeam[team] ?? [];
        return (
          <TeamCard
            key={team}
            colors={colors}
            findTeamOfPlayer={findTeamOfPlayer}
            onMoveTeam={onMoveTeam}
            onRemoveTeam={onRemoveTeam}
            onRenameTeam={onRenameTeam}
            onReorderParticipants={onReorderParticipants}
            onSaveParticipants={onSaveParticipants}
            participants={participants}
            suggestPlayers={suggestPlayers}
            team={team}
            teamIndex={teamIndex}
            totalTeams={teams.length}
          />
        );
      })}
    </ScrollView>
  );
}

export default function TeamsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    addTeam,
    colors,
    getPlayerSuggestions,
    moveTeam,
    participantsByTeam,
    removeScoreColumn,
    renameScoreColumn,
    reorderParticipants,
    rosterPlayers,
    scoreColumns,
    setTeamParticipants,
  } = useApp();

  const hasTeams = scoreColumns.length > 0;
  const [isAddTeamModalOpen, setIsAddTeamModalOpen] = useState(false);

  const contentStyle = useMemo(
    () => [
      styles.content,
      {
        paddingTop: Math.max(insets.top, 18) + 26,
        paddingBottom: Math.max(insets.bottom, 20) + 24,
      },
    ],
    [insets.bottom, insets.top],
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
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={[styles.screen, { backgroundColor: colors.background }]}
      >
        <NestableScrollContainer
          style={{ backgroundColor: colors.background }}
          contentContainerStyle={contentStyle}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={{ flex: 1, justifyContent: "space-between" }}>
            <View>
              <View style={[styles.header, { borderBottomColor: colors.border }]}>
                <TouchableOpacity
                  style={[
                    styles.backButton,
                    { borderColor: colors.border, backgroundColor: colors.surface },
                  ]}
                  onPress={() => router.back()}
                  activeOpacity={0.8}
                >
                  <Ionicons name="arrow-back" size={20} color={colors.text} />
                </TouchableOpacity>
                <View style={styles.titleBlock}>
                  <Text style={[styles.eyebrow, { color: colors.text }]}>
                    Times
                  </Text>
                  <Text style={[styles.title, { color: colors.text }]}>
                    {hasTeams ? "Times registrados" : "Nenhum time registrado"}
                  </Text>
                </View>
                <View style={styles.headerActions}>
                  <HeaderAction
                    colors={colors}
                    icon="user-group"
                    onPress={() => router.push("/players")}
                  />
                  <HeaderAction
                    colors={colors}
                    icon="dice"
                    onPress={() => router.push("/draw")}
                  />
                </View>
              </View>

              {!hasTeams ? (
                <EmptyTeamsNotice colors={colors} />
              ) : (
                <TeamsPreview
                  colors={colors}
                  findTeamOfPlayer={findTeamOfPlayer}
                  onMoveTeam={moveTeam}
                  onRemoveTeam={removeScoreColumn}
                  onRenameTeam={renameScoreColumn}
                  onReorderParticipants={reorderParticipants}
                  onSaveParticipants={setTeamParticipants}
                  teams={scoreColumns}
                  participantsByTeam={participantsByTeam}
                  suggestPlayers={suggestPlayers}
                />
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
      </KeyboardAvoidingView>
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  titleBlock: {
    flex: 1,
    minWidth: 0,
  },
  eyebrow: {
    fontSize: 20,
    fontWeight: "400",
    lineHeight: 25,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    lineHeight: 34,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerAction: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
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
  teamsPreview: {
    gap: 12,
    marginTop: 24,
    paddingRight: 40,
    paddingLeft: 40,
  },
  teamCard: {
    width: 210,
    minHeight: 200,
    borderRadius: 18,
    borderWidth: 2,
    padding: 12,
    overflow: "hidden",
  },
  teamCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  teamCardName: {
    flex: 1,
    fontSize: 20,
    fontWeight: "900",
    minWidth: 0,
  },
  teamNameInput: {
    flex: 1,
    minWidth: 0,
    borderBottomWidth: 1,
    fontSize: 18,
    fontWeight: "800",
    padding: 0,
  },
  teamActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  teamActionButton: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  participantsCardList: {
    marginTop: 16,
    maxHeight: 140,
  },
  participantsCardListContent: {
    gap: 8,
    minHeight: 86,
  },
  teamCardEmpty: {
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 18,
  },
  teamPlayerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 26,
  },
  teamPlayerRowActive: {
    opacity: 0.6,
  },
  teamPlayerName: {
    flex: 1,
    minWidth: 0,
    fontSize: 14,
    fontWeight: "800",
  },
  playerInitials: {
    minWidth: 24,
    height: 24,
    borderRadius: 7,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  playerInitialsText: {
    fontSize: 9,
    fontWeight: "900",
  },
  playerEditInput: {
    flex: 1,
    minWidth: 0,
    height: 30,
    borderRadius: 8,
    fontSize: 13,
    fontWeight: "700",
    paddingHorizontal: 8,
    paddingVertical: 0,
  },
  playerDeleteButton: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  cardPlayerInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
  },
  cardPlayerInput: {
    flex: 1,
    minWidth: 0,
    height: 32,
    borderRadius: 9,
    fontSize: 13,
    paddingHorizontal: 9,
    paddingVertical: 0,
  },
  cardPlayerAddButton: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  teamCardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    marginTop: "auto",
    paddingTop: 10,
  },
  teamCardMeta: {
    fontSize: 12,
    fontWeight: "800",
  },
  teamMoveButtonDisabled: {
    opacity: 0.35,
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
    maxHeight: "50%",
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
  modalHeaderActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
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
  suggestionChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    maxWidth: "100%",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 5,
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
  submitButtonDisabled: {
    opacity: 0.55,
  },
  formError: {
    marginTop: 6,
    marginBottom: 6,
    fontSize: 13,
    fontWeight: "700",
  },
  orderWarning: {
    marginTop: 16,
    marginHorizontal: 20,
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
  },
});
