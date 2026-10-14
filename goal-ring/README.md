# Goal Ring

A progress ring drawn with Skia: a gradient arc with a soft glow, a dot that rides its end, and anything you like in
the middle. Set it from code, drive it frame by frame with a shared value, or let people drag round it to choose a
goal. The gradient runs there and back, so a full ring never shows a seam.

React Native (Expo SDK 57): Skia 2, Reanimated 4, Gesture Handler, `expo-haptics`.

[Live preview on UpFork](https://upfork.dev/products/skia-progress-ring-react-native), in a phone, with the mouse or your finger.

## Run the demo

This folder is a small Expo app (SDK 57) with the component's demos:

```bash
npm install
npx expo start
```

Press `w` to open it in your browser, or scan the QR code with Expo Go on your phone. The bar at the top switches
between the demos and the theme (the phone's own, light or dark). On the web, Skia runs on CanvasKit: `npm install` copies it into `public/` for you (`setup-skia-web`).

## Install

Copy `components/goal-ring/` and `lib/use-scheme.ts` into your app, keeping the two folders side by side, then:

```bash
npx expo install @shopify/react-native-skia react-native-reanimated react-native-worklets react-native-gesture-handler expo-haptics
```

Your app's root must be inside `GestureHandlerRootView`.

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

```tsx
import { GoalRing } from './components/goal-ring';

const [progress, setProgress] = useState(0.6);

<GoalRing progress={progress} onChange={setProgress} interactive step={0.01}>
  <Text>{Math.round(progress * 100)}%</Text>
</GoalRing>;
```

| Prop | Default | What it does |
| --- | --- | --- |
| `progress` | required | 0 to 1. A number animates to its new value; a shared value is followed frame by frame. |
| `interactive` | `false` | Lets people drag round the ring, or tap on it, to set the progress. |
| `onChange` | | Called while dragging, with the new progress. |
| `step` | `0` | Rounds dragged values, e.g. `0.01` for whole percents. |
| `size` | `240` | Width and height. |
| `thickness` | `18` | The ring's stroke. |
| `colors` | green to teal | The gradient's two colors. |
| `scheme` | the phone's | `'light'` or `'dark'`: the track's color and the glow's strength. |
| `children` | | What sits in the middle. |

Each tenth of the way gives a light haptic tick while dragging. Screen readers get a progress bar, or an adjustable
control when it's interactive.

## Demos

- `demos/steps.tsx`: a daily steps goal you drag round; the stats below follow it.
- `demos/backup.tsx`: a backup driven by a shared value, moving on in uneven steps.
