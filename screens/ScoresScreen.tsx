import { Ionicons, Octicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useMemo } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { type ThemeColors, useApp } from "../context/AppContext";
import {
  TEAM_CARD_TEXT,
  type TeamStyle,
  teamTheme,
} from "../utils/teamGradients";

const TOTAL_ROW_ID = "Total";

// "1ª Rodada" → "1ª", "Rodada Relâmpago" → "Relâmpago"
const shortRoundLabel = (roundId: string) =>
  roundId.replace(/\s*Rodada\s*/i, "").trim() || roundId;

const formatPoints = (points: number) =>
  points === 1 ? "1 ponto" : `${points} pontos`;

interface TeamScoreCardProps {
  colors: ThemeColors;
  team: string;
  teamIndex: number;
  teamStyle?: TeamStyle;
  rounds: { id: string; value: string }[];
  total: number;
  isLeader: boolean;
  onChangeScore: (roundId: string, value: string) => void;
}

function TeamScoreCard({
  colors,
  isLeader,
  onChangeScore,
  rounds,
  team,
  teamIndex,
  teamStyle,
  total,
}: TeamScoreCardProps) {
  const theme = teamTheme(teamIndex, teamStyle);

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
        <LinearGradient
          colors={theme.gradient}
          start={{ x: 0, y: 1 }}
          end={{ x: 1, y: 0 }}
          style={styles.teamBadge}
        >
          <Ionicons name={theme.icon} size={20} color={TEAM_CARD_TEXT} />
        </LinearGradient>
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
        <Text
          style={[
            styles.teamTotal,
            { color: isLeader ? colors.accent : colors.text },
          ]}
        >
          {total}
        </Text>
      </View>

      <View style={styles.roundsRow}>
        {rounds.map((round) => (
          <View key={round.id} style={styles.roundField}>
            <Text
              numberOfLines={1}
              style={[styles.roundLabel, { color: colors.textSecondary }]}
            >
              {shortRoundLabel(round.id)}
            </Text>
            <TextInput
              style={[
                styles.roundInput,
                {
                  color: colors.text,
                  backgroundColor: colors.inputBg,
                  borderColor: colors.inputBorder,
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
        ))}
      </View>
    </View>
  );
}

export default function ScoresScreen() {
  const router = useRouter();
  const { colors, scores, scoreColumns, teamStyles, updateScore } = useApp();

  const inputRows = useMemo(
    () => scores.filter((row) => row.id !== TOTAL_ROW_ID),
    [scores],
  );

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
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      automaticallyAdjustKeyboardInsets
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.leaderCallout}>
        <Text style={[styles.leaderLabel, { color: colors.textSecondary }]}>
          Liderando
        </Text>
        <Text
          style={[styles.leaderName, { color: colors.accent }]}
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
  leaderCallout: {
    paddingHorizontal: 16,
    marginBottom: 24,
  },
  leaderLabel: {
    fontSize: 16,
    marginBottom: 4,
  },
  leaderName: {
    fontSize: 40,
    fontWeight: "700",
    maxWidth: "100%",
  },
  leaderHint: {
    fontSize: 12,
    marginTop: 6,
  },
  teamsList: {
    gap: 12,
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
  teamBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
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
  teamTotal: {
    fontFamily: "AlfaSlabOne",
    fontSize: 32,
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
