import { Ionicons, Octicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import {
  TOTAL_ROW_ID,
  type ThemeColors,
  useApp,
} from "../context/AppContext";
import {
  TEAM_CARD_TEXT,
  type TeamStyle,
  teamTheme,
} from "../utils/teamGradients";

const QUICK_POINTS = [1, 2, 3, 4, 5, 6];
const DEFAULT_CUSTOM_POINTS = 7;
// Rodadas que podem ser puladas sem pontuar
const OPTIONAL_ROUND_IDS = new Set(["Rodada Relâmpago"]);
// Linha de cima: valores rápidos; linha de baixo: o último rápido e o personalizado
const QUICK_POINTS_TOP = QUICK_POINTS.slice(0, 4);
const QUICK_POINTS_BOTTOM = QUICK_POINTS.slice(4);

// "1ª Rodada" → "1ª", "Rodada Relâmpago" → "Relâmpago"
export const shortRoundLabel = (roundId: string) =>
  roundId.replace(/\s*Rodada\s*/i, "").trim() || roundId;

export const formatPoints = (points: number) =>
  points === 1 ? "1 ponto" : `${points} pontos`;

interface TeamBadgeProps {
  teamIndex: number;
  teamStyle?: TeamStyle;
  size: number;
}

export function TeamBadge({ size, teamIndex, teamStyle }: TeamBadgeProps) {
  const theme = teamTheme(teamIndex, teamStyle);
  return (
    <LinearGradient
      colors={theme.gradient}
      start={{ x: 0, y: 1 }}
      end={{ x: 1, y: 0 }}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Ionicons name={theme.icon} size={size / 2} color={TEAM_CARD_TEXT} />
    </LinearGradient>
  );
}

interface MatchPointsPickerProps {
  colors: ThemeColors;
  selectedTeam: string | null;
  onSelectTeam: (team: string) => void;
  onAdd: (points: number) => void;
  // Trava a escolha, por exemplo depois que a partida já foi pontuada
  disabled?: boolean;
  // Destaca o valor já lançado
  highlightedPoints?: number | null;
}

// Escolha do time e do valor a somar na partida, usada no painel e no modal
export function MatchPointsPicker({
  colors,
  disabled = false,
  highlightedPoints = null,
  onAdd,
  onSelectTeam,
  selectedTeam,
}: MatchPointsPickerProps) {
  const { roundPoints, scoreColumns, teamStyles } = useApp();
  const [customPoints, setCustomPoints] = useState(DEFAULT_CUSTOM_POINTS);
  // Qual botão lançou o valor destacado, para não confundir o personalizado
  // (ajustado para 3, por exemplo) com o botão rápido de mesmo valor
  const [pressedCustom, setPressedCustom] = useState(false);
  const changeCustomPoints = (delta: number) => {
    setCustomPoints((value) => Math.max(1, value + delta));
  };
  const handleQuickAdd = (points: number) => {
    setPressedCustom(false);
    onAdd(points);
  };
  const handleCustomAdd = () => {
    setPressedCustom(true);
    onAdd(customPoints);
  };
  const canAdd = !disabled && selectedTeam !== null;
  const isCustomHighlighted =
    highlightedPoints !== null &&
    (pressedCustom || !QUICK_POINTS.includes(highlightedPoints));

  const renderQuickTile = (points: number) => {
    const isHighlighted = !isCustomHighlighted && points === highlightedPoints;
    return (
      <TouchableOpacity
        key={points}
        activeOpacity={0.7}
        disabled={!canAdd}
        onPress={() => handleQuickAdd(points)}
        accessibilityLabel={`Somar ${formatPoints(points)}`}
        style={[
          styles.pointTile,
          styles.quickTile,
          {
            backgroundColor: isHighlighted ? colors.accent : colors.background,
          },
          disabled && !isHighlighted && styles.disabled,
        ]}
      >
        <Text
          style={[
            styles.pointTileText,
            { color: isHighlighted ? "#fff" : colors.text },
          ]}
        >
          +{points}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <>
      <Text style={[styles.trackerLabel, { color: colors.textSecondary }]}>
        Pontos da partida para
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsRow}
      >
        {scoreColumns.map((team, teamIndex) => {
          const isSelected = team === selectedTeam;
          const pending = roundPoints[team] ?? 0;
          return (
            <TouchableOpacity
              key={team}
              activeOpacity={0.8}
              disabled={disabled}
              onPress={() => onSelectTeam(team)}
              accessibilityRole="radio"
              accessibilityState={{ checked: isSelected, disabled }}
              accessibilityLabel={`${team}, ${formatPoints(pending)} na rodada`}
              style={[
                styles.teamChip,
                {
                  backgroundColor: colors.background,
                  borderColor: isSelected ? colors.accent : "transparent",
                },
                disabled && !isSelected && styles.disabled,
              ]}
            >
              <TeamBadge
                teamIndex={teamIndex}
                teamStyle={teamStyles[team]}
                size={28}
              />
              <Text
                numberOfLines={1}
                style={[styles.teamChipName, { color: colors.text }]}
              >
                {team}
              </Text>
              <View
                style={[
                  styles.pendingPill,
                  {
                    backgroundColor:
                      pending !== 0 ? colors.accent : colors.surface,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.pendingText,
                    {
                      color: pending !== 0 ? "#fff" : colors.textTertiary,
                    },
                  ]}
                >
                  +{pending}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={styles.pointsGrid}>
        <View style={styles.pointsRow}>
          {QUICK_POINTS_TOP.map(renderQuickTile)}
        </View>
        <View style={styles.pointsRow}>
          {QUICK_POINTS_BOTTOM.map(renderQuickTile)}
          <View
            style={[
              styles.pointTile,
              styles.customTile,
              {
                backgroundColor: isCustomHighlighted
                  ? colors.accent
                  : colors.background,
                borderColor: colors.accent,
              },
              disabled && !isCustomHighlighted && styles.disabled,
            ]}
          >
            <TouchableOpacity
              hitSlop={8}
              disabled={disabled || customPoints <= 1}
              onPress={() => changeCustomPoints(-1)}
              accessibilityLabel="Diminuir valor personalizado"
              style={customPoints <= 1 && styles.disabled}
            >
              <Ionicons name="remove" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.7}
              disabled={!canAdd}
              onPress={handleCustomAdd}
              onLongPress={() => setCustomPoints(DEFAULT_CUSTOM_POINTS)}
              accessibilityLabel={`Somar ${formatPoints(customPoints)}`}
              accessibilityHint="Segure para voltar ao valor padrão"
              style={styles.customValue}
            >
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.5}
                style={[
                  styles.pointTileText,
                  { color: isCustomHighlighted ? "#fff" : colors.accent },
                ]}
              >
                +{isCustomHighlighted ? highlightedPoints : customPoints}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              hitSlop={8}
              disabled={disabled}
              onPress={() => changeCustomPoints(1)}
              accessibilityLabel="Aumentar valor personalizado"
            >
              <Ionicons name="add" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </>
  );
}

interface RoundTrackerProps {
  colors: ThemeColors;
  roundIds: string[];
}

// Acumula os pontos de cada partida e lança tudo na tabela ao fim da rodada
function RoundTracker({ colors, roundIds }: RoundTrackerProps) {
  const {
    addRoundPoints,
    canUndoRoundPoints,
    currentRoundId,
    finishMatch,
    finishRound,
    lastPlayedTeam,
    roundPoints,
    scoreColumns,
    setCurrentRoundId,
    undoRoundPoints,
  } = useApp();
  const [targetTeam, setTargetTeam] = useState<string | null>(
    lastPlayedTeam ?? scoreColumns[0] ?? null,
  );
  const [lastAdded, setLastAdded] = useState<string | null>(null);

  // Ao fim de cada partida, o alvo passa a ser o time que acabou de jogar
  const [seenLastPlayedTeam, setSeenLastPlayedTeam] = useState(lastPlayedTeam);
  if (lastPlayedTeam !== seenLastPlayedTeam) {
    setSeenLastPlayedTeam(lastPlayedTeam);
    if (lastPlayedTeam) setTargetTeam(lastPlayedTeam);
  }

  const selectedTeam =
    targetTeam && scoreColumns.includes(targetTeam)
      ? targetTeam
      : (scoreColumns[0] ?? null);
  const currentIndex = currentRoundId ? roundIds.indexOf(currentRoundId) : -1;
  const hasPending = Object.values(roundPoints).some((points) => points !== 0);
  const canSkip =
    currentRoundId !== null &&
    OPTIONAL_ROUND_IDS.has(currentRoundId) &&
    !hasPending;

  const handleAdd = (points: number) => {
    if (!selectedTeam) return;
    addRoundPoints(selectedTeam, points);
    setLastAdded(`+${points} para ${selectedTeam}`);
  };

  const handleUndo = () => {
    undoRoundPoints();
    setLastAdded(null);
  };

  const handleFinish = () => {
    finishRound();
    setLastAdded(null);
  };

  const handleFinishMatch = () => {
    const saved = finishMatch();
    setLastAdded(
      saved ? "Partida guardada no histórico." : "Tabela zerada para nova partida.",
    );
  };

  const handleSkip = () => {
    setCurrentRoundId(roundIds[currentIndex + 1] ?? null);
  };

  return (
    <View
      style={[
        styles.trackerCard,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsRow}
      >
        {roundIds.map((roundId, index) => {
          const isCurrent = roundId === currentRoundId;
          const isDone = currentRoundId === null || index < currentIndex;
          return (
            <TouchableOpacity
              key={roundId}
              activeOpacity={0.8}
              onPress={() => setCurrentRoundId(roundId)}
              accessibilityRole="button"
              accessibilityState={{ selected: isCurrent }}
              accessibilityLabel={`${roundId}${isDone ? ", finalizada" : ""}`}
              style={[
                styles.roundChip,
                {
                  backgroundColor: isCurrent
                    ? colors.accent
                    : colors.background,
                },
              ]}
            >
              {isDone ? (
                <Ionicons
                  name="checkmark"
                  size={14}
                  color={isCurrent ? "#fff" : colors.textSecondary}
                />
              ) : null}
              <Text
                style={[
                  styles.roundChipText,
                  { color: isCurrent ? "#fff" : colors.textSecondary },
                ]}
              >
                {shortRoundLabel(roundId)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {currentRoundId === null ? (
        <View style={styles.doneState}>
          <Octicons name="trophy" size={24} color={colors.accent} />
          <Text style={[styles.doneTitle, { color: colors.text }]}>
            Todas as rodadas finalizadas
          </Text>
          <Text style={[styles.doneHint, { color: colors.textTertiary }]}>
            Toque em uma rodada acima para reabri-la, ou encerre a partida para
            guardá-la no histórico e começar outra com os mesmos times.
          </Text>
          <TouchableOpacity
            onPress={handleFinishMatch}
            activeOpacity={0.85}
            style={[
              styles.actionButton,
              styles.finishMatchButton,
              { backgroundColor: colors.primary },
            ]}
          >
            <Ionicons name="archive" size={16} color={colors.background} />
            <Text style={[styles.actionText, { color: colors.background }]}>
              Encerrar partida
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <MatchPointsPicker
            colors={colors}
            selectedTeam={selectedTeam}
            onSelectTeam={setTargetTeam}
            onAdd={handleAdd}
          />

          <View style={styles.feedbackRow}>
            <Text
              numberOfLines={1}
              style={[styles.feedbackText, { color: colors.textTertiary }]}
            >
              {lastAdded ?? "Toque em um valor para somar ao time."}
            </Text>
            <TouchableOpacity
              onPress={handleUndo}
              disabled={!canUndoRoundPoints}
              hitSlop={8}
              style={[styles.undoButton, !canUndoRoundPoints && styles.disabled]}
            >
              <Ionicons name="arrow-undo" size={16} color={colors.text} />
              <Text style={[styles.undoText, { color: colors.text }]}>
                Desfazer
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.actionsRow}>
            {canSkip ? (
              <TouchableOpacity
                onPress={handleSkip}
                activeOpacity={0.85}
                style={[
                  styles.actionButton,
                  styles.skipButton,
                  { backgroundColor: colors.background },
                ]}
              >
                <Text style={[styles.actionText, { color: colors.text }]}>
                  Pular
                </Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              onPress={handleFinish}
              activeOpacity={0.85}
              style={[
                styles.actionButton,
                styles.finishButton,
                { backgroundColor: colors.primary },
              ]}
            >
              <Ionicons name="flag" size={16} color={colors.background} />
              <Text style={[styles.actionText, { color: colors.background }]}>
                Finalizar {currentRoundId.toLowerCase()}
              </Text>
            </TouchableOpacity>
          </View>
        </>
      )}
    </View>
  );
}

interface TeamScoreCardProps {
  colors: ThemeColors;
  team: string;
  teamIndex: number;
  teamStyle?: TeamStyle;
  rounds: { id: string; value: string }[];
  currentRoundId: string | null;
  pending: number;
  total: number;
  isLeader: boolean;
  onChangeScore: (roundId: string, value: string) => void;
}

function TeamScoreCard({
  colors,
  currentRoundId,
  isLeader,
  onChangeScore,
  pending,
  rounds,
  team,
  teamIndex,
  teamStyle,
  total,
}: TeamScoreCardProps) {
  return (
    <View
      style={[
        styles.teamCard,
        {
          backgroundColor: colors.surface,
          borderColor: isLeader ? colors.accent : colors.border,
        },
      ]}
    >
      <View style={styles.teamCardHeader}>
        <TeamBadge teamIndex={teamIndex} teamStyle={teamStyle} size={40} />
        <View style={styles.teamCardTitle}>
          <Text
            numberOfLines={1}
            style={[styles.teamName, { color: colors.text }]}
          >
            {team}
          </Text>
          {isLeader ? (
            <View style={styles.leaderTag}>
              <Octicons name="trophy" size={12} color={colors.accent} />
              <Text style={[styles.leaderTagText, { color: colors.accent }]}>
                Liderando
              </Text>
            </View>
          ) : null}
        </View>
        <View style={styles.totalColumn}>
          <Text
            style={[
              styles.teamTotal,
              { color: isLeader ? colors.accent : colors.text },
            ]}
          >
            {total}
          </Text>
          {pending !== 0 ? (
            <Text style={[styles.totalPending, { color: colors.textTertiary }]}>
              +{pending} na rodada
            </Text>
          ) : null}
        </View>
      </View>

      <View style={styles.roundsRow}>
        {rounds.map((round) => {
          const isCurrent = round.id === currentRoundId;
          return (
            <View key={round.id} style={styles.roundField}>
              <Text
                numberOfLines={1}
                style={[
                  styles.roundLabel,
                  { color: isCurrent ? colors.accent : colors.textSecondary },
                ]}
              >
                {shortRoundLabel(round.id)}
              </Text>
              <TextInput
                style={[
                  styles.roundInput,
                  {
                    color: colors.text,
                    backgroundColor: colors.inputBg,
                    borderColor: isCurrent ? colors.accent : colors.inputBorder,
                  },
                ]}
                value={round.value}
                onChangeText={(value) => onChangeScore(round.id, value)}
                placeholder="0"
                placeholderTextColor={colors.placeholder}
                keyboardType="numeric"
                selectTextOnFocus
              />
            </View>
          );
        })}
      </View>
    </View>
  );
}

interface ScoresPanelProps {
  // Ao lado dos timers (tablet): destaque do líder menor
  compact?: boolean;
}

export function ScoresPanel({ compact = false }: ScoresPanelProps) {
  const router = useRouter();
  const {
    colors,
    currentRoundId,
    openScoresAfterTurn,
    roundPoints,
    scores,
    scoreColumns,
    setOpenScoresAfterTurn,
    teamStyles,
    updateScore,
  } = useApp();

  const inputRows = useMemo(
    () => scores.filter((row) => row.id !== TOTAL_ROW_ID),
    [scores],
  );
  const roundIds = useMemo(() => inputRows.map((row) => row.id), [inputRows]);

  const totalsByTeam = useMemo(() => {
    const totals: Record<string, number> = {};
    scoreColumns.forEach((team) => {
      totals[team] = inputRows.reduce(
        (sum, row) => sum + (parseFloat(row.scores[team] ?? "") || 0),
        0,
      );
    });
    return totals;
  }, [inputRows, scoreColumns]);

  // Times com a maior pontuação; vazio enquanto ninguém pontuou
  const leaders = useMemo(() => {
    const best = Math.max(0, ...scoreColumns.map((team) => totalsByTeam[team]));
    if (best <= 0) return [];
    return scoreColumns.filter((team) => totalsByTeam[team] === best);
  }, [scoreColumns, totalsByTeam]);

  const leaderName =
    leaders.length === 0 ? "—" : leaders.length === 1 ? leaders[0] : "Empate";
  const leaderHint =
    scoreColumns.length === 0
      ? "Cadastre times para começar a pontuar"
      : leaders.length === 0
        ? "Ninguém pontuou ainda"
        : leaders.length === 1
          ? formatPoints(totalsByTeam[leaders[0]])
          : `${leaders.join(", ")} · ${formatPoints(totalsByTeam[leaders[0]])}`;

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[styles.content, compact && styles.contentCompact]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      automaticallyAdjustKeyboardInsets
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.leaderCallout}>
        <View style={styles.leaderLabelRow}>
          <Text style={[styles.leaderLabel, { color: colors.textSecondary }]}>
            Liderando
          </Text>
          <TouchableOpacity
            onPress={() => router.push("/history")}
            activeOpacity={0.8}
            accessibilityLabel="Histórico de partidas"
            style={[
              styles.historyButton,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Ionicons name="time-outline" size={16} color={colors.text} />
            <Text style={[styles.historyButtonText, { color: colors.text }]}>
              Histórico
            </Text>
          </TouchableOpacity>
        </View>
        <Text
          style={[
            styles.leaderName,
            compact && styles.leaderNameCompact,
            { color: colors.accent },
          ]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {leaderName}
        </Text>
        <Text
          style={[styles.leaderHint, { color: colors.textTertiary }]}
          numberOfLines={1}
        >
          {leaderHint}
        </Text>
      </View>

      {/* No tablet o painel já aparece sozinho ao lado dos timers */}
      {!compact ? (
        <View
          style={[
            styles.autoOpenRow,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Ionicons name="flash-outline" size={20} color={colors.textSecondary} />
          <View style={styles.autoOpenText}>
            <Text style={[styles.autoOpenTitle, { color: colors.text }]}>
              Abrir ao fim de cada partida
            </Text>
            <Text style={[styles.autoOpenHint, { color: colors.textTertiary }]}>
              Mostra os pontos da partida num card na tela inicial quando o timer termina.
            </Text>
          </View>
          <Switch
            value={openScoresAfterTurn}
            onValueChange={setOpenScoresAfterTurn}
            trackColor={{ false: colors.border, true: colors.accent }}
            thumbColor="#fff"
            ios_backgroundColor={colors.border}
            accessibilityLabel="Abrir pontuação ao fim de cada partida"
          />
        </View>
      ) : null}

      {scoreColumns.length === 0 ? (
        <View
          style={[
            styles.emptyCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Octicons name="trophy" size={28} color={colors.textSecondary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Os pontos de cada rodada aparecem aqui assim que houver times.
          </Text>
          <TouchableOpacity
            onPress={() => router.push("/teams")}
            activeOpacity={0.85}
            style={[styles.emptyButton, { backgroundColor: colors.primary }]}
          >
            <Text
              style={[styles.emptyButtonText, { color: colors.background }]}
            >
              Cadastrar times
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.teamsList}>
          <RoundTracker colors={colors} roundIds={roundIds} />
          {scoreColumns.map((team, teamIndex) => (
            <TeamScoreCard
              key={team}
              colors={colors}
              team={team}
              teamIndex={teamIndex}
              teamStyle={teamStyles[team]}
              rounds={inputRows.map((row) => ({
                id: row.id,
                value: row.scores[team] ?? "",
              }))}
              currentRoundId={currentRoundId}
              pending={roundPoints[team] ?? 0}
              total={totalsByTeam[team]}
              isLeader={leaders.includes(team)}
              onChangeScore={(roundId, value) =>
                updateScore(roundId, team, value)
              }
            />
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 40,
  },
  contentCompact: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  leaderCallout: {
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  leaderLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  leaderLabel: {
    fontSize: 16,
  },
  historyButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    height: 32,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  historyButtonText: {
    fontSize: 13,
    fontWeight: "700",
  },
  leaderName: {
    fontSize: 40,
    fontWeight: "700",
    maxWidth: "100%",
  },
  leaderNameCompact: {
    fontSize: 30,
  },
  leaderHint: {
    fontSize: 12,
    marginTop: 6,
  },
  teamsList: {
    gap: 12,
  },
  autoOpenRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 12,
  },
  autoOpenText: {
    flex: 1,
  },
  autoOpenTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  autoOpenHint: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  trackerCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  chipsRow: {
    gap: 8,
  },
  roundChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    height: 34,
    paddingHorizontal: 14,
    borderRadius: 17,
  },
  roundChipText: {
    fontSize: 14,
    fontWeight: "700",
  },
  trackerLabel: {
    fontSize: 13,
    fontWeight: "600",
    marginTop: 4,
  },
  teamChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    maxWidth: 220,
    paddingLeft: 6,
    paddingRight: 8,
    paddingVertical: 6,
    borderRadius: 24,
    borderWidth: 2,
  },
  teamChipName: {
    flexShrink: 1,
    fontSize: 15,
    fontWeight: "700",
  },
  pendingPill: {
    minWidth: 32,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    alignItems: "center",
  },
  pendingText: {
    fontSize: 13,
    fontWeight: "800",
  },
  pointsGrid: {
    gap: 8,
  },
  pointsRow: {
    flexDirection: "row",
    gap: 8,
  },
  pointTile: {
    height: 64,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  // Os quatro botões rápidos de cada linha têm a mesma largura
  quickTile: {
    flexGrow: 1,
    flexBasis: 0,
  },
  pointTileText: {
    fontFamily: "AlfaSlabOne",
    fontSize: 24,
  },
  // Ocupa as duas colunas restantes (e o espaço entre elas)
  customTile: {
    flexGrow: 2,
    flexBasis: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    borderWidth: 1.5,
  },
  customValue: {
    flex: 1,
    alignSelf: "stretch",
    alignItems: "center",
    justifyContent: "center",
  },
  feedbackRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  feedbackText: {
    flex: 1,
    fontSize: 13,
  },
  undoButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  undoText: {
    fontSize: 13,
    fontWeight: "700",
  },
  disabled: {
    opacity: 0.35,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    height: 48,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  skipButton: {
    paddingHorizontal: 20,
  },
  finishButton: {
    flex: 1,
  },
  actionText: {
    fontSize: 15,
    fontWeight: "800",
  },
  doneState: {
    alignItems: "center",
    gap: 6,
    paddingVertical: 12,
  },
  doneTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  doneHint: {
    fontSize: 13,
    lineHeight: 18,
    textAlign: "center",
  },
  finishMatchButton: {
    alignSelf: "stretch",
    marginTop: 8,
  },
  teamCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 16,
  },
  teamCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  teamCardTitle: {
    flex: 1,
  },
  teamName: {
    fontSize: 18,
    fontWeight: "700",
  },
  leaderTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  leaderTagText: {
    fontSize: 12,
    fontWeight: "700",
  },
  totalColumn: {
    alignItems: "flex-end",
  },
  teamTotal: {
    fontFamily: "AlfaSlabOne",
    fontSize: 32,
  },
  totalPending: {
    fontSize: 11,
    fontWeight: "600",
  },
  roundsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 16,
  },
  roundField: {
    flex: 1,
  },
  roundLabel: {
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 6,
  },
  roundInput: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
  emptyCard: {
    alignItems: "center",
    gap: 12,
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
  },
  emptyText: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },
  emptyButton: {
    alignSelf: "stretch",
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  emptyButtonText: {
    fontSize: 15,
    fontWeight: "800",
  },
});
