/*! Pulse Bento Feature Highlights: four live product-demo cards. Vanilla JS, no dependencies. */
// Every [data-pbf] section mounts itself; call PulseBentoFeatures.mount(element, options) for sections added later.
(() => {
  const DEFAULTS = { layout: "grid", theme: "auto", autoplay: true };
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = matchMedia("(hover: hover) and (pointer: fine)");
  // Lucide icons for the rows drawn at runtime (ISC licence, see ICONS-LICENSE.txt).
  const ICONS = {
    check: '<circle cx="12" cy="12" r="10"/><path d="m8 12 2.5 2.5L16 9"/>',
    star: '<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"/>',
    bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
    clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    chart: '<path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>',
  };
  const icon = (name, cls = "pbf-icon") => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ""}</svg>`;
  const escape = (value) => String(value ?? "").replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);
  const initials = (name) =>
    String(name)
      .split(/\s+/)
      .map((part) => part[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  /** $48.2k, or $1.18M from a million up. */
  const money = (v) => (v < 1e6 ? `$${(v / 1e3).toFixed(1)}k` : `$${(v / 1e6).toFixed(2)}M`);
  const percent = (v) => `${round(v)}%`;
  const avatar = (person) =>
    `<span class="pbf-avatar">${escape(initials(person.name))}${
      person.avatar ? `<img src="${escape(person.avatar)}" alt="" width="26" height="26" loading="lazy" decoding="async">` : ""
    }</span>`;
  const { min, max, round, random, abs, floor, sin, cos } = Math;
  const $ = (el, selector) => el.querySelector(selector);
  const $$ = (el, selector) => [...el.querySelectorAll(selector)];
  const on = (el, type, fn) => el.addEventListener(type, fn);
  const css = (el, name, value) => el.style.setProperty(name, value);
  const attr = (el, name, value) => el.setAttribute(name, value);
  const text = (el, value) => (el.textContent = value);
  const rect = (el) => el.getBoundingClientRect();
  const raf = (fn) => requestAnimationFrame(fn);
  const now = () => performance.now();
  /** Sets or clears a data-* flag the CSS keys off. */
  const flag = (el, name, state = true) => el.toggleAttribute(`data-${name}`, state);
  /** Plays the CSS animation behind a data-* flag again from the start. */
  const replay = (el, name) => (flag(el, name, false), rect(el), flag(el, name));
  const typing = new WeakMap();
  let mounted = 0;

  /** A client in the marquee (also pre-rendered by the build). */
  const clientRow = (c) => {
    const kind = c.status === "star" ? "star" : "check";
    return `<li class="pbf-crow">${avatar(c)}<b>${escape(c.name)}</b><span class="pbf-meta"><span>${escape(c.country)}</span> • <span>${escape(
      c.currency,
    )}</span></span>${icon(kind, `pbf-status pbf-${kind}`)}</li>`;
  };

  /** A workspace member (also pre-rendered by the build). */
  const memberRow = (m) =>
    `<li class="pbf-member">${avatar(m)}<span class="pbf-who"><b>${escape(m.name)}</b><span>${escape(m.role)}</span></span><span class="pbf-action" data-kind="${escape(
      m.kind,
    )}">${icon(m.kind)}${escape(m.action)}</span></li>`;

  /** Every timer and frame a card starts, so all of them stop at once when it leaves view. */
  const clock = () => {
    const timers = new Set();
    const frames = new Set();
    return {
      after(ms, fn) {
        const id = setTimeout(() => (timers.delete(id), fn()), ms);
        timers.add(id);
      },
      frame(fn) {
        const id = raf((time) => (frames.delete(id), fn(time)));
        frames.add(id);
      },
      clear() {
        timers.forEach(clearTimeout);
        frames.forEach(cancelAnimationFrame);
        timers.clear();
        frames.clear();
      },
    };
  };

  function mount(root, options = {}) {
    if (root.pbf) return root.pbf;
    const parse = (text) => {
      try {
        return JSON.parse(text) || {};
      } catch {
        return {};
      }
    };
    const cfg = { ...DEFAULTS, ...parse($(root, "[data-pbf-config]")?.textContent), ...parse(root.dataset.pbfConfig), ...options };
    const data = cfg.cards || {};
    const grid = $(root, ".pbf-grid");
    const uid = `pbf${++mounted}`;
    const still = () => reducedMotion.matches;
    let revealed = false;
    let stopped = false;

    grid.dataset.layout = cfg.layout;
    if (cfg.theme !== "auto") root.dataset.theme = cfg.theme;
    if (!still()) flag(root, "motion");

    /** Types `value` into `el` a character at a time (at once with reduced motion); a newer call on `el` takes over. */
    const type = (el, value, t, speed = 26) =>
      new Promise((done) => {
        const run = {};
        typing.set(el, run);
        if (still()) return text(el, value), done();
        let i = 0;
        el.classList.add("pbf-typing");
        const step = () => {
          if (typing.get(el) !== run) return;
          text(el, value.slice(0, ++i));
          if (i < value.length) t.after(speed, step);
          else el.classList.remove("pbf-typing"), done();
        };
        step();
      });
    /** Stops any typing into `el`, leaving its text as it is. */
    const untype = (el) => (typing.delete(el), el.classList.remove("pbf-typing"));

    /** Counts the text of `el` from one number to another, easing out (at once when `ms` is 0). */
    const count = (el, from, to, format, t, ms = 900) => {
      if (still() || !ms) return text(el, format(to));
      let start;
      const step = (time) => {
        start ??= time;
        const k = min(1, (time - start) / ms);
        text(el, format(from + (to - from) * (1 - (1 - k) ** 3)));
        if (k < 1) t.frame(step);
      };
      t.frame(step);
    };

    // ---- Card 1: the KPI monitor -----------------------------------------------
    function kpiCard(card) {
      const t = clock();
      const { datasets, insights } = data.kpi;
      const rows = $$(card, ".pbf-row");
      const live = $(card, ".pbf-live");
      const total = $(card, ".pbf-kpi-total b");
      const ranges = $$(card, ".pbf-seg button");
      const pill = $(card, ".pbf-pill");
      const wrap = pill.parentElement;
      const pop = $(wrap, ".pbf-popover");
      const popText = pop.firstElementChild; // typed out, for the eye
      const voice = $(wrap, "[aria-live]"); // the whole insight at once, for screen readers
      let range = ranges[0].dataset.range;
      let values;
      let counted = false;
      let hoverOpened = false;
      const load = () => (values = datasets[range].map((v) => ({ ...v })));
      const sum = () => values.reduce((s, v) => s + v.value, 0);
      const isOpen = () => pop.hasAttribute("data-open");
      load();
      // Sparklines: 18 points 4px apart; each tick drops the first, adds one at the right and slides left.
      const sparks = rows.map((row, i) => ({
        g: $(row, ".pbf-spark g"),
        paths: $$(row, ".pbf-spark path"),
        pts: Array.from({ length: 18 }, (_, k) => 11 + sin(k * 0.7 + i * 1.9) * 5 + cos(k * 1.3 + i) * 2),
      }));

      const paint = (i, ms) => {
        const row = rows[i];
        const v = values[i];
        css($(row, ".pbf-bar-fill"), "--v", v.pct / 100);
        [
          [".pbf-value b", v.value, money],
          [".pbf-pct", v.pct, percent],
        ].forEach(([selector, to, format]) => {
          const el = $(row, selector);
          count(el, +el.dataset.v || 0, to, format, t, ms);
          el.dataset.v = to;
        });
      };
      const flash = (row) => (replay(row, "flash"), t.after(1100, () => flag(row, "flash", false)));
      // Every few seconds one row drifts a little, with a green or red delta chip.
      const drift = () => {
        const i = floor(random() * rows.length);
        const change = (random() * 1.4 + 0.3) * (random() < 0.7 ? 1 : -1);
        const before = sum();
        const v = values[i];
        const chip = $(rows[i], ".pbf-delta");
        v.pct = max(5, min(96, v.pct + change));
        v.value = round(v.value * (1 + change / 100));
        paint(i);
        count(total, before, sum(), money, t);
        flash(rows[i]);
        text(chip, `${change > 0 ? "+" : ""}${change.toFixed(1)}%`);
        flag(chip, "up", change > 0);
        flag(chip, "show");
        t.after(1600, () => flag(chip, "show", false));
        t.after(2600 + random() * 1600, drift);
      };
      const tick = () => {
        sparks.forEach((s) => {
          s.pts.push(max(3, min(19, s.pts.at(-1) + (random() - 0.48) * 6)));
          s.pts.shift();
          const d = s.pts.map((y, k) => `${k ? "L" : "M"}${k * 4} ${y.toFixed(1)}`).join("");
          attr(s.paths[0], "d", `${d}L68 22L0 22Z`);
          attr(s.paths[1], "d", d);
          s.g.animate([{ transform: "translateX(4px)" }, { transform: "none" }], 1500);
        });
        t.after(1500, tick);
      };
      // Today / 7d / 30d: every row and the total animate to the other dataset.
      const choose = (next) => {
        range = next;
        ranges.forEach((b) => attr(b, "aria-pressed", b.dataset.range === range));
        const before = sum();
        load();
        rows.forEach((row, i) => t.after(i * 80, () => (paint(i), flash(row))));
        count(total, before, sum(), money, t);
        if (isOpen()) openInsight();
      };
      ranges.forEach((button) => on(button, "click", () => button.dataset.range !== range && choose(button.dataset.range)));

      // AI Insights: a glass popover that types out a one-line insight.
      const openInsight = () => {
        flag(pop, "open");
        attr(pill, "aria-expanded", true);
        text(voice, insights[range]);
        type(popText, insights[range], t, 18);
      };
      const closeInsight = () => {
        flag(pop, "open", false);
        attr(pill, "aria-expanded", false);
        text(voice, "");
        untype(popText);
        hoverOpened = false;
      };
      on(pill, "click", () => {
        if (!isOpen()) openInsight();
        else if (hoverOpened) hoverOpened = false; // a click keeps open what the pointer opened
        else closeInsight();
      });
      on(wrap, "pointerenter", (e) => e.pointerType === "mouse" && !isOpen() && ((hoverOpened = true), openInsight()));
      on(wrap, "pointerleave", () => hoverOpened && closeInsight());
      on(document, "pointerdown", (e) => isOpen() && !wrap.contains(e.target) && closeInsight());
      on(card, "keydown", (e) => e.key === "Escape" && isOpen() && (closeInsight(), pill.focus()));


      return {
        start() {
          flag(live, "paused", false);
          text(live.lastElementChild, "Live");
          // The first start counts every number up from zero (the CSS holds them back until then).
          if (!counted) {
            counted = true;
            flag(card, "counted");
            rows.forEach((_, i) => paint(i));
            count(total, 0, sum(), money, t);
          }
          if (still()) return;
          t.after(2400, drift);
          t.after(1500, tick);
        },
        stop() {
          t.clear();
          // Anything cut off mid-way (a count, the typed insight) settles at its end.
          rows.forEach((_, i) => paint(i, 0));
          text(total, money(sum()));
          if (isOpen()) untype(popText), text(popText, insights[range]);
          flag(live, "paused");
          text(live.lastElementChild, "Paused");
        },
        reset() {
          closeInsight();
          choose(ranges[0].dataset.range);
        },
      };
    }

    // ---- Card 2: worldwide clients ----------------------------------------------
    function clientsCard(card) {
      const t = clock();
      const clients = data.clients;
      const marquee = $(card, ".pbf-marquee");
      const track = $(card, ".pbf-track");
      const lists = $$(track, ".pbf-clients-list");
      const cycle = $(card, "[data-pbf-cycle]");
      const lang = $(card, ".pbf-lang");
      const pins = $$(card, ".pbf-pin-ring");
      let set = "weekly";
      let centre = -1;
      let pin = 0;
      let langIndex = 0;
      let size = 0; // [list height, half the window], measured once per list

      // Which row is crossing the middle, read from the marquee animation's own clock.
      const watch = () => {
        const animation = track.getAnimations().find((a) => a.animationName === "pbf-up");
        const rows = lists[0].children;
        size ||= lists[0].offsetHeight && [lists[0].offsetHeight, marquee.clientHeight / 2];
        if (animation && size) {
          const [height, middle] = size;
          const { duration } = animation.effect.getTiming();
          const index = floor(((((animation.currentTime ?? 0) % duration) / duration) * height + middle) / (height / rows.length)) % rows.length;
          if (index !== centre) {
            centre = index;
            lists.forEach((list) => [...list.children].forEach((row, i) => flag(row, "center", i === index)));
            replay(pins[pin++ % pins.length], "pulse");
          }
        }
        t.frame(watch);
      };
      const rotate = () => {
        langIndex = (langIndex + 1) % clients.languages.length;
        text(lang, clients.languages[langIndex]);
        replay(lang, "flip");
        t.after(2000, rotate);
      };
      // Weekly ⇄ Monthly: a quick crossfade, and the country and currency labels flip in.
      const show = (next) => {
        set = next;
        text(cycle.lastElementChild, set[0].toUpperCase() + set.slice(1));
        attr(cycle, "aria-label", `Showing ${set} clients. Switch view`);
        attr(lists[0], "aria-label", `Clients, ${set}`);
        replay(cycle, "spin");
        flag(track, "swap");
        setTimeout(() => {
          const html = clients[set].map(clientRow).join("");
          lists.forEach((list) => (list.innerHTML = html));
          centre = -1;
          size = 0;
          $$(track, ".pbf-meta").forEach((meta) => flag(meta, "flip"));
          flag(track, "swap", false);
        }, 300);
      };
      on(cycle, "click", () => show(set === "weekly" ? "monthly" : "weekly"));
      flag(card, "idle"); // the marquee waits for the card's demo to start

      return {
        start() {
          flag(card, "idle", false);
          if (still()) return;
          t.frame(watch);
          t.after(2000, rotate);
        },
        stop() {
          t.clear();
          flag(card, "idle");
        },
        reset: () => set !== "weekly" && show("weekly"),
      };
    }

    // ---- Card 3: integrations -----------------------------------------------------
    function integrationsCard(card) {
      const t = clock();
      const names = data.integrations.tiles;
      const tiles = $$(card, ".pbf-tile");
      const wires = $(card, ".pbf-wires");
      const hub = $(card, ".pbf-hub");
      const lines = $$(card, ".pbf-log p"); // a fixed set of lines, the newest at the bottom
      const first = lines.map((line) => line.lastChild.textContent);
      const stack = $(card, ".pbf-stack");
      let flight;

      // Lines from each tile down to the hub, measured so they always meet both ends.
      const layout = () => {
        const box = rect(wires);
        if (!box.width) return;
        const h = rect(hub);
        const hx = (h.left + h.width / 2 - box.left).toFixed(1);
        const hy = h.top - box.top;
        attr(wires, "viewBox", `0 0 ${box.width} ${box.height}`);
        tiles.forEach((tile, i) => {
          const b = rect(tile);
          const x = (b.left + b.width / 2 - box.left).toFixed(1);
          const d = `M${x} 0C${x} ${(hy * 0.6).toFixed(1)} ${hx} ${(hy * 0.4).toFixed(1)} ${hx} ${hy.toFixed(1)}`;
          $$(wires, `[data-wire="${i}"]`).forEach((path) => attr(path, "d", d));
        });
      };
      new ResizeObserver(layout).observe($(card, ".pbf-body"));

      // 3D tilt (mouse only, at most 8°) with a specular highlight, eased back on leave.
      tiles.forEach((tile) => {
        const s = { x: 0, y: 0, tx: 0, ty: 0, raf: 0 };
        const step = () => {
          s.x += (s.tx - s.x) * 0.15;
          s.y += (s.ty - s.y) * 0.15;
          css(tile, "--rx", `${s.y.toFixed(2)}deg`);
          css(tile, "--ry", `${s.x.toFixed(2)}deg`);
          s.raf = abs(s.tx - s.x) + abs(s.ty - s.y) > 0.05 ? raf(step) : 0;
        };
        on(tile, "pointermove", (e) => {
          if (e.pointerType !== "mouse" || still()) return;
          const b = rect(tile);
          const px = (e.clientX - b.left) / b.width;
          const py = (e.clientY - b.top) / b.height;
          s.tx = (px - 0.5) * 16;
          s.ty = (0.5 - py) * 16;
          css(tile, "--sx", `${px * 100}%`);
          css(tile, "--sy", `${py * 100}%`);
          s.raf ||= raf(step);
        });
        on(tile, "pointerleave", () => {
          s.tx = s.ty = 0;
          s.raf ||= raf(step);
        });
      });

      // The sync log: each arrival types itself in at the bottom; older lines fade and their times age.
      const stamp = (line) => {
        const s = round((now() - line.at) / 1000);
        untype(line.lastChild);
        text(line.lastChild, `${line.name} synced · ${s ? `${s}s ago` : "just now"}`);
      };
      const rearm = () => (tiles.forEach((tile) => flag(tile, "sent", false)), flag(stack, "done", false));
      // One packet per tool travels to the hub in turn; then the stack gets its check and the cycle rests.
      const send = (i) => {
        if (i === tiles.length) return flag(stack, "done"), t.after(2600, () => (rearm(), send(0)));
        flag(tiles[i], "sent");
        flight = $(wires, `.pbf-packet[data-wire="${i}"]`).animate(
          { strokeDashoffset: [0, -12, -88, -100], opacity: [0, 1, 1, 0], offset: [0, 0.12, 0.88, 1] },
          { duration: 950, easing: "cubic-bezier(.45,0,.25,1)" },
        );
        flight.onfinish = () => {
          replay(hub, "pulse");
          // Every line takes the text of the one below it (text only, so nothing shifts).
          lines.forEach((line, k) => {
            const next = lines[k + 1];
            if (!next) return;
            line.name = next.name;
            line.at = next.at;
            line.name ? stamp(line) : text(line.lastChild, next.lastChild.textContent);
          });
          const line = lines.at(-1);
          line.name = names[i];
          line.at = now();
          type(line.lastChild, `${line.name} synced · just now`, t, 16);
          t.after(500, () => send(i + 1));
        };
      };

      return {
        start() {
          layout();
          if (still()) return tiles.forEach((tile) => flag(tile, "sent")), flag(stack, "done");
          rearm();
          t.after(600, () => send(0));
        },
        stop() {
          t.clear();
          flight?.cancel();
          lines.forEach((line) => line.name && stamp(line));
        },
        reset() {
          rearm();
          lines.forEach((line, k) => (untype(line.lastChild), (line.name = null), text(line.lastChild, first[k])));
        },
      };
    }

    // ---- Card 4: team workspace ------------------------------------------------------
    function workspaceCard(card) {
      const t = clock();
      const { invites } = data.workspace;
      const tabs = $$(card, ".pbf-tab");
      const panels = $$(card, ".pbf-panel");
      const tablist = $(card, ".pbf-tabs");
      const add = $(card, "[data-pbf-add]");
      const list = $(card, ".pbf-members");
      const toast = $(card, ".pbf-toast");
      const voice = $(card, '[role="status"]');
      let current = 0;
      let busy = false;
      let added = null; // the row the demo added
      let person = null; // and who it is
      let invite = 0;
      let runs = 0;
      let touched = -1e4; // when the visitor last used this card: autoplay waits for them

      const select = (i, focus) => {
        current = i;
        tabs.forEach((tab, k) => {
          attr(tab, "aria-selected", k === i);
          tab.tabIndex = k === i ? 0 : -1;
          panels[k].hidden = k !== i;
        });
        css(tablist, "--tab", i);
        if (focus) tabs[i].focus();
      };
      tabs.forEach((tab, i) => {
        tab.id = `${uid}-tab-${i}`;
        panels[i].id = `${uid}-panel-${i}`;
        attr(tab, "aria-controls", panels[i].id);
        attr(panels[i], "aria-labelledby", tab.id);
        on(tab, "click", () => select(i));
      });
      on(tablist, "keydown", (e) => {
        const moves = { ArrowRight: 1, ArrowLeft: -1, Home: -current, End: tabs.length - 1 - current };
        if (!(e.key in moves)) return;
        e.preventDefault();
        select((current + moves[e.key] + tabs.length) % tabs.length, true);
      });

      const showToast = (state) => {
        if (!state && toast.contains(document.activeElement)) add.focus({ preventScroll: true });
        flag(toast, "open", state);
        text(voice, state ? `Invitation sent to ${person.name}.` : "");
      };
      // The toast steps aside after a few seconds, but never from under the pointer or the keyboard.
      const hide = () => (toast.matches(":hover,:focus-within") ? t.after(1000, hide) : showToast(false));
      const removeAdded = () => {
        if (!added) return;
        const row = added;
        added = null;
        row.animate([{ opacity: 1 }, { opacity: 0, transform: "translateY(-6px)" }], 250).onfinish = () => row.remove();
      };
      // Add a member: a spinner, then a row that types itself in, then a toast with Undo.
      const run = () => {
        if (busy) return;
        busy = true;
        const mine = ++runs;
        select(0);
        showToast(false);
        removeAdded();
        attr(add, "aria-busy", true);
        t.after(still() ? 0 : 700, () => {
          person = invites[invite++ % invites.length];
          const holder = document.createElement("ul");
          holder.innerHTML = memberRow(person);
          const row = (added = holder.firstElementChild);
          const [name, role] = $$(row, ".pbf-who > *");
          flag(row, "new");
          text(role, "");
          list.prepend(row);
          attr(add, "aria-busy", false);
          type(name, person.name, t, 45)
            .then(() => type(role, person.role, t, 30))
            .then(() => {
              busy = false;
              showToast(true);
              t.after(3200, () => mine === runs && hide());
            });
        });
      };
      on(add, "click", run);
      on($(toast, "button"), "click", () => (showToast(false), removeAdded()));
      on(card, "pointerdown", () => (touched = now()));
      on(card, "keydown", () => (touched = now()));
      const autoplay = () => {
        if (!current && !busy && now() - touched > 8000 && !card.matches(":hover,:focus-within")) run();
        t.after(8000, autoplay);
      };

      return {
        run,
        start() {
          if (!still() && cfg.autoplay) t.after(1800, autoplay);
        },
        stop() {
          t.clear();
          busy = false;
          attr(add, "aria-busy", false);
          showToast(false);
          // A row cut off while typing itself in is completed.
          if (added) {
            const [name, role] = $$(added, ".pbf-who > *");
            untype(name);
            untype(role);
            text(name, person.name);
            text(role, person.role);
          }
        },
        reset() {
          showToast(false);
          removeAdded();
          select(0);
        },
      };
    }

    // ---- Shared: spotlight, reveal, visibility, API ------------------------------------
    const builders = { kpi: kpiCard, clients: clientsCard, integrations: integrationsCard, workspace: workspaceCard };
    const cards = $$(root, "[data-pbf-card]").map((el, k) => {
      const name = el.dataset.pbfCard;
      const card = { el, name, inView: false, running: false, ...builders[name]?.(el) };
      card.run ||= () => card.running && (card.stop(), card.start());
      css(el, "--k", k);
      // The cursor spotlight on the surface and along the border, once per frame.
      let frame = 0;
      let x = 0;
      let y = 0;
      on(el, "pointermove", (e) => {
        if (e.pointerType !== "mouse" || still() || !finePointer.matches) return;
        const b = rect(el);
        x = e.clientX - b.left;
        y = e.clientY - b.top;
        frame ||= raf(() => {
          frame = 0;
          css(el, "--mx", `${x}px`);
          css(el, "--my", `${y}px`);
        });
      });
      const activate = () => {
        if (el.hasAttribute("data-hot")) return;
        flag(el, "hot");
        flag(grid, "hot");
        root.dispatchEvent(new CustomEvent("pbf:cardActive", { detail: { card: name } }));
      };
      const deactivate = () => (flag(el, "hot", false), flag(grid, "hot", !!$(grid, "[data-hot]")));
      on(el, "pointerenter", (e) => e.pointerType === "mouse" && activate());
      on(el, "pointerleave", deactivate);
      on(el, "focusin", activate);
      on(el, "focusout", (e) => !el.contains(e.relatedTarget) && !el.matches(":hover") && deactivate());
      return card;
    });

    // Demos run only once revealed, only while their card is in view, never in a hidden tab.
    const sync = (card) => {
      const go = revealed && card.inView && !document.hidden && !stopped;
      if (go !== card.running) (card.running = go) ? card.start?.() : card.stop?.();
    };
    const syncAll = () => cards.forEach(sync);
    const watch = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          const card = cards.find((c) => c.el === entry.target);
          card.inView = entry.isIntersecting;
          sync(card);
        }),
      { threshold: 0.25 },
    );
    cards.forEach((card) => watch.observe(card.el));
    on(document, "visibilitychange", syncAll);
    new IntersectionObserver(
      ([entry], observer) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        flag(root, "revealing");
        flag(root, "revealed");
        setTimeout(() => {
          flag(root, "revealing", false);
          revealed = true;
          syncAll();
        }, 900);
      },
      { threshold: 0.1 },
    ).observe(root);

    const api = {
      start: () => ((stopped = false), syncAll()),
      stop: () => ((stopped = true), syncAll()),
      setTheme: (theme) => (theme === "auto" ? delete root.dataset.theme : (root.dataset.theme = theme)),
      cards: Object.fromEntries(cards.map((c) => [c.name, { run: () => c.run(), reset: () => c.reset?.() }])),
    };
    Object.assign(root, api, { pbf: api });
    return api;
  }

  window.PulseBentoFeatures = { mount, clientRow, memberRow };
  document.querySelectorAll("[data-pbf]").forEach((root) => mount(root));
})();
