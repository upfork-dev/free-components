import { useColorScheme } from 'react-native';

export type Scheme = 'light' | 'dark';

/** The theme to draw in: the one asked for, or else the phone's own. */
export function useScheme(scheme?: Scheme): Scheme {
  const system = useColorScheme();
  return scheme ?? (system === 'dark' ? 'dark' : 'light');
}
