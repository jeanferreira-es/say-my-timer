import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  LogBox,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import {
  NestableDraggableFlatList,
  NestableScrollContainer,
  ScaleDecorator,
} from "react-native-draggable-flatlist";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useApp } from "../context/AppContext";

const CARD_MARGIN = 12;
const CARD_PADDING_H = 20;

const TEAM_CARD_COLORS = [
  "#E23676",
  "#02AFB6",
  "#6A4C93",
  "#1982C4",
  "#8AC926",
  "#FFCA3A",
  "#FF595E",
  "#6A994E",
  "#BC4749",
  "#457B9D",
  "#E63946",
  "#2A9D8F",
  "#E9C46A",
  "#F4A261",
  "#9B5DE5",
];

function getTeamCardColor(teamName: string): string {
  let hash = 0;
  for (let i = 0; i < teamName.length; i++) {
    hash = (hash << 5) - hash + teamName.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % TEAM_CARD_COLORS.length;
  return TEAM_CARD_COLORS[index];
}

function DragHandle({ color, size = 20 }: { color: string; size?: number }) {
  const dotSize = Math.max(3, size / 6);
  return (
    <View style={[styles.dragHandle, { width: size, minHeight: size }]}>
      {[0, 1].map((col) => (
        <View key={col} style={styles.dragHandleColumn}>
          {[0, 1, 2].map((row) => (
            <View
              key={row}
              style={[
                styles.dragHandleDot,
                {
                  width: dotSize,
                  height: dotSize,
                  borderRadius: dotSize / 2,
                  backgroundColor: color,
                },
              ]}
            />
          ))}
        </View>
      ))}
    </View>
  );
}

export default function ScoresScreen() {
  const { width: screenWidth } = useWindowDimensions();
  const router = useRouter();
  const {
    scores,
    scoreColumns,
    participantsByTeam,
    updateScore,
    addScoreColumn,
    removeScoreColumn,
    moveTeam,
    addParticipantToTeam,
    removeParticipant,
    reorderParticipants,
    colors,
  } = useApp();
  const [teamName, setTeamName] = useState("");
  const [participantInputs, setParticipantInputs] = useState<
    Record<string, string>
  >({});

  const cardWidth = Math.min(
    screenWidth - (CARD_PADDING_H * 2 + CARD_MARGIN * 2),
    320,
  );

  useEffect(() => {
    LogBox.ignoreLogs([
      "ref.measureLayout must be called with a ref to a native component",
    ]);
  }, []);

  const handleAddTeam = () => {
    if (addScoreColumn(teamName)) {
      setTeamName("");
    }
  };

  const handleParticipantInputChange = (team: string, value: string) => {
    setParticipantInputs((prev) => ({
      ...prev,
      [team]: value,
    }));
  };

  const handleAddParticipant = (team: string) => {
    const participantName = participantInputs[team] ?? "";

    if (addParticipantToTeam(team, participantName)) {
      setParticipantInputs((prev) => ({
        ...prev,
        [team]: "",
      }));
    }
  };

  const themedStyles = useMemo(
    () => ({
      container: {
        ...styles.containerBase,
        backgroundColor: colors.background,
      },
      header: { ...styles.headerBase, borderBottomColor: colors.border },
      backButton: {
        ...styles.backButtonBase,
        borderColor: colors.border,
        backgroundColor: colors.surface,
      },
      title: { ...styles.titleBase, color: colors.text },
      subtitle: { ...styles.subtitleBase, color: colors.textSecondary },
      table: { ...styles.tableBase, borderColor: colors.border },
      headerRow: { ...styles.headerRowBase, backgroundColor: colors.surface },
      row: { ...styles.rowBase, borderTopColor: colors.border },
      cell: { ...styles.cellBase, backgroundColor: colors.card },
      cellHeader: { backgroundColor: colors.surface, minHeight: 44 },
      rowLabel: { backgroundColor: colors.surface },
      headerText: { ...styles.headerTextBase, color: colors.textSecondary },
      rowLabelText: { ...styles.rowLabelTextBase, color: colors.text },
      input: {
        ...styles.inputBase,
        color: colors.text,
        borderColor: colors.inputBorder,
        backgroundColor: colors.inputBg,
      },
      addButton: { ...styles.addButtonBase, backgroundColor: colors.primary },
      addButtonText: { ...styles.addButtonTextBase, color: colors.background },
      emptyText: { ...styles.emptyTextBase, color: colors.text },
      sectionTitle: { ...styles.sectionTitleBase, color: colors.text },
      teamCard: { ...styles.teamCardBase, borderColor: "#fff", borderWidth: 4 },
      teamCardTitle: { ...styles.teamCardTitleBase, color: colors.card },
      participantText: { ...styles.participantTextBase, color: colors.card },
    }),
    [colors],
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={themedStyles.container}>
        <View style={themedStyles.header}>
          <TouchableOpacity
            style={themedStyles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={themedStyles.title}>Pontuações</Text>
          </View>
        </View>

        <NestableScrollContainer contentContainerStyle={styles.content}>
          <Text style={themedStyles.subtitle}>
            Gerencie a pontuação de cada time.
          </Text>

          <ScrollView
            horizontal
            contentContainerStyle={styles.scrollContent}
            showsHorizontalScrollIndicator={false}
          >
            <View style={themedStyles.table}>
              <View style={themedStyles.headerRow}>
                <View
                  style={[
                    themedStyles.cell,
                    styles.firstCol,
                    themedStyles.cellHeader,
                  ]}
                >
                  <Text style={themedStyles.headerText}></Text>
                </View>
                {scoreColumns.map((column) => (
                  <View
                    key={column}
                    style={[themedStyles.cell, themedStyles.cellHeader]}
                  >
                    <Text style={themedStyles.headerText}>{column}</Text>
                  </View>
                ))}
              </View>
              {scores.map((row) => (
                <View key={row.id} style={themedStyles.row}>
                  <View
                    style={[
                      themedStyles.cell,
                      styles.firstCol,
                      themedStyles.rowLabel,
                    ]}
                  >
                    <Text style={themedStyles.rowLabelText}>{row.id}</Text>
                  </View>
                  {scoreColumns.map((column) => (
                    <View key={column} style={themedStyles.cell}>
                      <TextInput
                        style={themedStyles.input}
                        value={row.scores[column] ?? ""}
                        onChangeText={(value) =>
                          updateScore(row.id, column, value)
                        }
                        placeholder="0"
                        placeholderTextColor={colors.placeholder}
                        keyboardType="numeric"
                      />
                    </View>
                  ))}
                </View>
              ))}
            </View>
          </ScrollView>

          {scoreColumns.length === 0 ? (
            <Text style={[themedStyles.emptyText, styles.emptyTextSpacing]}>
              Adicione um time abaixo para criar a primeira coluna da tabela.
            </Text>
          ) : null}

          <View style={styles.addTeamContainer}>
            <TextInput
              style={[themedStyles.input, styles.teamNameInput]}
              value={teamName}
              onChangeText={setTeamName}
              placeholder="Nome do time"
              placeholderTextColor={colors.placeholder}
              returnKeyType="done"
              onSubmitEditing={handleAddTeam}
            />
            <TouchableOpacity
              style={themedStyles.addButton}
              onPress={handleAddTeam}
              activeOpacity={0.85}
            >
              <Text style={themedStyles.addButtonText}>Adicionar</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.participantsSection}>
            <Text style={{ ...themedStyles.sectionTitle, marginLeft: 20 }}>
              Times e participantes
            </Text>

            {scoreColumns.length === 0 ? (
              <Text style={{ ...themedStyles.emptyText, marginLeft: 20 }}>
                Os times cadastrados aparecerão aqui para receber participantes.
              </Text>
            ) : (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={[
                  styles.carouselContent,
                  { paddingHorizontal: CARD_PADDING_H },
                ]}
                snapToInterval={cardWidth + CARD_MARGIN}
                snapToAlignment="start"
                decelerationRate="fast"
              >
                {scoreColumns.map((team, teamIndex) => {
                  const participants = participantsByTeam[team] ?? [];
                  const canMoveLeft = scoreColumns.length > 1 && teamIndex > 0;
                  const canMoveRight =
                    scoreColumns.length > 1 &&
                    teamIndex < scoreColumns.length - 1;
                  return (
                    <View
                      key={team}
                      style={[
                        themedStyles.teamCard,
                        styles.teamCardCarousel,
                        {
                          width: cardWidth,
                          marginRight: CARD_MARGIN,
                          backgroundColor: getTeamCardColor(team),
                        },
                      ]}
                    >
                      <View style={styles.teamCardHeaderRow}>
                        <View style={styles.teamChevrons}>
                          {canMoveLeft ? (
                            <TouchableOpacity
                              style={[
                                styles.chevronButton,
                                { backgroundColor: colors.card },
                              ]}
                              onPress={() => moveTeam(teamIndex, "left")}
                              activeOpacity={0.8}
                              hitSlop={6}
                            >
                              <Ionicons
                                name="chevron-back"
                                size={20}
                                color={colors.text}
                              />
                            </TouchableOpacity>
                          ) : null}
                          {canMoveRight ? (
                            <TouchableOpacity
                              style={[
                                styles.chevronButton,
                                { backgroundColor: colors.card },
                              ]}
                              onPress={() => moveTeam(teamIndex, "right")}
                              activeOpacity={0.8}
                              hitSlop={6}
                            >
                              <Ionicons
                                name="chevron-forward"
                                size={20}
                                color={colors.text}
                              />
                            </TouchableOpacity>
                          ) : null}
                        </View>
                        <View style={styles.teamCardTitleWrap}>
                          <Text
                            style={[themedStyles.teamCardTitle]}
                            numberOfLines={1}
                          >
                            {team}
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={[
                            styles.deleteTeamButton,
                            { backgroundColor: colors.card },
                          ]}
                          onPress={() => removeScoreColumn(team)}
                          activeOpacity={0.8}
                          hitSlop={8}
                        >
                          <Ionicons
                            name="close"
                            size={22}
                            color={colors.accent}
                          />
                        </TouchableOpacity>
                      </View>

                      <View style={styles.participantInputRow}>
                        <TextInput
                          style={[themedStyles.input, styles.participantInput]}
                          value={participantInputs[team] ?? ""}
                          onChangeText={(value) =>
                            handleParticipantInputChange(team, value)
                          }
                          placeholder="Nome do participante"
                          placeholderTextColor={colors.placeholder}
                          returnKeyType="done"
                          onSubmitEditing={() => handleAddParticipant(team)}
                        />
                        <TouchableOpacity
                          style={[
                            themedStyles.addButton,
                            { backgroundColor: colors.card },
                          ]}
                          onPress={() => handleAddParticipant(team)}
                          activeOpacity={0.85}
                        >
                          <Ionicons name="add" size={20} color={colors.text} />
                        </TouchableOpacity>
                      </View>

                      {participants.length === 0 ? (
                        <Text
                          style={{
                            ...themedStyles.emptyText,
                            color: colors.card,
                          }}
                        >
                          Nenhum participante adicionado.
                        </Text>
                      ) : (
                        <NestableDraggableFlatList
                          data={participants}
                          keyExtractor={(p, i) => `${team}-${i}-${p}`}
                          onDragEnd={({ data }) =>
                            reorderParticipants(team, data)
                          }
                          style={styles.participantsListScroll}
                          scrollEnabled
                          nestedScrollEnabled
                          showsVerticalScrollIndicator={false}
                          renderItem={({
                            item: participant,
                            drag: dragParticipant,
                            isActive: isParticipantActive,
                          }) => (
                            <ScaleDecorator activeScale={1.02}>
                              <View
                                style={[
                                  styles.draggableRow,
                                  styles.participantRow,
                                  { opacity: isParticipantActive ? 0.95 : 1 },
                                ]}
                              >
                                <Pressable
                                  onLongPress={dragParticipant}
                                  style={styles.dragHandlePressable}
                                  hitSlop={6}
                                >
                                  <DragHandle color={colors.card} size={18} />
                                </Pressable>
                                <Text
                                  style={[
                                    themedStyles.participantText,
                                    styles.participantName,
                                  ]}
                                  numberOfLines={1}
                                >
                                  {participant}
                                </Text>
                                <TouchableOpacity
                                  style={[styles.deleteParticipantButton]}
                                  onPress={() =>
                                    removeParticipant(team, participant)
                                  }
                                  activeOpacity={0.8}
                                  hitSlop={8}
                                >
                                  <Ionicons
                                    name="close"
                                    size={18}
                                    color={colors.card}
                                  />
                                </TouchableOpacity>
                              </View>
                            </ScaleDecorator>
                          )}
                        />
                      )}
                    </View>
                  );
                })}
              </ScrollView>
            )}
          </View>
        </NestableScrollContainer>
      </View>
    </GestureHandlerRootView>
  );
}

const cellSize = 72;
const firstColWidth = 64;

const styles = StyleSheet.create({
  containerBase: {
    flex: 1,
  },
  headerBase: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
  },
  backButtonBase: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  headerText: {
    flex: 1,
  },
  content: {
    paddingTop: 24,
    paddingBottom: 32,
  },
  titleBase: {
    fontSize: 24,
    fontWeight: "700",
  },
  subtitleBase: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    flexDirection: "column",
  },
  tableBase: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  headerRowBase: {
    flexDirection: "row",
  },
  rowBase: {
    flexDirection: "row",
    borderTopWidth: 1,
  },
  cellBase: {
    width: cellSize,
    minHeight: 48,
    padding: 6,
    justifyContent: "center",
  },
  firstCol: {
    width: firstColWidth,
    minWidth: firstColWidth,
  },
  headerTextBase: {
    fontWeight: "700",
    fontSize: 12,
  },
  rowLabelTextBase: {
    fontWeight: "600",
    fontSize: 14,
  },
  inputBase: {
    fontSize: 14,
    padding: 6,
    borderWidth: 1,
    borderRadius: 8,
    minHeight: 36,
  },
  addTeamContainer: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
    paddingBottom: 24,
    alignItems: "center",
  },
  teamNameInput: {
    flex: 1,
    minHeight: 44,
    paddingHorizontal: 12,
  },
  addButtonBase: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  addButtonTextBase: {
    fontSize: 14,
    fontWeight: "700",
  },
  emptyTextBase: {
    fontSize: 14,
    lineHeight: 20,
  },
  emptyTextSpacing: {
    paddingHorizontal: 20,
    marginTop: 12,
    marginBottom: 16,
  },
  sectionTitleBase: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 12,
  },
  participantsSection: {
    paddingHorizontal: 0,
    gap: 12,
  },
  carouselContent: {
    paddingBottom: 24,
    paddingTop: 3,
  },
  dragHandle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  dragHandleColumn: {
    flexDirection: "column",
    gap: 2,
  },
  dragHandleDot: {},
  dragHandlePressable: {
    padding: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  draggableRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  teamCardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  teamChevrons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  chevronButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  teamCardTitleWrap: {
    flex: 1,
    minWidth: 0,
  },
  deleteTeamButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  deleteParticipantButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  teamCardCarousel: {
    minHeight: 160,
  },
  participantsListScroll: {
    maxHeight: 160,
  },
  teamCardBase: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    gap: 12,
  },
  teamCardTitleBase: {
    fontSize: 16,
    fontWeight: "700",
  },
  participantInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  participantInput: {
    flex: 1,
    minHeight: 44,
    paddingHorizontal: 12,
  },
  participantsList: {
    gap: 6,
  },
  participantRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  participantName: {
    flex: 1,
    minWidth: 0,
  },
  participantReorder: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  participantTextBase: {
    fontSize: 18,
    lineHeight: 25,
    fontWeight: "600",
  },
});
