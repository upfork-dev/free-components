// The room's renderer: raw WebGL2, no 3D library. It touches no DOM, so it can run in a worker on an
// OffscreenCanvas. It draws only when told to.
import type { Pose } from "./camera";
import { viewProjection } from "./camera";
import type { WallLayout } from "./layout";
import { SHOE_Z, SLAB } from "./layout";
import type { Lighting } from "./lighting";
import { hexToLinear } from "./lighting";
import * as shaders from "./gl/shaders";

const MAX_SHOES = 16;
const SHADOW_SIZE = 256;

export type RoomShoe = {
  id: string;
  aspect: number;
  baseline: number;
  ledColor: string;
  src: string;
  large?: string;
  shadow: { file: string; pad: number; rects: number[][] };
};

export type RoomAssets = {
  /** Right to left: the shoes face the other way. */
  flip?: boolean;
  shoes: RoomShoe[];
  wall: { albedo: string; normal: string; detail: string };
  noise: string;
};

export type ShoeState = {
  /** 0..1: how far the larger picture has faded in. */
  largeMix?: number;
  level: number;
  exposure: number;
  mipBias: number;
  fade: number;
  /** 0..1: how much this shelf gives way to the panel's calm zone. */
  panelAmount: number;
};

export type RoomState = {
  lighting: Lighting;
  pose: Pose;
  shoes: ShoeState[];
  /** Screen share where a neighbour starts to fade and where it is gone. It keeps the panel's zone calm. */
  panelFade: [number, number];
  /** Ambient and key scale: in focus the strip becomes the key. */
  ambientScale: number;
  keyScale: number;
  /** Close up the wall's maps are enlarged, so their relief is kept gentle. */
  reliefScale: number;
  /** Mip bias on the wall's colour and relief maps. */
  mapBias: number;
  /** Close up the fine detail tile takes over from the enlarged maps. */
  detailScale: number;
  /** The bag is open: 1 is untouched, lower is dimmer, for the whole world, in linear light. */
  worldDim: number;
  /** World position of the torch, and its strength. Strength 0 means off. */
  torch: { x: number; y: number; power: number };
};

type Program = { program: WebGLProgram; u: Record<string, WebGLUniformLocation> };

function compile(gl: WebGL2RenderingContext, type: number, source: string, name: string): WebGLShader {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(`${name}: ${gl.getShaderInfoLog(shader)}`);
  }
  return shader;
}

function link(gl: WebGL2RenderingContext, vert: string, frag: string, name: string): Program {
  const program = gl.createProgram()!;
  gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, vert, `${name}.vert`));
  gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, frag, `${name}.frag`));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(`${name}: ${gl.getProgramInfoLog(program)}`);
  }
  const u: Record<string, WebGLUniformLocation> = {};
  const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS) as number;
  for (let i = 0; i < count; i++) {
    const info = gl.getActiveUniform(program, i)!;
    const key = info.name.replace(/\[0\]$/, "");
    const loc = gl.getUniformLocation(program, info.name);
    if (loc) u[key] = loc;
  }
  return { program, u };
}

// A unit box. Each face has its own vertices, because each has its own normal.
function boxFaces(): { data: Float32Array; ranges: Record<string, [number, number]> } {
  const faces: Record<string, { n: number[]; v: number[][] }> = {
    front: { n: [0, 0, 1], v: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]] },
    top: { n: [0, -1, 0], v: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]] },
    bottom: { n: [0, 1, 0], v: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]] },
    left: { n: [-1, 0, 0], v: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]] },
    right: { n: [1, 0, 0], v: [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]] },
  };
  const out: number[] = [];
  const ranges: Record<string, [number, number]> = {};
  let first = 0;
  for (const [name, face] of Object.entries(faces)) {
    const uv = [[0, 0], [1, 0], [1, 1], [0, 1]];
    for (const i of [0, 1, 2, 0, 2, 3]) out.push(...face.v[i], ...face.n, ...uv[i]);
    ranges[name] = [first, 6];
    first += 6;
  }
  return { data: new Float32Array(out), ranges };
}

const HALTON_16 = Array.from({ length: 16 }, (_, i) => {
  const h = (n: number, b: number) => {
    let f = 1;
    let r = 0;
    while (n > 0) {
      f /= b;
      r += f * (n % b);
      n = Math.floor(n / b);
    }
    return r;
  };
  return [h(i + 1, 2) - 0.5, h(i + 1, 3) - 0.5];
});

export type Engine = ReturnType<typeof createEngine>;

