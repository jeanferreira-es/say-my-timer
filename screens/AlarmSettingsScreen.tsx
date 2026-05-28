import { Ionicons } from "@expo/vector-icons";
import {
  createAudioPlayer,
  setAudioModeAsync,
  type AudioPlayer,
} from "expo-audio";
import { useRouter } from "expo-router";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { ALARM_OPTIONS, ALARM_SOUNDS, type AlarmId } from "../config/alarms";
import { useApp } from "../context/AppContext";

export default function AlarmSettingsScreen() {
  const router = useRouter();
  const { colors, selectedAlarmId, setSelectedAlarmId } = useApp();
  const [previewingId, setPreviewingId] = useState<AlarmId | null>(null);
  const previewSoundRef = useRef<AudioPlayer | null>(null);

  const stopPreview = useCallback(async () => {
    try {
      const sound = previewSoundRef.current;
      if (sound) {
        sound.pause();
        await sound.seekTo(0);
        sound.removeAllListeners("playbackStatusUpdate");
        sound.remove();
        previewSoundRef.current = null;
      }
      setPreviewingId(null);
    } catch {
      setPreviewingId(null);
    }
  }, []);

  const playPreview = useCallback(
    async (alarmId: AlarmId) => {
      const source = ALARM_SOUNDS[alarmId];
      try {
        await stopPreview();
        await setAudioModeAsync({
          playsInSilentMode: true,
          interruptionMode: "duckOthers",
          shouldPlayInBackground: false,
        });
        setPreviewingId(alarmId);
        const sound = createAudioPlayer(source);
        previewSoundRef.current = sound;
        sound.addListener("playbackStatusUpdate", (status) => {
          if (status.isLoaded && status.didJustFinish && !status.loop) {
            sound.removeAllListeners("playbackStatusUpdate");
            sound.remove();
            previewSoundRef.current = null;
            setPreviewingId(null);
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
      void stopPreview();
    };
  }, [stopPreview]);

  const handleGoBack = useCallback(async () => {
    await stopPreview();
    router.back();
  }, [router, stopPreview]);

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
      listContent: { ...styles.listContentBase, paddingBottom: 40 },
      optionCard: {
        ...styles.optionCardBase,
        backgroundColor: colors.card,
        borderColor: colors.border,
      },
      optionRow: { ...styles.optionRowBase },
      optionText: { ...styles.optionTextBase, color: colors.text },
      optionHint: { ...styles.optionHintBase, color: colors.textSecondary },
      previewButton: {
        ...styles.previewButtonBase,
        backgroundColor: colors.accent,
      },
      previewButtonStop: { backgroundColor: colors.primary },
      radioOuter: { ...styles.radioOuterBase, borderColor: colors.border },
      radioOuterSelected: { borderColor: colors.accent },
      radioInner: { ...styles.radioInnerBase, backgroundColor: colors.accent },
    }),
    [colors],
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
        <Text style={themedStyles.title}>Som do alarme</Text>
      </View>

      <ScrollView
        contentContainerStyle={themedStyles.listContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={themedStyles.subtitle}>
          Escolha o som tocado ao finalizar o cronometro de 30 segundos.
        </Text>
        {ALARM_OPTIONS.map((option) => {
          const isSelected = selectedAlarmId === option.id;
          const isPreviewing = previewingId === option.id;

          return (
            <TouchableOpacity
              key={option.id}
              style={[
                themedStyles.optionCard,
                isSelected && { backgroundColor: colors.surface },
              ]}
              activeOpacity={0.8}
              onPress={() => setSelectedAlarmId(option.id)}
            >
              <View style={themedStyles.optionRow}>
                <View
                  style={[
                    themedStyles.radioOuter,
                    isSelected && themedStyles.radioOuterSelected,
                  ]}
                >
                  {isSelected && <View style={themedStyles.radioInner} />}
                </View>

                <View style={styles.optionTextWrapper}>
                  <Text style={themedStyles.optionText}>{option.label}</Text>
                  <Text style={themedStyles.optionHint}>
                    {isSelected ? "Selecionado" : "Toque para selecionar"}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[
                    themedStyles.previewButton,
                    isPreviewing && themedStyles.previewButtonStop,
                  ]}
                  activeOpacity={0.8}
                  onPress={() => {
                    if (isPreviewing) {
                      void stopPreview();
                      return;
                    }
                    void playPreview(option.id);
                  }}
                >
                  <Ionicons
                    name={isPreviewing ? "stop" : "play"}
                    size={20}
                    color="#fff"
                  />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
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
  headerText: {
    flex: 1,
  },
  titleBase: {
    fontSize: 24,
    fontWeight: "700",
  },
  subtitleBase: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 6,
  },
  listContentBase: {
    padding: 20,
    gap: 12,
  },
  optionCardBase: {
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  optionRowBase: {
    flexDirection: "row",
    alignItems: "center",
  },
  optionTextWrapper: {
    flex: 1,
    marginLeft: 14,
    marginRight: 12,
  },
  optionTextBase: {
    fontSize: 16,
    fontWeight: "600",
  },
  optionHintBase: {
    fontSize: 13,
    marginTop: 4,
  },
  previewButtonBase: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  radioOuterBase: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  radioInnerBase: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
});
