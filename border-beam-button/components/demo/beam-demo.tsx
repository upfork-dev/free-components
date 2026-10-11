"use client";

import { useState, type ReactNode } from "react";
import { Sparkles } from "lucide-react";
import { BeamButton, type BeamState } from "@/components/ui/beam-button/beam-button";

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const succeed = () => wait(1500);
const fail = () => wait(1500).then(() => Promise.reject(new Error("Build failed")));

function Card({ title, note, children, className = "" }: { title: string; note: string; children: ReactNode; className?: string }) {
  return (
    <section
      className={`flex flex-col rounded-3xl border border-zinc-950/5 bg-white p-6 shadow-[0_1px_2px_rgba(9,9,11,0.04)] dark:border-white/[0.07] dark:bg-white/[0.025] dark:shadow-none ${className}`}
    >
      <h2 className="text-sm font-semibold text-zinc-950 dark:text-white">{title}</h2>
      <p className="mt-1 text-sm text-pretty text-zinc-500 dark:text-zinc-400">{note}</p>
      <div className="mt-6 flex flex-1 flex-wrap items-center justify-center gap-4 py-4">{children}</div>
    </section>
  );
}

const states: BeamState[] = ["idle", "loading", "success", "error"];

export function BeamDemo() {
  const [controlled, setControlled] = useState<BeamState>("idle");

  return (
    <div className="mx-auto max-w-6xl px-4 pb-24 sm:px-6">
      {/* The hero stage */}
      <div className="relative flex flex-col items-center overflow-hidden rounded-[2rem] border border-zinc-950/5 bg-white px-6 py-20 text-center dark:border-white/[0.07] dark:bg-[#0c0c0e] sm:py-24">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 -top-40 mx-auto h-80 max-w-2xl rounded-full bg-[radial-gradient(closest-side,rgba(249,115,22,0.16),transparent)] dark:bg-[radial-gradient(closest-side,rgba(249,115,22,0.14),transparent)]"
        />
        <p className="relative text-xs font-semibold tracking-[0.2em] text-orange-600 uppercase dark:text-orange-300">Component</p>
        <h1 className="relative mt-4 text-4xl font-semibold tracking-tight text-balance text-zinc-950 sm:text-5xl dark:text-white">
          Border Beam Button
        </h1>
        <p className="relative mx-auto mt-4 max-w-xl text-base text-pretty text-zinc-600 dark:text-zinc-400">
          A comet of light runs along the real border at a constant speed. Hover it, press it, or let it build
          something: the beam follows every step.
        </p>
        <div className="relative mt-10 flex flex-col items-center gap-4 sm:flex-row">
          <BeamButton size="lg" surface="auto" magnetic onClick={succeed}>
            Start building
          </BeamButton>
          <BeamButton size="lg" surface="auto" accent="mono" icon={false} href="#states">
            See the states
          </BeamButton>
        </div>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <Card title="Sizes" note="44, 52 and 60px tall, with matching padding and type.">
          <BeamButton size="sm" surface="auto">Small</BeamButton>
          <BeamButton size="md" surface="auto">Medium</BeamButton>
          <BeamButton size="lg" surface="auto">Large</BeamButton>
        </Card>

        <Card title="Accents" note="Four presets, or any two colors of your own.">
          <BeamButton surface="auto" size="sm" accent="ember">Ember</BeamButton>
          <BeamButton surface="auto" size="sm" accent="violet">Violet</BeamButton>
          <BeamButton surface="auto" size="sm" accent="aurora">Aurora</BeamButton>
          <BeamButton surface="auto" size="sm" accent="mono">Mono</BeamButton>
          <BeamButton surface="auto" size="sm" accent={{ from: "#6ee7b7", to: "#10b981" }}>Custom</BeamButton>
        </Card>

        <Card
          title="Surfaces"
          note={'Dark and light, whatever the page around them. surface="auto" follows your theme.'}
          className="md:col-span-2"
        >
          <div className="grid w-full gap-4 sm:grid-cols-2">
            <div className="flex flex-wrap items-center justify-center gap-4 rounded-2xl bg-[#0b0b0d] px-6 py-12 ring-1 ring-white/10">
              <BeamButton surface="dark">Deploy now</BeamButton>
              <BeamButton surface="dark" accent="aurora" dualBeam>
                Dual beam
              </BeamButton>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-4 rounded-2xl bg-white px-6 py-12 ring-1 ring-zinc-950/10">
              <BeamButton surface="light">Deploy now</BeamButton>
              <BeamButton surface="light" accent="violet" dualBeam>
                Dual beam
              </BeamButton>
            </div>
          </div>
        </Card>

        <Card title="Async, on its own" note="Return a Promise from onClick: loading, then success or error, then back.">
          <BeamButton surface="auto" onClick={succeed} successText="Deployed">
            Deploy
          </BeamButton>
          <BeamButton surface="auto" accent="violet" onClick={fail} loadingText="Saving…" errorText="Try again">
            Save changes
          </BeamButton>
        </Card>

        <Card title="Inside a form" note={`type="submit" picks up the form's pending state through useFormStatus.`}>
          <form
            action={async () => {
              await wait(1500);
            }}
            className="flex w-full max-w-sm flex-col gap-3 sm:flex-row"
          >
            <label htmlFor="beam-demo-email" className="sr-only">
              Email address
            </label>
            <input
              id="beam-demo-email"
              type="email"
              required
              placeholder="Email address"
              className="h-11 min-w-0 flex-1 rounded-full border border-zinc-950/10 bg-white px-4 text-sm text-zinc-950 placeholder:text-zinc-400 focus:border-orange-500/60 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-zinc-500"
            />
            <BeamButton type="submit" size="sm" surface="auto" loadingText="Joining…" icon={<Sparkles className="size-4" />}>
              Join
            </BeamButton>
          </form>
        </Card>

        <Card title="Controlled" note="Or drive the state yourself with the state prop.">
          <div id="states" className="flex w-full flex-col items-center gap-6">
            <BeamButton surface="auto" accent="aurora" state={controlled}>
              Publish
            </BeamButton>
            <div role="group" aria-label="Button state" className="flex flex-wrap justify-center gap-1 rounded-full border border-zinc-950/10 p-1 dark:border-white/10">
              {states.map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={controlled === value}
                  onClick={() => setControlled(value)}
                  className="cursor-pointer rounded-full px-3 py-1.5 text-xs font-medium text-zinc-500 capitalize transition-colors hover:text-zinc-950 focus-visible:outline-2 focus-visible:outline-orange-500 aria-pressed:bg-zinc-950 aria-pressed:text-white dark:text-zinc-400 dark:hover:text-white dark:aria-pressed:bg-white dark:aria-pressed:text-zinc-950"
                >
                  {value}
                </button>
              ))}
            </div>
          </div>
        </Card>

        <Card title="Disabled and as a link" note="Disabled stops the beam; href renders a next/link with the same look.">
          <BeamButton surface="auto" disabled>
            Unavailable
          </BeamButton>
          <BeamButton surface="auto" accent="violet" href="#top">
            Back to top
          </BeamButton>
        </Card>
      </div>
    </div>
  );
}
