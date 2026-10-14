# Clockface Time Picker

A time picker where a wheel of times and a live analog clock move as one: wind the wheel and the hands sweep, as if
you were winding the clock. Pick a single time or a range (the clock face shows the booked arc), skip times that
aren't available, or grab the minute hand and turn it. For meetings, alarms, reservations and reminders.

React Native (Expo SDK 57): Skia 2 (the clock), Reanimated 4, Gesture Handler, `expo-haptics`. The demos also use
`react-native-svg` and `react-native-safe-area-context`.

[Live preview on UpFork](https://upfork.dev/products/clockface-time-picker-react-native), in a phone, with the mouse or your finger.

## Run the demo

This folder is a small Expo app (SDK 57) with the component's demos:

```bash
npm install
npx expo start
```

Press `w` to open it in your browser, or scan the QR code with Expo Go on your phone. The bar at the top switches
between the demos and the theme (the phone's own, light or dark). On the web, Skia runs on CanvasKit: `npm install` copies it into `public/` for you (`setup-skia-web`).

## Install

Copy `components/clockface-time-picker/` and `lib/use-scheme.ts` into your app, keeping the two folders side by
side (the component imports `../../lib/use-scheme`), then:

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

On phones nothing is needed. The clock draws its numerals as paths, so it needs no font file anywhere.

## Use

A single time:

```tsx
import { useState } from 'react';
import { Clockface, type TimeValue } from './components/clockface-time-picker';

export function Reminder() {
  const [time, setTime] = useState<TimeValue>({ hours: 9, minutes: 30 });
  return <Clockface value={time} onChange={(v) => 'hours' in v && setTime(v)} step={5} />;
}
```

A range:

```tsx
<Clockface
  mode="range"
  layout="stacked"
  value={{ start: { hours: 14, minutes: 0 }, end: { hours: 15, minutes: 0 } }}
  onChange={(v) => 'start' in v && setRange(v)}
  minDuration={15}
  maxDuration={180}
/>
```

Values are plain `{ hours, minutes }` (and `{ start, end }` for a range): no `Date`, no time zones inside the
component, nothing to drift. A range may run past midnight (22:00 to 01:00).

## Props

| Prop | Default | What it does |
| --- | --- | --- |
| `mode` | `'time'` | `'range'` picks a start and an end, with Start and End tabs. |
| `value` / `defaultValue` | 09:00 | A time, or `{ start, end }`. |
| `onChange` | | Once the picker has settled (never on every frame). |
| `liveValue` | | A shared value you pass in: minutes since 00:00, fractional, while it moves. |
| `step` | `15` | 1, 5, 10, 15 or 30 minutes. Changing it keeps the nearest time. |
| `hourCycle` | the locale's | `12` (with AM and PM) or `24`. |
| `min`, `max` | | The earliest and latest times. A value outside is clamped (with a warning in development). |
| `isDisabled` | | `(time) => boolean`: booked times, struck through. The wheel won't land on them. |
| `minDuration`, `maxDuration` | `step`, a day | Range mode, in minutes. |
| `layout` | `'side'` | `'side'`: the clock beside the wheel. `'stacked'`: above it. |
| `clockSize` | 120 / 220 | The clock's diameter (side / stacked). |
| `showNumerals` | `'quarters'` | `'none'`, `'quarters'` (12, 3, 6, 9) or `'all'`. |
| `dayNight` | `false` | The face warms by day and deepens by night, with a sun or a moon in a window at six. |
| `accent` | `#FF7A1A` | The centre cap and the range arc. |
| `accessibilityLabel` | "Time" | What the wheel picks ("Alarm time"). |
| `scheme` | the phone's | `'light'` or `'dark'`. |
| `haptics` | `true` | Ticks while turning, a tap on settle, a bump when a time is refused (phones only). |

## Availability

- `min` and `max` bound the wheel; past them it resists like a rubber band.
- `isDisabled(time)` marks booked times: struck through at 35%. The wheel skips them when it settles, landing on the
  nearest open time in the direction you were going, with a "refused" haptic.
- In a range the end can't come before the start; `minDuration` and `maxDuration` hold. Moving the start carries the
  end with it, keeping the length; switching to End lets you change the length.
- With every time disabled, the wheel says "No times available" and doesn't move.

## How it moves

- **The wheel** is its own scroller: a finger, a mouse drag and the mouse wheel (one notch, one step) feel the same.
  A fling keeps your speed and decelerates onto a time; a hard spin travels hours, and the hands spin with it.
- **The clock** follows the wheel's fractional value, so the hands sweep continuously; past midnight they keep going
  forwards. Grab the minute hand (or anywhere on the outer ring) and turn it: one turn is an hour, crossing 12 moves
  the hour, and the wheel follows.
- **Start and End** spin the wheel (and the hands) to that handle, under a sliding highlight.
- **Reduced motion.** Flat rows instead of a drum, short timings instead of springs, and hands that jump from step to
  step.

## The clock alone

```tsx
import { AnalogClock } from './components/clockface-time-picker';

const minutes = useSharedValue(10 * 60 + 8);
<AnalogClock minutes={minutes} size={180} showNumerals="all" dayNight />
```

`minutes` is any shared value (unbounded: 1500 is 01:00 the next day, with the hands still going forwards). Pass
`range={{ start, end }}` (two shared values) to draw a booked span.

## Accessibility

The wheel is an adjustable control ("Start time, 2:30 PM"): swipe up and down to move a step, skipping disabled
times. On the web, the arrow keys move a step and Page Up and Page Down an hour. In range mode the tabs are a tab
list. The clock is decorative for screen readers; the duration is announced when it changes. The centre row and the
labels keep 4.5:1 contrast.

## Performance

One shared value drives everything: the wheel's rows, the hands, the day and night tint, the range arc. The face's
ticks and numerals are drawn once into a picture; only the hands, the arc and the tint change per frame. The wheel
mounts only the rows near its centre (a whole day at one-minute steps is 1,440 rows). Measured in Chrome on
integrated graphics (Intel Iris Plus), in a production web build: 60 fps while spinning the wheel and dragging the
hand, in all three demos.

## Demos

- `demos/meeting.tsx`: "Schedule a call with Lena". Days with two fully booked, a range on a 220-point clock with
  the 14:00 to 15:00 arc, two booked slots struck through, length chips that set the end, and the time zone.
- `demos/alarm.tsx`: a bedside alarm. A 260-point clock with the sun or moon in its window, a 12-hour wheel at 6:45,
  repeat days, gentle wake and a snooze length.
- `demos/reservation.tsx`: a table for two on Friday. The clock beside the wheel, 15-minute steps from 17:30 to
  22:30, many tables taken, seating and occasion, and the confirmation.

## Limits

- Ranges are drawn on a 12-hour face: spans longer than 12 hours overlap themselves (keep `maxDuration` under 720).
- One picker edits one time (or one range). The clock does not mirror for right-to-left layouts; the layout does.
