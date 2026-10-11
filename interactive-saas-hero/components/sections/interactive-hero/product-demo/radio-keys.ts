import type { KeyboardEvent } from "react";

const STEPS: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };

/**
 * Arrow keys move through a radio group and check the radio they land on (the WAI radio group pattern:
 * the group is one tab stop, the checked radio carries tabIndex 0).
 */
export function onRadioKeys(event: KeyboardEvent<HTMLElement>) {
  const step = STEPS[event.key];
  if (!step) return;
  const radios = [...event.currentTarget.querySelectorAll<HTMLElement>('[role="radio"]')];
  const index = radios.indexOf(document.activeElement as HTMLElement);
  if (index < 0) return;
  event.preventDefault();
  const next = radios[(index + step + radios.length) % radios.length];
  next.focus();
  next.click();
}
