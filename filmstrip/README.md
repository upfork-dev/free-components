# Filmstrip

The gallery pattern of a phone's photo app, for React Native and Expo: a big viewer on top, and along the bottom a
strip of thumbnails where the current item opens to its true shape while every other one is squeezed into a slim
sliver. Scrub the strip and the viewer follows frame by frame; swipe the viewer and the strip follows. For
galleries, listings (stays, homes, cars), product photos and video chapters.

React Native (Expo SDK 57): Reanimated 4, Gesture Handler, `react-native-svg`, `expo-haptics`. No Skia and no image
package: you draw the pictures with any image component you like.

[Live preview on UpFork](https://upfork.dev/products/filmstrip-react-native), in a phone, with the mouse or your finger.

## Run the demo

This folder is a small Expo app (SDK 57) with the component's demos:

```bash
npm install
npx expo start
```

Press `w` to open it in your browser, or scan the QR code with Expo Go on your phone. The bar at the top switches
between the demos and the theme (the phone's own, light or dark).

## Install

Copy `components/filmstrip/` and `lib/use-scheme.ts` into your app, keeping the two folders side by side (the
component imports `../../lib/use-scheme`), then:

```bash
npx expo install react-native-reanimated react-native-worklets react-native-gesture-handler react-native-svg expo-haptics
```

Your app's root must be inside `GestureHandlerRootView` (from `react-native-gesture-handler`), as Gesture Handler
asks.

## Use

```tsx
import { Image } from 'react-native';
import { Filmstrip } from './components/filmstrip';

const photos = album.map((p) => ({
  key: p.id,
  width: p.width,
  height: p.height,
  accessibilityLabel: p.description,
  uri: p.uri,
}));

<Filmstrip
  data={photos}
  renderImage={({ item }) => <Image source={{ uri: item.uri }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />}
  defaultIndex={0}
  onIndexChange={(i) => console.log('settled on', i)}
/>;
```

### The `renderImage` contract

`renderImage({ item, index, variant })` returns a picture that **fills its box** (`width: '100%', height: '100%'`,
cropped to fit). `variant` is `'viewer'` for the big picture and `'thumb'` for the strip, so you can ask your image
service for a smaller size for thumbnails. Any component works: `Image`, `expo-image`, a Skia canvas.

The viewer gives the picture a box of the item's own shape (from `width` and `height`), fitted to the page; the
strip gives it a box of its open shape and shows its centre.

### Props

| Prop | Default | What it does |
| --- | --- | --- |
| `data` | required | Items: `key`, `width`, `height` (only the shape is used), `accessibilityLabel`, optional `type: 'video'`, `duration` (seconds) and `caption`. |
| `renderImage` | required | Draws a picture filling its box (see above). |
| `index` / `defaultIndex` | `0` | Controlled or initial item. |
| `onIndexChange` | | Called when a scrub, a tap or a swipe settles. |
| `position` | | A shared value for the live float index: pass your own to drive other things (a header, a progress bar) with it. |
| `thumbHeight` | `52` | The strip's thumbnail height. Open items are `thumbHeight × aspect`, kept within 0.75–2.2× the height. |
| `sliverWidth` | `14` | Width of a squeezed item. |
| `gap` | `3` | Space between items. |
| `showCounter` | `true` | "12 / 48" over the viewer, read by screen readers on change. |
| `renderCaption` | | `(item, index) => node` under the viewer (the demos use `SwapText` so it morphs). |
| `viewer` | `true` | `false` for the strip alone, or `{ zoom, parallax, fit }`: double-tap zoom (default on), how much the picture lags its page while paging (default 0.12), `contain` or `cover`. |
| `onRequestClose` | | Turns on swipe-down-to-close on the viewer (for a gallery shown as a modal). |
| `onEndReached`, `endThreshold` | `4` | Load more when the index comes within that many items of the end. Appending keeps the position. |
| `scheme` | the phone's | `'light'` or `'dark'`. |
| `haptics` | `true` | A light tick as each item crosses the centre while scrubbing, a firmer one on settle. |
| `ref` | | `ref.current.scrollToIndex(i, animated?)`. |

## Your own layout

`Filmstrip` is a viewer, a counter and a strip in a column. For anything else, use the two pieces it's made of and
bind them to one shared value:

```tsx
const position = useSharedValue(0);

<FilmstripViewer data={items} position={position} renderImage={renderImage} fit="cover" />
<FilmstripStrip data={items} position={position} renderImage={renderImage} thumbHeight={46} scheme="dark" />
```

The listing demo lays the strip over the photo's bottom edge this way.

## How it moves

- **One value.** A float index drives both: the viewer's pages sit at `(i − position) × width`, and the strip opens
  each item by `1 − smoothstep(|i − position|)`, so between two items both share the transition.
- **No stretching, no width animation.** A thumbnail never changes its width: two clipping boxes slide over each
  other (one holds the left edge, one the right), and the picture slides back inside them. What shows is always
  the picture's centre, uncropped in height and unstretched, with round corners at both edges.
- **Scrubbing** follows the finger 1:1 from pointer-down: one item per sliver plus gap of drag. On release it carries
  on with a 0.994 decay and snaps (stiffness 260, damping 30) so an item sits open in the centre. A tap jumps to the
  item under it; slivers take the strip's whole height to be easy to hit.
- **The viewer** follows the strip exactly while you scrub; swiped itself, it pages with its own snap and the strip
  follows. Double-tap (double-click) zooms 2× about that point; drag to look around; double-tap again to come back.
- **Light on memory.** Only the viewer's pages within one of the current one, and the thumbnails the strip can show
  (plus four on each side), are mounted: 500 items scrub as smoothly as 5.

## Video items

`type: 'video'` with a `duration` shows a time badge on the open thumbnail and a play mark in the viewer. Playing it
is up to you (there's no video package here): put your player in `renderImage` for the viewer variant, or open one
from your own button.

## Accessibility

The strip is an adjustable control ("Lisbon, 5 of 14"): swipe up and down with VoiceOver or TalkBack, arrow keys,
Home and End on the web, or the mouse wheel. The viewer's picture has the item's label and a "Zoom" action; the
counter is announced when it changes. Arrow keys page the viewer on the web, Enter zooms, Esc zooms out or closes.
With "reduce motion" on, there's no parallax and snaps are short fades.

RTL: in a right-to-left app the strip and the swipes are mirrored.

## Limits

- One row; the strip is horizontal.
- Pinch-zoom isn't built in (double-tap is). Zoom is 2×.
- Video playback is yours.

## The demos' pictures

The fourteen landscapes in `assets/scenes/` are ours: each is a formula in `art/scenes.sksl` (a Skia shader: skies,
ridges, water and light from noise functions), rendered once by `art/render.mjs` (CanvasKit, on the CPU) and saved
as WebP by `art/webp.py`, each at most 120 KB. No photos, stock or otherwise. They're only for the demos: your app
shows your own pictures.

## Demos

- `demos/gallery.tsx`: a photo viewer. The place and time morph per photo as you scrub; a favourite button.
- `demos/listing.tsx`: a stay listing, the strip laid over the photo's bottom edge (`FilmstripViewer` +
  `FilmstripStrip`).
- `demos/chapters.tsx`: a film's nine chapters as video items with duration badges, the chapter's title and times
  in the caption.
