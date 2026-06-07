import { useApp } from "@/context/AppContext";
import { FontAwesome6, Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import React from "react";
import { Dimensions, Platform, View } from "react-native";

export const unstable_settings = {
  initialRouteName: "index",
};

export default function TabLayout() {
  const { colors } = useApp();

  return (
    <Tabs
      initialRouteName="index"
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: colors.text,
        tabBarInactiveTintColor: colors.textTertiary,
        animation: "shift",
        tabBarStyle: {
          position: "absolute",
          marginHorizontal: 20,
          marginLeft: Dimensions.get("window").width / 2 - 100,
          marginBottom: Platform.OS === "ios" ? 24 : 15,
          height: 60,
          width: "50%",
          borderRadius: 30,
          backgroundColor: colors.surface,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.08,
          shadowRadius: 16,
          elevation: 4,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Timer",
          tabBarIcon: ({ focused, size }) => (
            <View
              style={{
                width: 94,
                height: 52,
                marginTop: 20,
                borderRadius: 30,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: focused ? colors.primary : colors.card,
              }}
            >
              <Ionicons
                name="game-controller-outline"
                size={size + 2}
                color={focused ? colors.background : colors.textTertiary}
              />
            </View>
          ),
        }}
      />

      <Tabs.Screen
        name="two"
        options={{
          title: "Teams",
          tabBarIcon: ({ focused, size }) => (
            <View
              style={{
                width: 95,
                height: 52,
                marginTop: 20,
                borderRadius: 30,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: focused ? colors.primary : colors.card,
              }}
            >
              <FontAwesome6
                name="chess-knight"
                size={size}
                color={focused ? colors.background : colors.textTertiary}
              />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}
