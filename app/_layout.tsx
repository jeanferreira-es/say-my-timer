import { AppProvider, useApp } from "@/context/AppContext";
import { useFonts } from "@expo-google-fonts/alfa-slab-one";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";

export { ErrorBoundary } from "expo-router";

export const unstable_settings = {
  initialRouteName: "index",
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
    AlfaSlabOne: require("../assets/fonts/AlfaSlabOne-Regular.ttf"),
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return <RootLayoutNav />;
}

function ThemeStatusBar() {
  const { themeMode } = useApp();
  const style = themeMode === "dark" ? "light" : "dark";
  return <StatusBar style={style} animated={true} hidden />;
}

function RootLayoutNav() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppProvider>
        <ThemeStatusBar />
        <Stack>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="teams" options={{ headerShown: false }} />
          <Stack.Screen name="alarm" options={{ headerShown: false }} />
          <Stack.Screen name="score" options={{ headerShown: false }} />
          <Stack.Screen name="draw" options={{ headerShown: false }} />
          <Stack.Screen name="edit-time" options={{ headerShown: false }} />
          <Stack.Screen name="modal" options={{ presentation: "modal" }} />
        </Stack>
      </AppProvider>
    </GestureHandlerRootView>
  );
}
