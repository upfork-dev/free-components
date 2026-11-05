"use client";

import "@fontsource-variable/archivo/wdth.css";
import { Floodlit } from "../floodlit";
import { varsaShoes } from "@/data/varsa-data";

// A smaller range: six pairs, one colour for every shelf, the day room.
const six = ["neon-racer", "red-high", "cobalt-runner", "olive-trail", "lagoon-low", "slate-gym"].map((id) => varsaShoes.find((s) => s.id === id)!);

export default function SixPairs() {
  return <Floodlit shoes={six} theme="light" ledMode="brand" ledColor="#FFB27A" eyebrow="Capsule" heading="Six pairs, one light." labels={{ demoLine: "Demo store. Nothing here is for sale." }} />;
}
