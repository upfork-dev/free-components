# Toast Stack

A complete toast system for React Native. Call `toast.success('Saved')` from anywhere; the toasts gather in a
collapsed stack that peeks behind the newest one, fans open when you touch it (or hover it with a mouse), and each
can be swiped away. Promise toasts turn their spinner into a drawn check. Undo buttons, upload progress, timers that
pause while you read, and a layout that never jumps.

React Native (Expo SDK 57): Reanimated 4, Gesture Handler, `react-native-svg` (icons),
`react-native-safe-area-context`, `expo-haptics`.

[Live preview on UpFork](https://upfork.dev/products/toast-stack-react-native), in a phone, with the mouse or your finger.

## Run the demo

This folder is a small Expo app (SDK 57) with the component's demos:

```bash
npm install
npx expo start
```

Press `w` to open it in your browser, or scan the QR code with Expo Go on your phone. The bar at the top switches
between the demos and the theme (the phone's own, light or dark).

## Install

Copy `components/toast-stack/` and `lib/use-scheme.ts` into your app, keeping the two folders side by side (the
component imports `../../lib/use-scheme`), then:

```bash
npx expo install react-native-reanimated react-native-worklets react-native-gesture-handler react-native-svg react-native-safe-area-context expo-haptics
```

## Quick start

Mount one `<Toaster />` near the root, over everything else (inside your `GestureHandlerRootView` and your
`SafeAreaProvider`, if you have one):

```tsx
import { Toaster } from './components/toast-stack';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Navigation />
      <Toaster />
    </GestureHandlerRootView>
  );
}
```

Then call it from anywhere: a component, a hook, a plain function, a store.

```tsx
import { toast } from './components/toast-stack';

toast.success('Changes saved');
```

## Every call

```tsx
toast('Link copied');                                      // neutral
toast.success('Changes saved', { description: 'Your profile is up to date' });
toast.error('Payment declined', { description: 'Try another card' });
toast.warning('Storage almost full');
toast.info('New version available');
const id = toast.loading('Exporting…');                    // stays until updated or dismissed

toast.promise(saveDraft(), {
  loading: 'Saving draft…',
  success: (draft) => `Saved “${draft.title}”`,
  error: (e) => `Couldn’t save: ${String(e)}`,
});                                                        // returns the same promise

toast.custom((id) => <ReplyToast id={id} />);              // your own content in the toast's frame

toast.update(id, { description: '45%', progress: 0.45 }); // change any toast
toast.dismiss(id);                                         // one, with its exit
toast.dismiss();                                           // all of them
toast.clear();                                             // all, at once, without callbacks
```

Every call returns the toast's `id`. Pass your own `id` to replace a toast in place: calling
`toast.success('Back online', { id: 'network' })` turns the "You're offline" toast with that id into good news.

## Options

| Option | Default | What it does |
| --- | --- | --- |
| `id` | generated | Your own id: calling again with it updates that toast. |
| `description` | | A second line, at 70%. |
| `icon` | the type's | Any node, or `null` for none. |
| `action` | | `{ label, onPress }`: a pill button (Undo). The toast closes after it. |
| `cancel` | | `{ label, onPress? }`: a quieter text button. |
| `duration` | `4000` | In ms. `Infinity` keeps it. Loading toasts keep until updated. |
| `haptic` | by type | A success, error or warning haptic on phones. `false` turns it off. |
| `important` | `false` | Announced at once and marked as an alert. |
| `progress` | | A thin bar under the text, from 0 to 1 (an upload). |
| `onDismiss` | | `(id)`, when it's dismissed (a swipe, an action, `dismiss`). |
| `onAutoClose` | | `(id)`, when its time runs out. |

## The Toaster

| Prop | Default | What it does |
| --- | --- | --- |
| `position` | `'bottom'` | `'top'` or `'bottom'`, centred. |
| `visibleToasts` | `3` | Toasts in the stack; the rest wait their turn. |
| `offset` | `16` | Distance from the edge past the safe area: add your tab bar's height. |
| `gap` | `8` | Between toasts when the stack is open. |
| `expand` | `false` | Always open. |
| `richColors` | `false` | Tinted success, error, warning and info backgrounds (text keeps 4.5:1). |
| `showProgress` | `false` | A hairline along each toast's bottom edge showing its time left. |
| `backdrop` | `false` | `true`: a soft scrim behind the open stack. `{ color, opacity? }`: a wash of your page's colour rising behind it. |
| `scheme` | the phone's | `'light'` or `'dark'`. |
| `toastStyle` | | Extra style for every toast's frame. |

`useToasts()` gives the live list (newest first), for a renderer of your own.

## How it behaves

- **The collapsed stack.** The newest toast in front, two behind it peeking out by 10 and 20 points, smaller and with
  their text hidden. The stack is always the front toast's height plus the peeks, so toasts of different heights
  never make it jump.
- **Open.** Tap the stack (or hover it with a mouse) and it fans into a list, every toast readable. Each toast
  travels its own way and the hidden text only fades in once they've separated: no text ever overlaps. Tap outside,
  or leave it alone for a few seconds, and it closes.
- **Timers that pause** while the stack is open, while a toast is pressed, while the mouse is over it and while the
  app is in the background; they go on with the time that was left.
- **Swipes.** Towards the edge it came from, or sideways either way, measured from where your finger went down. Far
  enough (40%) or fast enough and it flies off at your speed, fading over the last part of its way; otherwise it
  springs back. The toast behind springs forward.
- **Promise toasts** turn their spinner into a check (or a cross) drawn by its stroke, the tint crossing over, the
  height following the new text with a spring.
- **Safe area and keyboard.** Clear of the notch and the home indicator; bottom toasts rise above the keyboard with
  it.
- **Reduced motion.** Fades only, no scale or springs; swipes still work.

## Recipes

**Undo.**

```tsx
const archive = (mail) => {
  removeFromList(mail);
  toast('Conversation archived', {
    description: mail.subject,
    action: { label: 'Undo', onPress: () => putBack(mail) },
  });
};
```

**Upload progress.**

```tsx
const id = toast.loading('Uploading 3 files', { progress: 0 });
upload(files, (done) => toast.update(id, { description: `${Math.round(done * 100)}%`, progress: done }))
  .then(() => toast.update(id, { type: 'success', title: '3 files uploaded', progress: undefined, duration: 4000 }))
  .catch(() => toast.update(id, { type: 'error', title: 'Upload failed', progress: undefined, action: { label: 'Retry', onPress: retry } }));
```

**Offline and back.**

```tsx
onNetworkChange((online) =>
  online
    ? toast.success('Back online', { id: 'network', duration: 3000 })
    : toast.warning('You’re offline', { id: 'network', duration: Infinity }),
);
```

## Coming from another toast library

Most toast libraries share this shape, so moving over is mostly a search and replace:

- A provider plus a hook becomes one `<Toaster />` and the `toast` function, which needs no hook.
- `show({ type: 'success', text1, text2 })` becomes `toast.success(text1, { description: text2 })`.
- `visibilityTime` or `autoHide` becomes `duration` (`Infinity` to keep it).
- `hide()` becomes `toast.dismiss(id)`; ids are returned by every call.
- A custom layout becomes `toast.custom((id) => …)`.

## Accessibility

Each new toast is announced: politely, or at once with `important` (which is also an alert). Each toast has a
"Dismiss" action, and its button and cancel as actions too; the buttons are real buttons with 44-point targets. Rich
colours keep their text at 4.5:1 or better in both themes.

## Performance

Every toast's place, scale and fade derive on the UI thread from its order and the measured heights; React renders
only when toasts arrive, change or leave. Only the stack's toasts are mounted (plus one fading at the back); the rest
wait in the store. A toast is measured invisibly before it's shown, so it never appears in the wrong place.
Measured in Chrome on integrated graphics (Intel Iris Plus), in a production web build: 60 fps while dragging and
swiping, opening and closing the stack, and through 50 toasts in a second.

## Demos

- `demos/mail.tsx`: an inbox. Archive a conversation (swipe it or press its button) and Undo it; reply and send,
  which runs a promise toast. Three toasts wait in the stack.
- `demos/upload.tsx`: files. An upload whose toast counts to 100%, one that fails with Retry, and going offline and
  back with the same id.
- `demos/playground.tsx`: every call and the Toaster's options as switches, with the call you pressed shown.

## Limits

- One Toaster per app (a second one draws nothing).
- Toasts are as wide as the screen less 16 points a side, up to 420.
