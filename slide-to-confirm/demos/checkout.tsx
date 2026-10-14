import { StyleSheet, Text, View } from 'react-native';

import { SlideToConfirm } from '../components/slide-to-confirm';
import type { Scheme } from '../lib/use-scheme';

const COLORS = {
  light: { page: '#F5F5F3', card: '#FFFFFF', text: '#0C0D10', muted: '#6E7179', line: 'rgba(12,13,16,0.07)', art: '#D9DCE3', artInk: '#3A3D45' },
  dark: { page: '#0B0B0D', card: '#151619', text: '#F2F3F5', muted: '#8E929A', line: 'rgba(255,255,255,0.07)', art: '#24262B', artInk: '#C9CCD3' },
} as const;

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** A payment that waits for the slide, with a short "processing" before it's paid. */
export default function Checkout({ scheme = 'light' }: { scheme?: Scheme }) {
  const c = COLORS[scheme];

  return (
    <View style={[styles.page, { backgroundColor: c.page }]}>
      <View style={styles.top}>
        <Text style={[styles.title, { color: c.text }]}>Checkout</Text>
        <Text style={[styles.subtitle, { color: c.muted }]}>1 item · ships in 2 days</Text>

        <View style={[styles.card, { backgroundColor: c.card, borderColor: c.line }]}>
          <View style={styles.item}>
            <View style={[styles.art, { backgroundColor: c.art }]}>
              <View style={[styles.band, { borderColor: c.artInk }]} />
            </View>
            <View style={styles.itemText}>
              <Text style={[styles.itemName, { color: c.text }]}>Studio Headphones</Text>
              <Text style={[styles.itemMeta, { color: c.muted }]}>Graphite · Qty 1</Text>
            </View>
            <Text style={[styles.itemPrice, { color: c.text }]}>$249.00</Text>
          </View>

          <View style={[styles.rule, { backgroundColor: c.line }]} />
          <Row label="Subtotal" value="$249.00" color={c.muted} />
          <Row label="Shipping" value="Free" color={c.muted} />
          <Row label="Total" value="$249.00" color={c.text} strong />
        </View>

        <View style={[styles.card, styles.pay, { backgroundColor: c.card, borderColor: c.line }]}>
          <View style={[styles.cardGlyph, { borderColor: c.muted }]}>
            <View style={[styles.cardStripe, { backgroundColor: c.muted }]} />
          </View>
          <Text style={[styles.payText, { color: c.text }]}>Card ending 4242</Text>
          <Text style={[styles.payChange, { color: c.muted }]}>Change</Text>
        </View>
      </View>

      <View style={styles.bottom}>
        <SlideToConfirm
          scheme={scheme}
          label="Slide to pay $249.00"
          doneLabel="Paid"
          onConfirm={() => wait(1500)}
        />
        <Text style={[styles.note, { color: c.muted }]}>Nothing is charged until you slide.</Text>
      </View>
    </View>
  );
}

function Row({ label, value, color, strong }: { label: string; value: string; color: string; strong?: boolean }) {
  const weight = strong ? '700' : '500';
  return (
    <View style={styles.row}>
      <Text style={[styles.rowText, { color, fontWeight: weight }]}>{label}</Text>
      <Text style={[styles.rowText, { color, fontWeight: weight }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, paddingHorizontal: 20, paddingTop: 72, paddingBottom: 34, justifyContent: 'space-between' },
  top: { gap: 14 },
  title: { fontSize: 30, fontWeight: '700', letterSpacing: -0.6 },
  subtitle: { fontSize: 15, marginTop: -8, marginBottom: 4 },
  card: { borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, padding: 16, gap: 10 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  art: { width: 56, height: 56, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  band: { width: 30, height: 26, borderWidth: 3, borderBottomWidth: 0, borderTopLeftRadius: 15, borderTopRightRadius: 15 },
  itemText: { flex: 1, gap: 2 },
  itemName: { fontSize: 16, fontWeight: '600' },
  itemMeta: { fontSize: 13 },
  itemPrice: { fontSize: 16, fontWeight: '600', fontVariant: ['tabular-nums'] },
  rule: { height: StyleSheet.hairlineWidth, marginVertical: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  rowText: { fontSize: 15, fontVariant: ['tabular-nums'] },
  pay: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardGlyph: { width: 34, height: 24, borderRadius: 5, borderWidth: 1.5, justifyContent: 'center' },
  cardStripe: { height: 3, marginHorizontal: -1, opacity: 0.6 },
  payText: { flex: 1, fontSize: 15, fontWeight: '500' },
  payChange: { fontSize: 14, fontWeight: '500' },
  bottom: { gap: 12 },
  note: { fontSize: 13, textAlign: 'center' },
});
