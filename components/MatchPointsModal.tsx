import { Ionicons, Octicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  Easing,
  ZoomIn,
  ZoomOut,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { useApp } from "../context/AppContext";
import { MatchPointsPicker, formatPoints } from "./ScoresPanel";

const FLIP_DURATION_MS = 650;
const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

interface MatchPointsModalProps {
  // Time que acabou de jogar: alvo inicial dos pontos
  playedTeam: string;
  // Quem acabou de jogar, para o título do card
  playedPlayer: string | null;
  onClose: () => void;
}

interface RegisteredPoints {
  team: string;
  points: number;
}

// Celular: ao fim da partida, pontua ali mesmo na tela inicial. Cada partida
// aceita um único lançamento, que pode ser desfeito para corrigir.
export function MatchPointsModal({
  playedTeam,
  playedPlayer,
  onClose,
}: MatchPointsModalProps) {
  const router = useRouter();
  const {
    addRoundPoints,
    colors,
    currentRoundId,
    scoreColumns,
    undoRoundPoints,
  } = useApp();
  const [targetTeam, setTargetTeam] = useState(playedTeam);
  const [registered, setRegistered] = useState<RegisteredPoints | null>(null);

  const selectedTeam = scoreColumns.includes(targetTeam)
    ? targetTeam
    : (scoreColumns[0] ?? null);

  // O card surge girando no eixo X, de "deitado" até ficar de frente
  const rotation = useSharedValue(-100);
  const opacity = useSharedValue(0);
  useEffect(() => {
    rotation.value = withTiming(0, {
      duration: FLIP_DURATION_MS,
      easing: Easing.out(Easing.back(1.6)),
    });
    opacity.value = withTiming(1, { duration: FLIP_DURATION_MS / 3 });
  }, [opacity, rotation]);
  const cardStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { perspective: 900 },
      { rotateX: `${rotation.value}deg` },
    ],
  }));

  const handleAdd = (points: number) => {
    if (!selectedTeam || registered) return;
    addRoundPoints(selectedTeam, points);
    setRegistered({ team: selectedTeam, points });
  };

  const handleUndo = () => {
    if (!registered) return;
    // Nada mais pontua enquanto o modal está aberto, então o último
    // lançamento é exatamente o desta partida
    undoRoundPoints();
    setRegistered(null);
  };

  const handleOpenScores = () => {
    onClose();
    router.push("/score");
  };

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable
        style={styles.overlay}
        onPress={onClose}
        accessibilityLabel="Fechar pontuação da partida"
      >
        <Animated.View style={[styles.cardWrapper, cardStyle]}>
          {/* Toques dentro do card não fecham o modal */}
          <Pressable
            style={[
              styles.card,
              {
                backgroundColor: colors.modalBackground,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={styles.header}>
              <View style={styles.headerText}>
                <Text style={[styles.title, { color: colors.text }]}>
                  {`Quanto ${playedPlayer ?? playedTeam} pontuou?`}
                </Text>
                {currentRoundId ? (
                  <Text
                    style={[styles.subtitle, { color: colors.textTertiary }]}
                  >
                    {currentRoundId}
                  </Text>
                ) : null}
              </View>
              <TouchableOpacity
                onPress={onClose}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel="Fechar"
                style={[styles.closeButton, { backgroundColor: colors.surface }]}
              >
                <Ionicons name="close" size={20} color={colors.text} />
              </TouchableOpacity>
              {registered ? (
                <AnimatedTouchable
                  entering={ZoomIn.duration(200)}
                  exiting={ZoomOut.duration(150)}
                  onPress={onClose}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel="Confirmar pontuação"
                  style={[styles.closeButton, { backgroundColor: colors.accent }]}
                >
                  <Ionicons name="checkmark" size={20} color="#fff" />
                </AnimatedTouchable>
              ) : null}
            </View>

            {currentRoundId === null ? (
              <View style={styles.doneState}>
                <Octicons name="trophy" size={24} color={colors.accent} />
                <Text style={[styles.doneHint, { color: colors.textSecondary }]}>
                  Todas as rodadas já foram finalizadas. Reabra uma rodada em
                  Pontuações para lançar pontos.
                </Text>
                <TouchableOpacity
                  onPress={handleOpenScores}
                  activeOpacity={0.85}
                  style={[
                    styles.primaryButton,
                    { backgroundColor: colors.primary },
                  ]}
                >
                  <Text
                    style={[
                      styles.primaryButtonText,
                      { color: colors.background },
                    ]}
                  >
                    Abrir pontuações
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <MatchPointsPicker
                  colors={colors}
                  selectedTeam={registered?.team ?? selectedTeam}
                  onSelectTeam={setTargetTeam}
                  onAdd={handleAdd}
                  disabled={registered !== null}
                  highlightedPoints={registered?.points ?? null}
                />

                <View style={styles.feedbackRow}>
                  <Text
                    numberOfLines={2}
                    style={[
                      styles.feedbackText,
                      {
                        color: registered
                          ? colors.text
                          : colors.textTertiary,
                      },
                    ]}
                  >
                    {registered
                      ? `${formatPoints(registered.points)} para ${registered.team}`
                      : "Toque em um valor para pontuar esta partida."}
                  </Text>
                  <TouchableOpacity
                    onPress={handleUndo}
                    disabled={!registered}
                    hitSlop={8}
                    accessibilityRole="button"
                    accessibilityLabel="Desfazer pontuação da partida"
                    style={[styles.undoButton, !registered && styles.disabled]}
                  >
                    <Ionicons name="arrow-undo" size={16} color={colors.text} />
                    <Text style={[styles.undoText, { color: colors.text }]}>
                      Desfazer
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
  },
  cardWrapper: {
    width: "100%",
    maxWidth: 420,
  },
  card: {
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    gap: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  feedbackRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  feedbackText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
  },
  undoButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  undoText: {
    fontSize: 14,
    fontWeight: "700",
  },
  disabled: {
    opacity: 0.4,
  },
  doneState: {
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
  },
  doneHint: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  primaryButton: {
    height: 44,
    borderRadius: 12,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  primaryButtonText: {
    fontSize: 15,
    fontWeight: "800",
  },
});
