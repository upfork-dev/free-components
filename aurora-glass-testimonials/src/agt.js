/*!
 * Aurora Glass Testimonials: an interactive 3D stack of glass review cards.
 * Vanilla JS, no dependencies. Every [data-agt] section mounts itself; call
 * AuroraGlassTestimonials.mount(element, options) for sections added later.
 */
(() => {
  const DEFAULTS = { autoplay: true, interval: 6000, loop: true, tilt: true, maxVisible: 4, theme: "auto", schema: true };
  const TILT_LERP = 0.12;
  const ROTATION = [0, -3, 4, -5, 3, -4]; // degrees, by depth in the stack
  const media = (query) => window.matchMedia(query);
  const reducedMotion = media("(prefers-reduced-motion: reduce)");
  const finePointer = media("(hover: hover) and (pointer: fine)");
  const smallScreen = media("(max-width: 640px)");
  const parse = (text) => {
    try {
      return text ? JSON.parse(text) : null;
    } catch {
      return null;
    }
  };
  const escape = (value) =>
    String(value ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  const initials = (name) =>
    String(name)
      .split(/\s+/)
      .map((part) => part[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  const monthYear = (iso) =>
    new Date(`${iso}T12:00:00`).toLocaleDateString("en", { month: "short", year: "numeric" });
  const pad = (n) => String(n).padStart(2, "0");
  let mounted = 0;

  /** One review as a <figure>. The build pre-renders these (so they work without JS); mount() uses it for JSON-only sections. */
  function cardHTML(review, index, total) {
    const stars = [0, 1, 2, 3, 4]
      .map((s) => `<i class="agt-star${s < Math.round(review.rating) ? " agt-on" : ""}" style="--s:${s}"></i>`)
      .join("");
    const avatar = review.avatar
      ? `<img src="${escape(review.avatar)}" alt="" width="40" height="40" loading="lazy" decoding="async">`
      : "";
    const role = [review.role, review.company].filter(Boolean).map(escape).join(", ");
    const meta = [review.source && `via ${escape(review.source)}`, review.date && `<time datetime="${escape(review.date)}">${monthYear(review.date)}</time>`]
      .filter(Boolean)
      .join(" · ");
    return `<figure class="agt-card" data-agt-card style="--i:${Math.min(index, 4)};--k:${index}" role="group" aria-roledescription="slide" aria-label="Testimonial ${index + 1} of ${total}">
  <div class="agt-card-inner">
    <span class="agt-sheen" aria-hidden="true"></span>
    <div class="agt-card-top">
      <span class="agt-pill agt-quote-mark" aria-hidden="true"></span>
      ${review.verified ? '<span class="agt-pill agt-verified">Verified</span>' : ""}
    </div>
    <blockquote class="agt-quote"><p>${escape(review.quote)}</p></blockquote>
    <div class="agt-rating" role="img" aria-label="Rated ${review.rating} out of 5">${stars}</div>
    <figcaption class="agt-author">
      <span class="agt-avatar" data-initials="${escape(initials(review.name))}">${avatar}</span>
      <span><span class="agt-name">${escape(review.name)}</span><span class="agt-role">${role}</span></span>
      ${meta ? `<span class="agt-source">${meta}</span>` : ""}
    </figcaption>
    <span class="agt-progress" aria-hidden="true"></span>
    <span class="agt-veil" aria-hidden="true"></span>
  </div>
</figure>`;
  }

  /** schema.org JSON-LD for the reviews: a Product with its aggregate rating and each Review. */
  function schema(data) {
    const json = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Product",
      name: data.product || "Product",
      aggregateRating: data.aggregate && {
        "@type": "AggregateRating",
        ratingValue: data.aggregate.rating,
        bestRating: 5,
        reviewCount: data.aggregate.count,
      },
      review: (data.reviews || []).map((r) => ({
        "@type": "Review",
        author: { "@type": "Person", name: r.name },
        datePublished: r.date,
        reviewBody: r.quote,
        reviewRating: { "@type": "Rating", ratingValue: r.rating, bestRating: 5 },
      })),
    });
    return json.replace(/</g, "\\" + "u003c");
  }

  function mount(root, options = {}) {
    if (root.agt) return root.agt;
    const data = parse(root.querySelector("[data-agt-data]")?.textContent) || {};
    const config = { ...DEFAULTS, ...data.config, ...parse(root.dataset.agtConfig), ...options };
    const stage = root.querySelector("[data-agt-stage]");
    const live = root.querySelector("[data-agt-live]");
    const counter = root.querySelector("[data-agt-counter]");
    const toggle = root.querySelector("[data-agt-toggle]");
    if (!stage) return null;
    mounted++;

    // Name the section after its heading, so copies of it need no hand-made ids.
    const heading = root.querySelector("h2, h3");
    if (heading && !root.hasAttribute("aria-labelledby") && !root.hasAttribute("aria-label")) {
      heading.id ||= `agt-heading-${mounted}`;
      root.setAttribute("aria-labelledby", heading.id);
    }
    if (config.theme !== "auto") root.dataset.theme = config.theme;
    root.style.setProperty("--agt-interval", `${config.interval}ms`);

    // A section with only JSON: render its cards (and JSON-LD) here.
    if (!stage.querySelector("[data-agt-card]") && data.reviews) {
      stage.innerHTML = data.reviews.map((r, i) => cardHTML(r, i, data.reviews.length)).join("");
      if (config.schema) {
        const ld = document.createElement("script");
        ld.type = "application/ld+json";
        ld.textContent = schema(data);
        root.append(ld);
      }
    }

    const cards = [...stage.querySelectorAll("[data-agt-card]")];
    const total = cards.length;
    const pausers = new Set(["offscreen"]); // anything in here holds autoplay
    let order = cards.map((_, i) => i); // order[0] is the card in front
    let drag = null;
    let tilt = { x: 0, y: 0, tx: 0, ty: 0, frame: 0 };

    // An avatar that fails to load shows the initials underneath instead.
    stage.querySelectorAll(".agt-avatar img").forEach((img) => {
      if (img.complete && !img.naturalWidth) img.remove();
      else img.addEventListener("error", () => img.remove(), { once: true });
    });

    const front = () => cards[order[0]];

    function layout() {
      const visible = Math.max(1, smallScreen.matches ? 2 : config.maxVisible);
      order.forEach((cardIndex, depth) => {
        const card = cards[cardIndex];
        const d = Math.min(depth, visible);
        card.style.setProperty("--i", d);
        card.style.setProperty("--r", depth ? ROTATION[d % ROTATION.length] : 0);
        card.toggleAttribute("data-front", depth === 0);
        card.toggleAttribute("data-hidden", depth >= visible);
        card.setAttribute("aria-hidden", String(depth > 0));
        if (depth) ["--tx", "--ty", "--mx", "--my"].forEach((p) => card.style.removeProperty(p));
      });
      if (counter) counter.textContent = `${pad(order[0] + 1)} / ${pad(total)}`;
    }

    function sync() {
      const running = config.autoplay && !reducedMotion.matches && total > 1 && pausers.size === 0;
      root.toggleAttribute("data-paused", !running);
      root.dataset.autoplay = config.autoplay && !reducedMotion.matches && total > 1 ? "on" : "off";
      // Announce changes only when they aren't automatic (WAI carousel pattern).
      live?.setAttribute("aria-live", running ? "off" : "polite");
      if (toggle) {
        // The label says what the button does next (WAI carousel pattern), the icon matches it.
        const playing = !pausers.has("user");
        toggle.dataset.playing = String(playing);
        toggle.setAttribute("aria-label", playing ? "Pause autoplay" : "Play autoplay");
      }
    }

    function fly(card, attr, dir) {
      card.style.setProperty("--dir", dir);
      card.removeAttribute(attr);
      void card.offsetWidth; // restart the animation if it was mid-flight
      card.setAttribute(attr, "");
      card.addEventListener(
        "animationend",
        function done(event) {
          if (event.target !== card) return card.addEventListener("animationend", done, { once: true });
          card.removeAttribute(attr);
          ["--dx", "--drot", "--dir"].forEach((p) => card.style.removeProperty(p));
        },
        { once: true },
      );
    }

    /** Moves the stack by `steps` (positive: forward). `dir` is the side a card flies out to. */
    function go(steps, dir = -1) {
      steps = ((steps % total) + total) % total;
      if (total < 2 || !steps) return;
      // Forward (up to half the stack): the front card flies to the back. Further than that, it's
      // shorter to go the other way: the new front card flies in from the side.
      const forward = steps <= total / 2;
      const leaving = front();
      order = [...order.slice(steps), ...order.slice(0, steps)];
      if (forward) fly(leaving, "data-leaving", dir);
      else fly(front(), "data-entering", -dir);
      layout();
      const review = front().querySelector(".agt-name")?.textContent || "";
      if (live) live.textContent = `Testimonial ${order[0] + 1} of ${total}: ${review}`;
      root.dispatchEvent(new CustomEvent("agt:change", { detail: { index: order[0] } }));
    }
    const next = () => (config.loop || order[0] < total - 1) && go(1, -1);
    const prev = () => (config.loop || order[0] > 0) && go(-1, 1);
    const goTo = (index) => go(order.indexOf(((index % total) + total) % total), -1);

    // ---- Dragging and swiping the front card --------------------------------
    let swiped = false; // the click that ends a swipe must not bring the swiped card back
    stage.addEventListener("click", (event) => {
      const card = event.target.closest("[data-agt-card]");
      if (card && card !== front() && !swiped) goTo(cards.indexOf(card)); // a card behind: bring it forward
      swiped = false;
    });
    stage.addEventListener("pointerdown", (event) => {
      const card = event.target.closest("[data-agt-card]");
      if (card !== front() || event.button > 0) return;
      swiped = false;
      drag = { x: event.clientX, time: event.timeStamp, dx: 0, card };
      card.setPointerCapture(event.pointerId);
      pausers.add("drag");
      sync();
    });
    stage.addEventListener("pointermove", (event) => {
      if (!drag) return pointerTilt(event);
      drag.dx = event.clientX - drag.x;
      if (Math.abs(drag.dx) > 3) (root.dataset.dragging = ""), (swiped = true);
      drag.card.style.setProperty("--dx", `${drag.dx}px`);
      drag.card.style.setProperty("--drot", `${drag.dx / 24}deg`);
    });
    const release = (event) => {
      if (!drag) return;
      const { dx, time, card } = drag;
      drag = null;
      delete root.dataset.dragging;
      const speed = Math.abs(dx) / Math.max(1, event.timeStamp - time);
      if (Math.abs(dx) > 80 || (Math.abs(dx) > 24 && speed > 0.5)) go(1, Math.sign(dx));
      else ["--dx", "--drot"].forEach((p) => card.style.removeProperty(p)); // spring back
      pausers.delete("drag");
      sync();
    };
    stage.addEventListener("pointerup", release);
    stage.addEventListener("pointercancel", release);

    // ---- Tilt, parallax and sheen (mouse only) ------------------------------
    function pointerTilt(event) {
      if (!config.tilt || reducedMotion.matches || !finePointer.matches) return;
      const card = front();
      const box = card.getBoundingClientRect();
      const x = (event.clientX - box.left) / box.width;
      const y = (event.clientY - box.top) / box.height;
      tilt.tx = Math.max(-1, Math.min(1, x * 2 - 1));
      tilt.ty = Math.max(-1, Math.min(1, y * 2 - 1));
      card.style.setProperty("--mx", `${(x * 100).toFixed(1)}%`);
      card.style.setProperty("--my", `${(y * 100).toFixed(1)}%`);
      tilt.frame ||= requestAnimationFrame(stepTilt);
    }
    function stepTilt() {
      tilt.x += (tilt.tx - tilt.x) * TILT_LERP;
      tilt.y += (tilt.ty - tilt.y) * TILT_LERP;
      const card = front();
      card.style.setProperty("--tx", tilt.x.toFixed(3));
      card.style.setProperty("--ty", tilt.y.toFixed(3));
      tilt.frame = Math.abs(tilt.tx - tilt.x) + Math.abs(tilt.ty - tilt.y) > 0.002 ? requestAnimationFrame(stepTilt) : 0;
    }
    stage.addEventListener("pointerenter", (event) => {
      if (event.pointerType === "mouse") pausers.add("hover"), sync();
    });
    stage.addEventListener("pointerleave", () => {
      pausers.delete("hover");
      sync();
      tilt.tx = tilt.ty = 0;
      tilt.frame ||= requestAnimationFrame(stepTilt);
    });

    // ---- Keyboard, buttons, focus and visibility ----------------------------
    stage.addEventListener("keydown", (event) => {
      const keys = { ArrowRight: next, ArrowLeft: prev, Home: () => goTo(0), End: () => goTo(total - 1) };
      if (keys[event.key]) event.preventDefault(), keys[event.key]();
    });
    root.querySelector("[data-agt-next]")?.addEventListener("click", next);
    root.querySelector("[data-agt-prev]")?.addEventListener("click", prev);
    toggle?.addEventListener("click", () => {
      pausers.has("user") ? pausers.delete("user") : pausers.add("user");
      sync();
    });
    root.addEventListener("focusin", () => (pausers.add("focus"), sync()));
    root.addEventListener("focusout", (event) => {
      if (!root.contains(event.relatedTarget)) pausers.delete("focus"), sync();
    });
    document.addEventListener("visibilitychange", () => {
      document.hidden ? pausers.add("hidden") : pausers.delete("hidden");
      sync();
    });
    stage.addEventListener("animationend", (event) => {
      if (event.target.closest(".agt-progress") && event.target.closest("[data-front]")) next();
    });
    smallScreen.addEventListener("change", layout);
    reducedMotion.addEventListener("change", sync);

    // ---- Reveal on scroll: header, cards fanning in, numbers counting up -----
    new IntersectionObserver(
      ([entry]) => {
        entry.isIntersecting ? pausers.delete("offscreen") : pausers.add("offscreen");
        sync();
        if (entry.isIntersecting && !root.hasAttribute("data-revealed")) {
          root.setAttribute("data-revealing", "");
          root.setAttribute("data-revealed", "");
          setTimeout(() => root.removeAttribute("data-revealing"), 1400);
          countUp();
        }
      },
      { threshold: 0.25 },
    ).observe(root);

    function countUp() {
      if (reducedMotion.matches) return;
      root.querySelectorAll("[data-agt-count]").forEach((el) => {
        const target = parseFloat(el.dataset.agtCount);
        const decimals = (el.dataset.agtCount.split(".")[1] || "").length;
        const start = performance.now();
        const format = (value) =>
          value.toLocaleString("en", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
        const step = (now) => {
          const t = Math.min(1, (now - start) / 1400);
          el.textContent = format(target * (1 - (1 - t) ** 3));
          if (t < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      });
    }

    layout();
    sync();
    const api = {
      next,
      prev,
      goTo,
      pause: () => (pausers.add("user"), sync()),
      play: () => (pausers.delete("user"), sync()),
    };
    Object.assign(root, api, { agt: api });
    return api;
  }

  window.AuroraGlassTestimonials = { mount, cardHTML, schema };
  document.querySelectorAll("[data-agt]").forEach((root) => mount(root));
})();
