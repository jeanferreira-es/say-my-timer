import { ALARM_SOUNDS } from "@/config/alarms";
import type { ThemeColors } from "@/context/AppContext";
import { useApp } from "@/context/AppContext";
import {
  Feather,
  FontAwesome6,
  Ionicons,
  Octicons
} from "@expo/vector-icons";
import {
  createAudioPlayer,
  setAudioModeAsync,
  type AudioPlayer,
} from "expo-audio";
import { useRouter } from "expo-router";
import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  Vibration,
  View,
} from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  type SharedValue,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import Svg, { G, Path } from "react-native-svg";

import {
  INITIAL_TURN,
  type Turn,
  getActiveTeams,
  getTurnPlayer,
  isFirstTurn,
  nextTurn,
  previousTurn,
} from "@/utils/turnOrder";

const START_SOUND = require("../assets/audio/start.wav");
const ALARM_VIBRATION_PATTERN = [0, 300, 100, 300, 100, 500];

const DURATION_MS = 400;
const DOUBLE_TAP_MS = 350;
const REWIND_MS = 500;
const PRIMARY_TIMER_SECONDS = 30;

type TimerSize = "large" | "small";
type TimerSeconds = number;
type TimerId = "primary" | "secondary";

// Blocos ao redor do timer: poucos o bastante para manter o círculo legível
const SEGMENT_COUNT = 15;
const SEGMENT_GAP_DEG = 8;
// Fração do período de cada bloco que a gota leva para atravessar o espaço
const SEGMENT_DROP = 0.3;
// Ondulação da borda do líquido: oscilações por bloco e amplitude (fração da largura do anel)
const SEGMENT_WAVES = 4;
const SEGMENT_WAVE_AMPLITUDE = 0.18;

const AnimatedPath = Animated.createAnimatedComponent(Path);

interface SegmentGeometry {
  center: number;
  innerRadius: number;
  outerRadius: number;
  midRadius: number;
  cornerRadius: number;
  step: number;
  inset: number;
  gap: number;
}

const clamp01 = (v: number) => {
  "worklet";
  return Math.min(Math.max(v, 0), 1);
};

// Setor de anel (trapézio curvo); o stroke com junção arredondada arredonda os cantos
function segmentPath(
  center: number,
  innerRadius: number,
  outerRadius: number,
  startDeg: number,
  endDeg: number,
): string {
  "worklet";
  const point = (r: number, deg: number) => {
    const rad = ((deg - 90) * Math.PI) / 180;
    return `${center + r * Math.cos(rad)} ${center + r * Math.sin(rad)}`;
  };
  return [
    `M ${point(outerRadius, startDeg)}`,
    `A ${outerRadius} ${outerRadius} 0 0 1 ${point(outerRadius, endDeg)}`,
    `L ${point(innerRadius, endDeg)}`,
    `A ${innerRadius} ${innerRadius} 0 0 0 ${point(innerRadius, startDeg)}`,
    "Z",
  ].join(" ");
}

