# Morph Text

Text that changes beautifully, for React Native and Expo:

- **`MorphText`**: when a label changes ("Follow" → "Following"), the letters both strings share glide to their new
  places, removed letters leave, new ones rise in, and the width springs to fit.
- **`MorphNumber`**: digits roll like an odometer for prices, counters and balances, formatted by `Intl`.
- **`MorphButton`**: a pill whose label morphs while its width springs, through idle, loading, success and error.

No letter is ever drawn over another, widths never jump, and Persian and Arabic keep their joined letters.

React Native (Expo SDK 57): Reanimated 4, `react-native-svg`, `expo-haptics`. No Skia, no fonts to bundle.

[Live preview on UpFork](https://upfork.dev/products/morph-text-react-native), in a phone, with the mouse or your finger.

## Run the demo

This folder is a small Expo app (SDK 57) with the component's demos:

```bash
npm install
npx expo start
```

Press `w` to open it in your browser, or scan the QR code with Expo Go on your phone. The bar at the top switches
between the demos and the theme (the phone's own, light or dark).

## Install

Copy `components/morph-text/` and `lib/use-scheme.ts` into your app, keeping the two folders side by side (the
components import `../../lib/use-scheme`), then:

```bash
npx expo install react-native-reanimated react-native-worklets react-native-svg expo-haptics
```

## MorphText

```tsx
import { MorphText } from './components/morph-text';

<MorphText text={following ? 'Following' : 'Follow'} style={{ fontSize: 16, fontWeight: '600', color: ink }} />;
```

| Prop | Default | What it does |
| --- | --- | --- |
| `text` | required | The text. Change it and it morphs. |
| `style` | | A text style. Its colour animates when it changes; a new size or weight cross-fades. Margins and other layout props go on the row. |
| `containerStyle` | | The row's style. |
| `align` | `'start'` | What stays put while the width changes: `start`, `center` or `end`. `start` is the left in left-to-right text and the right in right-to-left text. Match how the parent places the row (a centred parent: `center`). |
| `granularity` | `'auto'` | `grapheme`, `word`, or `auto` (see below). |
| `stagger` | `18` | ms between two arriving letters. All arrivals happen within 200 ms. |
| `spring` | stiffness 300, damping 30 | How kept letters (and the width) travel. |
| `duration` | `160` | ms a letter takes to leave. |
| `live` | `false` | Screen readers announce changes (statuses, counters). |
| `accessibilityLabel` | the text | What screen readers read. |
| `onWidth` | | Called with the new width each time a change starts. |

**How it moves.** The old and new strings are compared piece by piece: the longest run of shared pieces stays and
glides to its new place; a repeated letter is matched with its nearest copy ("letter" → "better" keeps "etter"
together). Pieces that go shrink, fade and drift up 4 px; new ones rise 6 px into place, staggered. An arrival waits
until its spot is clear: until what was there has nearly faded, and until a moving letter has left it. That is why
nothing ever overlaps, in any frame. A new text in the middle of a morph starts from where everything is on screen.

**Graphemes, not code units.** Emoji, flags, skin tones and accented letters move as one piece (`Intl.Segmenter`
where the platform has it, a careful splitter elsewhere).

**Joined scripts.** Arabic, Persian, Urdu, Syriac, N'Ko, Mongolian and the Indic scripts change a letter's shape
with its neighbours, so `auto` moves them by word: the shared word stays, the other one cross-fades, and every
letter keeps its shape. The text's direction comes from its first strong letter, and right-to-left text is laid out
right to left. `auto` also switches to words above 60 graphemes, to stay light.

**Limits.** One line. Each piece is its own `Text`, so the kerning between two pieces is lost (hardly visible in
interface text). A run of Latin words inside right-to-left text keeps right-to-left word order.

## MorphNumber

```tsx
import { MorphNumber } from './components/morph-text';

<MorphNumber
  value={balance}
  format={{ style: 'currency', currency: 'EUR', locale: 'en-IE' }}
  style={{ fontSize: 40, fontWeight: '800', color: ink }}
  trend
/>;
```

| Prop | Default | What it does |
| --- | --- | --- |
| `value` | required | The number. |
| `format` | | `Intl.NumberFormat` options plus `locale`: `currency`, `percent`, `compact`, fixed decimals, `signDisplay`, grouping. Where `Intl` is missing, a fallback formats grouping, decimals, common currency symbols and percent. |
| `prefix`, `suffix` | | Text before and after, kept as one piece. |
| `trend` | `false` | Flash green when the value goes up and red when it goes down (fading back over 600 ms), or `{ up, down }` colours of your own. |
| `direction` | `'trend'` | `trend`: every digit rolls the way the value went. `shortest`: each digit takes the short way round. |
| `align` | `'start'` | What stays put. Numbers that grow at the front ("999" → "1,000") look best with `end`. |
| `style`, `containerStyle`, `scheme`, `live`, `accessibilityLabel` | | As above. Digits always use tabular figures. |

Each digit is keyed by its place (units, tens…, then tenths…), so when "999" becomes "1,000" the last three
digits roll and "1," slides in at the front. Persian, Arabic and Devanagari digits roll too. On the web, the digit's
window fades at its top and bottom edges; on phones, a digit dims a little between two places.

## MorphButton

```tsx
import { MorphButton } from './components/morph-text';

<MorphButton
  label={inBag ? `In bag (${count})` : 'Add to bag'}
  successLabel="Added"
  onPress={() => api.addToBag(item)} // a promise: loading, then success or error, then idle
/>;
```

| Prop | Default | What it does |
| --- | --- | --- |
| `label` | required | The idle label. Change it and it morphs. |
| `successLabel`, `errorLabel` | `label`, `'Try again'` | Shown in success and error. |
| `onPress` | | Return a promise and the button walks through loading, then success (resolved) or error (rejected or thrown), and back to idle after `resetAfter`. |
| `state` | | Control the state yourself: `idle`, `loading`, `success`, `error`. |
| `resetAfter` | `1600` | ms in success or error before idle (uncontrolled). |
| `variant` | `'solid'` | `solid`, `tinted` or `outline`. |
| `tone` | `'accent'` | `accent`, `neutral` or `danger`. |
| `size` | `'md'` | `sm` 36, `md` 46, `lg` 54 points tall. Smaller than 44 gets a larger touch area. |
| `icon` | | A component `({ color, size })`, shown when idle. |
| `disabled`, `haptics`, `scheme`, `loadingLabel`, `style` | | |

Loading shrinks the pill into a circle around a spinner; success draws a check and shows its label; error shakes
and shows the error label. Every label and fill pair reads at 4.5:1 or better in both themes. Haptics: a light tap
on loading, a success or error notification (not on the web). Inside a column, give it `alignSelf` (`'flex-start'`
or `'center'`) so it can size itself to its label; in a row it does that already.

## Accessibility

The animated pieces are hidden from screen readers; one label carries the final text (`accessibilityLabel` on
phones, a hidden text on the web), announced on change with `live`. Buttons have the button role, a busy state while
loading, and announce success and error. With "reduce motion" on, labels cross-fade (120 ms) instead of moving,
digits swap with a 100 ms fade, and the button keeps its width instead of shrinking.

## Demos

- `demos/buttons.tsx`: a potter's profile and shop: Follow with a rolling follower count, a subscribe button in its
  success state, Add to bag with a promise, and a swap card with "Use max" ↔ "Using max".
- `demos/ticker.tsx`: a portfolio: the balance, six invented holdings whose prices tick every 1.2 s with trend
  flashes, percentage pills, and a period switch whose caption morphs.
- `demos/languages.tsx`: a greeting cycling through English, Persian, Arabic, Spanish and Japanese; "سلام دنیا" ↔
  "سلام دوست"; a note's "Saved 2 min ago" → "Saving…" → "Saved just now"; a field that morphs as you type.
