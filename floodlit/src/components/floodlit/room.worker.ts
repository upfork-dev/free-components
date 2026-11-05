// The room's own thread: context, shaders, pictures and every frame, so the page's main thread never waits for them.
// Typed without the "webworker" lib, so a project's own TypeScript setup never has to include it.
import { createHost, type HostInit, type HostMethod } from "./host";

type Message = { type: "init"; canvas: OffscreenCanvas; init: HostInit } | { type: "call"; method: HostMethod; args: unknown[] };
type Scope = { postMessage(message: unknown): void; onmessage: ((e: { data: Message }) => void) | null };

const scope = self as unknown as Scope;
let host: ReturnType<typeof createHost> | null = null;

scope.onmessage = ({ data }) => {
  if (data.type === "init") host = createHost(data.canvas, data.init, (event) => scope.postMessage(event), "worker");
  else host?.call(data.method, data.args);
};

// Asked before the page hands its canvas over, because a canvas handed over cannot be taken back.
let ok = typeof requestAnimationFrame === "function" && typeof OffscreenCanvas === "function";
if (ok) {
  try {
    ok = !!new OffscreenCanvas(1, 1).getContext("webgl2");
  } catch {
    ok = false;
  }
}
scope.postMessage({ type: "hello", ok });
