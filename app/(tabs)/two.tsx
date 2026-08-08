import { FontAwesome6, Ionicons } from "@expo/vector-icons";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { type ThemeColors, useApp } from "@/context/AppContext";

interface ThemedComponentProps {
  colors: ThemeColors;
}

function HeaderAction({ colors }: ThemedComponentProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      style={[styles.headerAction, { backgroundColor: colors.surface }]}
    >
      <FontAwesome6 name="dice" size={30} color={colors.text} />
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

interface AddTeamCardProps extends ThemedComponentProps {
  onAddTeam: (teamName: string, players: string[]) => void;
  teamCount: number;
}

function nextDefaultTeamName(teamCount: number): string {
  return `Time ${String(teamCount + 1).padStart(2, "0")}`;
}

function AddTeamCard({ colors, onAddTeam, teamCount }: AddTeamCardProps) {
  const defaultTeamName = nextDefaultTeamName(teamCount);
  const [teamName, setTeamName] = useState(defaultTeamName);
  const [playerName, setPlayerName] = useState("");
  const [players, setPlayers] = useState<string[]>([]);
  const previousDefaultRef = useRef(defaultTeamName);
  const playerInputRef = useRef<TextInput>(null);

  useEffect(() => {
    setTeamName((current) =>
      current === previousDefaultRef.current ? defaultTeamName : current,
    );
    previousDefaultRef.current = defaultTeamName;
  }, [defaultTeamName]);

  const trimmedTeamName = teamName.trim();
  const trimmedPlayerName = playerName.trim();

  const addDraftPlayer = () => {
    if (!trimmedPlayerName) return;
    const alreadyExists = players.some(
      (player) => player.toLowerCase() === trimmedPlayerName.toLowerCase(),
    );
    if (alreadyExists) return;
    setPlayers((current) => [...current, trimmedPlayerName]);
    setPlayerName("");
    playerInputRef.current?.focus();
  };

  const addTeam = () => {
    if (!trimmedTeamName) return;
    onAddTeam(trimmedTeamName, players);
    setTeamName(nextDefaultTeamName(teamCount + 1));
    setPlayerName("");
    setPlayers([]);
  };

  return (
    <View style={styles.addSection}>
      <Text style={[styles.addSectionTitle, { color: colors.text }]}>
        Adicionar novo time
      </Text>
      <View
        style={[
          styles.addCard,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        <TextInput
          value={teamName}
          onChangeText={setTeamName}
          placeholder="Digite o nome do time"
          placeholderTextColor={colors.placeholder}
          returnKeyType="next"
          style={[styles.teamInput, { color: colors.text }]}
        />

        {players.length === 0 ? (
          <Text style={[styles.playersEmpty, { color: colors.textTertiary }]}>
            Nenhum jogador adicionado
          </Text>
        ) : (
          <View style={styles.playersList}>
            {players.map((player) => (
              <View
                key={player}
                style={[styles.playerPill, { backgroundColor: colors.surface }]}
              >
                <Text
                  style={[styles.playerPillText, { color: colors.text }]}
                  numberOfLines={1}
                >
                  {player}
                </Text>
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
            onSubmitEditing={addDraftPlayer}
            style={[
              styles.playerInput,
              { backgroundColor: colors.inputBg, color: colors.text },
            ]}
          />
          <TouchableOpacity
            onPress={addDraftPlayer}
            activeOpacity={0.82}
            style={[styles.addPlayerButton, { backgroundColor: colors.text }]}
          >
            <Ionicons
              name="person-add-outline"
              size={21}
              color={colors.background}
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          onPress={addTeam}
          activeOpacity={0.85}
          style={[
            styles.submitButton,
            { backgroundColor: colors.text },
            !trimmedTeamName && styles.submitButtonDisabled,
          ]}
          disabled={!trimmedTeamName}
        >
          <Text style={[styles.submitButtonText, { color: colors.background }]}>
            Adicionar Time
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

interface TeamCardProps extends ThemedComponentProps {
  team: string;
  teamIndex: number;
  totalTeams: number;
  participants: string[];
  onAddParticipant: (teamName: string, participantName: string) => boolean;
  onMoveTeam: (teamIndex: number, direction: "left" | "right") => void;
  onRemoveParticipant: (teamName: string, participantName: string) => void;
  onRemoveTeam: (teamName: string) => void;
  onRenameTeam: (teamName: string, nextName: string) => boolean;
  onUpdateParticipant: (
    teamName: string,
    participantIndex: number,
    nextName: string,
  ) => boolean;
}

function  TeamCard({
  colors,
  onAddParticipant,
  onMoveTeam,
  onRemoveParticipant,
  onRemoveTeam,
  onRenameTeam,
  onUpdateParticipant,
  participants,
  team,
  teamIndex,
  totalTeams,
}: TeamCardProps) {
  const [editingTeam, setEditingTeam] = useState(false);
  const [editingPlayers, setEditingPlayers] = useState(false);
  const [teamDraft, setTeamDraft] = useState(team);
  const [playerDrafts, setPlayerDrafts] = useState(participants);
  const [newPlayerName, setNewPlayerName] = useState("");
  const newPlayerInputRef = useRef<TextInput>(null);

  const canMoveLeft = totalTeams > 1 && teamIndex > 0;
  const canMoveRight = totalTeams > 1 && teamIndex < totalTeams - 1;

  const beginTeamEdit = () => {
    setTeamDraft(team);
    setEditingTeam(true);
  };

  const saveTeamName = () => {
    if (onRenameTeam(team, teamDraft)) {
      setEditingTeam(false);
    }
  };

  const togglePlayerEdit = () => {
    setPlayerDrafts(participants);
    setEditingPlayers((current) => !current);
  };

  const savePlayerDrafts = () => {
    playerDrafts.forEach((playerName, index) => {
      onUpdateParticipant(team, index, playerName);
    });
    setEditingPlayers(false);
  };

  const addPlayer = () => {
    if (onAddParticipant(team, newPlayerName)) {
      setNewPlayerName("");
      setPlayerDrafts((current) => [...current, newPlayerName.trim()]);
      newPlayerInputRef.current?.focus();
    }
  };

  const updatePlayerDraft = (participantIndex: number, value: string) => {
    setPlayerDrafts((current) =>
      current.map((player, index) =>
        index === participantIndex ? value : player,
      ),
    );
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
            onPress={editingPlayers ? savePlayerDrafts : togglePlayerEdit}
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

      <FlatList
        data={editingPlayers ? playerDrafts : participants}
        keyExtractor={(_participant, participantIndex) =>
          `${team}-${participantIndex}`
        }
        style={styles.participantsCardList}
        contentContainerStyle={styles.participantsCardListContent}
        scrollEnabled
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          !editingPlayers ? (
            <Text
              style={[styles.teamCardEmpty, { color: colors.textTertiary }]}
            >
              Nenhum jogador adicionado
            </Text>
          ) : null
        }
        renderItem={({ item: participant, index: participantIndex }) => (
          <View style={styles.teamPlayerRow}>
            <Ionicons
              name="reorder-three"
              size={18}
              color={colors.textTertiary}
            />
            {editingPlayers ? (
              <>
                <TextInput
                  value={participant}
                  onChangeText={(value) =>
                    updatePlayerDraft(participantIndex, value)
                  }
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
                  onPress={() => {
                    onRemoveParticipant(team, participant);
                    setPlayerDrafts((current) =>
                      current.filter((_, index) => index !== participantIndex),
                    );
                  }}
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
        )}
      />

      {editingPlayers ? (
        <View style={styles.cardPlayerInputRow}>
          <TextInput
            ref={newPlayerInputRef}
            value={newPlayerName}
            onChangeText={setNewPlayerName}
            onSubmitEditing={addPlayer}
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
            onPress={addPlayer}
            style={[styles.cardPlayerAddButton, { backgroundColor: colors.text }]}
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
  onAddParticipant: (teamName: string, participantName: string) => boolean;
  onMoveTeam: (teamIndex: number, direction: "left" | "right") => void;
  onRemoveParticipant: (teamName: string, participantName: string) => void;
  onRemoveTeam: (teamName: string) => void;
  onRenameTeam: (teamName: string, nextName: string) => boolean;
  onUpdateParticipant: (
    teamName: string,
    participantIndex: number,
    nextName: string,
  ) => boolean;
}

function TeamsPreview({
  colors,
  onAddParticipant,
  onMoveTeam,
  onRemoveParticipant,
  onRemoveTeam,
  onRenameTeam,
  onUpdateParticipant,
  participantsByTeam,
  teams,
}: TeamsPreviewProps) {
  const scrollRef = useRef<ScrollView>(null);
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
            onAddParticipant={onAddParticipant}
            onMoveTeam={onMoveTeam}
            onRemoveParticipant={onRemoveParticipant}
            onRemoveTeam={onRemoveTeam}
            onRenameTeam={onRenameTeam}
            onUpdateParticipant={onUpdateParticipant}
            participants={participants}
            team={team}
            teamIndex={teamIndex}
            totalTeams={teams.length}
          />
        );
      })}
    </ScrollView>
  );
}

export default function TabTwoScreen() {
  const insets = useSafeAreaInsets();
  const {
    addParticipantToTeam,
    addScoreColumn,
    colors,
    moveTeam,
    participantsByTeam,
    removeParticipant,
    removeScoreColumn,
    renameScoreColumn,
    scoreColumns,
    updateParticipant,
  } = useApp();

  const hasTeams = scoreColumns.length > 0;

  const contentStyle = useMemo(
    () => [
      styles.content,
      {
        paddingTop: Math.max(insets.top, 18) + 26,
        paddingBottom: Math.max(insets.bottom, 20) + 104,
      },
    ],
    [insets.bottom, insets.top],
  );

  const handleAddTeam = (teamName: string, players: string[]) => {
    const wasAdded = addScoreColumn(teamName);
    if (!wasAdded) return;
    players.forEach((player) => addParticipantToTeam(teamName, player));
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={[styles.screen, { backgroundColor: colors.background }]}
    >
      <ScrollView
        style={{ backgroundColor: colors.background }}
        contentContainerStyle={contentStyle}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={{ flex: 1, justifyContent: "space-between" }}>
          <View>
            <View style={styles.header}>
              <View style={styles.titleBlock}>
                <Text style={[styles.eyebrow, { color: colors.text }]}>Times</Text>
                <Text style={[styles.title, { color: colors.text }]}>
                  {hasTeams ? "Times registrados" : "Nenhum time registrado"}
                </Text>
              </View>
              <HeaderAction colors={colors} />
            </View>

            {!hasTeams ? (
              <EmptyTeamsNotice colors={colors} />
            ) : (
              <TeamsPreview
                colors={colors}
                onAddParticipant={addParticipantToTeam}
                onMoveTeam={moveTeam}
                onRemoveParticipant={removeParticipant}
                onRemoveTeam={removeScoreColumn}
                onRenameTeam={renameScoreColumn}
                onUpdateParticipant={updateParticipant}
                teams={scoreColumns}
                participantsByTeam={participantsByTeam}
              />
            )}
          </View>

          <AddTeamCard
            colors={colors}
            onAddTeam={handleAddTeam}
            teamCount={scoreColumns.length}
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: 40,
    gap: 28,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
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
  headerAction: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyNotice: {
    minHeight: 170,
    marginTop: 28,
    marginHorizontal: 8,
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
    paddingRight: 4,
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
  },
  addSectionTitle: {
    fontSize: 24,
    fontWeight: "800",
    lineHeight: 34,
    marginBottom: 10,
  },
  addCard: {
    minHeight: 260,
    borderRadius: 28,
    borderWidth: 1,
    paddingHorizontal: 24,
    paddingTop: 22,
    paddingBottom: 22,
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
  },
  playersList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 12,
  },
  playerPill: {
    maxWidth: "100%",
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  playerPillText: {
    fontSize: 14,
    fontWeight: "700",
  },
  playerInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: "auto",
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
    borderColor: "red",
  },
  addPlayerButton: {
    width: 37,
    height: 37,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  submitButton: {
    height: 37,
    marginTop: 9,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  submitButtonDisabled: {
    opacity: 0.55,
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: "800",
  },
});
