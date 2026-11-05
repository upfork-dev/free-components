/** A soft rubber tap made on the spot: no audio files. Started only after a user gesture. */
let context: AudioContext | null = null;
let last = 0;

export function tap(strength = 1) {
  if (typeof window === "undefined") return;
  const now = performance.now();
  if (now - last < 60) return;
  last = now;
  try {
    context ??= new AudioContext();
    if (context.state === "suspended") void context.resume();
    const t = context.currentTime;
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.09 * strength, t + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
    const body = context.createOscillator();
    body.type = "sine";
    body.frequency.setValueAtTime(170 + Math.random() * 30, t);
    body.frequency.exponentialRampToValueAtTime(82, t + 0.08);
    body.connect(gain).connect(context.destination);
    body.start(t);
    body.stop(t + 0.1);
  } catch {
    /* No audio on this device: the wall works the same. */
  }
}
