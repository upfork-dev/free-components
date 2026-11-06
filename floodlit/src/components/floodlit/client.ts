// What the page talks to. Every call is fire and forget, so the room can live on this thread or in a worker, and the
// page never needs to know which. A bundle that cannot find the worker's file, as in a single-file preview, or a browser
// that cannot draw in one, gets the room on this thread instead; that code loads only then.
import type { RoomAssets } from "./engine";
import type { HostEvent, HostInit, HostMethod } from "./host";
import type { WallLayout } from "./layout";

export type RoomEvents = {
  onReady: () => void;
  onFail: () => void;
  onLost: () => void;
  onRestored: () => void;
  onPanelClear: () => void;
  /** Walking back, nearly home. */
  onHome: () => void;
};

export type RoomInit = {
  assets: RoomAssets;
  reduced: boolean;
  torch: boolean;
  rtl: boolean;
  detailTop: number;
  day: number;
  small: boolean;
  /** False keeps the room on the page's own thread, for a host whose rules forbid workers. */
  worker: boolean;
};

export type RoomClient = {
  setLayout: (layout: WallLayout, width: number, height: number, dpr: number) => void;
  setTheme: (day: number) => void;
  hover: (index: number) => void;
  open: (index: number, instant?: boolean) => void;
  close: () => void;
  pointer: (x: number, y: number) => void;
  pointerLeft: () => void;
  setScroll: (y: number) => void;
  pulse: (index: number) => void;
  setBag: (open: boolean) => void;
  closerLook: (zoom: number, u?: number, v?: number, omega?: number) => void;
  preload: (index: number) => void;
};

const absolute = (url: string) => new URL(url, location.href).href;

/** A worker resolves a relative address against its own file, not the page. */
function absoluteAssets(assets: RoomAssets): RoomAssets {
  return {
    ...assets,
    shoes: assets.shoes.map((s) => ({ ...s, src: absolute(s.src), large: s.large ? absolute(s.large) : undefined, shadow: { ...s.shadow, file: s.shadow.file ? absolute(s.shadow.file) : "" } })),
    wall: { albedo: absolute(assets.wall.albedo), normal: absolute(assets.wall.normal), detail: absolute(assets.wall.detail) },
    noise: absolute(assets.noise),
  };
}

export function startRoom(canvas: HTMLCanvasElement, init: RoomInit, events: RoomEvents): RoomClient {
  const hostInit: HostInit = { ...init, assets: absoluteAssets(init.assets) };
  let send: ((method: HostMethod, args: unknown[]) => void) | null = null;
  let waiting: [HostMethod, unknown[]][] = [];
  const call = (method: HostMethod, ...args: unknown[]) => {
    if (send) send(method, args);
    else waiting.push([method, args]);
  };
  const connect = (next: (method: HostMethod, args: unknown[]) => void) => {
    send = next;
    for (const [method, args] of waiting) next(method, args);
    waiting = [];
  };
  const onEvent = (event: HostEvent) => {
    if (event.type === "ready") events.onReady();
    else if (event.type === "fail") events.onFail();
    else if (event.type === "lost") events.onLost();
    else if (event.type === "restored") events.onRestored();
    else if (event.type === "panelClear") events.onPanelClear();
    else if (event.type === "home") events.onHome();
  };
  const onThisThread = async () => {
    try {
      const { createHost } = await import("./host");
      const host = createHost(canvas, hostInit, onEvent, "main");
      connect((method, args) => host.call(method, args));
    } catch {
      events.onFail();
    }
  };

  const canHandOver = init.worker && typeof Worker === "function" && "transferControlToOffscreen" in HTMLCanvasElement.prototype && typeof import.meta.url === "string";
  if (!canHandOver) {
    void onThisThread();
  } else {
    let worker: Worker | null = null;
    let handed = false;
    const giveUp = () => {
      clearTimeout(timer);
      worker?.terminate();
      worker = null;
      void onThisThread();
    };
    // A worker that never answers, its file missing or blocked, counts as no worker.
    const timer = setTimeout(giveUp, 4000);
    try {
      worker = new Worker(new URL("./room.worker.ts", import.meta.url), { type: "module", name: "floodlit" });
      worker.onerror = (e) => {
        e.preventDefault();
        if (handed) events.onFail();
        else giveUp();
      };
      worker.onmessage = ({ data }) => {
        if (data.type === "hello") {
          if (!data.ok) {
            giveUp();
            return;
          }
          clearTimeout(timer);
          handed = true;
          const w = worker as Worker;
          const offscreen = canvas.transferControlToOffscreen();
          w.postMessage({ type: "init", canvas: offscreen, init: hostInit }, [offscreen]);
          connect((method, args) => w.postMessage({ type: "call", method, args }));
        } else {
          onEvent(data as HostEvent);
        }
      };
    } catch {
      giveUp();
    }
  }

  const onVisibility = () => call("setVisible", document.visibilityState !== "hidden");
  document.addEventListener("visibilitychange", onVisibility);
  onVisibility();

  // Pointer moves come faster than frames, and only the latest one matters.
  let pointerAt: [number, number] | null = null;
  let pointerFrame = 0;
  return {
    setLayout: (layout, width, height, dpr) => call("setLayout", layout, width, height, dpr),
    setTheme: (day) => call("setTheme", day),
    hover: (index) => call("hover", index),
    open: (index, instant) => call("open", index, instant),
    close: () => call("close"),
    pointer: (x, y) => {
      pointerAt = [x, y];
      if (pointerFrame) return;
      pointerFrame = requestAnimationFrame(() => {
        pointerFrame = 0;
        if (pointerAt) call("pointer", pointerAt[0], pointerAt[1]);
      });
    },
    pointerLeft: () => {
      pointerAt = null;
      call("pointerLeft");
    },
    setScroll: (y) => call("setScroll", y),
    pulse: (index) => call("pulse", index),
    setBag: (open) => call("setBag", open),
    closerLook: (zoom, u, v, omega) => call("closerLook", zoom, u, v, omega),
    preload: (index) => call("preload", index),
  };
}
