import type { NativeStackScreenProps } from '@react-navigation/native-stack';

export type RootStackParamList = {
  Home: undefined;
  Pontuações: undefined;
  Alarme: undefined;
  EditarTempo: undefined;
};

export type HomeScreenProps = NativeStackScreenProps<RootStackParamList, 'Home'>;
export type ScoresScreenProps = NativeStackScreenProps<RootStackParamList, 'Pontuações'>;
export type AlarmScreenProps = NativeStackScreenProps<RootStackParamList, 'Alarme'>;
export type TimeEditorScreenProps = NativeStackScreenProps<RootStackParamList, 'EditarTempo'>;
