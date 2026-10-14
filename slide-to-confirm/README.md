# Slide to Confirm

A pill you slide to the end to confirm something that shouldn't happen by accident: a payment, a transfer, an
unlock. It shows a spinner while your action runs, then a done state, or an error you can retry. It works with a
finger and with the mouse, in light and dark, with haptics on phones that have them.

React Native (Expo SDK 57): Reanimated 4, Gesture Handler, `react-native-svg`, `expo-haptics`.

[Live preview on UpFork](https://upfork.dev/products/slide-to-confirm-react-native), in a phone, with the mouse or your finger.

## Run the demo

This folder is a small Expo app (SDK 57) with the component's demos:

```bash
npm install
npx expo start
```

Press `w` to open it in your browser, or scan the QR code with Expo Go on your phone. The bar at the top switches
between the demos and the theme (the phone's own, light or dark).

## Install

Copy `components/slide-to-confirm/` and `lib/use-scheme.ts` into your app, keeping the two folders side by side
(the component imports `../../lib/use-scheme`), then:

```bash
npx expo install react-native-reanimated react-native-worklets react-native-gesture-handler react-native-svg expo-haptics
```

Your app's root must be inside `GestureHandlerRootView` (from `react-native-gesture-handler`), as Gesture Handler
asks.

## Use

```tsx
import { SlideToConfirm } from './components/slide-to-confirm';

<SlideToConfirm
  label="Slide to pay $249.00"
  doneLabel="Paid"
  onConfirm={() => api.pay(order)} // a promise: spinner until it settles, an error if it rejects
/>;
```

| Prop | Default | What it does |
| --- | --- | --- |
| `label` | required | What sliding does. Screen readers announce it. |
| `onConfirm` | required | Called at the end. Return a promise to show a spinner; a rejection shows `failLabel`. |
| `doneLabel` | `"Done"` | Shown once confirmed. |
| `failLabel` | `"Try again"` | Shown when `onConfirm` throws or rejects. |
| `tint` | the theme's ink | The thumb's and the fill's color. |
| `onTint` | white, or the page color | The icons' and the done label's color on the tint. |
| `disabled` | `false` | Dims it and turns off the gestures. |
| `resetAfter` | `1800` | Milliseconds before a confirmed slider resets; `0` keeps it confirmed. |
| `height` | `64` | The track's height; the thumb follows. |
| `scheme` | the phone's | `'light'` or `'dark'`. |
| `style` | | The track's style (width, margins). |

Screen readers get a button with an "activate" action, so the slide is never the only way. A tap on the track
nudges the thumb, which tells a mouse user it slides. With "reduce motion" on, the chevrons stay still.

## Demos

- `demos/checkout.tsx`: a payment that takes 1.5 seconds, then "Paid".
- `demos/unlock.tsx`: a custom violet tint, and the error state (every other try is turned down).
