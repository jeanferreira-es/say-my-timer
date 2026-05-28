import Colors from "@/constants/Colors";
import { FontAwesome6, Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import React from "react";
import { Dimensions, Platform, View } from "react-native";

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: "#111827",
        tabBarInactiveTintColor: "#9ca3af",
        animation: "shift",
        tabBarStyle: {
          position: "absolute",
          marginHorizontal: 20,
          marginLeft: Dimensions.get("window").width / 2 - 100,
          marginBottom: Platform.OS === "ios" ? 24 : 15,
          height: 60,
          width: "50%",
          borderRadius: 30,
          backgroundColor: Colors.light.BottomTabBg,
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
                width: 95,
                height: 52,
                marginTop: 20,
                borderRadius: 30,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: focused ? "#111827" : "#e5e7eb",
              }}
            >
              <Ionicons
                name="game-controller-outline"
                size={size + 2}
                color={
                  focused ? "white" : Colors.light.BottomTabItemSelected + "60"
                }
              />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="two"
        options={{
          title: "Teams",
          tabBarIcon: ({ color, size, focused }) => (
            <View
              style={{
                width: 95,
                height: 52,
                marginTop: 20,
                borderRadius: 30,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: focused ? "#111827" : "#e5e7eb",
              }}
            >
              <FontAwesome6
                name={"chess-knight"}
                size={size}
                color={
                  focused ? "white" : Colors.light.BottomTabItemSelected + "60"
                }
              />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}
