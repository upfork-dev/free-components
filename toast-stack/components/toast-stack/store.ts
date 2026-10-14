import { useSyncExternalStore, type ReactNode } from 'react';

// The toasts live in a small store outside React, so `toast(...)` works from anywhere: components, hooks, plain
// functions. The one <Toaster /> subscribes and draws them. Changes made in the same moment reach React together.

export type ToastType = 'default' | 'success' | 'error' | 'warning' | 'info' | 'loading';

export type ToastOptions = {
  /** Your own id: calling again with it updates that toast instead of adding one. */
  id?: string;
  description?: string;
  /** A node in place of the type's icon, or `null` for none. */
  icon?: ReactNode | null;
  action?: { label: string; onPress: () => void };
  cancel?: { label: string; onPress?: () => void };
  /** How long it stays, in ms (4000). `Infinity` keeps it until it's dismissed. */
  duration?: number;
  /** A haptic for success, error and warning (on by type). */
  haptic?: boolean;
  /** Announced at once, interrupting, and marked as an alert. */
  important?: boolean;
  /** A thin progress bar under the text, from 0 to 1 (an upload). */
  progress?: number;
  onDismiss?: (id: string) => void;
  onAutoClose?: (id: string) => void;
};

export type ToastRecord = {
  id: string;
  title: string;
  type: ToastType;
  options: ToastOptions;
  render?: (id: string) => ReactNode;
  /** Bumps when the toast is updated, restarting its timer. */
  version: number;
  /** Set once it's on its way out. */
  closing: false | 'auto' | 'dismiss';
};

export const DEFAULT_DURATION = 4000;

let toasts: ToastRecord[] = [];
let counter = 0;
const listeners = new Set<() => void>();
let queued = false;

function changed() {
  if (queued) return;
  queued = true;
  queueMicrotask(() => {
    queued = false;
    listeners.forEach((listener) => listener());
  });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function snapshot() {
  return toasts;
}

function upsert(title: string, type: ToastType, options: ToastOptions = {}, render?: (id: string) => ReactNode) {
  const id = options.id ?? `toast-${++counter}`;
  const existing = toasts.find((t) => t.id === id && !t.closing);
  if (existing) {
    toasts = toasts.map((t) =>
      t === existing ? { ...t, title, type, render: render ?? t.render, options: { ...t.options, ...options }, version: t.version + 1 } : t,
    );
  } else {
    // A toast leaving with the same id makes way at once.
    toasts = [{ id, title, type, options, render, version: 0, closing: false as const }, ...toasts.filter((t) => t.id !== id)];
  }
  changed();
  return id;
}

/** Ends a toast: it plays its exit, then the Toaster removes it. */
function close(id: string, how: 'auto' | 'dismiss') {
  let callback: ((id: string) => void) | undefined;
  toasts = toasts.map((t) => {
    if (t.id !== id || t.closing) return t;
    callback = how === 'auto' ? t.options.onAutoClose : t.options.onDismiss;
    return { ...t, closing: how };
  });
  changed();
  callback?.(id);
}

type PromiseMessages<T> = {
  loading: string;
  success: string | ((value: T) => string);
  error: string | ((error: unknown) => string);
};

type Toast = {
  (title: string, options?: ToastOptions): string;
  success(title: string, options?: ToastOptions): string;
  error(title: string, options?: ToastOptions): string;
  warning(title: string, options?: ToastOptions): string;
  info(title: string, options?: ToastOptions): string;
  loading(title: string, options?: ToastOptions): string;
  promise<T>(promise: Promise<T>, messages: PromiseMessages<T>, options?: ToastOptions): Promise<T>;
  custom(render: (id: string) => ReactNode, options?: ToastOptions): string;
  update(id: string, options: ToastOptions & { title?: string; type?: ToastType }): void;
  dismiss(id?: string): void;
  clear(): void;
};

export const toast: Toast = Object.assign((title: string, options?: ToastOptions) => upsert(title, 'default', options), {
  success: (title: string, options?: ToastOptions) => upsert(title, 'success', options),
  error: (title: string, options?: ToastOptions) => upsert(title, 'error', options),
  warning: (title: string, options?: ToastOptions) => upsert(title, 'warning', options),
  info: (title: string, options?: ToastOptions) => upsert(title, 'info', options),
  loading: (title: string, options?: ToastOptions) => upsert(title, 'loading', { duration: Infinity, ...options }),
  promise<T>(promise: Promise<T>, messages: PromiseMessages<T>, options: ToastOptions = {}) {
    const id = upsert(messages.loading, 'loading', { ...options, duration: Infinity });
    const duration = options.duration ?? DEFAULT_DURATION;
    promise.then(
      (value) => {
        const title = typeof messages.success === 'function' ? messages.success(value) : messages.success;
        upsert(title, 'success', { ...options, id, duration });
      },
      (error: unknown) => {
        const title = typeof messages.error === 'function' ? messages.error(error) : messages.error;
        upsert(title, 'error', { ...options, id, duration });
      },
    );
    return promise;
  },
  custom: (render: (id: string) => ReactNode, options?: ToastOptions) => upsert('', 'default', options, render),
  update(id: string, options: ToastOptions & { title?: string; type?: ToastType }) {
    const current = toasts.find((t) => t.id === id && !t.closing);
    if (!current) return;
    const { title, type, ...rest } = options;
    upsert(title ?? current.title, type ?? current.type, { ...rest, id });
  },
  dismiss(id?: string) {
    if (id === undefined) toasts.filter((t) => !t.closing).forEach((t) => close(t.id, 'dismiss'));
    else close(id, 'dismiss');
  },
  clear() {
    toasts = [];
    changed();
  },
});

/** For the Toaster: a toast's time ran out. */
export function expireToast(id: string) {
  close(id, 'auto');
}

/** For the Toaster: a toast finished leaving. */
export function removeToast(id: string) {
  const next = toasts.filter((t) => !(t.id === id && t.closing));
  if (next.length === toasts.length) return;
  toasts = next;
  changed();
}

/** Every toast, newest first, including those on their way out. For custom renderers. */
export function useToasts() {
  return useSyncExternalStore(subscribe, snapshot, snapshot);
}