// Setor preenchido com a borda de avanço ondulada (curva em S que oscila)
function fillPath(
  center: number,
  innerRadius: number,
  outerRadius: number,
  startDeg: number,
  endDeg: number,
  wave: number,
  phase: number,
): string {
  "worklet";
  const rad = ((endDeg - 90) * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const point = (r: number, deg: number) => {
    const a = ((deg - 90) * Math.PI) / 180;
    return `${center + r * Math.cos(a)} ${center + r * Math.sin(a)}`;
  };
  // Ponto na borda de avanço, a uma distância r do centro, deslocado na tangente
  const edge = (r: number, offset: number) =>
    `${center + r * cos - offset * sin} ${center + r * sin + offset * cos}`;
  const thickness = outerRadius - innerRadius;
  const c1 = wave * Math.sin(phase);
  const c2 = wave * Math.sin(phase + Math.PI * 0.8);
  return [
    `M ${point(outerRadius, startDeg)}`,
    `A ${outerRadius} ${outerRadius} 0 0 1 ${point(outerRadius, endDeg)}`,
    `C ${edge(outerRadius - thickness / 3, c1)} ${edge(innerRadius + thickness / 3, c2)} ${point(innerRadius, endDeg)}`,
    `A ${innerRadius} ${innerRadius} 0 0 0 ${point(innerRadius, startDeg)}`,
    "Z",
  ].join(" ");
}

// Gota no espaço entre dois blocos, em coordenadas locais: x tangente
// (negativo = bloco anterior), y radial. s vai de 0 a 1: a gota escorre até
// tocar o próximo bloco (s = 0.5) e depois o pescoço afina até se soltar.
function dropPath(s: number, halfGap: number, halfHeight: number): string {
  "worklet";
  const x0 = -halfGap;
  const x1 = halfGap;
  if (s < 0.5) {
    const t = s / 0.5;
    const a = halfHeight * 0.55;
    const tip = x0 + (x1 - x0) * t * t * (3 - 2 * t);
    const mid = (x0 + tip) / 2;
    return [
      `M ${x0} ${-a}`,
      `C ${mid} ${-a * 0.5} ${tip} ${-a} ${tip} 0`,
      `C ${tip} ${a} ${mid} ${a * 0.5} ${x0} ${a}`,
      "Z",
    ].join(" ");
  }
  const t = (s - 0.5) / 0.5;
  const a = halfHeight * 0.55 * (1 - 0.4 * t);
  const n = a * (1 - t) * 0.7;
  return [
    `M ${x0} ${-a}`,
    `C ${x0 / 2} ${-a} ${x0 / 2} ${-n} 0 ${-n}`,
    `C ${x1 / 2} ${-n} ${x1 / 2} ${-a} ${x1} ${-a}`,
    `L ${x1} ${a}`,
    `C ${x1 / 2} ${a} ${x1 / 2} ${n} 0 ${n}`,
    `C ${x0 / 2} ${n} ${x0 / 2} ${a} ${x0} ${a}`,
    "Z",
  ].join(" ");
}

interface ProgressSegmentProps {
  index: number;
  geometry: SegmentGeometry;
  progress: SharedValue<number>;
  color: string;
}

// Preenche o bloco como líquido; termina no fim do seu trecho, então o último
// bloco fica completo junto com o tempo
function ProgressSegment({
  index,
  geometry,
  progress,
  color,
}: ProgressSegmentProps) {
  const animatedProps = useAnimatedProps(() => {
    const { center, innerRadius, outerRadius, step, inset } = geometry;
    // A partir do segundo bloco, o líquido começa quando a gota encosta
    const delay = index === 0 ? 0 : SEGMENT_DROP / 2;
    const fill = clamp01(
      (progress.value * SEGMENT_COUNT - index - delay) / (1 - delay),
    );
    const startDeg = index * step + inset;
    const endDeg = startDeg + (step - inset * 2) * fill;
    // Some nas pontas, para o bloco começar e terminar com a borda reta
    const wave =
      (outerRadius - innerRadius) *
      SEGMENT_WAVE_AMPLITUDE *
      Math.sin(Math.PI * fill);
    const phase = progress.value * SEGMENT_COUNT * SEGMENT_WAVES * Math.PI * 2;
    return {
      d: fillPath(
        center,
        innerRadius,
        outerRadius,
        startDeg,
        endDeg,
        wave,
        phase,
      ),
      opacity: fill > 0 ? 1 : 0,
    };
  });
  return (
    <AnimatedPath
      fill={color}
      stroke={color}
      strokeWidth={geometry.cornerRadius * 2}
      strokeLinejoin="round"
      animatedProps={animatedProps}
    />
  );
}

interface SegmentDropProps {
  index: number;
  geometry: SegmentGeometry;
  progress: SharedValue<number>;
  color: string;
}

// Gota que sai do bloco `index` e dá cor ao próximo
function SegmentDrop({ index, geometry, progress, color }: SegmentDropProps) {
  const { center, midRadius, outerRadius, innerRadius, cornerRadius, gap } =
    geometry;
  const animatedProps = useAnimatedProps(() => {
    const s = (progress.value * SEGMENT_COUNT - (index + 1)) / SEGMENT_DROP;
    if (s <= 0 || s >= 1) return { d: "M 0 0", opacity: 0 };
    const halfHeight = (outerRadius - innerRadius) / 2 + cornerRadius;
    return {
      d: dropPath(s, gap / 2 + cornerRadius, halfHeight),
      opacity: 1,
    };
  });
  const deg = (index + 1) * geometry.step;
  return (
    <G
      transform={`rotate(${deg} ${center} ${center}) translate(${center} ${center - midRadius})`}
    >
      <AnimatedPath fill={color} animatedProps={animatedProps} />
    </G>
  );
}

export interface TimerCircleRef {
  start: () => void;
  reset: () => void;
  pause: () => void;
}

interface TimerCircleProps {
  timerId: TimerId;
  seconds: TimerSeconds;
  size: TimerSize;
  onComplete?: () => void;
  // Volta automaticamente ao tempo inicial quando chega a zero
  resetOnComplete?: boolean;
  expanded: boolean;
  onRunningChange?: (timerId: TimerId, isRunning: boolean) => void;
  onPressAction?: () => void;
  onDoubleTap?: () => void;
  colors: ThemeColors;
}

const TimerCircle = forwardRef<TimerCircleRef, TimerCircleProps>(
  function TimerCircle(
    {
      timerId,
      seconds,
      size,
      onComplete,
      resetOnComplete = false,
      expanded,
      onRunningChange,
      onPressAction,
      onDoubleTap,
      colors,
    },
    ref,
  ) {
    const [remaining, setRemaining] = useState<number>(seconds);
    const [running, setRunning] = useState<boolean>(false);

    const widthScale = useSharedValue(1);
    const borderProgress = useSharedValue(0);
    const prevRunningRef = useRef(false);
    const lastPauseTapRef = useRef(0);
    const rewindUntilRef = useRef(0);

    useEffect(() => {
      const justStarted = running && !prevRunningRef.current;
      prevRunningRef.current = running;
      if (!justStarted) return;
      const durationMs = remaining * 1000;
      borderProgress.value = withTiming(1, {
        duration: durationMs,
        easing: Easing.linear,
      });
    }, [running, remaining, borderProgress]);

    useEffect(() => {
      const targetScale = expanded && running ? 2 : 1;
      widthScale.value = withTiming(targetScale, {
        duration: DURATION_MS,
        easing: Easing.out(Easing.cubic),
      });
    }, [expanded, running, widthScale]);

    useEffect(() => {
      setRemaining(seconds);
      setRunning(false);
      borderProgress.value = 0;
      widthScale.value = 1;
    }, [seconds, borderProgress, widthScale]);

    const reset = useCallback(() => {
      cancelAnimation(borderProgress);
      setRemaining(seconds);
      setRunning(false);
      onRunningChange?.(timerId, false);
      widthScale.value = withTiming(1, {
        duration: DURATION_MS,
        easing: Easing.out(Easing.cubic),
      });
      borderProgress.value = withTiming(0, { duration: 300 });
    }, [seconds, onRunningChange, timerId, widthScale, borderProgress]);

    // Finaliza o timer: zera o estado e retrocede o anel até o início
    const finish = useCallback(() => {
      cancelAnimation(borderProgress);
      cancelAnimation(widthScale);
      lastPauseTapRef.current = 0;
      rewindUntilRef.current = Date.now() + REWIND_MS;
      setRemaining(seconds);
      setRunning(false);
      onRunningChange?.(timerId, false);
      widthScale.value = withTiming(1, {
        duration: DURATION_MS,
        easing: Easing.out(Easing.cubic),
      });
      borderProgress.value = withTiming(0, {
        duration: REWIND_MS,
        easing: Easing.out(Easing.cubic),
      });
    }, [seconds, onRunningChange, timerId, widthScale, borderProgress]);

    useEffect(() => {
      if (!running) return;
      if (remaining <= 0) {
        if (resetOnComplete) finish();
        else setRunning(false);
        onComplete?.();
        return;
      }
      const t = setInterval(() => setRemaining((r) => r - 1), 1000);
      return () => clearInterval(t);
    }, [running, remaining, onComplete, resetOnComplete, finish]);

    const pause = useCallback(() => {
      cancelAnimation(borderProgress);
      setRunning(false);
      onRunningChange?.(timerId, false);
    }, [onRunningChange, timerId, borderProgress]);

    useImperativeHandle(
      ref,
      () => ({
        start() {
          if (remaining > 0) {
            setRunning(true);
            onRunningChange?.(timerId, true);
          }
        },
        reset,
        pause,
      }),
      [remaining, onRunningChange, timerId, reset, pause],
    );

    const toggle = () => {
      // Primeiro toque pausa; segundo toque logo em seguida finaliza o timer
      const now = Date.now();
      // Ignora toques enquanto o anel retrocede, para não reiniciar no meio da animação
      if (now < rewindUntilRef.current) return;
      if (
        onDoubleTap &&
        remaining > 0 &&
        now - lastPauseTapRef.current < DOUBLE_TAP_MS
      ) {
        finish();
        onDoubleTap();
        return;
      }
      lastPauseTapRef.current = onDoubleTap && running ? now : 0;
      onPressAction?.();
      if (remaining <= 0) reset();
      else {
        setRunning((r) => {
          const next = !r;
          if (r && !next) cancelAnimation(borderProgress);
          onRunningChange?.(timerId, next);
          return next;
        });
      }
    };

    const { width, height } = useWindowDimensions();
    const isLarge = size === "large";
    // Cresce com a tela (tablets inclusive), limitado pela altura para caber a
    // coluna de timers e pela largura para caber expandido (2x) enquanto roda
    const largeDimension = Math.min(
      width * 0.4,
      height * 0.28,
      (width - 48) / 2,
    );
    const dimension = isLarge ? largeDimension : largeDimension * 0.7;
    const fontSize = isLarge ? dimension * 0.45 : dimension * 0.22;
    const center = dimension / 2;
    const cornerRadius = dimension * 0.025;
    const outerRadius = center - dimension * 0.04 - cornerRadius;
    const innerRadius = outerRadius - dimension * 0.11 + cornerRadius * 2;
    const geometry = useMemo<SegmentGeometry>(() => {
      const step = 360 / SEGMENT_COUNT;
      const midRadius = (innerRadius + outerRadius) / 2;
      const inset =
        SEGMENT_GAP_DEG / 2 + (cornerRadius / midRadius) * (180 / Math.PI);
      return {
        center,
        innerRadius,
        outerRadius,
        midRadius,
        cornerRadius,
        step,
        inset,
        gap: (SEGMENT_GAP_DEG * Math.PI * midRadius) / 180,
      };
    }, [center, innerRadius, outerRadius, cornerRadius]);
    const segmentPaths = useMemo(
      () =>
        Array.from({ length: SEGMENT_COUNT }, (_, i) =>
          segmentPath(
            center,
            innerRadius,
            outerRadius,
            i * geometry.step + geometry.inset,
            (i + 1) * geometry.step - geometry.inset,
          ),
        ),
      [center, innerRadius, outerRadius, geometry],
    );

    const isExpandable = true;
    const hasBorderProgress = true;
    const animatedContainerStyle = useAnimatedStyle(() => {
      if (!isExpandable)
        return {
          width: dimension,
          height: dimension,
          borderRadius: dimension / 2,
        };
      const sizeVal = dimension * widthScale.value;
      return {
        width: sizeVal,
        height: sizeVal,
        borderRadius: sizeVal / 2,
      };
    }, [dimension, isExpandable]);

    const animatedContentStyle = useAnimatedStyle(() => {
      if (!isExpandable) return {};
      return {
        transform: [{ scale: widthScale.value }],
      };
    }, [isExpandable]);

    return (
      <TouchableOpacity
        onPress={toggle}
        onLongPress={reset}
        activeOpacity={0.8}
        style={styles.timerCircleWrapper}
      >
        <Animated.View
          style={[
            styles.timerCircleBase,
            {
              borderRadius: dimension / 2,
              borderWidth: hasBorderProgress ? 0 : 3,
              borderColor: colors.accent,
              backgroundColor: colors.surface,
            },
            animatedContainerStyle,
          ]}
        >
          {hasBorderProgress && (
            <Svg
              width="100%"
              height="100%"
              viewBox={`0 0 ${dimension} ${dimension}`}
              style={styles.progressRing}
            >
              {segmentPaths.map((d, i) => (
                <Path
                  key={`base-${i}`}
                  d={d}
                  fill={colors.border}
                  stroke={colors.border}
                  strokeWidth={cornerRadius * 2}
                  strokeLinejoin="round"
                />
              ))}
              {segmentPaths.map((_, i) => (
                <ProgressSegment
                  key={`fill-${i}`}
                  index={i}
                  geometry={geometry}
                  progress={borderProgress}
                  color={colors.accent}
                />
              ))}
              {segmentPaths.slice(1).map((_, i) => (
                <SegmentDrop
                  key={`drop-${i}`}
                  index={i}
                  geometry={geometry}
                  progress={borderProgress}
                  color={colors.accent}
                />
              ))}
            </Svg>
          )}
          <Animated.View
            style={[styles.timerContent, animatedContentStyle]}
            pointerEvents="none"
          >
            <Text
              style={[
                styles.timerValueBase,
                { fontFamily: "AlfaSlabOne", fontSize, color: colors.text },
              ]}
            >
              {remaining}
            </Text>
          </Animated.View>
        </Animated.View>
      </TouchableOpacity>
    );
  },
);

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  colors: ThemeColors;
}

