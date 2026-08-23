import { Ionicons } from "@expo/vector-icons";
import { createAudioPlayer, setAudioModeAsync } from "expo-audio";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  GestureResponderEvent,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useApp } from "../context/AppContext";

const DRAW_FINISH_SOUND = require("../assets/audio/start.wav");

interface TouchPoint {
  id: string;
  x: number;
  y: number;
}

type DrawPhase = "idle" | "collecting" | "spinning" | "result" | "revealed";

const MIN_PARTICIPANTS = 2;
const COLLECT_DELAY_MS = 2200;
const REVEAL_DURATION_MS = 2600;
const CIRCLE_SIZE = 70;
const WINNER_CIRCLE_SIZE = 88;
const TOUCH_RING_EXTRA = 16;
const TOUCH_RING_BORDER_WIDTH = 3;
const PULSE_DURATION_MS = 1200;
const PULSE_MAX_SCALE = 2.2;

function extractTouches(evt: GestureResponderEvent): TouchPoint[] {
  return evt.nativeEvent.touches.map((touch) => ({
    id: String(touch.identifier),
    x: touch.locationX,
    y: touch.locationY,
  }));
}

function statusMessage(phase: DrawPhase, participantCount: number): string {
  switch (phase) {
    case "collecting":
      return participantCount < MIN_PARTICIPANTS
        ? "Aguardando mais participantes tocarem a tela..."
        : "Mantenha o dedo na tela, o sorteio vai começar...";
    case "spinning":
      return "Sorteando...";
    case "result":
      return "Escolhido! Solte os dedos para revelar.";
    case "revealed":
      return "Participante selecionado!";
    default:
      return "Peça para todos tocarem a tela com o dedo ao mesmo tempo.";
  }
}

function TouchCircle({
  x,
  y,
  color,
  size = CIRCLE_SIZE,
  showRing = false,
}: {
  x: number;
  y: number;
  color: string;
  size?: number;
  showRing?: boolean;
}) {
  const ringSize = size + TOUCH_RING_EXTRA * 2;
  return (
    <>
      {showRing ? (
        <View
          pointerEvents="none"
          style={[
            styles.touchRing,
            {
              left: x - ringSize / 2,
              top: y - ringSize / 2,
              width: ringSize,
              height: ringSize,
              borderRadius: ringSize / 2,
              borderColor: color,
            },
          ]}
        />
      ) : null}
      <View
        pointerEvents="none"
        style={[
          styles.touchCircle,
          {
            left: x - size / 2,
            top: y - size / 2,
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: color,
          },
        ]}
      />
    </>
  );
}

function WinnerPulse({
  x,
  y,
  color,
  size,
}: {
  x: number;
  y: number;
  color: string;
  size: number;
}) {
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    pulseAnim.setValue(0);
    const animation = Animated.loop(
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: PULSE_DURATION_MS,
        useNativeDriver: true,
      }),
    );
    animation.start();
    return () => animation.stop();
  }, [pulseAnim]);

  const scale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, PULSE_MAX_SCALE],
  });
  const opacity = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.55, 0],
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.pulseRing,
        {
          left: x - size / 2,
          top: y - size / 2,
          width: size,
          height: size,
          borderRadius: size / 2,
          borderColor: color,
          opacity,
          transform: [{ scale }],
        },
      ]}
    />
  );
}

