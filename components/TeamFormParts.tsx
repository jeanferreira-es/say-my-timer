import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

import type { ThemeColors } from "@/context/AppContext";

export type SuggestPlayers = (query: string, exclude: string[]) => string[];
// Time em que o jogador já está (ignorando `exceptTeam`), ou null.
export type FindPlayerTeam = (
  playerName: string,
  exceptTeam?: string,
) => string | null;

interface FormErrorProps {
  colors: ThemeColors;
  message: string | null;
}

export function FormError({ colors, message }: FormErrorProps) {
  if (!message) return null;
  return (
    <Text style={[styles.formError, { color: colors.accent }]}>{message}</Text>
  );
}

interface PlayerSuggestionsProps {
  colors: ThemeColors;
  suggestions: string[];
  onSelect: (playerName: string) => void;
}

export function PlayerSuggestions({
  colors,
  onSelect,
  suggestions,
}: PlayerSuggestionsProps) {
  if (suggestions.length === 0) return null;

  return (
    <View style={styles.suggestionsList}>
      {suggestions.map((suggestion) => (
        <TouchableOpacity
          key={suggestion}
          onPress={() => onSelect(suggestion)}
          activeOpacity={0.8}
          style={[styles.suggestionChip, { borderColor: colors.primary }]}
        >
          <Ionicons name="time-outline" size={12} color={colors.primary} />
          <Text
            numberOfLines={1}
            style={[styles.suggestionChipText, { color: colors.text }]}
          >
            {suggestion}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const sharedStyles = StyleSheet.create({
  suggestionsList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 10,
  },
  suggestionChipText: {
    flexShrink: 1,
    fontSize: 13,
    fontWeight: "700",
  },
});

const styles = StyleSheet.create({
  ...sharedStyles,
  suggestionChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    maxWidth: "100%",
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  formError: {
    marginTop: 6,
    marginBottom: 6,
    fontSize: 13,
    fontWeight: "700",
  },
});
