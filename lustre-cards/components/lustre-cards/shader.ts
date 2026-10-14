import { Skia } from '@shopify/react-native-skia';

/**
 * The card's material, as a Skia runtime shader. A light sits in front of the card; as the card turns (yaw) or
 * tilts, the light's reflection slides across it. The metal is brushed: a fine grain runs one way, and the
 * reflection stretches along it. A clear coat adds a small sharp glint, the edges lift as the card turns away, a thin
 * film can shift its hue with the angle (holo), and frost can grow over it from one corner (the freeze).
 */
const SOURCE = `
uniform float2 size;
uniform float yaw;
uniform float2 tilt;
uniform float time;
uniform float3 toneA;
uniform float3 toneB;
uniform float3 specular;
uniform float roughness;
uniform float brush;
uniform float brushAngle;
uniform float coat;
uniform float holo;
uniform float frost;
uniform float freeze;
uniform float strength;

// A cheap, stable hash and value noise: no textures needed.
float hash(float2 p) {
  float3 q = fract(float3(p.xyx) * 0.1031);
  q += dot(q, q.yzx + 33.33);
  return fract((q.x + q.y) * q.z);
}

float noise(float2 p) {
  float2 i = floor(p);
  float2 f = fract(p);
  float2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + float2(1.0, 0.0)), u.x), mix(hash(i + float2(0.0, 1.0)), hash(i + float2(1.0, 1.0)), u.x), u.y);
}

half4 main(float2 xy) {
  float2 uv = xy / size;
  float aspect = size.y / size.x;
  // Square units: x runs 0..1 across the card, y 0..aspect down it.
  float2 p = float2(uv.x, uv.y * aspect);

  // Where the light's reflection falls. It slides across as the card turns, follows the tilt, and drifts a hair at rest.
  float2 light = float2(
    0.5 - sin(yaw) * 0.95 + tilt.x * 0.45 + sin(time * 1.05) * 0.012,
    aspect * (0.3 + tilt.y * 0.28) + cos(time * 0.8) * 0.012
  );

  float2 along = float2(cos(brushAngle), sin(brushAngle));
  float2 across = float2(-along.y, along.x);
  float2 d = p - light;
  float da = dot(d, along);
  float dc = dot(d, across);

  // The grain: fine across the brushing, long along it.
  float grain = noise(float2(dot(p, along) * 7.0, dot(p, across) * 380.0)) * 0.6
              + noise(float2(dot(p, along) * 2.5, dot(p, across) * 120.0)) * 0.4;
  grain = (grain - 0.5) * brush;

  // The base: a soft falloff between the two tones, and the grain in it.
  float shade = smoothstep(-0.25, 1.25, uv.y * 0.85 + uv.x * 0.3);
  float3 col = mix(toneA, toneB, shade);
  col *= 1.0 + grain * 0.2;

  // The reflection: a lobe stretched along the grain, narrow across it, broken up by the grain.
  float wAlong = mix(0.45, 1.9, brush) * (0.6 + roughness);
  float wAcross = 0.05 + roughness * 0.24;
  float lobe = exp(-(da * da) / (wAlong * wAlong) - (dc * dc) / (wAcross * wAcross));
  lobe *= 1.0 + grain * 0.9;

  // A broad sheen sweeping diagonally as the card turns.
  float sweep = dot(p, normalize(float2(1.0, 0.55))) - (0.62 - sin(yaw) * 1.15 + tilt.x * 0.3);
  float sheen = exp(-(sweep * sweep) / 0.055) * 0.32;

  // The clear coat's small, sharp glint.
  float2 g = p - (light + float2(0.07, -0.05));
  float glint = exp(-dot(g, g) / (0.003 + roughness * 0.008)) * coat;

  // The edges lift as the card turns away (Fresnel).
  float edgePx = min(min(xy.x, size.x - xy.x), min(xy.y, size.y - xy.y));
  float fres = (1.0 - smoothstep(0.0, size.x * 0.07, edgePx));
  fres = fres * fres * (0.2 + abs(sin(yaw)) * 0.7);

  float3 spec = specular * (lobe * 0.5 + sheen * 0.85 + glint * 0.8) * strength;

  // Thin film: the hue shifts with the angle of view.
  if (holo > 0.0) {
    float t = dot(p, float2(0.7, 0.5)) * 1.25 + yaw * 0.6 + tilt.x * 0.5 + tilt.y * 0.3;
    float3 film = 0.5 + 0.5 * cos(6.2832 * (t + float3(0.0, 0.33, 0.67)));
    float3 filmed = mix(col, film * 0.78 + 0.18, 0.56);
    col = mix(col, filmed, holo * (0.5 + 0.5 * clamp(lobe + sheen * 2.0, 0.0, 1.0)));
    spec *= mix(1.0, 0.78, holo);
  }

  col += spec + fres * specular * 0.3 * strength;

  // Frost: the frost material, or the freeze growing from the top left corner.
  float diag = (uv.x + uv.y * 0.85) / 1.85;
  float front = freeze * 1.3 - 0.12;
  float frozen = smoothstep(front + 0.07, front - 0.07, diag);
  float iceAmount = max(clamp(frost, 0.0, 1.0), frozen);
  if (iceAmount > 0.0) {
    float cells = noise(p * 24.0) * 0.55 + noise(p * 66.0) * 0.45;
    float3 ice = mix(float3(0.78, 0.85, 0.93), float3(0.95, 0.98, 1.0), cells);
    ice += specular * (lobe * 0.32 + sheen * 0.55) * strength;
    float h = hash(floor(p * 58.0));
    float twinkle = smoothstep(0.984, 1.0, h) * (0.5 + 0.5 * sin(time * 3.0 + h * 40.0 + yaw * 6.0));
    ice += twinkle * 0.85;
    // A brighter seam of crystals right at the moving front.
    float rimX = (diag - front) / 0.035;
    float rim = exp(-(rimX * rimX)) * step(0.002, freeze) * step(freeze, 0.998);
    ice += rim * 0.4;
    col = mix(col, ice, iceAmount);
  }

  // A soft shoulder instead of a hard clip: highlights roll off into white rather than flattening into a blob.
  float3 over = max(col - 0.8, 0.0);
  col = min(col, 0.8) + 0.2 * (1.0 - exp(-over / 0.2));

  // Dither by a fraction of a level, so slow gradients on dark metal never band.
  col += (hash(xy) - 0.5) / 255.0;
  return half4(half3(clamp(col, 0.0, 1.0)), 1.0);
}
`;

const effect = Skia.RuntimeEffect.Make(SOURCE);
if (!effect) {
  throw new Error('Lustre Cards: the material shader failed to compile.');
}

/** Compiled once, shared by every card. */
export const MATERIAL_SHADER = effect;
