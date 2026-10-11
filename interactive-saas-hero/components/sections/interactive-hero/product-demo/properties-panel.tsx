"use client";

import { useRef, type CSSProperties } from "react";
import { designOf, useDemo, type Design } from "./use-demo-store";
import { onRadioKeys } from "./radio-keys";
import { BREAKPOINT_WIDTH, type Blend, type Position, type SizeMode } from "./demo-types";

const POSITIONS: Position[] = ["Top", "Center", "Bottom"];
const SIZES: SizeMode[] = ["Fill", "Fit", "Fixed", "Min"];
const BLENDS: Blend[] = ["Normal", "Overlay", "Screen"];

/** The properties of the selected element, every one live on the canvas. */
export function PropertiesPanel() {
  const { state, dispatch } = useDemo();
  return (
    <div className="min-h-0 overflow-y-auto border-s border-(--ih-panel-line) bg-(--ih-panel) text-(--ih-panel-text)">
      <Section title="Position">
        <Segmented
          label="Caption position"
          options={POSITIONS}
          value={state.position}
          onChange={(position) => dispatch({ type: "set", patch: { position } })}
          tourPrefix="position"
        />
      </Section>
      <Section title="Size">
        <div className="mb-2 grid grid-cols-2 gap-2 font-mono text-[11px]">
          <Readout label="W" value={String(BREAKPOINT_WIDTH[state.breakpoint])} />
          <Readout label="H" value="Auto" />
        </div>
        <Segmented
          label="Caption width"
          options={SIZES}
          value={state.sizeMode}
          onChange={(sizeMode) => dispatch({ type: "set", patch: { sizeMode } })}
          tourPrefix="size"
        />
      </Section>
      <Section
        title="Effects"
        badge={<span className="rounded bg-(--ih-control) px-1.5 py-0.5 text-[10px] text-(--ih-panel-text-2)">3</span>}
      >
        <Slider label="Blur" unit="px" min={0} max={16} field="blur" />
        <Slider label="Glow" unit="%" min={0} max={60} field="glow" />
        <p className="mt-3 mb-1.5 text-[11px] text-(--ih-panel-text-2)">Blend</p>
        <Segmented
          label="Blend mode"
          options={BLENDS}
          value={state.blend}
          onChange={(blend) => dispatch({ type: "set", patch: { blend } })}
          tourPrefix="blend"
        />
      </Section>
    </div>
  );
}

function Section({ title, badge, children }: { title: string; badge?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="border-b border-(--ih-panel-line) px-3.5 py-3">
      <h3 className="mb-2.5 flex items-center gap-2 text-[11px] font-semibold tracking-wide text-(--ih-panel-text-2) uppercase">
        {title}
        {badge}
      </h3>
      {children}
    </section>
  );
}

function Readout({ label, value }: { label: string; value: string }) {
  return (
    <span className="flex items-center gap-1.5 rounded-md bg-(--ih-control) px-2 py-1.5">
      <span className="text-(--ih-panel-text-2)">{label}:</span>
      <span>{value}</span>
    </span>
  );
}

function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
  tourPrefix,
}: {
  label: string;
  options: T[];
  value: T;
  onChange: (value: T) => void;
  tourPrefix: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} onKeyDown={onRadioKeys} className="flex rounded-lg bg-(--ih-control) p-0.5">
      {options.map((option) => {
        const active = option === value;
        return (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(option)}
            data-tour-id={`${tourPrefix}-${option}`}
            className={`h-6 flex-1 cursor-pointer rounded-md text-[11px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-(--ih-selection) ${
              active ? "bg-(--ih-control-active) text-(--ih-panel-text) shadow-sm" : "text-(--ih-panel-text-2) hover:text-(--ih-panel-text)"
            }`}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}

/** A styled range input. Dragging previews live; letting go records one history entry for the whole drag. */
function Slider({ label, unit, min, max, field }: { label: string; unit: string; min: number; max: number; field: "blur" | "glow" }) {
  const { state, dispatch } = useDemo();
  const before = useRef<Design | null>(null);
  const value = state[field];
  const start = () => {
    if (!before.current) before.current = designOf(state);
  };
  const commit = () => {
    if (!before.current) return;
    dispatch({ type: "commit", before: before.current });
    before.current = null;
  };
  return (
    <label className="mt-2 block first:mt-0">
      <span className="mb-1.5 flex justify-between text-[11px]">
        <span className="text-(--ih-panel-text-2)">{label}</span>
        <span className="font-mono tabular-nums">
          {value}
          {unit}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        data-tour-id={`slider-${field}`}
        onPointerDown={start}
        onKeyDown={start}
        onChange={(e) => {
          start();
          dispatch({ type: "set", patch: { [field]: Number(e.target.value) }, record: false });
        }}
        onPointerUp={commit}
        onKeyUp={commit}
        onBlur={commit}
        style={{ "--val": `${((value - min) / (max - min)) * 100}%` } as CSSProperties}
        className="h-4 w-full cursor-pointer appearance-none bg-transparent focus-visible:outline-none [&::-moz-range-thumb]:size-3.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-(--ih-selection) [&::-moz-range-track]:h-1 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-[linear-gradient(90deg,var(--ih-selection)_var(--val),var(--ih-control)_var(--val))] [&::-webkit-slider-runnable-track]:h-1 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-[linear-gradient(90deg,var(--ih-selection)_var(--val),var(--ih-control)_var(--val))] [&::-webkit-slider-thumb]:-mt-[5px] [&::-webkit-slider-thumb]:size-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-(--ih-selection) [&::-webkit-slider-thumb]:shadow focus-visible:[&::-webkit-slider-thumb]:ring-2 focus-visible:[&::-webkit-slider-thumb]:ring-(--ih-selection)/50"
      />
    </label>
  );
}
