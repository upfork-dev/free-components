/*!
 * Spotlight Bento Feature Showcase: a feature list linked to a bento grid of image tiles.
 * Vanilla JS, no dependencies. Every [data-sfs] section mounts itself; call
 * SpotlightFeatureShowcase.mount(element, options) for sections added later.
 */
(() => {
  const DEFAULTS = { autoplay: true, interval: 5000, layout: "bento", parallax: true, kenBurns: true, theme: "auto", schema: true };
  const LERP = 0.12;
  const CHEVRON =
    '<svg class="sfs-open" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 11l6-6M6 5h5v5"/></svg>';

  const media = (query) => window.matchMedia(query);
  const reducedMotion = media("(prefers-reduced-motion: reduce)");
  const finePointer = media("(hover: hover) and (pointer: fine)");
  const phone = media("(max-width: 767px)");
  const parse = (text) => {
    try {
      return text ? JSON.parse(text) : null;
    } catch {
      return null;
    }
  };
  const escape = (value) =>
    String(value ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  let mounted = 0;

  /** One feature in the list. The build pre-renders these (plain markup; the script adds the tab roles). */
  function stepHTML(feature, index, features) {
    const next = features[index + 1];
    return `<li class="sfs-step" data-sfs-step="${escape(feature.id)}" style="--accent:${escape(feature.accent)};--accent-next:${escape(next ? next.accent : feature.accent)};--k:${index}">
  <span class="sfs-marker" aria-hidden="true"></span><span class="sfs-connector" aria-hidden="true"></span>
  <span class="sfs-step-title">${escape(feature.title)}</span>
  <span class="sfs-step-desc">${escape(feature.description)}</span>
  <span class="sfs-step-progress" aria-hidden="true"></span>
</li>`;
  }

  /** One feature's tile: image (or video), glass pills, caption, and a link or button over the whole tile. */
  function tileHTML(feature, index) {
    const first = index === 0;
    const mediaHTML = feature.video
      ? `<video src="${escape(feature.video)}" poster="${escape(feature.poster || feature.image || "")}" muted loop playsinline preload="none" aria-label="${escape(feature.alt || feature.title)}"></video>`
      : `<img src="${escape(feature.image)}" alt="${escape(feature.alt || "")}" decoding="async" ${first ? 'fetchpriority="high"' : 'loading="lazy"'}>`;
    const label = `${feature.href ? "Open" : "Show"} ${escape(feature.title)}`;
    const hit = feature.href
      ? `<a class="sfs-hit" href="${escape(feature.href)}"><span class="sfs-sr">${label}</span></a>`
      : `<button class="sfs-hit" type="button"><span class="sfs-sr">${label}</span></button>`;
    return `<li class="sfs-tile" data-sfs-tile="${escape(feature.id)}" style="--accent:${escape(feature.accent)};--k:${index}">
  <div class="sfs-media">${mediaHTML}</div>
  <span class="sfs-scrim" aria-hidden="true"></span><span class="sfs-sheen" aria-hidden="true"></span><span class="sfs-veil" aria-hidden="true"></span>
  <div class="sfs-tile-top" aria-hidden="true"><span class="sfs-glass sfs-icon">${feature.icon || ""}</span>${feature.category ? `<span class="sfs-glass">${escape(feature.category)}</span>` : ""}</div>
  <div class="sfs-caption"><p class="sfs-caption-title">${escape(feature.title)}${CHEVRON}</p><p class="sfs-caption-desc">${escape(feature.short || feature.description)}</p></div>
  ${hit}
</li>`;
  }

  /** schema.org JSON-LD: the features as an ItemList. */
  function schema(data) {
    const json = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: data.name || "Features",
      itemListElement: (data.features || []).map((f, i) => ({
        "@type": "ListItem",
        position: i + 1,
        name: f.title,
        description: f.description,
        image: f.image,
      })),
    });
    return json.replace(/</g, "\\" + "u003c");
  }

  function mount(root, options = {}) {
    if (root.sfs) return root.sfs;
    const data = parse(root.querySelector("[data-sfs-data]")?.textContent) || {};
    const config = { ...DEFAULTS, ...data.config, ...parse(root.dataset.sfsConfig), ...options };
    const list = root.querySelector("[data-sfs-list]");
    const grid = root.querySelector("[data-sfs-grid]");
    const live = root.querySelector("[data-sfs-live]");
    if (!list || !grid) return null;
    const uid = `sfs${++mounted}`;

    // A section with only JSON: render the list, the tiles and the JSON-LD here.
    if (!list.querySelector("[data-sfs-step]") && data.features) {
      list.innerHTML = data.features.map((f, i, all) => stepHTML(f, i, all)).join("");
      grid.innerHTML = data.features.map(tileHTML).join("");
      if (config.schema) {
        const ld = document.createElement("script");
        ld.type = "application/ld+json";
        ld.textContent = schema(data);
        root.append(ld);
      }
    }

    const steps = [...list.querySelectorAll("[data-sfs-step]")];
    const tiles = [...grid.querySelectorAll("[data-sfs-tile]")];
    const total = Math.min(steps.length, tiles.length);
    const pausers = new Set(["offscreen", "reveal"]); // anything in here holds autoplay
    let active = -1;
    let programmaticScroll = 0;

    if (config.theme !== "auto") root.dataset.theme = config.theme;
    root.style.setProperty("--sfs-interval", `${config.interval}ms`);
    grid.dataset.layout = config.layout;
    root.dataset.kenburns = config.kenBurns && !reducedMotion.matches ? "on" : "off";

    // Tabs: the list controls the tiles. Roles and ids are added here, so the markup works without JS.
    list.setAttribute("role", "tablist");
    list.setAttribute("aria-orientation", "vertical");
    steps.forEach((step, i) => {
      const tile = tiles[i];
      step.id = `${uid}-tab-${i}`;
      tile.id = `${uid}-panel-${i}`;
      step.setAttribute("role", "tab");
      step.setAttribute("aria-controls", tile.id);
      tile.setAttribute("role", "tabpanel");
      tile.setAttribute("aria-labelledby", step.id);
    });

    // The headline's words reveal one by one (the gradient phrase moves as one word).
    const headline = root.querySelector("[data-sfs-words]");
    if (headline && !reducedMotion.matches) {
      let w = 0;
      const wrap = () => {
        const outer = document.createElement("span");
        outer.className = "sfs-word";
        const inner = document.createElement("span");
        inner.style.setProperty("--w", w++);
        outer.append(inner);
        return [outer, inner];
      };
      [...headline.childNodes].forEach((node) => {
        if (node.nodeType === 3) {
          const parts = node.textContent.split(/(\s+)/);
          const frag = document.createDocumentFragment();
          parts.forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) return frag.append(part);
            const [outer, inner] = wrap();
            inner.textContent = part;
            frag.append(outer);
          });
          node.replaceWith(frag);
        } else {
          const [outer, inner] = wrap();
          node.replaceWith(outer);
          inner.append(node);
        }
      });
    }

    const accentOf = (i) => steps[i].style.getPropertyValue("--accent").trim();

    function scrollStripTo(i) {
      programmaticScroll = Date.now();
      const tile = tiles[i];
      grid.scrollTo({ left: tile.offsetLeft - (grid.clientWidth - tile.clientWidth) / 2, behavior: reducedMotion.matches ? "auto" : "smooth" });
    }

    function playVideos() {
      tiles.forEach((tile, i) => {
        const video = tile.querySelector("video");
        if (!video) return;
        if (i === active && !pausers.has("offscreen")) video.play().catch(() => {});
        else video.pause();
      });
    }

    /** Puts feature `index` in the spotlight. `source`: autoplay, hover, focus, click, key, scroll, api. */
    function setActive(index, source) {
      index = ((index % total) + total) % total;
      if (index === active) return;
      active = index;
      steps.forEach((step, i) => {
        step.toggleAttribute("data-active", i === active);
        step.toggleAttribute("data-visited", i < active);
        step.setAttribute("aria-selected", String(i === active));
        step.tabIndex = i === active ? 0 : -1;
      });
      tiles.forEach((tile, i) => tile.toggleAttribute("data-active", i === active));
      root.style.setProperty("--sfs-active-accent", accentOf(active));
      if (phone.matches && source !== "scroll" && source !== "init") scrollStripTo(active);
      playVideos();
      if (live && source !== "init") {
        const step = steps[active];
        live.textContent = `${step.querySelector(".sfs-step-title")?.textContent}: ${step.querySelector(".sfs-step-desc")?.textContent}`;
      }
      if (source !== "init") {
        root.dispatchEvent(new CustomEvent("sfs:change", { detail: { index: active, id: steps[active].dataset.sfsStep } }));
      }
    }
    const next = () => setActive(active + 1, "api");
    const prev = () => setActive(active - 1, "api");
    const goTo = (target) =>
      setActive(typeof target === "number" ? target : steps.findIndex((s) => s.dataset.sfsStep === target), "api");

    function sync() {
      const enabled = config.autoplay && !reducedMotion.matches && total > 1;
      const running = enabled && pausers.size === 0;
      root.dataset.autoplay = enabled ? "on" : "off";
      root.toggleAttribute("data-paused", !running);
      live?.setAttribute("aria-live", running ? "off" : "polite");
      playVideos();
    }
    const hold = (reason, on) => {
      on ? pausers.add(reason) : pausers.delete(reason);
      sync();
    };

    // ---- The list: hover, focus, tap and arrow keys --------------------------
    steps.forEach((step, i) => {
      step.addEventListener("pointerenter", (event) => {
        if (event.pointerType === "mouse") setActive(i, "hover");
      });
      step.addEventListener("click", () => setActive(i, "click"));
      step.addEventListener("focus", () => setActive(i, "focus"));
    });
    list.addEventListener("keydown", (event) => {
      const moves = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1, Home: -active, End: total - 1 - active };
      if (!(event.key in moves)) return;
      event.preventDefault();
      steps[(((active + moves[event.key]) % total) + total) % total].focus();
    });

    // ---- The tiles: hover, the tile button, parallax and sheen ----------------
    tiles.forEach((tile, i) => {
      tile.addEventListener("pointerenter", (event) => {
        if (event.pointerType === "mouse") setActive(i, "hover");
      });
      tile.querySelector("button.sfs-hit")?.addEventListener("click", () => setActive(i, "click"));
    });
    const parallax = { x: 0, y: 0, tx: 0, ty: 0, frame: 0, tile: null };
    function stepParallax() {
      parallax.x += (parallax.tx - parallax.x) * LERP;
      parallax.y += (parallax.ty - parallax.y) * LERP;
      const tile = tiles[active];
      tile.style.setProperty("--px", parallax.x.toFixed(3));
      tile.style.setProperty("--py", parallax.y.toFixed(3));
      parallax.frame =
        Math.abs(parallax.tx - parallax.x) + Math.abs(parallax.ty - parallax.y) > 0.002 ? requestAnimationFrame(stepParallax) : 0;
    }
    grid.addEventListener("pointermove", (event) => {
      if (event.pointerType !== "mouse") return;
      const tile = event.target.closest("[data-sfs-tile]");
      if (!tile) return;
      const box = tile.getBoundingClientRect();
      const x = (event.clientX - box.left) / box.width;
      const y = (event.clientY - box.top) / box.height;
      tile.style.setProperty("--mx", `${(x * 100).toFixed(1)}%`);
      tile.style.setProperty("--my", `${(y * 100).toFixed(1)}%`);
      if (!config.parallax || reducedMotion.matches || !finePointer.matches || tile !== tiles[active]) return;
      parallax.tx = (x - 0.5) * -2;
      parallax.ty = (y - 0.5) * -2;
      parallax.frame ||= requestAnimationFrame(stepParallax);
    });
    grid.addEventListener("pointerleave", () => {
      parallax.tx = parallax.ty = 0;
      parallax.frame ||= requestAnimationFrame(stepParallax);
    });

    // Each caption sits lowered by its description's height until the tile is in the spotlight.
    new ResizeObserver(() => {
      tiles.forEach((tile) => {
        const desc = tile.querySelector(".sfs-caption-desc");
        if (desc) tile.style.setProperty("--desc-h", `${desc.offsetHeight}px`);
      });
    }).observe(grid);

    // Phones: the snapped tile becomes the active feature (and tapping a feature scrolls to its tile).
    const snap = new IntersectionObserver(
      (entries) => {
        if (!phone.matches || Date.now() - programmaticScroll < 700) return;
        const seen = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (seen) setActive(tiles.indexOf(seen.target), "scroll");
      },
      { root: grid, threshold: 0.6 },
    );
    tiles.forEach((tile) => snap.observe(tile));

    // ---- The call to action's magnetic pull (mouse only) ----------------------
    const cta = root.querySelector(".sfs-cta");
    if (cta) {
      const magnet = { x: 0, y: 0, tx: 0, ty: 0, frame: 0 };
      const stepMagnet = () => {
        magnet.x += (magnet.tx - magnet.x) * 0.18;
        magnet.y += (magnet.ty - magnet.y) * 0.18;
        cta.style.setProperty("--mag-x", `${magnet.x.toFixed(2)}px`);
        cta.style.setProperty("--mag-y", `${magnet.y.toFixed(2)}px`);
        magnet.frame = Math.abs(magnet.tx - magnet.x) + Math.abs(magnet.ty - magnet.y) > 0.05 ? requestAnimationFrame(stepMagnet) : 0;
      };
      cta.addEventListener("pointermove", (event) => {
        if (event.pointerType !== "mouse" || reducedMotion.matches) return;
        const box = cta.getBoundingClientRect();
        magnet.tx = Math.max(-1, Math.min(1, (event.clientX - box.left - magnet.x) / box.width * 2 - 1)) * 6;
        magnet.ty = Math.max(-1, Math.min(1, (event.clientY - box.top - magnet.y) / box.height * 2 - 1)) * 6;
        magnet.frame ||= requestAnimationFrame(stepMagnet);
      });
      cta.addEventListener("pointerleave", () => {
        magnet.tx = magnet.ty = 0;
        magnet.frame ||= requestAnimationFrame(stepMagnet);
      });
    }

    // ---- Autoplay holds: hover, focus, a hidden tab, off screen -------------
    [list, grid].forEach((el) => {
      el.addEventListener("pointerenter", (event) => event.pointerType === "mouse" && hold("hover", true));
      el.addEventListener("pointerleave", () => hold("hover", false));
    });
    root.addEventListener("focusin", () => hold("focus", true));
    root.addEventListener("focusout", (event) => !root.contains(event.relatedTarget) && hold("focus", false));
    document.addEventListener("visibilitychange", () => hold("hidden", document.hidden));
    list.addEventListener("animationend", (event) => {
      if (event.target.closest(".sfs-step-progress") && event.target.closest("[data-active]")) setActive(active + 1, "autoplay");
    });
    reducedMotion.addEventListener("change", sync);

    // ---- Reveal on scroll, then autoplay -------------------------------------
    new IntersectionObserver(
      ([entry]) => {
        hold("offscreen", !entry.isIntersecting);
        if (entry.isIntersecting && !root.hasAttribute("data-revealed")) {
          root.setAttribute("data-revealing", "");
          root.setAttribute("data-revealed", "");
          setTimeout(() => {
            root.removeAttribute("data-revealing");
            hold("reveal", false);
          }, 1500);
        }
      },
      { threshold: 0.25 },
    ).observe(root);

    setActive(0, "init");
    root.dataset.ready = "";
    sync();
    const api = { next, prev, goTo, pause: () => hold("user", true), play: () => hold("user", false) };
    Object.assign(root, api, { sfs: api });
    return api;
  }

  window.SpotlightFeatureShowcase = { mount, stepHTML, tileHTML, schema };
  document.querySelectorAll("[data-sfs]").forEach((root) => mount(root));
})();
