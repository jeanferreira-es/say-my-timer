import { AppSplash } from "@/components/AppSplash";
import { AppProvider, useApp } from "@/context/AppContext";
import { useFonts } from "@expo-google-fonts/alfa-slab-one";
import { Feather, Ionicons } from "@expo/vector-icons";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
  type Theme,
} from "@react-navigation/native";
import { Stack, useRouter } from "expo-router";
import * as ScreenOrientation from "expo-screen-orientation";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import { useEffect, useMemo, useState } from "react";
import {
  Animated,
  Appearance,
  Dimensions,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "react-native-reanimated";

export { ErrorBoundary } from "expo-router";

export const unstable_settings = {
  initialRouteName: "index",
};

SplashScreen.preventAutoHideAsync();

// Só tablets giram (pontuação ao lado dos timers); celulares ficam em retrato
const screen = Dimensions.get("screen");
if (Math.min(screen.width, screen.height) < 600) {
  ScreenOrientation.lockAsync(
    ScreenOrientation.OrientationLock.PORTRAIT_UP,
  ).catch(() => {});
}

const SPLASH_FADE_MS = 250;

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
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [loaded]);

  if (!loaded) {
    return <AppSplash />;
  }

  return <RootLayoutNav />;
}

function ThemeStatusBar() {
  const { themeMode } = useApp();
  const style = themeMode === "dark" ? "light" : "dark";
  return <StatusBar style={style} animated={true} hidden />;
}

// Fundo nativo, teclado e alertas seguem o tema do app, não o do sistema
function NativeThemeSync() {
  const { colors, themeMode } = useApp();
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colors.background).catch(() => {});
    Appearance.setColorScheme(themeMode);
  }, [colors.background, themeMode]);
  return null;
}

// Cobre o app com a splash até o tema salvo carregar e depois some suavemente,
// em vez de trocar de cor de uma vez
function SplashOverlay() {
  const { isHydrated } = useApp();
  const [opacity] = useState(() => new Animated.Value(1));
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (!isHydrated) return;
    Animated.timing(opacity, {
      toValue: 0,
      duration: SPLASH_FADE_MS,
      useNativeDriver: true,
    }).start(() => setVisible(false));
  }, [isHydrated, opacity]);

  if (!visible) return null;
  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { opacity }]}
    >
      <AppSplash />
    </Animated.View>
  );
}

function HeaderBackButton({ color }: { color: string }) {
  const router = useRouter();
  return (
    <TouchableOpacity
      onPress={() => router.back()}
      hitSlop={12}
      activeOpacity={0.6}
    >
      <Feather name="arrow-left" size={24} color={color} />
    </TouchableOpacity>
  );
}

// Definidos aqui, e não na tela, para já entrarem junto com a animação
function TeamsHeaderActions() {
  const router = useRouter();
  const { colors } = useApp();
  return (
    <View style={styles.headerActions}>
      <TouchableOpacity
        activeOpacity={0.6}
        hitSlop={8}
        onPress={() => router.push("/players")}
      >
        <Ionicons name="people-outline" size={24} color={colors.text} />
      </TouchableOpacity>
      <TouchableOpacity
        activeOpacity={0.6}
        hitSlop={8}
        onPress={() => router.push("/draw")}
      >
        <Ionicons name="dice-outline" size={24} color={colors.text} />
      </TouchableOpacity>
    </View>
  );
}

// Header nativo do Stack: título centralizado, seta simples e sem sombra
function ThemedStack() {
  const { colors, themeMode } = useApp();
  // Sem isso a navegação usa o tema claro padrão, que aparece nas transições
  const navigationTheme = useMemo<Theme>(() => {
    const base = themeMode === "dark" ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        primary: colors.primary,
        background: colors.background,
        card: colors.background,
        text: colors.text,
        border: colors.border,
      },
    };
  }, [colors, themeMode]);

  return (
    <ThemeProvider value={navigationTheme}>
      <Stack
        screenOptions={{
          headerTitleAlign: "center",
          headerShadowVisible: false,
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.text,
          headerTitleStyle: { fontSize: 18, fontWeight: "500" },
          headerBackButtonDisplayMode: "minimal",
          headerLeft: ({ canGoBack }) =>
            canGoBack ? <HeaderBackButton color={colors.text} /> : null,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen
          name="teams"
          options={{
            title: "Times",
            headerRight: () => <TeamsHeaderActions />,
          }}
        />
        <Stack.Screen
          name="team-settings"
          options={({ route }) => ({
            title: (route.params as { team?: string } | undefined)?.team || "Time",
          })}
        />
        <Stack.Screen name="alarm" options={{ title: "Som do alarme" }} />
        <Stack.Screen name="score" options={{ title: "Pontuações" }} />
        <Stack.Screen name="history" options={{ title: "Histórico" }} />
        <Stack.Screen name="draw" options={{ title: "Sortear" }} />
        <Stack.Screen name="players" options={{ title: "Jogadores" }} />
        <Stack.Screen
          name="edit-time"
          options={{ title: "Tempo de preparação" }}
        />
        <Stack.Screen name="modal" options={{ presentation: "modal" }} />
      </Stack>
    </ThemeProvider>
  );
}

function RootLayoutNav() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppProvider>
        <ThemeStatusBar />
        <NativeThemeSync />
        <ThemedStack />
        <SplashOverlay />
      </AppProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
  },
});
