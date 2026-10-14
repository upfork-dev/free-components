# Choice Chips

The chip group behind every "pick your interests" step, filter sheet and tag picker, made to feel alive. A chip
fills with colour from the exact point you pressed, a check grows in and draws its stroke, and the chips after it
slide to their new places like objects, not snapping. A tap past the limit gets a polite refusal (a little shake, a
haptic, the helper line pulsing) instead of nothing.

React Native (Expo SDK 57): Reanimated 4 (layout transitions, animated props), `react-native-svg` (the check),
`expo-haptics`. No colour package: contrast is worked out by a tiny helper inside.

[Live preview on UpFork](https://upfork.dev/products/choice-chips-react-native), in a phone, with the mouse or your finger.

## Run the demo

This folder is a small Expo app (SDK 57) with the component's demos:

```bash
npm install
npx expo start
```

Press `w` to open it in your browser, or scan the QR code with Expo Go on your phone. The bar at the top switches
between the demos and the theme (the phone's own, light or dark).

## Install

Copy `components/choice-chips/` and `lib/use-scheme.ts` into your app, keeping the two folders side by side (the
component imports `../../lib/use-scheme`), then:

```bash
npx expo install react-native-reanimated react-native-worklets react-native-svg expo-haptics
```

## Use

```tsx
import { useState } from 'react';
import { ChoiceChips, ChipCounter } from './components/choice-chips';

const OPTIONS = [
  { value: 'design', label: 'Design', emoji: '🎨' },
  { value: 'music', label: 'Music', emoji: '🎧' },
  { value: 'running', label: 'Running', emoji: '🏃' },
  { value: 'books', label: 'Books', emoji: '📚', disabled: true },
];

export function Interests() {
  const [picked, setPicked] = useState<string[]>([]);
  return (
    <>
      <ChipCounter count={picked.length} max={3} color="#7D7A83" />
      <ChoiceChips
        accessibilityLabel="What are you into?"
        options={OPTIONS}
        value={picked}
        onChange={setPicked}
        max={3}
        helperText="Pick up to 3"
      />
    </>
  );
}
```

## Props

| Prop | Default | What it does |
| --- | --- | --- |
| `options` | required | `{ value, label, icon?, emoji?, color?, count?, disabled?, accessibilityHint? }`. `color` gives one option its own colour; `count` shows a number after the label. |
| `accessibilityLabel` | required | The group's question, for screen readers. |
| `mode` | `'multiple'` | `'multiple'` (checkboxes) or `'single'` (radio buttons: the previous one empties as the new one fills). |
| `value` / `defaultValue` | | The selected values: controlled, or a starting point. |
| `onChange` | | `(value, { value, selected })` after each change. |
| `max`, `min` | | Limits. A tap past them is refused: the chip shakes, a warning haptic plays, the helper line pulses and screen readers hear why. |
| `onLimit` | | `('max' \| 'min')` when a tap is refused. |
| `layout` | `'wrap'` | `'wrap'` flows onto lines; `'scroll'` is one row that scrolls (its edges fade through the chips' own opacity, so it works on any background); `'grid'` is equal `columns`. |
| `variant` | `'tinted'` | `'tinted'` (a soft fill), `'outline'` (a stronger border, a faint fill), `'solid'` (a full fill, white or dark text picked for contrast). |
| `size` | `'md'` | `'sm'` 32, `'md'` 40, `'lg'` 48 points tall. Small chips get a larger touch area. |
| `checkPlacement` | `'trailing'` | `'leading'`, `'trailing'`, or `'reserve'`: space for the check is always kept, so nothing reflows at all (dense layouts). |
| `accent` | `#FF6B3D` | The colour of selection. Selected labels are darkened or lightened just enough to read at 4.5:1. |
| `gap` | `10` | Space between chips. |
| `helperText` | | A line under the group; it pulses on a refused tap. |
| `searchable` | `false` | `true` or `{ placeholder }`: a field that filters the options, underlining the match, with selected chips pinned above. |
| `scheme` | the phone's | `'light'` or `'dark'`. |
| `haptics` | `true` | A tick on each change, a warning on a refusal. |

### On their own

- **`Chip`**: one toggle chip for your own layouts (`label`, `selected`, `onPress`, `variant`, `size`, `accent`,
  `checkPlacement`, `icon`, `emoji`, `count`, `disabled`, `shake`, `highlight`, `role`).
- **`ChipCounter`** (also `ChoiceChips.Counter`): "3 of 5", the number rolling up or down as it changes.

## How it moves

- **Press**: the chip gives under the finger (scale 0.96, a quick spring).
- **Select**: a circle of colour grows from the press point until it covers the chip, the label's colour cross-fades,
  the check circle grows in, and its stroke draws itself a moment later. Unselecting runs it back, towards the new
  press point.
- **Reflow**: the chips after it slide to their new places with a spring; a chip that moves to the next line travels
  there.
- **Refusal**: a short shake that settles, three times smaller each time.
- **Reduced motion**: quick cross-fades instead of the growing fill, and a short timing for the reflow; nothing
  shakes (the helper line still flashes).

## Accessibility

The group is a radio group (single) or a labelled list; each chip is a checkbox or radio button with its checked and
disabled states. Limits are announced. On the web, Tab moves between chips, Space or Enter toggles, and a focus ring
shows for the keyboard only (never after a click). Labels scale with the text size up to 1.4×.

## Demos

- `demos/interests.tsx`: onboarding, "What are you into?": 26 chips in three groups sharing one limit of five, a
  rolling counter, and a Continue button that wakes up at three.
- `demos/filters.tsx`: a shop's filter sheet: sort as one scrolling single choice (solid), sizes in a grid with two
  sold out, colours with swatches and their own colours, and brands with counts and a search.
- `demos/dietary.tsx`: a restaurant booking step: outlined chips with icons that never reflow (`reserve`), and a single
  seating choice.

## Limits

- Labels are one line; long ones end with an ellipsis (screen readers get the whole label).
- `wrap` reflows with layout transitions; with hundreds of chips, prefer `scroll` or `grid`.
