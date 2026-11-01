import * as SplashScreen from "expo-splash-screen";
import { StyleSheet, View } from "react-native";

import { AppIcon } from "./AppIcon";

// Matches the native splash in app.json (backgroundColor and imageWidth 200,
// where the stopwatch fills 61% of the image), so the handoff is seamless.
const SPLASH_BACKGROUND = "#072636";
const SPLASH_ICON_SIZE = 122;

export function AppSplash() {
  return (
    <View
      style={styles.container}
      onLayout={() => {
        SplashScreen.hideAsync().catch(() => {});
      }}
    >
      <AppIcon size={SPLASH_ICON_SIZE} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: SPLASH_BACKGROUND,
  },
});