function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  onConfirm,
  onCancel,
  colors,
}: ConfirmDialogProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <View style={styles.dialogOverlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} />
        <View
          style={[
            styles.dialogCard,
            { backgroundColor: colors.modalBackground, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.dialogTitle, { color: colors.text }]}>
            {title}
          </Text>
          <Text style={[styles.dialogMessage, { color: colors.textSecondary }]}>
            {message}
          </Text>
          <View style={styles.dialogActions}>
            <TouchableOpacity
              onPress={onCancel}
              activeOpacity={0.8}
              style={[styles.dialogButton, { backgroundColor: colors.surface }]}
            >
              <Text style={[styles.dialogButtonText, { color: colors.text }]}>
                Cancelar
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onConfirm}
              activeOpacity={0.85}
              style={[styles.dialogButton, { backgroundColor: colors.primary }]}
            >
              <Text
                style={[styles.dialogButtonText, { color: colors.background }]}
              >
                {confirmLabel}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const {
    colors,
    themeMode,
    toggleTheme,
    selectedAlarmId,
    secondaryTimerSeconds,
    scoreColumns,
    participantsByTeam,
  } = useApp();
  const [expandedTimer, setExpandedTimer] = useState<TimerId | null>(null);
  const [isAlarmPlaying, setIsAlarmPlaying] = useState<boolean>(false);
  const [turn, setTurn] = useState<Turn>(INITIAL_TURN);
  const [isRestartOrderConfirmOpen, setIsRestartOrderConfirmOpen] =
    useState(false);
  const timer30Ref = useRef<TimerCircleRef>(null);
  const timer15Ref = useRef<TimerCircleRef>(null);
  const alarmSoundRef = useRef<AudioPlayer | null>(null);

  const currentTurn = useMemo(
    () => getTurnPlayer(turn, scoreColumns, participantsByTeam),
    [turn, scoreColumns, participantsByTeam],
  );
  const currentPlayerName = currentTurn?.player ?? null;
  const hasPlayers = currentTurn !== null;
  const activeTeamsCount = getActiveTeams(scoreColumns, participantsByTeam).length;
  const isAtFirstTurn = isFirstTurn(turn, scoreColumns, participantsByTeam);
  // expandedTimer só fica definido enquanto algum timer está rodando
  const isRestartOrderDisabled =
    !hasPlayers || expandedTimer !== null || isAtFirstTurn;

  // Refs para os callbacks dos timers sempre usarem os times atuais.
  const teamsRef = useRef({ scoreColumns, participantsByTeam });
  teamsRef.current = { scoreColumns, participantsByTeam };
  const advanceTurn = useCallback(() => {
    const { scoreColumns: order, participantsByTeam: players } = teamsRef.current;
    setTurn((current) => nextTurn(current, order, players));
  }, []);

  const handleRestartTimers = useCallback(() => {
    setExpandedTimer(null);
    setTurn(INITIAL_TURN);
    timer30Ref.current?.reset();
    timer15Ref.current?.reset();
  }, []);

  const handlePreviousPlayer = useCallback(() => {
    setExpandedTimer(null);
    timer30Ref.current?.reset();
    timer15Ref.current?.reset();
    const { scoreColumns: order, participantsByTeam: players } = teamsRef.current;
    setTurn((current) => previousTurn(current, order, players));
  }, []);

  const stopAlarm = useCallback(async () => {
    try {
      const sound = alarmSoundRef.current;
      if (sound) {
        sound.pause();
        await sound.seekTo(0);
        sound.removeAllListeners("playbackStatusUpdate");
        sound.remove();
        alarmSoundRef.current = null;
      }
      setIsAlarmPlaying(false);
    } catch (e) {
      const err = e as { message?: string };
      console.warn("Erro ao parar alarme:", err?.message ?? e);
      setIsAlarmPlaying(false);
    }
  }, []);

  // Volta a vez para o primeiro jogador do primeiro time, seguindo a ordem da tela de times
  const handleRestartOrder = useCallback(() => {
    setIsRestartOrderConfirmOpen(false);
    setExpandedTimer(null);
    setTurn(INITIAL_TURN);
    timer30Ref.current?.reset();
    timer15Ref.current?.reset();
    void stopAlarm();
  }, [stopAlarm]);

  const playAlarm = useCallback(async () => {
    const source = ALARM_SOUNDS[selectedAlarmId] ?? ALARM_SOUNDS.alarm2;
    try {
      await stopAlarm();
      await setAudioModeAsync({
        playsInSilentMode: true,
        interruptionMode: "duckOthers",
        shouldPlayInBackground: false,
      });
      const sound = createAudioPlayer(source);
      alarmSoundRef.current = sound;
      setIsAlarmPlaying(true);
      sound.addListener("playbackStatusUpdate", (status) => {
        if (status.isLoaded && status.didJustFinish && !status.loop) {
          sound.removeAllListeners("playbackStatusUpdate");
          sound.remove();
          alarmSoundRef.current = null;
          setIsAlarmPlaying(false);
        }
      });
      sound.play();
    } catch (e) {
      const err = e as { message?: string };
      console.warn("Erro ao tocar alarme:", err?.message ?? e);
      Vibration.vibrate(ALARM_VIBRATION_PATTERN);
      setIsAlarmPlaying(false);
    }
  }, [stopAlarm, selectedAlarmId]);

  const playStartSound = useCallback(async () => {
    try {
      await setAudioModeAsync({
        playsInSilentMode: true,
        interruptionMode: "duckOthers",
        shouldPlayInBackground: false,
      });
      const sound = createAudioPlayer(START_SOUND);
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
      console.warn("Erro ao tocar start:", err?.message ?? e);
    }
  }, []);

  const handleRunningChange = useCallback(
    (timerId: TimerId, isRunning: boolean) => {
      if (isRunning) {
        setExpandedTimer(timerId);
      } else {
        setExpandedTimer(null);
      }
    },
    [],
  );

  const handle15sComplete = useCallback(() => {
    playStartSound();
    timer30Ref.current?.reset();
    timer30Ref.current?.start();
  }, [playStartSound]);

  const handleFinishTurn = useCallback(() => {
    timer15Ref.current?.reset();
    setExpandedTimer(null);
    advanceTurn();
  }, [advanceTurn]);

  const handle30sComplete = useCallback(() => {
    playAlarm();
    setExpandedTimer(null);
    advanceTurn();
  }, [playAlarm, advanceTurn]);

  const themedStyles = useMemo(
    () => ({
      container: {
        ...styles.containerBase,
        backgroundColor: colors.background,
      },
      topBarButton: {
        ...styles.topBarButtonBase,
        backgroundColor: colors.surface,
        borderColor: colors.border,
      },
      restartButton: {
        ...styles.timerControlButton,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.accent,
      },
      timerControlButtonText: {
        ...styles.timerControlButtonTextBase,
        color: colors.text,
      },
      stopAlarmButton: {
        ...styles.stopAlarmButtonBase,
        backgroundColor: colors.accent,
      },
      stopAlarmButtonText: { ...styles.stopAlarmButtonTextBase, color: "#fff" },
    }),
    [colors],
  );

  return (
    <View style={themedStyles.container}>
      <View style={styles.playerCalloutWrapper}>
        <Text
          style={[styles.playerCalloutLabel, { color: colors.textSecondary }]}
        >
          Agora na vez de
        </Text>
        <Text
          style={[styles.playerCalloutName, { color: colors.accent }]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {currentPlayerName ?? "—"}
        </Text>
        {!hasPlayers ? (
          <Text
            style={[styles.playerCalloutHint, { color: colors.textTertiary }]}
          >
            Adicione times e jogadores em Pontuações
          </Text>
        ) : activeTeamsCount < 2 ? (
          <Text
            style={[styles.playerCalloutHint, { color: colors.textTertiary }]}
          >
            Cadastre pelo menos 2 times com jogadores para alternar a vez
          </Text>
        ) : (
          <Text
            style={[styles.playerCalloutHint, { color: colors.textTertiary }]}
            numberOfLines={1}
          >
            {currentTurn.team}
          </Text>
        )}
      </View>

      <View style={styles.topBar}>
        <TouchableOpacity
          onPress={() => router.push("/alarm" as never)}
          activeOpacity={0.8}
          style={themedStyles.topBarButton}
        >
          <Feather name="volume-2" size={22} color={colors.text} />
        </TouchableOpacity>
        <TouchableOpacity
          style={themedStyles.topBarButton}
          onPress={() => router.push("/score" as never)}
          activeOpacity={0.8}
        >
          <Octicons name="trophy" size={20} color={colors.text} />
        </TouchableOpacity>
        <TouchableOpacity
          style={themedStyles.topBarButton}
          onPress={toggleTheme}
          activeOpacity={0.8}
        >
          <Feather
            name={themeMode === "dark" ? "sun" : "moon"}
            size={22}
            color={colors.text}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.timersRow}>
        <View style={styles.timerControlsRow}>
          <TouchableOpacity
            onPress={() => setIsRestartOrderConfirmOpen(true)}
            activeOpacity={0.8}
            disabled={isRestartOrderDisabled}
            style={[
              isRestartOrderDisabled && styles.timerControlButtonDisabled,
            ]}
          >
            <Ionicons name="play-skip-back" size={30} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handlePreviousPlayer}
            activeOpacity={0.8}
            disabled={!hasPlayers || isAtFirstTurn}
            style={[
              (!hasPlayers || isAtFirstTurn) &&
                styles.timerControlButtonDisabled,
            ]}
          >
            <Ionicons name="play-back" size={32} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleRestartTimers}
            activeOpacity={0.8}
            disabled={!expandedTimer}
            style={[!expandedTimer && styles.timerControlButtonDisabled]}
          >
            <Ionicons name="refresh" size={40} color={colors.text} />
          </TouchableOpacity>
        </View>
        <TimerCircle
          timerId="primary"
          ref={timer30Ref}
          seconds={PRIMARY_TIMER_SECONDS}
          size="large"
          expanded={expandedTimer === "primary"}
          onRunningChange={handleRunningChange}
          onComplete={handle30sComplete}
          resetOnComplete
          onPressAction={() => {
            timer15Ref.current?.reset();
            void stopAlarm();
          }}
          onDoubleTap={handleFinishTurn}
          colors={colors}
        />
        <View style={styles.secondaryTimerRow}>
          <TimerCircle
            timerId="secondary"
            ref={timer15Ref}
            seconds={secondaryTimerSeconds}
            size="small"
            expanded={expandedTimer === "secondary"}
            onRunningChange={handleRunningChange}
            onComplete={handle15sComplete}
            onPressAction={() => {
              timer30Ref.current?.reset();
            }}
            colors={colors}
          />
          <TouchableOpacity
            style={[
              styles.editTimerButton,
              {
                backgroundColor: colors.surface,
                position: "absolute",
                right: -60,
              },
            ]}
            onPress={() => router.push("/edit-time" as never)}
            activeOpacity={0.8}
          >
            <FontAwesome6 name="pen" size={20} color={colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity
        onPress={() => router.push("/teams" as never)}
        activeOpacity={0.85}
        style={[
          styles.teamsFab,
          { backgroundColor: colors.primary, shadowColor: "#000" },
        ]}
      >
        <FontAwesome6 name="chess-knight" size={22} color={colors.background} />
      </TouchableOpacity>

      <ConfirmDialog
        visible={isRestartOrderConfirmOpen}
        title="Reiniciar ordem?"
        message={`A vez volta para ${getTurnPlayer(INITIAL_TURN, scoreColumns, participantsByTeam)?.player ?? "o primeiro jogador"}, o primeiro da ordem definida em Times.`}
        confirmLabel="Reiniciar"
        onConfirm={handleRestartOrder}
        onCancel={() => setIsRestartOrderConfirmOpen(false)}
        colors={colors}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  containerBase: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  playerCalloutWrapper: {
    justifyContent: "center",
    alignItems: "flex-start",
    paddingHorizontal: 16,
    position: "absolute",
    top: 60,
    left: 20,
  },
  playerCalloutLabel: {
    fontSize: 16,
    marginBottom: 4,
  },
  playerCalloutName: {
    fontSize: 40,
    fontWeight: "700",
    textAlign: "center",
    maxWidth: "100%",
  },
  playerCalloutHint: {
    fontSize: 12,
    marginTop: 6,
    textAlign: "center",
  },
  topBar: {
    position: "absolute",
    top: 48,
    right: 24,
    zIndex: 10,
    flexDirection: "row",
    gap: 8,
  },
  topBarButtonBase: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  timersRow: {
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 24,
    marginBottom: 24,
  },
  secondaryTimerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    gap: 12,
  },
  editTimerButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  timerControlsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 28,
    marginBottom: 10,
  },
  timerControlButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  timerControlButtonTextBase: {
    fontWeight: "600",
    fontSize: 16,
  },
  timerControlButtonDisabled: {
    opacity: 0.5,
  },
  dialogOverlay: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
  },
  dialogCard: {
    width: "100%",
    maxWidth: 340,
    borderRadius: 24,
    borderWidth: 1,
    padding: 24,
  },
  dialogTitle: {
    fontSize: 20,
    fontWeight: "800",
  },
  dialogMessage: {
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
  },
  dialogActions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 24,
  },
  dialogButton: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  dialogButtonText: {
    fontSize: 15,
    fontWeight: "800",
  },
  stopAlarmButtonBase: {
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 24,
  },
  stopAlarmButtonTextBase: {
    fontWeight: "700",
    fontSize: 16,
  },
  timerCircleWrapper: {
    alignItems: "center",
    justifyContent: "center",
  },
  timerCircleBase: {
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  progressRing: {
    position: "absolute",
    top: 0,
    left: 0,
  },
  timerContent: {
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  timerValueBase: {
    fontFamily: "AlfaSlabOne",
    // fontWeight: "800",
  },
  teamsFab: {
    position: "absolute",
    right: 24,
    bottom: Platform.OS === "ios" ? 40 : 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 6,
  },
});
