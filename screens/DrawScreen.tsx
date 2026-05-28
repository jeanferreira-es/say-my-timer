import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useMemo } from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { useApp } from "../context/AppContext";

export default function DrawScreen() {
  const router = useRouter();
  const { colors } = useApp();

  const handleGoBack = useCallback(async () => {
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
        Escolha os participantes pressionando sobre a tela até que reste apenas
        um participante.
      </Text>
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
