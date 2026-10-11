import type { CSSProperties } from "react";
import type { Blend, HeroVisual as Visual } from "./demo-types";

const shape: Record<Visual, string> = { Ring: "ih-ring", Orb: "ih-orb", Prism: "ih-prism" };
const blendMode: Record<Blend, string> = { Normal: "normal", Overlay: "overlay", Screen: "screen" };

/**
 * The hero's abstract 3D-looking object, drawn with CSS gradients only: a metallic ring, a glossy orb or a
 * faceted prism, slowly turning, with a halo whose strength is the Glow setting and a highlight layer whose
 * blend mode is the Blend setting.
 */
export function HeroVisual({
  visual,
  glow = 20,
  blend = "Overlay",
  className = "",
}: {
  visual: Visual;
  glow?: number;
  blend?: Blend;
  className?: string;
}) {
  return (
    <div className={`relative grid place-items-center ${className}`}>
      <div
        aria-hidden
        className="absolute inset-[-18%] rounded-full transition-opacity duration-500"
        style={{
          background: "radial-gradient(closest-side, color-mix(in oklab, var(--ih-accent) 70%, transparent), transparent)",
          opacity: Math.min(1, glow / 60),
          filter: "blur(18px)",
        }}
      />
      <div
        aria-hidden
        className={`ih-visual w-full ${shape[visual]}`}
        style={{ "--ih-blend": blendMode[blend] } as CSSProperties}
      />
    </div>
  );
}
