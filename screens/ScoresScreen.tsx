import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo } from "react";
import {
  LogBox,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { NestableScrollContainer } from "react-native-draggable-flatlist";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useApp } from "../context/AppContext";

const TOTAL_ROW_ID = "Total";
const DYNAMIC_WIDTH_COLUMN_LIMIT = 5;
const CONTENT_HORIZONTAL_PADDING = 20;
const PLACEHOLDER_COLUMN_COUNT = 4;
const PLACEHOLDER_COLUMNS = Array.from(
  { length: PLACEHOLDER_COLUMN_COUNT },
  (_, index) => index,
);

export default function ScoresScreen() {
  const { width: screenWidth } = useWindowDimensions();
  const router = useRouter();
  const { scores, scoreColumns, updateScore, colors } = useApp();

  useEffect(() => {
    LogBox.ignoreLogs([
      "ref.measureLayout must be called with a ref to a native component",
    ]);
  }, []);

  const inputRows = useMemo(
    () => scores.filter((row) => row.id !== TOTAL_ROW_ID),
    [scores],
  );

  const cellWidth = useMemo(() => {
    const columnsCount = scoreColumns.length || PLACEHOLDER_COLUMN_COUNT;
    if (columnsCount >= DYNAMIC_WIDTH_COLUMN_LIMIT) {
      return cellSize;
    }
    const availableWidth =
      screenWidth - CONTENT_HORIZONTAL_PADDING * 2 - firstColWidth;
    return Math.max(availableWidth / columnsCount, cellSize);
  }, [screenWidth, scoreColumns.length]);

  const totalsByColumn = useMemo(() => {
    const totals: Record<string, number> = {};
    scoreColumns.forEach((column) => {
      totals[column] = inputRows.reduce(
        (sum, row) => sum + (parseFloat(row.scores[column] ?? "") || 0),
        0,
      );
    });
    return totals;
  }, [inputRows, scoreColumns]);

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
      table: { ...styles.tableBase, borderColor: colors.border },
      headerRow: { ...styles.headerRowBase, backgroundColor: colors.surface },
      row: { ...styles.rowBase, borderTopColor: colors.border },
      cell: { ...styles.cellBase, backgroundColor: colors.card },
      cellHeader: { backgroundColor: colors.surface, minHeight: 44 },
      rowLabel: { backgroundColor: colors.surface },
      headerText: { ...styles.headerTextBase, color: colors.textSecondary },
      rowLabelText: { ...styles.rowLabelTextBase, color: colors.text },
      input: {
        ...styles.inputBase,
        color: colors.text,
        borderColor: colors.inputBorder,
        backgroundColor: colors.inputBg,
      },
      emptyText: { ...styles.emptyTextBase, color: colors.text },
    }),
    [colors],
  );

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={themedStyles.container}>
        <View style={themedStyles.header}>
          <TouchableOpacity
            style={themedStyles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={themedStyles.title}>Pontuações</Text>
          </View>
        </View>

        <NestableScrollContainer contentContainerStyle={styles.content}>
          <Text style={themedStyles.subtitle}>
            Gerencie a pontuação de cada time.
          </Text>

          <ScrollView
            horizontal
            contentContainerStyle={styles.scrollContent}
            showsHorizontalScrollIndicator={false}
          >
            <View style={themedStyles.table}>
              <View style={themedStyles.headerRow}>
                <View
                  style={[
                    themedStyles.cell,
                    styles.firstCol,
                    themedStyles.cellHeader,
                  ]}
                >
                  <Text style={themedStyles.headerText}></Text>
                </View>
                {scoreColumns.length === 0
                  ? PLACEHOLDER_COLUMNS.map((placeholder) => (
                      <View
                        key={placeholder}
                        style={[
                          themedStyles.cell,
                          themedStyles.cellHeader,
                          styles.placeholderCell,
                          { width: cellWidth },
                        ]}
                      />
                    ))
                  : scoreColumns.map((column) => (
                      <View
                        key={column}
                        style={[
                          themedStyles.cell,
                          themedStyles.cellHeader,
                          { width: cellWidth },
                        ]}
                      >
                        <Text style={themedStyles.headerText}>{column}</Text>
                      </View>
                    ))}
              </View>
              {inputRows.map((row) => (
                <View key={row.id} style={themedStyles.row}>
                  <View
                    style={[
                      themedStyles.cell,
                      styles.firstCol,
                      themedStyles.rowLabel,
                    ]}
                  >
                    <Text style={themedStyles.rowLabelText}>{row.id}</Text>
                  </View>
                  {scoreColumns.length === 0
                    ? PLACEHOLDER_COLUMNS.map((placeholder) => (
                        <View
                          key={placeholder}
                          style={[
                            themedStyles.cell,
                            styles.placeholderCell,
                            { width: cellWidth },
                          ]}
                        />
                      ))
                    : scoreColumns.map((column) => (
                        <View
                          key={column}
                          style={[themedStyles.cell, { width: cellWidth }]}
                        >
                          <TextInput
                            style={themedStyles.input}
                            value={row.scores[column] ?? ""}
                            onChangeText={(value) =>
                              updateScore(row.id, column, value)
                            }
                            placeholder="0"
                            placeholderTextColor={colors.placeholder}
                            keyboardType="numeric"
                          />
                        </View>
                      ))}
                </View>
              ))}
              <View style={themedStyles.row}>
                <View
                  style={[
                    themedStyles.cell,
                    styles.firstCol,
                    themedStyles.rowLabel,
                  ]}
                >
                  <Text style={themedStyles.rowLabelText}>
                    {TOTAL_ROW_ID}
                  </Text>
                </View>
                {scoreColumns.length === 0
                  ? PLACEHOLDER_COLUMNS.map((placeholder) => (
                      <View
                        key={placeholder}
                        style={[
                          themedStyles.cell,
                          styles.placeholderCell,
                          { width: cellWidth },
                        ]}
                      />
                    ))
                  : scoreColumns.map((column) => (
                      <View
                        key={column}
                        style={[themedStyles.cell, { width: cellWidth }]}
                      >
                        <Text style={themedStyles.rowLabelText}>
                          {totalsByColumn[column]}
                        </Text>
                      </View>
                    ))}
              </View>
            </View>
          </ScrollView>

          {scoreColumns.length === 0 ? (
            <Text style={[themedStyles.emptyText, styles.emptyTextSpacing]}>
              Cadastre um time na aba Times para começar a pontuar.
            </Text>
          ) : null}
        </NestableScrollContainer>
      </View>
    </GestureHandlerRootView>
  );
}

