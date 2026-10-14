import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, useColorScheme, useWindowDimensions, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import Account from './demos/account';
import Cart from './demos/cart';
import Transfer from './demos/transfer';

// The demos, a tap apart, in the phone's own theme or in light or dark. On a wide screen (a computer's browser) the
// demo sits in a phone-sized card.
const DEMOS = [
  { name: 'Account', Screen: Account },
  { name: 'Cart', Screen: Cart },
  { name: 'Transfer', Screen: Transfer },
];

type Theme = 'auto' | 'light' | 'dark';
const NEXT: Record<Theme, Theme> = { auto: 'light', light: 'dark', dark: 'auto' };
const LABEL: Record<Theme, string> = { auto: 'Auto', light: 'Light', dark: 'Dark' };

export default function App() {
  const system = useColorScheme();
  const [at, setAt] = useState(0);
  const [theme, setTheme] = useState<Theme>('auto');
  const scheme = theme === 'auto' ? (system === 'dark' ? 'dark' : 'light') : theme;
  const c = scheme === 'dark' ? DARK : LIGHT;
  const { Screen } = DEMOS[at];
  const wide = useWindowDimensions().width > 560;

  return (
    <GestureHandlerRootView style={[styles.fill, { backgroundColor: c.page }]}>
      <SafeAreaProvider>
        <SafeAreaView edges={['top']} style={[styles.column, wide && styles.narrow]}>
          <View style={[styles.bar, wide && styles.barWide]}>
            {DEMOS.map((demo, i) => (
              <Pressable
                key={demo.name}
                accessibilityRole="tab"
                accessibilityState={{ selected: i === at }}
                onPress={() => setAt(i)}
                style={[styles.chip, { backgroundColor: i === at ? c.ink : c.chip }]}>
                <Text style={[styles.chipText, { color: i === at ? c.onInk : c.text }]}>{demo.name}</Text>
              </Pressable>
            ))}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Theme: ${LABEL[theme]}`}
              onPress={() => setTheme(NEXT[theme])}
              style={[styles.chip, styles.theme, { backgroundColor: c.chip }]}>
              <Text style={[styles.chipText, { color: c.text }]}>{LABEL[theme]}</Text>
            </Pressable>
          </View>
        </SafeAreaView>
        <View style={[styles.fill, styles.column, wide && [styles.card, { borderColor: c.line }]]}>
          <Screen key={at} scheme={scheme} />
        </View>
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const LIGHT = { page: '#E9EAED', chip: '#DCDDE2', text: '#3A3D45', ink: '#0C0D10', onInk: '#FFFFFF', line: 'rgba(12,13,16,0.08)' };
const DARK = { page: '#000000', chip: '#1C1D21', text: '#C9CCD3', ink: '#F2F3F5', onInk: '#0C0D10', line: 'rgba(255,255,255,0.1)' };

const styles = StyleSheet.create({
  fill: { flex: 1 },
  column: { width: '100%', maxWidth: 480, alignSelf: 'center' },
  narrow: { maxWidth: 390 },
  barWide: { paddingHorizontal: 0, paddingTop: 16 },
  card: {
    maxWidth: 390,
    maxHeight: 844,
    marginBottom: 20,
    borderRadius: 32,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 12 },
  },
  bar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, paddingVertical: 10 },
  chip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999 },
  chipText: { fontSize: 14, fontWeight: '600' },
  theme: { marginLeft: 'auto' },
});