export default function DrawScreen() {
  const router = useRouter();
  const { colors } = useApp();

  const [phase, setPhase] = useState<DrawPhase>("idle");
  const [touches, setTouches] = useState<TouchPoint[]>([]);
  const [frozenTouches, setFrozenTouches] = useState<TouchPoint[]>([]);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const [winnerId, setWinnerId] = useState<string | null>(null);
  const [touchAreaOrigin, setTouchAreaOrigin] = useState({ x: 0, y: 0 });

  const phaseRef = useRef(phase);
  const touchesRef = useRef(touches);
  const spinTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const revealOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    touchesRef.current = touches;
  }, [touches]);

  const resetDraw = useCallback(() => {
    setPhase("idle");
    setTouches([]);
    setFrozenTouches([]);
    setHighlightId(null);
    setWinnerId(null);
  }, []);

  const playFinishSound = useCallback(async () => {
    try {
      await setAudioModeAsync({
        playsInSilentMode: true,
        interruptionMode: "duckOthers",
        shouldPlayInBackground: false,
      });
      const sound = createAudioPlayer(DRAW_FINISH_SOUND);
      let subscription: { remove(): void } | null = null;
      subscription = sound.addListener("playbackStatusUpdate", (status) => {
        if (status.isLoaded && status.didJustFinish && !status.loop) {
          subscription?.remove();
          sound.remove();
        }
      });
      sound.play();
    } catch (e) {
      const err = e as { message?: string };
      console.warn("Erro ao tocar som do sorteio:", err?.message ?? e);
    }
  }, []);

  const startSpin = useCallback((snapshot: TouchPoint[]) => {
    if (snapshot.length < MIN_PARTICIPANTS) return;

    setFrozenTouches(snapshot);
    setHighlightId(null);
    setWinnerId(null);
    setPhase("spinning");

    const ids = snapshot.map((touch) => touch.id);
    const winner = ids[Math.floor(Math.random() * ids.length)];
    const totalSteps = 18 + Math.floor(Math.random() * 6);
    let delay = 70;
    let step = 0;

    const tick = () => {
      step += 1;
      const isLast = step >= totalSteps;
      const currentId = isLast
        ? winner
        : ids[Math.floor(Math.random() * ids.length)];
      setHighlightId(currentId);

      if (isLast) {
        setWinnerId(winner);
        setPhase("result");
        playFinishSound();
        return;
      }

      delay = Math.min(delay * 1.18, 420);
      spinTimeoutRef.current = setTimeout(tick, delay);
    };

    spinTimeoutRef.current = setTimeout(tick, delay);
  }, [playFinishSound]);

  useEffect(() => {
    if (phase !== "collecting" || touches.length < MIN_PARTICIPANTS) return;
    const timer = setTimeout(() => {
      startSpin(touchesRef.current);
    }, COLLECT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [phase, touches.length, startSpin]);

  useEffect(() => {
    if (phase !== "result") return;
    revealOpacity.setValue(1);
  }, [phase, revealOpacity]);

  useEffect(() => {
    if (phase !== "revealed") return;
    revealOpacity.setValue(1);
    const animation = Animated.sequence([
      Animated.delay(REVEAL_DURATION_MS - 500),
      Animated.timing(revealOpacity, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]);
    animation.start();
    const timer = setTimeout(resetDraw, REVEAL_DURATION_MS);
    return () => {
      animation.stop();
      clearTimeout(timer);
    };
  }, [phase, resetDraw, revealOpacity]);

  useEffect(() => {
    return () => {
      if (spinTimeoutRef.current) clearTimeout(spinTimeoutRef.current);
    };
  }, []);

  const handleTouchChange = useCallback((evt: GestureResponderEvent) => {
    if (phaseRef.current === "spinning" || phaseRef.current === "result" || phaseRef.current === "revealed") {
      return;
    }
    const next = extractTouches(evt);
    setTouches(next);
    if (next.length > 0) {
      setPhase((current) => (current === "idle" ? "collecting" : current));
    }
  }, []);

  const handleTouchEnd = useCallback((evt: GestureResponderEvent) => {
    const remaining = extractTouches(evt);

    if (phaseRef.current === "collecting") {
      setTouches(remaining);
      if (remaining.length === 0) {
        setPhase("idle");
      }
      return;
    }

    if (phaseRef.current === "result" && remaining.length === 0) {
      setPhase("revealed");
    }
  }, []);

  const handleGoBack = useCallback(() => {
    router.back();
  }, [router]);

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
    }),
    [colors],
  );

  const visibleCircles = useMemo(() => {
    if (phase === "collecting") {
      return touches.map((touch) => ({
        ...touch,
        color: colors.primary,
        size: CIRCLE_SIZE,
        ring: true,
      }));
    }
    if (phase === "spinning") {
      return frozenTouches.map((touch) => {
        const isActive = touch.id === highlightId;
        return {
          ...touch,
          color: isActive ? colors.accent : colors.primary,
          size: isActive ? WINNER_CIRCLE_SIZE : CIRCLE_SIZE,
          ring: false,
        };
      });
    }
    return [];
  }, [phase, touches, frozenTouches, highlightId, colors]);

  const winnerCircle = useMemo(
    () => frozenTouches.find((touch) => touch.id === winnerId) ?? null,
    [frozenTouches, winnerId],
  );

  return (
    <View style={themedStyles.container}>
      <View style={themedStyles.header}>
        <TouchableOpacity
          style={themedStyles.backButton}
          onPress={handleGoBack}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={themedStyles.title}>Sortear</Text>
      </View>

      <Text style={themedStyles.subtitle}>
        {statusMessage(phase, touches.length)}
      </Text>

      <View
        style={styles.touchArea}
        onLayout={(evt) => {
          const { x, y } = evt.nativeEvent.layout;
          setTouchAreaOrigin({ x, y });
        }}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={handleTouchChange}
        onResponderMove={handleTouchChange}
        onResponderRelease={handleTouchEnd}
        onResponderTerminate={handleTouchEnd}
      >
        {visibleCircles.map((circle) => (
          <TouchCircle
            key={circle.id}
            x={circle.x}
            y={circle.y}
            color={circle.color}
            size={circle.size}
            showRing={circle.ring}
          />
        ))}
      </View>

      {(phase === "result" || phase === "revealed") && winnerCircle ? (
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: colors.accent, opacity: revealOpacity },
          ]}
        >
          <WinnerPulse
            x={touchAreaOrigin.x + winnerCircle.x}
            y={touchAreaOrigin.y + winnerCircle.y}
            color={colors.background}
            size={WINNER_CIRCLE_SIZE}
          />
          <View
            style={[
              styles.touchCircle,
              {
                left:
                  touchAreaOrigin.x + winnerCircle.x - WINNER_CIRCLE_SIZE / 2,
                top:
                  touchAreaOrigin.y + winnerCircle.y - WINNER_CIRCLE_SIZE / 2,
                width: WINNER_CIRCLE_SIZE,
                height: WINNER_CIRCLE_SIZE,
                borderRadius: WINNER_CIRCLE_SIZE / 2,
                backgroundColor: colors.background,
              },
            ]}
          />
        </Animated.View>
      ) : null}
    </View>
  );
}

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
  titleBase: {
    fontSize: 24,
    fontWeight: "700",
  },
  subtitleBase: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 14,
    paddingHorizontal: 20,
  },
  touchArea: {
    flex: 1,
  },
  touchCircle: {
    position: "absolute",
  },
  touchRing: {
    position: "absolute",
    borderWidth: TOUCH_RING_BORDER_WIDTH,
    opacity: 0.5,
  },
  pulseRing: {
    position: "absolute",
    borderWidth: TOUCH_RING_BORDER_WIDTH,
  },
});
