# Ambient Carousel

A cover-flow carousel with a living glow. The focused cover faces you, its neighbours fold away in depth, and the
whole stage glows in the focused item's colours: a soft aura that drifts slowly and melts from one palette to the
next as you swipe. The "New this week" shelf of a music app, a colourway picker, a theme chooser.

React Native (Expo SDK 57): Skia 2 (the glow), Reanimated 4, Gesture Handler, `expo-haptics`. The demos also use
`react-native-svg` and `react-native-safe-area-context`.

[Live preview on UpFork](https://upfork.dev/products/ambient-carousel-react-native), in a phone, with the mouse or your finger.

## Run the demo

This folder is a small Expo app (SDK 57) with the component's demos:

```bash
npm install
npx expo start
```

Press `w` to open it in your browser, or scan the QR code with Expo Go on your phone. The bar at the top switches
between the demos and the theme (the phone's own, light or dark). On the web, Skia runs on CanvasKit: `npm install` copies it into `public/` for you (`setup-skia-web`).

## Install

Copy `components/ambient-carousel/` and `lib/use-scheme.ts` into your app, keeping the two folders side by side
(the component imports `../../lib/use-scheme`), then:

```bash
npx expo install @shopify/react-native-skia react-native-reanimated react-native-worklets react-native-gesture-handler expo-haptics
```

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

## Use

Each item has a `key` and two or three colours: its palette, which the glow takes when it's in front.

```tsx
import { Image, Text } from 'react-native';
import { AmbientCarousel } from './components/ambient-carousel';

const RELEASES = [
  { key: 'a', title: 'Night Garden', art: '…', colors: ['#3048A8', '#8FA8FF', '#E4D9FF'] },
  { key: 'b', title: 'Citrus Hours', art: '…', colors: ['#FF8A3D', '#FFD23F', '#FF5E5B'] },
] as const;

<AmbientCarousel
  data={RELEASES}
  loop
  reflection
  accessibilityLabel="Album"
  accessibilityLabelForItem={(r) => r.title}
  renderCover={({ item }) => <Image source={{ uri: item.art }} style={{ width: '100%', height: '100%' }} />}
  renderMeta={(item) => <Text style={{ color: 'white', fontSize: 20, fontWeight: '800' }}>{item.title}</Text>}
  onPress={(item) => play(item)}
/>;
```

The carousel is as wide as its parent and sets its own height (room above the covers for the glow, the covers, the
reflection and the meta). Give it the stage colour behind it: `#0A0A0D` and `#F6F5F2` are the ones it's designed on.

## Props

| Prop | Default | What it does |
| --- | --- | --- |
| `data` | required | `{ key, colors: [a, b] or [a, b, c] }` and anything else you need. |
| `renderCover` | required | `({ item, index, focus })`: the cover, clipped to its frame. `focus` is 1 in front, 0 one place away. |
| `accessibilityLabelForItem` | required | The item's name for screen readers. |
| `renderMeta` | | A title block under the covers; it slides and fades with the carousel. Its buttons take their own taps. |
| `accessibilityLabel` | `'Carousel'` | What it holds: "Album". |
| `index` / `defaultIndex` | `0` | The item in front, controlled or not. |
| `onChange` | | `(index)`, once it settles on another item. |
| `onPress` | | `(item, index)`, a tap on the front cover (with a press-in of 0.97). |
| `progress` | | A shared value you pass in, following the carousel as a fractional index. |
| `itemWidth` | 62% of the width | The covers' width. |
| `aspectRatio` | `1` | Width over height. |
| `visibleCount` | `5` | 3, 5 or 7 covers on show. |
| `maxRotate` | `48` | How far the side covers turn (degrees). |
| `perspective` | `900` | The depth of the turn. |
| `loop` | `false` | Without end (three items or more). |
| `reflection` | `false` | A faint mirror image of each cover on the floor. |
| `glow` | `true` | `false`, or `{ intensity, drift }`. |
| `scheme` | the phone's | `'light'` or `'dark'`. |
| `haptics` | `true` | A tick as each cover comes to the front (phones only). |

`ref` gives `scrollToIndex(index, animated?)`.

## The glow, and OKLab

The glow is four large soft blobs, each a radial gradient in one of the palette's colours, drifting on its own slow
loop (6 to 10 seconds). As you swipe, the palette blends between the two items either side of the carousel's
fractional place, in OKLab: a swipe from teal to coral passes through clean colours rather than grey. The gradients
are dithered, and the whole glow is faded to nothing well inside its canvas, so it has no edge and doesn't band.

On the light stage the glow is a pastel wash (lighter and quieter colours, at most 55%); on the dark stage it's full
colour (at most 75%), with colours that are too pale for a glow deepened a little.

Use the glow alone with `AmbientGlow` (a palette shared value of three OKLab colours), and mix colours yourself with
`oklabMix('#14B8A6', '#FB7185', 0.5)`, `hexToLab` and `labToRgba`.

## Recipes

**Chrome that follows the swipe.** Pass `progress` and blend your own colours with it:

```tsx
const progress = useSharedValue(0);
const button = useAnimatedStyle(() => ({ backgroundColor: blendAccents(progress.value) }));
```

The sneaker and theme demos tint their buttons this way, picking dark or light text to keep the contrast.

## Depth that's always right

Every cover's slide, turn, scale, darkening and stacking order come from the same shared value on every frame, so
the order never flickers, even through a hard fling. Side covers darken with an overlay of black (not transparency),
and only the covers near the front are mounted for long lists.

## Reflection

The reflection fades out through an opacity mask: a CSS mask on the web, and on phones the mirror image in eight thin
bands, each a little fainter (React Native has no masks without an extra package). On phones it draws each cover nine
times, so with heavy covers you may prefer `reflection={false}`.

## Accessibility

The carousel is an adjustable control ("Album, Night Garden by Lumen, 3 of 12"): swipe up and down to move,
double-tap to call `onPress`. On the web, the arrow keys move and Enter presses. The glow and the reflection are
hidden from screen readers.

## Performance

One shared value drives the covers, the glow's palette and the meta. Nothing re-renders while you swipe. Measured in
Chrome on integrated graphics (Intel Iris Plus), in a production web build: 60 fps while swiping, in all three
demos.

## Demos

- `demos/albums.tsx`: "New this week". Twelve album covers drawn in SVG (a moon over the sea, a grain gradient,
  dots, rays, waves, a golden spiral and more, with invented artists), a reflection, and a play button that turns
  into pause.
- `demos/sneakers.tsx`: a colourway picker. One shoe, drawn here, in six colourways; size chips, and "Add to bag" in
  the colourway's colour.
- `demos/themes.tsx`: choose an app theme. Each cover is a little phone in its palette; the header and the button
  tint as you swipe.

## Limits

- One row of covers, horizontal.
- Covers share one size and shape (`itemWidth`, `aspectRatio`); whatever `renderCover` draws is clipped to it.
- With one item there's nothing to swipe; with two it doesn't loop.
