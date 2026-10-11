"use client";

import { useSyncExternalStore } from "react";
import { Monitor, Moon, Sun } from "lucide-react";

type Theme = "light" | "system" | "dark";

const STORAGE_KEY = "interactive-hero-theme";
const DARK_QUERY = "(prefers-color-scheme: dark)";
const listeners = new Set<() => void>();

function readTheme(): Theme {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved === "light" || saved === "dark" ? saved : "system";
  } catch {
    return "system";
  }
}

function applyTheme(theme: Theme) {
  const dark = theme === "dark" || (theme === "system" && matchMedia(DARK_QUERY).matches);
  const root = document.documentElement;
  root.classList.toggle("dark", dark);
  root.style.colorScheme = dark ? "dark" : "light";
}

function setTheme(theme: Theme) {
  try {
    if (theme === "system") localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, theme);
  } catch {}
  applyTheme(theme);
  listeners.forEach((notify) => notify());
}

function subscribe(notify: () => void) {
  const media = matchMedia(DARK_QUERY);
  const onSystemChange = () => applyTheme(readTheme());
  const onStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY) return;
    applyTheme(readTheme());
    notify();
  };
  listeners.add(notify);
  media.addEventListener("change", onSystemChange);
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(notify);
    media.removeEventListener("change", onSystemChange);
    window.removeEventListener("storage", onStorage);
  };
}

const options = [
  { value: "light", label: "Light theme", Icon: Sun },
  { value: "system", label: "System theme", Icon: Monitor },
  { value: "dark", label: "Dark theme", Icon: Moon },
] as const;

/** Demo only: switches the page between light, dark and the system theme. Not part of the hero. */
export function ThemeSwitch() {
  const theme = useSyncExternalStore(subscribe, readTheme, () => "system" as Theme);

  return (
    <div
      role="group"
      aria-label="Theme"
      className="fixed top-4 right-4 z-10 flex gap-1 rounded-full border border-zinc-950/10 bg-white/70 p-1 backdrop-blur-md dark:border-white/10 dark:bg-zinc-900/70"
    >
      {options.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          aria-label={label}
          aria-pressed={theme === value}
          onClick={() => setTheme(value)}
          className="grid size-8 cursor-pointer place-items-center rounded-full text-zinc-500 transition-colors duration-200 hover:text-zinc-950 focus-visible:outline-2 focus-visible:outline-violet-600 aria-pressed:bg-zinc-950/5 aria-pressed:text-zinc-950 dark:text-zinc-400 dark:hover:text-white dark:focus-visible:outline-violet-300 dark:aria-pressed:bg-white/10 dark:aria-pressed:text-white"
        >
          <Icon aria-hidden className="size-4" />
        </button>
      ))}
    </div>
  );
}
