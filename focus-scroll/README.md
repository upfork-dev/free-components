# Focus Scroll

A vertical list where only the item on the focal line is sharp. The items above and below it go soft as they move
away: they blur, shrink a little, dim and lean back, like the background of a photo taken with a fast lens. Scroll
it, flick it, wheel it or tap a line, and the focus pulls from one item to the next. It's the effect behind
karaoke lyrics, "your year" stories and calm reading screens.

React Native (Expo SDK 57): Skia 2, Reanimated 4, Gesture Handler, `expo-haptics`. Everything is drawn on one Skia
canvas, so the blur is real on iOS, Android and the web.

[Live preview on UpFork](https://upfork.dev/products/focus-scroll-react-native), in a phone, with the mouse or your finger.

## Run the demo

This folder is a small Expo app (SDK 57) with the component's demos:

```bash
npm install
npx expo start
```

Press `w` to open it in your browser, or scan the QR code with Expo Go on your phone. The bar at the top switches
between the demos and the theme (the phone's own, light or dark). On the web, Skia runs on CanvasKit: `npm install` copies it into `public/` for you (`setup-skia-web`).

## Install

Copy `components/focus-scroll/`, `lib/use-scheme.ts` and `assets/fonts/` into your app, keeping the three folders
side by side (the component imports `../../lib/use-scheme` and `../../assets/fonts/…`), then:

```bash
npx expo install @shopify/react-native-skia react-native-reanimated react-native-worklets react-native-gesture-handler expo-haptics
```

Your app's root must be inside `GestureHandlerRootView` (from `react-native-gesture-handler`).

The demos also use `react-native-svg` and `react-native-safe-area-context` for their screens; the component doesn't.

### On the web

On the web, Skia runs on CanvasKit (WebAssembly), which must be loaded before any module that uses Skia is imported.
Copy the engine into `public/` once with `npx setup-skia-web public`, then load it in a web-only entry, `index.web.ts`:

```ts
import '@expo/metro-runtime';
import { registerRootComponent } from 'expo';
import { LoadSkiaWeb } from '@shopify/react-native-skia/lib/module/web';

LoadSkiaWeb({ locateFile: (file) => `/${file}` }).then(async () => {
  const { default: App } = await import('./App');
  registerRootComponent(App);
});
```

On phones nothing is needed.

### The font

Skia draws its own text, and CanvasKit on the web has no system fonts at all, so text inside a Focus Scroll needs a
font file. Geist (Regular, Medium, SemiBold and Bold, Latin) comes with it, under the SIL Open Font License
(`assets/fonts/OFL.txt`). `useFocusFont()` loads it. To use your own, load it with Skia's `useFonts` and pass its
family name as `family`.

## Use

```tsx
import { useCallback, useRef } from 'react';
import {
  FocusParagraph,
  FocusScroll,
  buildParagraph,
  useFocusFont,
  type FocusScrollHandle,
} from './components/focus-scroll';

const LINES = ['First line', 'Second line, a little longer', 'Third'];
const STYLE = { fontSize: 26, weight: 700 as const, lineHeight: 1.16 };

export function Lyrics() {
  const fonts = useFocusFont();
  const list = useRef<FocusScrollHandle>(null);

  // Heights come from the same paragraphs that are drawn (they're cached, so measuring costs nothing extra).
  const getItemHeight = useCallback(
    (line: string, _index: number, width: number) =>
      fonts ? buildParagraph(fonts, line, width - 48, STYLE).getHeight() + 24 : 60,
    [fonts],
  );

  if (!fonts) return null;
  return (
    <FocusScroll
      ref={list}
      data={LINES}
      keyExtractor={(_, index) => String(index)}
      getItemHeight={getItemHeight}
      accessibilityLabelForItem={(line) => line}
      focalPoint={0.42}
      renderItem={({ item, width }) => (
        <FocusParagraph text={item} fonts={fonts} width={width - 48} x={24} y={12} color="#F5F1FF" {...STYLE} />
      )}
    />
  );
}
```

`renderItem` returns Skia elements (`Group`, `Rect`, `Path`, `Image`, `Paragraph`…), drawn in a box from (0, 0) to
(width, height). The list fills its own box: give it a size or `flex: 1`.

## Props

| Prop | Default | What it does |
| --- | --- | --- |
| `data` | required | The items. |
| `keyExtractor` | required | A stable key for each item. |
| `getItemHeight` | required | `(item, index, width)`: the item's height, spacing included. Heights can differ. |
| `renderItem` | required | `({ item, index, width, height, distance })`: Skia elements for the item. `distance` is a shared value: 0 in focus, −1 one above, 1 one below. |
| `accessibilityLabelForItem` | required | What screen readers say for an item. |
| `focalPoint` | `0.5` | Where the focal line sits, from 0 (top) to 1 (bottom). |
| `depth` | see below | How out-of-focus items look. |
| `snap` | `true` | Settle each item exactly on the focal line (a fling can travel several). Off: free scrolling. |
| `initialIndex` | `0` | The item in focus at first. |
| `onFocusChange` | | `(index)`, once each time the item in focus changes. |
| `onItemPress` | | `(item, index)` on a tap. Without it, a tap brings the item into focus. |
| `onUserScroll` | | A person (not your code) started moving the list: a drag, the wheel or the keyboard. |
| `focusProgress` | | A shared value that follows the focus as a fractional index, frame by frame. |
| `haptics` | `true` | A light tick each time the focus changes while a person scrolls (never for your own `scrollToIndex`). |
| `edgeFade` | `48` | How far the list's top and bottom edges fade out, in px. It's a mask, so it works on any background. |
| `scheme` | the phone's | `'light'` or `'dark'`. The list itself has no colours; your items do. |

`depth`: `{ blur: 12, scale: 0.9, opacity: 0.35, tilt: 0, spread: 2.2 }`, the values items reach `spread` items away
from the focal line, along an eased curve. `blur` is in px, `tilt` in degrees. Set `above` and `below` for different
values on each side, e.g. `{ blur: 10, below: { blur: 4 } }`.

## Ref

```ts
list.current?.scrollToIndex(5);                    // glides there
list.current?.scrollToIndex(5, { animated: false });
list.current?.getFocusedIndex();
```

## Helpers

- **`FocusParagraph`**: Skia text for an item, with an optional karaoke fill. `progress` (a number or a shared value,
  0 to 1) sweeps the lines in reading order with a soft front edge; text the fill hasn't reached is drawn in
  `dimColor`. Style props: `fontSize`, `lineHeight` (a multiple), `weight`, `letterSpacing`, `color`, `align`,
  `family`, `tabular`, `maxLines`.
- **`buildParagraph(fonts, text, width, style)`**: the same paragraph, to measure its height in `getItemHeight`.
  Paragraphs are cached, so drawing one you've measured costs nothing more.
- **`useAutoAdvance(ref, { durations, playing, following, loop, startIndex, startProgress })`**: steps the focus item
  by item on a timeline (lyrics, guided reading). It gives `index`, `progress` (for the karaoke fill), `elapsed`,
  `total` and `seek(index)`. Turn `following` off while a person browses (from `onUserScroll`): the timeline keeps
  going, and turning it back on glides the list back to the current item.
- **`useFocusFont()`**: loads the bundled Geist. `withAlpha(hex, alpha)` gives an `rgba()` colour.

## Input and accessibility

- **Touch, mouse, wheel, keyboard.** A drag follows the finger (or mouse) from where it went down, and a fling keeps
  its speed. On the web, the mouse wheel and trackpads scroll it and snap after a short pause, and with the list
  focused the arrow keys, Page Up/Down, Home and End move the focus.
- **Screen readers.** Skia content isn't visible to screen readers, so each item near the focus has an invisible
  native row with its label, and the item in focus is marked selected. Activating a row brings it into focus (or
  calls `onItemPress`).
- **Reduced motion.** No tilt and no scaling, half the blur, and quick timings instead of springs.

## Performance

One canvas for the whole list. Only items on screen, plus a few on each side, are mounted (short lists are mounted
whole), and scrolling never re-renders them: every transform, blur and fade runs on the UI thread. Blur programs are
warmed up while the list appears, so the first scroll is as smooth as the rest. Build paragraphs once (they're
cached by `buildParagraph`) and keep `renderItem` stable with `useCallback` when the parent re-renders often.

Measured in Chrome on a laptop with integrated graphics (Intel Iris Plus), in a production web build: 60 fps
while scrubbing all three demos.

## Demos

- `demos/lyrics.tsx`: a now-playing screen. The lyrics play themselves with a karaoke fill, scrolling pauses the
  follow and shows "Back to now", and tapping a line jumps there. (The song and lyrics are made up for the demo.)
- `demos/recap.tsx`: a "your year" story of tall cards with drawn illustrations, snapping one at a time with the
  next one tilted and soft beneath.
- `demos/agenda.tsx`: a day's timeline with rows of different heights, the hour you're in sharp, and a "Now" chip
  that brings it back.

## Limits

- Vertical only.
- Items are Skia scenes, not regular views: text inputs and native components can't live inside an item.
- Very tall items (taller than the list) work, but the depth effect is designed for items up to about two thirds of
  the list's height.
