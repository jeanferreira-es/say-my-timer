export type AlarmId =
  | 'alarm2'
  | 'alarm3'
  | 'alarm4'
  | 'alarm5'
  | 'alarm6'
  | 'alarm7'
  | 'alarm8'
  | 'alarm9'
  | 'alarm10'
  | 'alarm11'
  | 'alarm12';

export const DEFAULT_ALARM_ID: AlarmId = 'alarm2';

export const ALARM_SOUNDS: Record<AlarmId, number> = {
  alarm2: require('../assets/audio/alarm2.wav'),
  alarm3: require('../assets/audio/alarm3.wav'),
  alarm4: require('../assets/audio/alarm4.wav'),
  alarm5: require('../assets/audio/alarm5.wav'),
  alarm6: require('../assets/audio/alarm6.wav'),
  alarm7: require('../assets/audio/alarm7.wav'),
  alarm8: require('../assets/audio/alarm8.wav'),
  alarm9: require('../assets/audio/alarm9.wav'),
  alarm10: require('../assets/audio/alarm10.wav'),
  alarm11: require('../assets/audio/alarm11.wav'),
  alarm12: require('../assets/audio/alarm12.wav'),
};

export const ALARM_OPTIONS = (Object.keys(ALARM_SOUNDS) as AlarmId[]).map((id) => ({
  id,
  label: `Alarme ${id.replace('alarm', '')}`,
}));
