import { Ionicons } from "@expo/vector-icons";
import {
  createAudioPlayer,
  setAudioModeAsync,
  type AudioPlayer,
} from "expo-audio";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";
import { ALARM_OPTIONS, ALARM_SOUNDS, type AlarmId } from "../config/alarms";
import { type ThemeColors, useApp } from "../context/AppContext";

interface SoundBadgeProps {
  colors: ThemeColors;
  isSelected: boolean;
  isPlaying: boolean;
}

// Ícone à esquerda do card; pulsa enquanto a prévia toca
function SoundBadge({ colors, isPlaying, isSelected }: SoundBadgeProps) {
  const pulse = useSharedValue(1);

  useEffect(() => {
    if (isPlaying) {
      pulse.value = withRepeat(withTiming(0.4, { duration: 450 }), -1, true);
    } else {
      cancelAnimation(pulse);
      pulse.value = 1;
    }
  }, [isPlaying, pulse]);

  const pulseStyle = useAnimatedStyle(() => ({ opacity: pulse.value }));

  return (
    <View
      style={[
        styles.soundBadge,
        { backgroundColor: isSelected ? colors.accent : colors.background },
      ]}
    >
      <Animated.View style={pulseStyle}>
        <Ionicons
          name={isPlaying ? "volume-high" : "musical-note"}
          size={20}
          color={isSelected ? "#fff" : colors.textSecondary}
        />
      </Animated.View>
    </View>
  );
}

export default function AlarmSettingsScreen() {
  const { colors, selectedAlarmId, setSelectedAlarmId } = useApp();
  const [previewingId, setPreviewingId] = useState<AlarmId | null>(null);
  const previewSoundRef = useRef<AudioPlayer | null>(null);
  // Só a prévia pedida por último pode tocar, mesmo com toques rápidos seguidos
  const previewRequestRef = useRef(0);

  const stopPreview = useCallback(async () => {
    try {
      const sound = previewSoundRef.current;
      if (sound) {
        previewSoundRef.current = null;
        sound.removeAllListeners("playbackStatusUpdate");
        sound.pause();
        sound.remove();
      }
      setPreviewingId(null);
    } catch {
      setPreviewingId(null);
    }
  }, []);

  const playPreview = useCallback(
    async (alarmId: AlarmId) => {
      const requestId = ++previewRequestRef.current;
      try {
        await stopPreview();
        await setAudioModeAsync({
          playsInSilentMode: true,
          interruptionMode: "duckOthers",
          shouldPlayInBackground: false,
        });
        if (requestId !== previewRequestRef.current) return;
        setPreviewingId(alarmId);
        const sound = createAudioPlayer(ALARM_SOUNDS[alarmId]);
        previewSoundRef.current = sound;
        sound.addListener("playbackStatusUpdate", (status) => {
          if (status.isLoaded && status.didJustFinish && !status.loop) {
            sound.removeAllListeners("playbackStatusUpdate");
            sound.remove();
            if (previewSoundRef.current === sound) {
              previewSoundRef.current = null;
              setPreviewingId(null);
            }
          }
        });
        sound.play();
      } catch (e) {
        const err = e as { message?: string };
        console.warn("Erro ao ouvir preview:", err?.message ?? e);
        setPreviewingId(null);
      }
    },
    [stopPreview],
  );

  useEffect(() => {
    return () => {
      previewRequestRef.current++;
      void stopPreview();
    };
  }, [stopPreview]);

  // Um toque seleciona e toca a prévia; tocar de novo no que está tocando para
  const handlePress = useCallback(
    (alarmId: AlarmId) => {
      setSelectedAlarmId(alarmId);
      if (previewingId === alarmId) {
        previewRequestRef.current++;
        void stopPreview();
        return;
      }
      void playPreview(alarmId);
    },
    [playPreview, previewingId, setSelectedAlarmId, stopPreview],
  );

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Escolha o som tocado ao fim do cronômetro de 30 segundos. Toque em um
        som para ouvir.
      </Text>

      <View style={styles.optionsList} accessibilityRole="radiogroup">
        {ALARM_OPTIONS.map((option) => {
          const isSelected = selectedAlarmId === option.id;
          const isPlaying = previewingId === option.id;

          return (
            <TouchableOpacity
              key={option.id}
              activeOpacity={0.8}
              onPress={() => handlePress(option.id)}
              accessibilityRole="radio"
              accessibilityState={{ checked: isSelected }}
              accessibilityLabel={option.label}
              accessibilityHint={
                isPlaying
                  ? "Toque para parar a prévia"
                  : "Toque para selecionar e ouvir"
              }
              style={[
                styles.optionCard,
                {
                  backgroundColor: colors.surface,
                  borderColor: isSelected ? colors.accent : colors.border,
                },
              ]}
            >
              <SoundBadge
                colors={colors}
                isSelected={isSelected}
                isPlaying={isPlaying}
              />
              <Text
                style={[
                  styles.optionText,
                  { color: colors.text },
                  isSelected && styles.optionTextSelected,
                ]}
              >
                {option.label}
              </Text>
              {isPlaying ? (
                <Text style={[styles.playingHint, { color: colors.textTertiary }]}>
                  Tocando
                </Text>
              ) : null}
              <Ionicons
                name={isSelected ? "checkmark-circle" : "ellipse-outline"}
                size={24}
                color={isSelected ? colors.accent : colors.border}
              />
            </TouchableOpacity>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 40,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  optionsList: {
    gap: 10,
  },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  soundBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  optionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
  },
  optionTextSelected: {
    fontWeight: "700",
  },
  playingHint: {
    fontSize: 12,
    fontWeight: "600",
  },
});