const cellSize = 72;
const firstColWidth = 64;

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
  content: {
    paddingTop: 24,
    paddingBottom: 32,
  },
  titleBase: {
    fontSize: 24,
    fontWeight: "700",
  },
  subtitleBase: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    flexDirection: "column",
  },
  tableBase: {
    borderWidth: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  headerRowBase: {
    flexDirection: "row",
  },
  rowBase: {
    flexDirection: "row",
    borderTopWidth: 1,
  },
  cellBase: {
    width: cellSize,
    minHeight: 48,
    padding: 6,
    justifyContent: "center",
  },
  firstCol: {
    width: firstColWidth,
    minWidth: firstColWidth,
  },
  headerTextBase: {
    fontWeight: "700",
    fontSize: 12,
  },
  rowLabelTextBase: {
    fontWeight: "600",
    fontSize: 14,
  },
  inputBase: {
    fontSize: 14,
    padding: 6,
    borderWidth: 1,
    borderRadius: 8,
    minHeight: 36,
  },
  emptyTextBase: {
    fontSize: 14,
    lineHeight: 20,
  },
  emptyTextSpacing: {
    paddingHorizontal: 20,
    marginTop: 12,
    marginBottom: 16,
  },
  placeholderCell: {
    opacity: 0.35,
  },
});
