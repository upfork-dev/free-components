// The room, on whichever thread it lives. It touches nothing but its canvas, so the worker and the page run this same
// code. Commands arrive by name, so a call from the page looks the same in both cases.
import { createEngine, type Engine, type RoomAssets } from "./engine";
import type { WallLayout } from "./layout";
import { createRoom, type Room } from "./room";

export type HostInit = {
  assets: RoomAssets;
  reduced: boolean;
  torch: boolean;
  rtl: boolean;
  detailTop: number;
  day: number;
  /** A phone holds fewer large pictures and fewer samples. */
  small: boolean;
};

export type HostEvent =
  | { type: "ready" | "fail" | "lost" | "restored" | "panelClear" }
  | { type: "stats"; stats: ReturnType<Engine["stats"]> & { thread: string; frames: number; frameMs: number[] } };

export type HostMethod =
  | "setLayout"
  | "setTheme"
  | "hover"
  | "open"
  | "close"
  | "pointer"
  | "pointerLeft"
  | "setScroll"
  | "pulse"
  | "setBag"
  | "closerLook"
  | "preload"
  | "setVisible"
  | "stats"
  | "debugLose"
  | "debugRestore";

/** Above this many device pixels the picture stops getting sharper and the laptop starts to feel it. */
const MAX_PIXELS = 6_000_000;

export function createHost(canvas: HTMLCanvasElement | OffscreenCanvas, init: HostInit, emit: (event: HostEvent) => void, thread: string) {
  let engine: Engine | null = null;
  let room: Room | null = null;
  let ready = false;
  let frames = 0;
  let frameMs: number[] = [];
  let queue: [HostMethod, unknown[]][] = [];
  // What must come back after a lost context.
  let lastLayout: [WallLayout, number, number, number] | null = null;
  let day = init.day;
  let focused = -1;
  let bagOpen = false;
  let visible = true;
  let loseExtension: { loseContext(): void; restoreContext(): void } | null = null;

  function boot(restoring: boolean) {
    ready = false;
    try {
      engine = createEngine(canvas);
    } catch {
      emit({ type: "fail" });
      return;
    }
    const e = engine;
    e.setSmall(init.small);
    const r = createRoom(e, {
      torch: init.torch,
      reduced: init.reduced,
      rtl: init.rtl,
      detailTop: init.detailTop,
      small: init.small,
      onPanelClear: () => emit({ type: "panelClear" }),
      onFrame: (info) => {
        frames++;
        if (info.moving && frameMs.length < 4000) frameMs.push(info.dt);
      },
    });
    room = r;
    r.setTheme(day, true);
    r.setVisible(visible);
    e.load(init.assets)
      .then(() => {
        if (room !== r) return;
        ready = true;
        if (restoring) {
          if (lastLayout) r.setLayout(...lastLayout);
          if (focused >= 0) r.open(focused, true);
          if (bagOpen) r.setBag(true);
        }
        for (const [method, args] of queue) run(method, args);
        queue = [];
        emit({ type: restoring ? "restored" : "ready" });
      })
      .catch(() => {
        if (room === r) emit({ type: "fail" });
      });
  }

  function run(method: HostMethod, args: unknown[]) {
    const r = room as Room;
    switch (method) {
      case "setLayout": {
        const [layout, width, height, ratio] = args as [WallLayout, number, number, number];
        const cap = Math.sqrt(MAX_PIXELS / Math.max(1, width * height));
        lastLayout = [layout, width, height, Math.min(ratio, cap)];
        r.setLayout(...lastLayout);
        break;
      }
      case "hover":
        r.hover(args[0] as number);
        break;
      case "open":
        focused = args[0] as number;
        r.open(focused, args[1] as boolean | undefined);
        break;
      case "close":
        focused = -1;
        r.close();
        break;
      case "pointer":
        r.pointer(args[0] as number, args[1] as number);
        break;
      case "pointerLeft":
        r.pointerLeft();
        break;
      case "setScroll":
        r.setScroll(args[0] as number);
        break;
      case "pulse":
        r.pulse(args[0] as number);
        break;
      case "setBag":
        bagOpen = args[0] as boolean;
        r.setBag(bagOpen);
        break;
      case "closerLook":
        r.closerLook(args[0] as number, args[1] as number | undefined, args[2] as number | undefined, args[3] as number | undefined);
        break;
      case "preload":
        r.preload(args[0] as number);
        break;
    }
  }

  const contextOf = () => (canvas as OffscreenCanvas).getContext("webgl2");
  const onLost = (e: Event) => {
    e.preventDefault();
    ready = false;
    room?.stop();
    room = null;
    engine = null;
    emit({ type: "lost" });
  };
  const onRestored = () => boot(true);
  canvas.addEventListener("webglcontextlost", onLost);
  canvas.addEventListener("webglcontextrestored", onRestored);

  boot(false);

  return {
    call(method: HostMethod, args: unknown[]) {
      if (method === "setTheme") {
        day = args[0] as number;
        room?.setTheme(day);
      } else if (method === "setVisible") {
        visible = args[0] as boolean;
        room?.setVisible(visible);
      } else if (method === "stats") {
        if (engine) emit({ type: "stats", stats: { ...engine.stats(), thread, frames, frameMs } });
        frameMs = [];
      } else if (method === "debugLose") {
        loseExtension = (contextOf() as WebGL2RenderingContext | null)?.getExtension("WEBGL_lose_context") ?? null;
        loseExtension?.loseContext();
      } else if (method === "debugRestore") {
        loseExtension?.restoreContext();
      } else if (ready) {
        run(method, args);
      } else {
        // Before the pictures have arrived, or while the context is away: the latest wins on a restore.
        if (method === "setLayout") {
          const [layout, width, height, ratio] = args as [WallLayout, number, number, number];
          lastLayout = [layout, width, height, Math.min(ratio, Math.sqrt(MAX_PIXELS / Math.max(1, width * height)))];
        } else if (method === "open") focused = args[0] as number;
        else if (method === "close") focused = -1;
        else if (method === "setBag") bagOpen = args[0] as boolean;
        queue.push([method, args]);
      }
    },
  };
}