export function createEngine(canvas: HTMLCanvasElement | OffscreenCanvas) {
  const gl = canvas.getContext("webgl2", {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    premultipliedAlpha: true,
    powerPreference: "high-performance",
    preserveDrawingBuffer: false,
  }) as WebGL2RenderingContext | null;
  if (!gl) throw new Error("no webgl2");
  if (!gl.getExtension("EXT_color_buffer_float") && !gl.getExtension("EXT_color_buffer_half_float")) {
    throw new Error("no float render target");
  }
  // From the prototype: after a restored context this is the same object, already wrapped once.
  const realDraw = WebGL2RenderingContext.prototype.drawArrays.bind(gl);
  gl.drawArrays = (mode: number, first: number, count: number) => {
    drawCalls++;
    totalDraws++;
    realDraw(mode, first, count);
  };
  const aniso = gl.getExtension("EXT_texture_filter_anisotropic");
  const maxAniso = aniso ? Math.min(8, gl.getParameter(aniso.MAX_TEXTURE_MAX_ANISOTROPY_EXT) as number) : 1;

  const programs = {
    wall: link(gl, shaders.worldVert, shaders.wallFrag, "wall"),
    shoe: link(gl, shaders.worldVert, shaders.shoeFrag, "shoe"),
    slab: link(gl, shaders.worldVert, shaders.slabFrag, "slab"),
    bracket: link(gl, shaders.worldVert, shaders.bracketFrag, "bracket"),
    present: link(gl, shaders.fullscreenVert, shaders.presentFrag, "present"),
    accumulate: link(gl, shaders.fullscreenVert, shaders.accumulateFrag, "accumulate"),
  };

  const box = boxFaces();
  const quad = new Float32Array([
    0, 0, 0, 0, 0, 1, 0, 0,
    1, 0, 0, 0, 0, 1, 1, 0,
    1, 1, 0, 0, 0, 1, 1, 1,
    0, 0, 0, 0, 0, 1, 0, 0,
    1, 1, 0, 0, 0, 1, 1, 1,
    0, 1, 0, 0, 0, 1, 0, 1,
  ]);
  const makeVao = (data: Float32Array) => {
    const vao = gl.createVertexArray()!;
    gl.bindVertexArray(vao);
    const buffer = gl.createBuffer()!;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 32, 0);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 32, 12);
    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 32, 24);
    return vao;
  };
  const quadVao = makeVao(quad);
  const boxVao = makeVao(box.data);
  const emptyVao = gl.createVertexArray()!;
  gl.bindVertexArray(null);

  const textures = {
    albedo: gl.createTexture()!,
    normal: gl.createTexture()!,
    detail: gl.createTexture()!,
    noise: gl.createTexture()!,
    shadows: gl.createTexture()!,
  };
  const shoeTextures: WebGLTexture[] = [];
  // Larger pictures, for the shoe in focus and those next to it. Decoded off to one side, uploaded a step per frame.
  type Large = { texture: WebGLTexture | null; bitmap: ImageBitmap | null; ready: boolean; bytes: number };
  const larges = new Map<number, Large>();
  let baseBytes = 0;
  let totalDraws = 0;
  let shoes: RoomShoe[] = [];
  let flip = 0;
  const failedShoes = new Set<number>();
  let leds: (readonly [number, number, number])[] = [];

  async function loadBitmap(url: string, options: ImageBitmapOptions): Promise<ImageBitmap> {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`${url}: ${response.status}`);
    return createImageBitmap(await response.blob(), options);
  }

  function dataTexture(texture: WebGLTexture, bitmap: ImageBitmap, wrap: number, mips: boolean) {
    gl!.bindTexture(gl!.TEXTURE_2D, texture);
    gl!.pixelStorei(gl!.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl!.NONE);
    gl!.pixelStorei(gl!.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.RGBA8, gl!.RGBA, gl!.UNSIGNED_BYTE, bitmap);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_S, wrap);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_T, wrap);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MAG_FILTER, mips ? gl!.LINEAR : gl!.NEAREST);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MIN_FILTER, mips ? gl!.LINEAR_MIPMAP_LINEAR : gl!.NEAREST);
    if (mips) {
      gl!.generateMipmap(gl!.TEXTURE_2D);
      if (aniso) gl!.texParameterf(gl!.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, maxAniso);
    }
    bitmap.close();
  }

  function shoeTexture(index: number, bitmap: ImageBitmap) {
    baseBytes += Math.round(bitmap.width * bitmap.height * 4 * 1.34);
    const texture = shoeTextures[index] ?? (shoeTextures[index] = gl!.createTexture()!);
    gl!.bindTexture(gl!.TEXTURE_2D, texture);
    gl!.pixelStorei(gl!.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl!.NONE);
    gl!.pixelStorei(gl!.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.RGBA8, gl!.RGBA, gl!.UNSIGNED_BYTE, bitmap);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_S, gl!.CLAMP_TO_EDGE);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_T, gl!.CLAMP_TO_EDGE);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MAG_FILTER, gl!.LINEAR);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MIN_FILTER, gl!.LINEAR_MIPMAP_LINEAR);
    gl!.generateMipmap(gl!.TEXTURE_2D);
    if (aniso) gl!.texParameterf(gl!.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, maxAniso);
    bitmap.close();
  }

  function emptyShoe(index: number) {
    const texture = shoeTextures[index] ?? (shoeTextures[index] = gl!.createTexture()!);
    gl!.bindTexture(gl!.TEXTURE_2D, texture);
    gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.RGBA8, 1, 1, 0, gl!.RGBA, gl!.UNSIGNED_BYTE, new Uint8Array(4));
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MIN_FILTER, gl!.LINEAR);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MAG_FILTER, gl!.LINEAR);
  }

  async function loadShadow(layer: number, shoe: RoomShoe) {
    const response = await fetch(shoe.shadow.file);
    const blob = await response.blob();
    const levels = shoe.shadow.rects.length;
    for (let level = 0; level < levels; level++) {
      const [x, y, w, h] = shoe.shadow.rects[level];
      const size = SHADOW_SIZE >> level;
      const bitmap = await createImageBitmap(blob, x, y, w, h, {
        resizeWidth: size,
        resizeHeight: size,
        resizeQuality: "high",
        premultiplyAlpha: "none",
        colorSpaceConversion: "none",
      });
      gl!.bindTexture(gl!.TEXTURE_2D_ARRAY, textures.shadows);
      gl!.texSubImage3D(gl!.TEXTURE_2D_ARRAY, level, 0, 0, layer, size, size, 1, gl!.RGBA, gl!.UNSIGNED_BYTE, bitmap);
      bitmap.close();
    }
  }

  async function load(assets: RoomAssets) {
    shoes = assets.shoes;
    leds = shoes.map((s) => hexToLinear(s.ledColor));
    flip = assets.flip ? 1 : 0;
    const raw: ImageBitmapOptions = { premultiplyAlpha: "none", colorSpaceConversion: "none" };
    const [albedo, normal, detail, noise] = await Promise.all([
      loadBitmap(assets.wall.albedo, raw),
      loadBitmap(assets.wall.normal, raw),
      loadBitmap(assets.wall.detail, raw),
      loadBitmap(assets.noise, raw),
    ]);
    dataTexture(textures.albedo, albedo, gl!.MIRRORED_REPEAT, true);
    dataTexture(textures.normal, normal, gl!.MIRRORED_REPEAT, true);
    dataTexture(textures.detail, detail, gl!.REPEAT, true);
    dataTexture(textures.noise, noise, gl!.REPEAT, false);

    gl!.bindTexture(gl!.TEXTURE_2D_ARRAY, textures.shadows);
    gl!.texStorage3D(gl!.TEXTURE_2D_ARRAY, 5, gl!.RGBA8, SHADOW_SIZE, SHADOW_SIZE, Math.max(1, shoes.length));
    gl!.texParameteri(gl!.TEXTURE_2D_ARRAY, gl!.TEXTURE_MIN_FILTER, gl!.LINEAR_MIPMAP_LINEAR);
    gl!.texParameteri(gl!.TEXTURE_2D_ARRAY, gl!.TEXTURE_MAG_FILTER, gl!.LINEAR);
    gl!.texParameteri(gl!.TEXTURE_2D_ARRAY, gl!.TEXTURE_WRAP_S, gl!.CLAMP_TO_EDGE);
    gl!.texParameteri(gl!.TEXTURE_2D_ARRAY, gl!.TEXTURE_WRAP_T, gl!.CLAMP_TO_EDGE);
    gl!.texParameteri(gl!.TEXTURE_2D_ARRAY, gl!.TEXTURE_MAX_LEVEL, 4);

    // One picture failing must not take the others with it: its slab and caption stay, and its link still works.
    await Promise.all(
      shoes.map(async (shoe, i) => {
        emptyShoe(i);
        try {
          const bitmap = await loadBitmap(shoe.src, { premultiplyAlpha: "premultiply", colorSpaceConversion: "none" });
          shoeTexture(i, bitmap);
          await loadShadow(i, shoe);
        } catch {
          failedShoes.add(i);
        }
      }),
    );
  }

  async function useLarge(index: number) {
    const url = shoes[index]?.large;
    if (!url || failedShoes.has(index)) return;
    try {
      shoeTexture(index, await loadBitmap(url, { premultiplyAlpha: "premultiply", colorSpaceConversion: "none" }));
    } catch {
      // The smaller picture stays. The walk never waits for this one.
    }
  }

  /** Fetch and decode a larger picture. Nothing touches the GPU yet, so this can never make a frame late. */
  async function requestLarge(index: number): Promise<boolean> {
    const url = shoes[index]?.large;
    if (!url || url === shoes[index].src || failedShoes.has(index) || larges.has(index)) return false;
    const entry: Large = { texture: null, bitmap: null, ready: false, bytes: 0 };
    larges.set(index, entry);
    try {
      const bitmap = await loadBitmap(url, { premultiplyAlpha: "premultiply", colorSpaceConversion: "none" });
      // Let go while it was on its way.
      if (larges.get(index) !== entry) {
        bitmap.close();
        return false;
      }
      entry.bitmap = bitmap;
      return true;
    } catch {
      larges.delete(index); // the smaller picture stays, and the walk never waited for this one
      return false;
    }
  }

  /** One step of one upload: the picture in one frame, its smaller levels in the next. True if there was work. */
  function pumpUpload(): boolean {
    for (const entry of larges.values()) {
      if (entry.ready || !entry.bitmap) continue;
      const g = gl!;
      if (!entry.texture) {
        const texture = g.createTexture()!;
        g.bindTexture(g.TEXTURE_2D, texture);
        const { width, height } = entry.bitmap;
        const levels = Math.floor(Math.log2(Math.max(width, height))) + 1;
        g.texStorage2D(g.TEXTURE_2D, levels, g.RGBA8, width, height);
        g.pixelStorei(g.UNPACK_COLORSPACE_CONVERSION_WEBGL, g.NONE);
        g.pixelStorei(g.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
        g.texSubImage2D(g.TEXTURE_2D, 0, 0, 0, g.RGBA, g.UNSIGNED_BYTE, entry.bitmap);
        g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_S, g.CLAMP_TO_EDGE);
        g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_T, g.CLAMP_TO_EDGE);
        g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MAG_FILTER, g.LINEAR);
        g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MIN_FILTER, g.LINEAR_MIPMAP_LINEAR);
        if (aniso) g.texParameterf(g.TEXTURE_2D, aniso.TEXTURE_MAX_ANISOTROPY_EXT, maxAniso);
        entry.texture = texture;
        entry.bytes = Math.round(width * height * 4 * 1.34);
        return true;
      }
      g.bindTexture(g.TEXTURE_2D, entry.texture);
      g.generateMipmap(g.TEXTURE_2D);
      entry.bitmap.close();
      entry.bitmap = null;
      entry.ready = true;
      return true;
    }
    return false;
  }

  const largeReady = (index: number) => larges.get(index)?.ready ?? false;

  /** Keep only these. The rest go back to the smaller picture. */
  function keepLarge(keep: (index: number) => boolean) {
    for (const [index, entry] of larges) {
      if (keep(index)) continue;
      entry.bitmap?.close();
      if (entry.texture) gl!.deleteTexture(entry.texture);
      larges.delete(index);
    }
  }

  // Render targets, rebuilt only when the size changes.
  let targetW = 0;
  let targetH = 0;
  let sceneFbo: WebGLFramebuffer | null = null;
  let sceneTex: WebGLTexture | null = null;
  let msaaFbo: WebGLFramebuffer | null = null;
  let msaaRb: WebGLRenderbuffer | null = null;
  let accumFbo: WebGLFramebuffer | null = null;
  let accumTex: WebGLTexture | null = null;
  let samples = 0;
  let drawCalls = 0;

  function floatTarget(w: number, h: number): { fbo: WebGLFramebuffer; tex: WebGLTexture } {
    const tex = gl!.createTexture()!;
    gl!.bindTexture(gl!.TEXTURE_2D, tex);
    gl!.texStorage2D(gl!.TEXTURE_2D, 1, gl!.RGBA16F, w, h);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MIN_FILTER, gl!.NEAREST);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MAG_FILTER, gl!.NEAREST);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_S, gl!.CLAMP_TO_EDGE);
    gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_T, gl!.CLAMP_TO_EDGE);
    const fbo = gl!.createFramebuffer()!;
    gl!.bindFramebuffer(gl!.FRAMEBUFFER, fbo);
    gl!.framebufferTexture2D(gl!.FRAMEBUFFER, gl!.COLOR_ATTACHMENT0, gl!.TEXTURE_2D, tex, 0);
    return { fbo, tex };
  }

  function resize(w: number, h: number, wantSamples: number) {
    if (w === targetW && h === targetH && wantSamples === samples) return;
    if (sceneTex) gl!.deleteTexture(sceneTex);
    if (accumTex) gl!.deleteTexture(accumTex);
    if (sceneFbo) gl!.deleteFramebuffer(sceneFbo);
    if (accumFbo) gl!.deleteFramebuffer(accumFbo);
    if (msaaFbo) gl!.deleteFramebuffer(msaaFbo);
    if (msaaRb) gl!.deleteRenderbuffer(msaaRb);
    msaaFbo = null;
    msaaRb = null;
    canvas.width = w;
    canvas.height = h;
    const scene = floatTarget(w, h);
    sceneFbo = scene.fbo;
    sceneTex = scene.tex;
    const accum = floatTarget(w, h);
    accumFbo = accum.fbo;
    accumTex = accum.tex;
    samples = wantSamples;
    if (samples > 0) {
      msaaRb = gl!.createRenderbuffer()!;
      gl!.bindRenderbuffer(gl!.RENDERBUFFER, msaaRb);
      gl!.renderbufferStorageMultisample(gl!.RENDERBUFFER, samples, gl!.RGBA16F, w, h);
      msaaFbo = gl!.createFramebuffer()!;
      gl!.bindFramebuffer(gl!.FRAMEBUFFER, msaaFbo);
      gl!.framebufferRenderbuffer(gl!.FRAMEBUFFER, gl!.COLOR_ATTACHMENT0, gl!.RENDERBUFFER, msaaRb);
    }
    targetW = w;
    targetH = h;
  }

  function bind2D(unit: number, texture: WebGLTexture) {
    gl!.activeTexture(gl!.TEXTURE0 + unit);
    gl!.bindTexture(gl!.TEXTURE_2D, texture);
  }

  function drawScene(layout: WallLayout, cssW: number, cssH: number, state: RoomState, jx: number, jy: number) {
    const g = gl!;
    const L = state.lighting;
    const vp = viewProjection(state.pose, cssW, cssH, (jx * 2) / targetW, (jy * 2) / targetH);
    const keyPos: [number, number, number] = [cssW * L.keyXShare, layout.contentHeight * L.keyHeightShare, L.keyZ];
    const keyPower = L.keyPower * state.keyScale;
    const ambient: [number, number, number] = [
      L.ambient[0] * state.ambientScale,
      L.ambient[1] * state.ambientScale,
      L.ambient[2] * state.ambientScale,
    ];
    const n = Math.min(layout.slots.length, MAX_SHOES);

    // The wall.
    g.disable(g.BLEND);
    {
      const p = programs.wall;
      g.useProgram(p.program);
      g.bindVertexArray(quadVao);
      g.uniformMatrix4fv(p.u.uViewProj, false, vp);
      const span = 40000;
      g.uniform3f(p.u.uOrigin, cssW / 2 - span / 2, layout.contentHeight / 2 - span / 2, 0);
      g.uniform3f(p.u.uScale, span, span, 1);
      bind2D(0, textures.albedo);
      bind2D(1, textures.normal);
      bind2D(2, textures.detail);
      g.activeTexture(g.TEXTURE3);
      g.bindTexture(g.TEXTURE_2D_ARRAY, textures.shadows);
      g.uniform1i(p.u.uAlbedo, 0);
      g.uniform1i(p.u.uNormal, 1);
      g.uniform1i(p.u.uDetail, 2);
      g.uniform1i(p.u.uShadows, 3);
      const wallSpan = 2300;
      g.uniform2f(p.u.uWallScale, 1 / wallSpan, 1 / wallSpan);
      g.uniform2f(p.u.uWallOffset, 0.07, 0.11);
      g.uniform1f(p.u.uDetailScale, 1 / 170);
      g.uniform1f(p.u.uContrast, L.contrast);
      g.uniform1f(p.u.uChroma, L.chroma);
      g.uniform1f(p.u.uMapBias, state.mapBias);
      g.uniform1f(p.u.uRelief, L.relief * state.reliefScale);
      g.uniform1f(p.u.uDetailRelief, L.detailRelief * state.detailScale);
      g.uniform3fv(p.u.uWallBase, L.wallBase as unknown as number[]);
      g.uniform3fv(p.u.uAmbient, ambient);
      g.uniform3fv(p.u.uKeyPos, keyPos);
      g.uniform3fv(p.u.uKeyColor, L.keyColor as unknown as number[]);
      g.uniform1f(p.u.uKeyPower, keyPower);
      g.uniform1f(p.u.uKeyShadow, L.keyShadow);
      g.uniform1f(p.u.uSlabShadow, L.slabShadow);
      g.uniform1f(p.u.uStripPower, L.stripPower);
      g.uniform1f(p.u.uShoeZ, SHOE_Z);
      g.uniform2f(p.u.uRoom, cssW / 2, cssW / 2);
      g.uniform3f(p.u.uTorchPos, state.torch.x, state.torch.y, L.torchZ);
      g.uniform3f(p.u.uTorchColor, 1.0, 0.96, 0.9);
      g.uniform1f(p.u.uTorchPower, state.torch.power);
      g.uniform2f(p.u.uPanelFade, state.panelFade[0], state.panelFade[1]);
      g.uniform2f(p.u.uViewport, targetW, targetH);
      g.uniform1f(p.u.uFlip, flip);
      g.uniform1i(p.u.uCount, n);
      const rects = new Float32Array(n * 4);
      const bases = new Float32Array(n * 3);
      const strips = new Float32Array(n * 4);
      const ledA = new Float32Array(n * 4);
      const slabs = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) {
        const s = layout.slots[i];
        const padShare = shoes[i].shadow.pad / (1 - 2 * shoes[i].shadow.pad);
        const pad = s.card.w * padShare;
        rects.set([s.card.x - pad, s.card.y - pad, s.card.x + s.card.w + pad, s.card.y + s.card.h + pad], i * 4);
        bases.set([s.slab.y, s.card.h, state.shoes[i]?.panelAmount ?? 0], i * 3);
        strips.set([s.strip.x0, s.strip.x1, s.strip.y, s.strip.z], i * 4);
        ledA.set([leds[i][0], leds[i][1], leds[i][2], state.shoes[i]?.level ?? 0], i * 4);
        slabs.set([s.slab.x0, s.slab.x1, s.slab.y], i * 3);
      }
      g.uniform4fv(p.u.uShoeRect, rects);
      g.uniform3fv(p.u.uShoeBase, bases);
      g.uniform4fv(p.u.uStrip, strips);
      g.uniform4fv(p.u.uLed, ledA);
      g.uniform3fv(p.u.uSlab, slabs);
      g.drawArrays(g.TRIANGLES, 0, 6);
    }

    // Each shelf, far parts first.
    const cam = state.pose;
    for (let i = 0; i < n; i++) {
      const slot = layout.slots[i];
      const st = state.shoes[i] ?? { level: 0, exposure: L.shoeExposure, mipBias: 0, fade: 1, panelAmount: 0 };
      const led = leds[i];
      const min: [number, number, number] = [slot.slab.x0, slot.slab.y, SLAB.zBack];
      const max: [number, number, number] = [slot.slab.x1, slot.slab.y + SLAB.thick, SLAB.zBack + SLAB.depth];

      // Brackets, under the slab.
      g.enable(g.BLEND);
      g.blendFunc(g.ONE, g.ONE_MINUS_SRC_ALPHA);
      {
        const p = programs.bracket;
        g.useProgram(p.program);
        g.bindVertexArray(boxVao);
        g.uniformMatrix4fv(p.u.uViewProj, false, vp);
        g.uniform3fv(p.u.uKeyPos, keyPos);
        g.uniform3fv(p.u.uKeyColor, L.keyColor as unknown as number[]);
        g.uniform1f(p.u.uKeyPower, keyPower);
        g.uniform3fv(p.u.uAmbient, ambient);
        g.uniform3fv(p.u.uSteel, L.steel as unknown as number[]);
        g.uniform3fv(p.u.uLedColor, led as unknown as number[]);
        g.uniform1f(p.u.uLedLevel, st.level);
        g.uniform1f(p.u.uStripPower, L.stripPower);
        g.uniform3f(p.u.uStripPoint, (slot.strip.x0 + slot.strip.x1) / 2, slot.strip.y, slot.strip.z);
        g.uniform2f(p.u.uPanelFade, state.panelFade[0], state.panelFade[1]);
        g.uniform1f(p.u.uPanelAmount, st.panelAmount);
        g.uniform2f(p.u.uViewport, targetW, targetH);
        const w = slot.slab.x1 - slot.slab.x0;
        for (const share of [0.2, 0.8]) {
          g.uniform3f(p.u.uOrigin, slot.slab.x0 + w * share - 3, slot.slab.y + SLAB.thick, 0);
          g.uniform3f(p.u.uScale, 6, 3, 20);
          for (const face of ["top", "bottom", "left", "right", "front"]) {
            const [first, count] = box.ranges[face];
            g.drawArrays(g.TRIANGLES, first, count);
          }
        }
      }

      const slabP = programs.slab;
      g.useProgram(slabP.program);
      g.bindVertexArray(boxVao);
      g.uniformMatrix4fv(slabP.u.uViewProj, false, vp);
      g.uniform3f(slabP.u.uCamera, cam.x, cam.y, cam.z);
      g.uniform3fv(slabP.u.uBoxMin, min);
      g.uniform3fv(slabP.u.uBoxMax, max);
      g.uniform2f(slabP.u.uStripX, slot.strip.x0, slot.strip.x1);
      g.uniform3fv(slabP.u.uLedColor, led as unknown as number[]);
      g.uniform1f(slabP.u.uLedLevel, st.level);
      g.uniform3fv(slabP.u.uKeyPos, keyPos);
      g.uniform3fv(slabP.u.uKeyColor, L.keyColor as unknown as number[]);
      g.uniform1f(slabP.u.uKeyPower, keyPower);
      g.uniform3fv(slabP.u.uAmbient, ambient);
      g.uniform3fv(slabP.u.uBodyTint, L.bodyTint as unknown as number[]);
      g.uniform1f(slabP.u.uBodyAlpha, L.bodyAlpha);
      g.uniform1f(slabP.u.uRimGain, L.rimGain);
      g.uniform1f(slabP.u.uStripGain, L.stripGain);
      g.uniform1f(slabP.u.uStripIdle, L.stripIdle);
      bind2D(0, shoeTextures[i]);
      g.uniform1i(slabP.u.uShoe, 0);
      g.uniform4f(slabP.u.uShoeRect, slot.card.x, slot.card.y, slot.card.x + slot.card.w, slot.card.y + slot.card.h);
      g.uniform1f(slabP.u.uShoeZ, SHOE_Z);
      g.uniform1f(slabP.u.uBaselineY, slot.slab.y);
      g.uniform2f(slabP.u.uContact, slot.contact[0], slot.contact[1]);
      g.uniform1f(slabP.u.uContactGain, L.contactGain);
      g.uniform1f(slabP.u.uReflectGain, L.reflectGain * (st.exposure / Math.max(L.shoeExposure, 0.01)));
      g.uniform2f(slabP.u.uPanelFade, state.panelFade[0], state.panelFade[1]);
      g.uniform1f(slabP.u.uPanelAmount, st.panelAmount);
      g.uniform1f(slabP.u.uFlip, flip);
      g.uniform2f(slabP.u.uViewport, targetW, targetH);

      const size: [number, number, number] = [max[0] - min[0], max[1] - min[1], max[2] - min[2]];
      const face = (name: string, zFrom = min[2], zTo = max[2]) => {
        g.uniform3f(slabP.u.uOrigin, min[0], min[1], zFrom);
        g.uniform3f(slabP.u.uScale, size[0], size[1], zTo - zFrom);
        const [first, count] = box.ranges[name];
        g.drawArrays(g.TRIANGLES, first, count);
      };
      const camAbove = cam.y < slot.slab.y;
      const camBelowFloor = cam.y > max[1];
      // Far faces of the slab, before the shoe.
      if (!camBelowFloor) face("bottom");
      face("top", min[2], SHOE_Z);
      if (cam.x > min[0]) face("left");
      if (cam.x < max[0]) face("right");

      // The shoe.
      {
        const p = programs.shoe;
        g.useProgram(p.program);
        g.bindVertexArray(quadVao);
        g.uniformMatrix4fv(p.u.uViewProj, false, vp);
        g.uniform3f(p.u.uOrigin, slot.card.x, slot.card.y, SHOE_Z);
        g.uniform3f(p.u.uScale, slot.card.w, slot.card.h, 1);
        bind2D(0, shoeTextures[i]);
        g.uniform1i(p.u.uShoe, 0);
        const large = larges.get(i);
        const largeMix = large?.ready ? (st.largeMix ?? 0) : 0;
        if (largeMix > 0) bind2D(1, large!.texture!);
        g.uniform1i(p.u.uShoeLarge, 1);
        g.uniform1f(p.u.uLargeMix, largeMix);
        g.uniform1f(p.u.uMipBias, st.mipBias);
        g.uniform1f(p.u.uExposure, st.exposure);
        g.uniform3fv(p.u.uLedColor, led as unknown as number[]);
        g.uniform1f(p.u.uLedLevel, st.level);
        g.uniform1f(p.u.uSoleCatch, L.soleCatch);
        g.uniform1f(p.u.uBaseline, shoes[i].baseline);
        g.uniform2f(p.u.uPanelFade, state.panelFade[0], state.panelFade[1]);
        g.uniform1f(p.u.uPanelAmount, st.panelAmount);
        g.uniform1f(p.u.uFadeAll, st.fade);
        g.uniform1f(p.u.uFlip, flip);
        g.uniform2f(p.u.uViewport, targetW, targetH);
        g.drawArrays(g.TRIANGLES, 0, 6);
      }

      // Near faces of the slab, over the shoe.
      g.useProgram(slabP.program);
      g.bindVertexArray(boxVao);
      face("top", SHOE_Z, max[2]);
      if (camBelowFloor) face("bottom");
      if (cam.x < min[0]) face("left");
      if (cam.x > max[0]) face("right");
      face("front");
      void camAbove;
    }
    g.disable(g.BLEND);
  }

  function renderFrame(layout: WallLayout, cssW: number, cssH: number, state: RoomState, jx: number, jy: number) {
    const g = gl!;
    g.viewport(0, 0, targetW, targetH);
    if (samples > 0 && msaaFbo) {
      g.bindFramebuffer(g.FRAMEBUFFER, msaaFbo);
      drawScene(layout, cssW, cssH, state, jx, jy);
      g.bindFramebuffer(g.READ_FRAMEBUFFER, msaaFbo);
      g.bindFramebuffer(g.DRAW_FRAMEBUFFER, sceneFbo);
      g.blitFramebuffer(0, 0, targetW, targetH, 0, 0, targetW, targetH, g.COLOR_BUFFER_BIT, g.NEAREST);
    } else {
      g.bindFramebuffer(g.FRAMEBUFFER, sceneFbo);
      drawScene(layout, cssW, cssH, state, jx, jy);
    }
  }

  let worldDim = 1;

  function present(source: WebGLTexture) {
    const g = gl!;
    g.bindFramebuffer(g.FRAMEBUFFER, null);
    g.viewport(0, 0, targetW, targetH);
    g.disable(g.BLEND);
    const p = programs.present;
    g.useProgram(p.program);
    g.bindVertexArray(emptyVao);
    bind2D(0, source);
    bind2D(1, textures.noise);
    g.uniform1i(p.u.uScene, 0);
    g.uniform1i(p.u.uNoise, 1);
    g.uniform1f(p.u.uDither, 1.0);
    g.uniform1f(p.u.uWorldDim, worldDim);
    g.drawArrays(g.TRIANGLES, 0, 3);
  }

  let small = false;

  function samplesFor(w: number, h: number): number {
    const limit = gl!.getParameter(gl!.MAX_SAMPLES) as number;
    const pixels = w * h;
    // Past 5 MP the pixels themselves do the work while moving, and a still is averaged anyway.
    const want = small ? 2 : pixels <= 2_600_000 ? 4 : pixels <= 5_000_000 ? 2 : 0;
    return Math.min(limit, want);
  }

  /**
   * One frame of motion, or one step of a still. A still is built one jittered frame at a time across animation
   * frames, so it never makes a long frame. Its first frame has no jitter and is the same picture as a moving
   * frame, so nothing shifts at the moment the camera stops. Pass stillIndex -1 while moving.
   */
  function frame(layout: WallLayout, cssW: number, cssH: number, dpr: number, state: RoomState, stillIndex: number) {
    const g = gl!;
    const w = Math.round(cssW * dpr);
    const h = Math.round(cssH * dpr);
    resize(w, h, samplesFor(w, h));
    drawCalls = 0;
    worldDim = state.worldDim;
    if (stillIndex < 0) {
      renderFrame(layout, cssW, cssH, state, 0, 0);
      present(sceneTex!);
      return drawCalls;
    }
    const [jx, jy] = stillIndex === 0 ? [0, 0] : HALTON_16[(stillIndex - 1) % 16];
    renderFrame(layout, cssW, cssH, state, jx, jy);
    g.bindFramebuffer(g.FRAMEBUFFER, accumFbo);
    g.viewport(0, 0, targetW, targetH);
    const p = programs.accumulate;
    g.useProgram(p.program);
    g.bindVertexArray(emptyVao);
    bind2D(0, sceneTex!);
    g.uniform1i(p.u.uFrame, 0);
    g.uniform1f(p.u.uWeight, 1 / (stillIndex + 1));
    if (stillIndex === 0) {
      g.disable(g.BLEND);
    } else {
      g.enable(g.BLEND);
      g.blendFunc(g.SRC_ALPHA, g.ONE_MINUS_SRC_ALPHA);
    }
    g.drawArrays(g.TRIANGLES, 0, 3);
    g.disable(g.BLEND);
    present(accumTex!);
    return drawCalls;
  }

  /** One still: frames jittered below a pixel, averaged in linear light, then shown. Then nothing draws. */
  function renderStill(layout: WallLayout, cssW: number, cssH: number, dpr: number, state: RoomState, frames = 16) {
    const g = gl!;
    resize(Math.round(cssW * dpr), Math.round(cssH * dpr), 0);
    worldDim = state.worldDim;
    for (let i = 0; i < frames; i++) {
      const [jx, jy] = HALTON_16[i % 16];
      renderFrame(layout, cssW, cssH, state, jx, jy);
      g.bindFramebuffer(g.FRAMEBUFFER, accumFbo);
      g.viewport(0, 0, targetW, targetH);
      const p = programs.accumulate;
      g.useProgram(p.program);
      g.bindVertexArray(emptyVao);
      bind2D(0, sceneTex!);
      g.uniform1i(p.u.uFrame, 0);
      g.uniform1f(p.u.uWeight, 1 / (i + 1));
      if (i === 0) {
        g.disable(g.BLEND);
      } else {
        g.enable(g.BLEND);
        g.blendFunc(g.SRC_ALPHA, g.ONE_MINUS_SRC_ALPHA);
      }
      g.drawArrays(g.TRIANGLES, 0, 3);
    }
    g.disable(g.BLEND);
    present(accumTex!);
    g.finish();
  }

  function stats() {
    let largeBytes = 0;
    let largeCount = 0;
    for (const entry of larges.values()) {
      largeBytes += entry.bytes;
      if (entry.ready) largeCount++;
    }
    const pixels = targetW * targetH;
    const wall = 1024 * 1024 * 4 * 1.34 * 2 + 512 * 512 * 4 * 1.34 + SHADOW_SIZE * SHADOW_SIZE * 4 * 1.34 * Math.max(1, shoes.length);
    const targets = pixels * 8 * 2 + pixels * 8 * samples + pixels * 4;
    return { draws: totalDraws, samples, width: targetW, height: targetH, larges: largeCount, largeBytes, baseBytes, wallBytes: Math.round(wall), targetBytes: targets, textureBytes: Math.round(baseBytes + largeBytes + wall), allBytes: Math.round(baseBytes + largeBytes + wall + targets) };
  }

  function info() {
    const dbg = gl!.getExtension("WEBGL_debug_renderer_info");
    return {
      renderer: dbg ? (gl!.getParameter(dbg.UNMASKED_RENDERER_WEBGL) as string) : "unknown",
      maxSamples: gl!.getParameter(gl!.MAX_SAMPLES) as number,
      aniso: maxAniso,
      error: gl!.getError(),
    };
  }

  return {
    load,
    useLarge,
    requestLarge,
    pumpUpload,
    largeReady,
    keepLarge,
    renderStill,
    frame,
    info,
    stats,
    setSmall(value: boolean) {
      small = value;
    },
  };
}
