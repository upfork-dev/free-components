# Confirm Button

A button for actions people must not trigger by accident, for React Native and Expo: delete an account, remove an
item, leave a group, send money. One press **arms** it: the label changes its mind ("Delete account" → "Tap to
confirm"), and a round cancel bubble buds off its side on a liquid neck that stretches, thins and snaps. A second
press confirms, through busy (your promise), done and error. Left alone, it disarms itself, with a countdown round
the bubble. Or set `mode="hold"`: press and hold while a liquid fill sweeps across.

React Native (Expo SDK 57): Skia (the pill, the neck and the bubble are one shape with a real shadow), Reanimated 4,
Gesture Handler, `react-native-svg`, `expo-haptics`. Labels are plain React Native `Text`: the system font,
accessible and crisp.

[Live preview on UpFork](https://upfork.dev/products/confirm-button-react-native), in a phone, with the mouse or your finger.

## Run the demo

This folder is a small Expo app (SDK 57) with the component's demos:

```bash
npm install
npx expo start
```

Press `w` to open it in your browser, or scan the QR code with Expo Go on your phone. The bar at the top switches
between the demos and the theme (the phone's own, light or dark). On the web, Skia runs on CanvasKit: `npm install` copies it into `public/` for you (`setup-skia-web`).

## Install

Copy `components/confirm-button/` and `lib/use-scheme.ts` into your app, keeping the two folders side by side (the
component imports `../../lib/use-scheme`), then:

```bash
npx expo install @shopify/react-native-skia react-native-reanimated react-native-worklets react-native-gesture-handler react-native-svg expo-haptics
```

Your app's root must be inside `GestureHandlerRootView` (from `react-native-gesture-handler`).

**On the web**, Skia runs on CanvasKit, which must be loaded before the component renders. In your web entry
(`index.web.ts`):

```ts
import { LoadSkiaWeb } from '@shopify/react-native-skia/lib/module/web';

LoadSkiaWeb({ locateFile: (file) => `/${file}` }).then(async () => {
  const { registerRootComponent } = await import('expo');
  const { default: App } = await import('./App');
  registerRootComponent(App);
});
```

and copy `node_modules/canvaskit-wasm/bin/full/canvaskit.wasm` to your `public/` folder.

## Use

```tsx
import { ConfirmButton } from './components/confirm-button';

<ConfirmButton
  label="Delete account"
  busyLabel="Deleting your account…"
  doneLabel="Deleted"
  onConfirm={() => api.deleteAccount()} // a promise: busy until it settles
/>;

<ConfirmButton
  label="Hold to send €120"
  mode="hold"
  tone="primary"
  size="lg"
  fullWidth
  errorLabel={(e) => (e instanceof Error ? e.message : 'Transfer failed')}
  onConfirm={() => api.send(transfer)}
/>;
```

| Prop | Default | What it does |
| --- | --- | --- |
| `label` | required | The idle label: what pressing it will do. |
| `onConfirm` | required | Called on confirmation. Return a promise: the button stays busy until it settles, then shows done (resolved) or error (rejected, or thrown). |
| `armedLabel` | `'Tap to confirm'` | Shown while armed. |
| `busyLabel` | `'<label>…'` | Read by screen readers while busy (the button shows a spinner). |
| `doneLabel` | `'Done'` | Shown with a check that draws itself. |
| `errorLabel` | `'Something went wrong'` | A string, or `(error) => string` for the rejection's own message. |
| `onArm`, `onCancel` | | When it arms, and when it's cancelled or disarms itself. |
| `mode` | `'tap'` | `tap`: press to arm, again to confirm. `hold`: press and hold for `holdDuration`. |
| `armTimeout` | `4000` | ms an armed button waits before disarming; `0` = never. Pressing on the pill pauses it. |
| `holdDuration` | `1200` | ms to hold in `hold` mode. Letting go early drains the fill, twice as fast. |
| `resetAfter` | `1400` | ms in done before idle; `persistDone` keeps it done. Error returns after 2.4 s. |
| `tone` | `'danger'` | `danger`, `primary` or `neutral`. |
| `size` | `'md'` | `sm` 36, `md` 48, `lg` 56 points tall. |
| `fullWidth` | `false` | Fills its parent; armed, the pill makes room for the bubble. |
| `align` | `'center'` | Where it sits in its box (the box is as wide as its widest state, so nothing around it moves). |
| `icon` | | A component `({ color, size })` before the idle label. |
| `disabled`, `scheme`, `haptics`, `style` | | |
| `defaultArmed` | `false` | Start armed (a poster, a screenshot); the countdown waits for the first touch. |

### `useConfirm()`

The state machine alone, for visuals of your own: `state` (`idle`, `armed`, `busy`, `done`, `error`), `error`,
`arm()`, `cancel()`, `confirm()`, `pause()` / `resume()` (the countdown), `reset()`, and `countdown` (a shared value,
1 → 0 while armed). It takes the same `onConfirm`, `onArm`, `onCancel`, `armTimeout`, `resetAfter`, `persistDone`
and `defaultArmed`.

## How it moves

- **One liquid.** The pill, the neck and the bubble are drawn together with one shadow: the neck is two cubic curves
  leaving the pill's end cap and arriving at the bubble along their tangents, so its edges are as crisp as the
  pill's (no blur-and-threshold goo). As the bubble travels out the neck thins, snaps once the gap passes 0.55 × the
  height, and both shapes settle with a small wobble; the bubble comes to rest 10 points away. Cancelling reverses
  it: the neck reforms under 0.35 × the height and pulls the bubble back in.
- **Colours in OKLab.** Red on its way to near-black stays a clean, darkening red, never brown.
- **Busy** contracts the pill into a circle around a spinner; **done** opens it again with a check that draws itself;
  **error** shakes (three decaying swings) in the error colour.
- **Labels never overlap**: the outgoing one rises and fades, and the next arrives once it has gone. The pill's width
  springs between the measured widths of the labels.
- **Haptics**: a light tap on arming, a firmer one on confirming, success and error notifications, and in hold mode
  ticks at a quarter, a half and three quarters, then a firm one at full. (Not on the web.)

## Accessibility

One button whose label follows the state: "Delete account", "Delete account, armed. Activate again to confirm",
your busy label, the done label, the error. While armed, the bubble is a second button, "Cancel". In hold mode
screen readers get a "Confirm" action: no holding needed. Changes are announced. On the web: Enter or Space presses,
Esc cancels. With "reduce motion" on there's no neck (the bubble fades in beside the pill), no shake (the error
colour alone), and the hold fill and the countdown still run. `disabled` dims it to 45% and turns it off.

## Limits

- A promise that never settles keeps the button busy: put a timeout in your `onConfirm` if that can happen.
- After unmounting mid-busy nothing updates (no warnings).
- On the web, React Native Skia's canvas marks its colours as Display P3 while drawing sRGB numbers, so colours come
  out more saturated than asked for. This component converts its colours for that, so they show as designed.

## Demos

- `demos/account.tsx`: a settings screen's danger zone. Sign out everywhere (neutral), delete all data (danger,
  armed at rest: the poster), delete account (danger, hold).
- `demos/cart.tsx`: a shopping bag; each Remove arms inline, the row folds away and the totals follow.
- `demos/transfer.tsx`: "Hold to send €120" with the liquid fill, a promise of 1.2 s, and a switch that makes the next
  send fail.
