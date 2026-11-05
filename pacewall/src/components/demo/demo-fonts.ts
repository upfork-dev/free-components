"use client";

import { Archivo } from "next/font/google";
import { useEffect, type CSSProperties } from "react";

const archivo = Archivo({ subsets: ["latin"], axes: ["wdth"], display: "swap" });
const display = `${archivo.style.fontFamily}, "Arial Narrow", Arial, sans-serif`;
const text = `${archivo.style.fontFamily}, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Arial, sans-serif`;

/**
 * The installed component loads no font: it reads these two variables. They go on the page's root
 * as well as the wrapper, because the detail view and the bag are portals to <body>.
 */
export function useDemoFonts(): CSSProperties {
  useEffect(() => {
    const root = document.documentElement.style;
    root.setProperty("--pw-font-display", display);
    root.setProperty("--pw-font-text", text);
  }, []);
  return { "--pw-font-display": display, "--pw-font-text": text, fontFamily: text } as CSSProperties;
}
