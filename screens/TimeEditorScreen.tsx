import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useApp } from "../context/AppContext";

const MIN_SECONDS = 1;
const MAX_SECONDS = 999;

export default function TimeEditorScreen() {
  const router = useRouter();
  const { colors, secondaryTimerSeconds, setSecondaryTimerSeconds } = useApp();
  const [value, setValue] = useState(String(secondaryTimerSeconds));

  useEffect(() => {
    setValue(String(secondaryTimerSeconds));
  }, [secondaryTimerSeconds]);

  const parsedValue = Number(value);
  const sanitizedValue = Number.isFinite(parsedValue)
    ? Math.floor(parsedValue)
    : NaN;
  const isValid =
    Number.isInteger(sanitizedValue) &&
    sanitizedValue >= MIN_SECONDS &&
    sanitizedValue <= MAX_SECONDS;

  const handleSave = useCallback(() => {
    if (!isValid) return;
    setSecondaryTimerSeconds(sanitizedValue);
    router.back();
  }, [isValid, router, sanitizedValue, setSecondaryTimerSeconds]);

  const themedStyles = useMemo(
    () => ({
      container: {
        ...styles.containerBase,
        backgroundColor: colors.background,
      },
      backButton: {
        ...styles.backButtonBase,
        borderColor: colors.border,
        backgroundColor: colors.surface,
      },
      title: { ...styles.titleBase, color: colors.text },
      subtitle: { ...styles.subtitleBase, color: colors.textSecondary },
      card: {
        ...styles.cardBase,
        backgroundColor: colors.card,
        borderColor: colors.border,
      },
      label: { ...styles.labelBase, color: colors.textSecondary },
      input: {
        ...styles.inputBase,
        backgroundColor: colors.inputBg,
        borderColor:
          isValid || value.length === 0 ? colors.inputBorder : colors.accent,
        color: colors.text,
      },
      helper: { ...styles.helperBase, color: colors.textSecondary },
      error: { ...styles.errorBase, color: colors.accent },
      saveButton: {
        ...styles.saveButtonBase,
        backgroundColor: isValid ? colors.accent : colors.border,
      },
      saveButtonText: { ...styles.saveButtonTextBase, color: "#fff" },
    }),
    [colors, isValid, value.length],
  );

  return (
    <KeyboardAvoidingView
      style={themedStyles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.header}>
        <TouchableOpacity
          style={themedStyles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={themedStyles.title}>Tempo de preparação</Text>
      </View>

      <View style={styles.content}>
        <Text style={themedStyles.subtitle}>
          Defina quantos segundos o timer menor deve ter antes de iniciar o
          cronometro de 30 segundos.
        </Text>

        <View style={themedStyles.card}>
          <Text style={themedStyles.label}>Segundos</Text>
          <TextInput
            style={themedStyles.input}
            value={value}
            onChangeText={(text) => setValue(text.replace(/[^0-9]/g, ""))}
            keyboardType="number-pad"
            maxLength={3}
            placeholder="15"
            placeholderTextColor={colors.placeholder}
          />
          <Text style={themedStyles.helper}>
            Valor permitido: entre {MIN_SECONDS} e {MAX_SECONDS} segundos.
          </Text>
          {!isValid && value.length > 0 ? (
            <Text style={themedStyles.error}>Digite um numero valido.</Text>
          ) : null}
        </View>

        <TouchableOpacity
          style={themedStyles.saveButton}
          onPress={handleSave}
          activeOpacity={0.8}
          disabled={!isValid}
        >
          <Text style={themedStyles.saveButtonText}>Salvar</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  containerBase: {
    flex: 1,
  },
  header: {
    paddingTop: 56,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
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
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 24,
  },
  titleBase: {
    fontSize: 28,
    fontWeight: "700",
  },
  subtitleBase: {
    fontSize: 15,
    lineHeight: 22,
    marginTop: 8,
    marginBottom: 24,
  },
  cardBase: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 18,
  },
  labelBase: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 10,
  },
  inputBase: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 26,
    fontWeight: "700",
  },
  helperBase: {
    fontSize: 13,
    marginTop: 10,
  },
  errorBase: {
    fontSize: 13,
    marginTop: 6,
    fontWeight: "600",
  },
  saveButtonBase: {
    marginTop: 24,
    minHeight: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  saveButtonTextBase: {
    fontSize: 16,
    fontWeight: "700",
  },
});
