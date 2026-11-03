import { Ionicons, Octicons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import {
  Alert,
  SectionList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { shortRoundLabel, TeamBadge } from "../components/ScoresPanel";
import {
  type MatchRecord,
  type ThemeColors,
  useApp,
} from "../context/AppContext";

const DAY_MS = 24 * 60 * 60 * 1000;

const startOfDay = (timestamp: number) => {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
};

// "Hoje", "Ontem" ou "3 de novembro de 2026"
function formatDay(dayStart: number): string {
  const today = startOfDay(Date.now());
  if (dayStart === today) return "Hoje";
  if (dayStart === today - DAY_MS) return "Ontem";
  return new Date(dayStart).toLocaleDateString("pt-BR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

const formatTime = (timestamp: number) =>
  new Date(timestamp).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });

interface MatchCardProps {
  colors: ThemeColors;
  match: MatchRecord;
  onDelete: () => void;
}

function MatchCard({ colors, match, onDelete }: MatchCardProps) {
  // Maior pontuação primeiro; empate no topo vira "Empate"
  const ranking = useMemo(
    () => [...match.teams].sort((a, b) => b.total - a.total),
    [match.teams],
  );
  const best = ranking[0]?.total ?? 0;
  const winners = ranking.filter((team) => team.total === best);
  const winnerLabel = winners.length === 1 ? winners[0].name : "Empate";

  return (
    <View
      style={[
        styles.matchCard,
        { backgroundColor: colors.surface, borderColor: colors.border },
      ]}
    >
      <View style={styles.matchHeader}>
        <Octicons name="trophy" size={18} color={colors.accent} />
        <View style={styles.matchHeaderText}>
          <Text
            numberOfLines={1}
            style={[styles.winnerName, { color: colors.accent }]}
          >
            {winnerLabel}
          </Text>
          <Text style={[styles.matchMeta, { color: colors.textTertiary }]}>
            {formatTime(match.finishedAt)} · {match.teams.length} times
          </Text>
        </View>
        <TouchableOpacity
          onPress={onDelete}
          hitSlop={10}
          accessibilityLabel="Apagar partida do histórico"
        >
          <Ionicons name="trash-outline" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <View style={styles.teamRows}>
        {ranking.map((team) => {
          const isWinner = team.total === best;
          return (
            <View key={team.name} style={styles.teamRow}>
              <TeamBadge
                teamIndex={match.teams.indexOf(team)}
                teamStyle={team.style}
                size={32}
              />
              <View style={styles.teamRowText}>
                <Text
                  numberOfLines={1}
                  style={[styles.teamName, { color: colors.text }]}
                >
                  {team.name}
                </Text>
                <Text
                  numberOfLines={1}
                  style={[styles.roundBreakdown, { color: colors.textTertiary }]}
                >
                  {match.rounds
                    .map(
                      (roundId) =>
                        `${shortRoundLabel(roundId)} ${team.scores[roundId] ?? 0}`,
                    )
                    .join(" · ")}
                </Text>
              </View>
              <Text
                style={[
                  styles.teamTotal,
                  { color: isWinner ? colors.accent : colors.text },
                ]}
              >
                {team.total}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

export default function MatchHistoryScreen() {
  const { colors, matchHistory, removeMatchFromHistory } = useApp();

  // Agrupa por dia, do mais recente para o mais antigo
  const sections = useMemo(() => {
    const byDay = new Map<number, MatchRecord[]>();
    [...matchHistory]
      .sort((a, b) => b.finishedAt - a.finishedAt)
      .forEach((match) => {
        const day = startOfDay(match.finishedAt);
        byDay.set(day, [...(byDay.get(day) ?? []), match]);
      });
    return [...byDay.entries()].map(([day, data]) => ({
      title: formatDay(day),
      data,
    }));
  }, [matchHistory]);

  const confirmDelete = (match: MatchRecord) => {
    Alert.alert(
      "Apagar partida?",
      `A partida das ${formatTime(match.finishedAt)} sai do histórico.`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Apagar",
          style: "destructive",
          onPress: () => removeMatchFromHistory(match.id),
        },
      ],
    );
  };

  return (
    <SectionList
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      sections={sections}
      keyExtractor={(match) => match.id}
      stickySectionHeadersEnabled={false}
      showsVerticalScrollIndicator={false}
      renderSectionHeader={({ section }) => (
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          {section.title}
        </Text>
      )}
      renderItem={({ item }) => (
        <MatchCard
          colors={colors}
          match={item}
          onDelete={() => confirmDelete(item)}
        />
      )}
      ListEmptyComponent={
        <View
          style={[
            styles.emptyCard,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <Ionicons name="time-outline" size={28} color={colors.textSecondary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            Nenhuma partida encerrada ainda. Ao finalizar a última rodada, toque
            em &quot;Encerrar partida&quot; para guardá-la aqui.
          </Text>
        </View>
      }
    />
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 40,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    paddingHorizontal: 16,
    marginTop: 12,
  },
  matchCard: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 16,
  },
  matchHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  matchHeaderText: {
    flex: 1,
  },
  winnerName: {
    fontSize: 20,
    fontWeight: "700",
  },
  matchMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  teamRows: {
    gap: 10,
    marginTop: 14,
  },
  teamRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  teamRowText: {
    flex: 1,
  },
  teamName: {
    fontSize: 15,
    fontWeight: "700",
  },
  roundBreakdown: {
    fontSize: 12,
    marginTop: 2,
  },
  teamTotal: {
    fontFamily: "AlfaSlabOne",
    fontSize: 24,
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
});
