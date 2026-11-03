import type { ComponentProps } from "react";
import type { Ionicons } from "@expo/vector-icons";

export type TeamIconName = ComponentProps<typeof Ionicons>["name"];

export interface TeamTheme {
  // Do canto inferior esquerdo (claro) ao superior direito (saturado)
  gradient: readonly [string, string];
  icon: TeamIconName;
}

// Escolha feita nas configurações do time; sem ela, vale o padrão da posição
export interface TeamStyle {
  gradientIndex: number;
  icon: TeamIconName;
}

// Cores claras o bastante para texto escuro em qualquer tema do app
export const TEAM_GRADIENTS: readonly (readonly [string, string])[] = [
  ["#C9DDFF", "#6C74EE"],
  ["#FCE0EE", "#D86BD3"],
  ["#D8F7C8", "#5CC7A8"],
  ["#FFE7B8", "#FF8A5C"],
  ["#C8F3FF", "#4AA6E6"],
  ["#EADBFF", "#9161EE"],
  ["#FFD9D9", "#EF5B6B"],
  ["#FFF6BF", "#F2B632"],
];

export const TEAM_ICONS: readonly TeamIconName[] = [
  "planet",
  "trophy",
  "leaf",
  "flame",
  "rocket",
  "diamond",
  "flash",
  "star",
  "heart",
  "football",
  "musical-notes",
  "paw",
  // Filmes e séries
  "glasses", // Harry Potter
  "color-wand", // magia
  "train", // Expresso de Hogwarts
  "eye", // O Senhor dos Anéis
  "skull", // Piratas do Caribe
  "flask", // Breaking Bad
  "pizza", // Tartarugas Ninja
  "cafe", // Friends
  "boat", // Titanic
  "fish", // Procurando Nemo
  "bug", // Vida de Inseto
  "dice", // Jumanji
  "balloon", // It: A Coisa
  "car-sport", // Velozes e Furiosos
  "hourglass", // De Volta para o Futuro
  "telescope", // Interestelar
  "moon", // E.T.
  "snow", // Frozen / Game of Thrones
  "rose", // A Bela e a Fera
  "umbrella", // Resident Evil
  "medkit", // Grey's Anatomy
  "hammer", // Thor
  "magnet", // X-Men
  "shield", // super-heróis
  "infinite", // Vingadores
  "game-controller", // Stranger Things
  "bonfire", // Lost / Survivor
  "nuclear", // Chernobyl / Os Simpsons
  "film",
  // Símbolos
  "triangle", // Round 6
  "ellipse", // Round 6
  "square", // Round 6
  "prism",
  "cube",
  "sparkles",
  "key",
];

export const TEAM_CARD_TEXT = "#16161D";

export function defaultTeamStyle(teamIndex: number): TeamStyle {
  return {
    gradientIndex: teamIndex % TEAM_GRADIENTS.length,
    icon: TEAM_ICONS[teamIndex % 6],
  };
}

export function teamTheme(teamIndex: number, style?: TeamStyle): TeamTheme {
  const { gradientIndex, icon } = style ?? defaultTeamStyle(teamIndex);
  return { gradient: TEAM_GRADIENTS[gradientIndex], icon };
}
