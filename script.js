const menuButton = document.querySelector(".menu-toggle");
const mobileNav = document.querySelector(".mobile-nav");

if (menuButton && mobileNav) {
  menuButton.addEventListener("click", () => {
    const isOpen = document.body.classList.toggle("menu-open");
    menuButton.setAttribute("aria-expanded", String(isOpen));
  });

  mobileNav.addEventListener("click", (event) => {
    if (event.target instanceof HTMLAnchorElement) {
      document.body.classList.remove("menu-open");
      menuButton.setAttribute("aria-expanded", "false");
    }
  });
}

(function initScrollReveal() {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Block-level elements that reveal on their own.
  const blockSelector = [
    ".section > .section-kicker",
    ".section > h2",
    ".section > .section-lede",
    ".split-section > div",
    ".reach-text",
    ".manifesto",
    ".pullquote",
    ".contact-copy",
    ".contact-form",
    ".final-cta > *",
  ].join(",");

  // Containers whose direct children reveal in a staggered sequence.
  const staggerGroups = [
    ".benefit-grid",
    ".branch-grid",
    ".process-grid",
    ".trust-strip",
    ".reach-stats",
    ".pf-pain-cards",
    ".pf-pillar-grid",
    ".pf-quotes-grid",
    ".pf-links-grid",
    ".pf-metrics",
  ];

  const blocks = Array.from(document.querySelectorAll(blockSelector));
  const staggerItems = [];

  staggerGroups.forEach((sel) => {
    document.querySelectorAll(sel).forEach((group) => {
      Array.from(group.children).forEach((child, i) => {
        child.style.setProperty("--reveal-delay", `${Math.min(i, 8) * 70}ms`);
        staggerItems.push(child);
      });
    });
  });

  const all = [...blocks, ...staggerItems];

  if (reduce || !("IntersectionObserver" in window)) {
    all.forEach((el) => el.classList.add("is-visible"));
    return;
  }

  all.forEach((el) => el.classList.add("reveal"));

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          io.unobserve(entry.target);
        }
      });
    },
    // Fire when the element's top has risen ~12% into the viewport — so the
    // motion is actually visible as you scroll, not pre-triggered off-screen.
    { rootMargin: "0px 0px -12% 0px", threshold: 0.05 }
  );

  all.forEach((el) => io.observe(el));
})();

(function initParallax() {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  const globe = document.querySelector(".reach-globe");
  const dash = document.querySelector(".hero-visual .product-frame");
  let raf = null;

  function update() {
    const y = window.scrollY;

    // Globe drifts up slightly as you scroll past it (depth).
    if (globe) {
      const sec = globe.closest(".reach-section");
      if (sec) {
        const rect = sec.getBoundingClientRect();
        const progress = 1 - (rect.top + rect.height) / (innerHeight + rect.height);
        const shift = Math.max(-1, Math.min(1, progress)) * 60;
        globe.style.transform = `translateX(-50%) translateY(${-shift}px)`;
      }
    }

    // Hero dashboard gets a gentle parallax lift on scroll.
    if (dash) {
      const rect = dash.getBoundingClientRect();
      if (rect.bottom > 0 && rect.top < innerHeight) {
        const p = (innerHeight - rect.top) / (innerHeight + rect.height);
        dash.style.setProperty("--parallax", `${(p - 0.5) * -28}px`);
      }
    }
    raf = null;
  }

  window.addEventListener(
    "scroll",
    () => {
      if (!raf) raf = requestAnimationFrame(update);
    },
    { passive: true }
  );
  update();
})();

(function initBgFieldParallax() {
  const field = document.getElementById("bgField");
  if (!field) return;
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  let tx = 0.5, ty = 0.5, cx = 0.5, cy = 0.5, raf = null;

  function loop() {
    // ease current toward target for smooth trailing motion
    cx += (tx - cx) * 0.06;
    cy += (ty - cy) * 0.06;
    field.style.setProperty("--mx", cx.toFixed(4));
    field.style.setProperty("--my", cy.toFixed(4));
    if (Math.abs(tx - cx) > 0.001 || Math.abs(ty - cy) > 0.001) {
      raf = requestAnimationFrame(loop);
    } else {
      raf = null;
    }
  }

  window.addEventListener("pointermove", (e) => {
    tx = e.clientX / window.innerWidth;
    ty = e.clientY / window.innerHeight;
    if (!raf) raf = requestAnimationFrame(loop);
  }, { passive: true });
})();

(function initCursorSpotlight() {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (matchMedia("(hover: none)").matches) return;
  let raf = null;
  let mx = -200, my = -200;
  const onMove = (e) => {
    mx = e.clientX;
    my = e.clientY;
    if (!raf) {
      raf = requestAnimationFrame(() => {
        document.body.style.setProperty("--mx", mx + "px");
        document.body.style.setProperty("--my", my + "px");
        raf = null;
      });
    }
  };
  window.addEventListener("mousemove", onMove, { passive: true });
})();

(function initCardGlow() {
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const cards = document.querySelectorAll(".benefit-grid article, .branch-card");
  cards.forEach((card) => {
    card.addEventListener("mousemove", (e) => {
      const r = card.getBoundingClientRect();
      card.style.setProperty("--cx", (e.clientX - r.left) + "px");
      card.style.setProperty("--cy", (e.clientY - r.top) + "px");
    });
  });
})();

(function initContactForm() {
  const form = document.querySelector(".contact-form");
  if (!form) return;
  const btn = form.querySelector(".contact-submit");
  const honeypot = form.querySelector('input[name="website"]');

  const originalText = btn.textContent;

  function reset(delay) {
    setTimeout(() => {
      btn.disabled = false;
      btn.classList.remove("is-success", "is-error");
      btn.textContent = originalText;
    }, delay);
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (honeypot && honeypot.value) return;
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    btn.disabled = true;
    btn.classList.remove("is-error");
    btn.textContent = "Sending…";

    const payload = {
      name: form.querySelector('[name="name"]')?.value || "",
      email: form.querySelector('[name="email"]')?.value || "",
      company: form.querySelector('[name="company"]')?.value || "",
      topic: form.querySelector('[name="topic"]')?.value || "",
      message: form.querySelector('[name="message"]')?.value || "",
      website: honeypot ? honeypot.value : "",
    };

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));

      if (res.ok && data.ok) {
        btn.classList.add("is-success");
        btn.textContent = "Got it — we’ll be in touch ✓";
        form.querySelectorAll("input, textarea, select").forEach((el) => {
          if (el !== honeypot && el !== btn) el.value = "";
        });
        reset(4000);
      } else {
        throw new Error(data.error || "Send failed");
      }
    } catch (err) {
      btn.classList.add("is-error");
      btn.textContent = "Couldn’t send — email us instead";
      reset(5000);
    }
  });
})();

(function initFloatCta() {
  const cta = document.getElementById("floatCta");
  if (!cta) return;
  const hero = document.querySelector(".hero");
  let ticking = false;
  function update() {
    const trigger = hero ? hero.getBoundingClientRect().bottom : 600;
    if (trigger < 0) cta.classList.add("is-visible");
    else cta.classList.remove("is-visible");
    ticking = false;
  }
  window.addEventListener("scroll", () => {
    if (!ticking) { requestAnimationFrame(update); ticking = true; }
  }, { passive: true });
  update();
})();

(function initScrolledHeader() {
  const header = document.querySelector(".site-header");
  if (!header) return;
  const THRESHOLD = 8;
  let ticking = false;
  function update() {
    if (window.scrollY > THRESHOLD) header.classList.add("is-scrolled");
    else header.classList.remove("is-scrolled");
    ticking = false;
  }
  window.addEventListener("scroll", () => {
    if (!ticking) {
      requestAnimationFrame(update);
      ticking = true;
    }
  }, { passive: true });
  update();
})();

(function initVisitTracking() {
  // Only track visitors who accepted analytics in the cookie banner (GDPR).
  let consent = null;
  try { consent = JSON.parse(localStorage.getItem("rayl-cookie-consent") || "null"); } catch (_) {}
  if (!consent || consent.choice !== "accept") return;

  // Fire a one-off beacon with the current page; IP + geo are read server-side.
  try {
    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify({
        path: location.pathname,
        referrer: document.referrer || "",
      }),
    }).catch(() => {});
  } catch (_) {}
})();

(function initCookieConsent() {
  const banner = document.getElementById("cookieBanner");
  if (!banner) return;

  const STORAGE_KEY = "rayl-cookie-consent";
  const ONE_YEAR = 60 * 60 * 24 * 365;

  function setCookie(name, value, maxAgeSeconds) {
    const secure = location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${name}=${encodeURIComponent(value)}; max-age=${maxAgeSeconds}; path=/; SameSite=Lax${secure}`;
  }

  function deleteCookie(name) {
    document.cookie = `${name}=; max-age=0; path=/; SameSite=Lax`;
  }

  function showBanner() {
    banner.hidden = false;
    requestAnimationFrame(() => banner.classList.add("is-visible"));
  }

  function hideBanner() {
    banner.classList.remove("is-visible");
    setTimeout(() => { banner.hidden = true; }, 400);
  }

  function applyConsent(choice) {
    const record = { choice, at: new Date().toISOString() };
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(record)); } catch (_) {}

    setCookie("rayl_consent", choice, ONE_YEAR);
    setCookie("rayl_session", Math.random().toString(36).slice(2) + Date.now().toString(36), ONE_YEAR);

    if (choice === "accept") {
      setCookie("rayl_analytics", "1", ONE_YEAR);
      setCookie("rayl_prefs", "default", ONE_YEAR);
    } else {
      deleteCookie("rayl_analytics");
      deleteCookie("rayl_prefs");
    }
  }

  let stored = null;
  try { stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null"); } catch (_) {}

  if (!stored || (stored.choice !== "accept" && stored.choice !== "reject")) {
    showBanner();
  }

  document.addEventListener("click", (event) => {
    const target = event.target.closest("[data-cookie-action]");
    if (!target) return;
    const action = target.dataset.cookieAction;
    if (action === "accept" || action === "reject") {
      applyConsent(action);
      hideBanner();
    } else if (action === "reset") {
      try { localStorage.removeItem(STORAGE_KEY); } catch (_) {}
      deleteCookie("rayl_consent");
      deleteCookie("rayl_analytics");
      deleteCookie("rayl_prefs");
      showBanner();
    }
  });
})();

(function initGlobe() {
  const svgEl = document.querySelector(".globe-svg");
  const pulseLayer = document.querySelector(".globe-pulses");
  if (!svgEl || !pulseLayer || typeof d3 === "undefined" || typeof topojson === "undefined") return;

  const SIZE = 500;
  const CENTER = SIZE / 2;
  const RADIUS = SIZE * 0.48;

  const svg = d3.select(svgEl);
  const projection = d3.geoOrthographic()
    .scale(RADIUS)
    .translate([CENTER, CENTER])
    .clipAngle(90)
    .rotate([0, -15]);

  const geoPath = d3.geoPath(projection);

  // Defs: blue ocean gradient + green land gradient + subtle highlight + sphere shading
  const defs = svg.append("defs");
  const oceanGrad = defs.append("radialGradient")
    .attr("id", "rayl-ocean")
    .attr("cx", "35%").attr("cy", "30%").attr("r", "80%");
  oceanGrad.append("stop").attr("offset", "0%").attr("stop-color", "#2a6da3");
  oceanGrad.append("stop").attr("offset", "55%").attr("stop-color", "#0f3a5c");
  oceanGrad.append("stop").attr("offset", "100%").attr("stop-color", "#061b2d");

  const landGrad = defs.append("linearGradient")
    .attr("id", "rayl-land")
    .attr("x1", "0%").attr("y1", "0%").attr("x2", "0%").attr("y2", "100%");
  landGrad.append("stop").attr("offset", "0%").attr("stop-color", "#3d8c4d");
  landGrad.append("stop").attr("offset", "60%").attr("stop-color", "#2f6b3b");
  landGrad.append("stop").attr("offset", "100%").attr("stop-color", "#1f4a29");

  const shadeGrad = defs.append("radialGradient")
    .attr("id", "rayl-shade")
    .attr("cx", "35%").attr("cy", "30%").attr("r", "75%");
  shadeGrad.append("stop").attr("offset", "0%").attr("stop-color", "rgba(255,255,255,0.18)");
  shadeGrad.append("stop").attr("offset", "55%").attr("stop-color", "rgba(0,0,0,0)");
  shadeGrad.append("stop").attr("offset", "100%").attr("stop-color", "rgba(0,0,0,0.55)");

  svg.append("circle")
    .attr("class", "ocean")
    .attr("cx", CENTER).attr("cy", CENTER).attr("r", RADIUS)
    .attr("fill", "url(#rayl-ocean)");

  svg.append("path")
    .attr("class", "graticule")
    .datum(d3.geoGraticule().step([15, 15])())
    .attr("d", geoPath);

  const landPath = svg.append("path").attr("class", "land");
  const dotsGroup = svg.append("g").attr("class", "dots");

  // Shading overlay on top — gives sphere depth (highlight + limb darkening)
  svg.append("circle")
    .attr("class", "sphere-shade")
    .attr("cx", CENTER).attr("cy", CENTER).attr("r", RADIUS)
    .attr("fill", "url(#rayl-shade)")
    .attr("pointer-events", "none");

  const pulses = Array.from(pulseLayer.querySelectorAll(".pulse")).map((el) => ({
    el,
    coord: [parseFloat(el.dataset.lng), parseFloat(el.dataset.lat)],
  }));

  const grid = [];
  for (let lat = -75; lat <= 80; lat += 5) {
    const step = lat === 0 ? 5 : 5 / Math.max(0.18, Math.cos(lat * Math.PI / 180));
    for (let lng = -180; lng < 180; lng += step) {
      grid.push([lng, lat]);
    }
  }

  d3.json("https://cdn.jsdelivr.net/npm/world-atlas@2/land-110m.json").then((world) => {
    const land = topojson.feature(world, world.objects.land);
    const graticule = d3.geoGraticule().step([15, 15])();

    landPath.datum(land);

    // Keep the dot grid as subtle land texture on top of the filled continents
    const landDots = grid.filter((pt) => d3.geoContains(land, pt));
    const dotSel = dotsGroup.selectAll("circle")
      .data(landDots)
      .join("circle")
      .attr("class", "dot")
      .attr("r", 0.9);

    function render() {
      landPath.attr("d", geoPath);
      svg.select(".graticule").attr("d", geoPath(graticule));

      dotSel.each(function (d) {
        const p = projection(d);
        if (p) {
          this.setAttribute("cx", p[0]);
          this.setAttribute("cy", p[1]);
          this.style.display = "";
        } else {
          this.style.display = "none";
        }
      });

      const rect = svgEl.getBoundingClientRect();
      const scale = rect.width / SIZE;
      pulses.forEach(({ el, coord }) => {
        const p = projection(coord);
        if (p) {
          const x = p[0] * scale;
          const y = p[1] * scale;
          el.style.transform = `translate(${x}px, ${y}px)`;
          el.style.opacity = "1";
        } else {
          el.style.opacity = "0";
        }
      });
    }

    let lambda = 0;
    let last = performance.now();
    function tick(now) {
      const dt = (now - last) / 1000;
      last = now;
      lambda += dt * 9;
      projection.rotate([lambda, -15]);
      render();
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }).catch(() => {});
})();

(function initScrollSpy() {
  // Highlight the nav link whose section is currently in the middle of the viewport.
  const links = Array.from(document.querySelectorAll('.desktop-nav a[href^="#"]'));
  if (!links.length || !("IntersectionObserver" in window)) return;

  const byId = new Map();
  links.forEach((link) => {
    const id = link.getAttribute("href").slice(1);
    const section = id && document.getElementById(id);
    if (section) byId.set(section, link);
  });
  if (!byId.size) return;

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        links.forEach((l) => l.classList.remove("is-active"));
        const link = byId.get(entry.target);
        if (link) link.classList.add("is-active");
      });
    },
    // A band around the middle of the viewport decides the "current" section.
    { rootMargin: "-35% 0px -60% 0px", threshold: 0 }
  );

  byId.forEach((_, section) => io.observe(section));
})();

(function initCountUp() {
  // Animate stat numbers from 0 when they scroll into view.
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (!("IntersectionObserver" in window)) return;

  const els = document.querySelectorAll(
    ".trust-stat strong, .pay-stat strong, .reach-stats strong, .pv-tile strong"
  );

  const targets = [];
  els.forEach((el) => {
    // Exactly one numeric run, e.g. "99.4%", "11+", "1,200+", "2026".
    const m = el.textContent.trim().match(/^([^0-9]*)([0-9][0-9.,]*)([^0-9]*)$/);
    if (!m) return;
    const raw = m[2];
    const value = parseFloat(raw.replace(/,/g, ""));
    if (!isFinite(value)) return;
    targets.push({
      el,
      prefix: m[1],
      suffix: m[3],
      value,
      decimals: raw.includes(".") ? raw.split(".")[1].length : 0,
      grouped: raw.includes(","),
      final: el.textContent,
    });
  });
  if (!targets.length) return;

  function format(t, val) {
    if (t.grouped) {
      return val.toLocaleString("en-US", {
        minimumFractionDigits: t.decimals,
        maximumFractionDigits: t.decimals,
      });
    }
    return val.toFixed(t.decimals);
  }

  function run(t) {
    const DURATION = 1200;
    const start = performance.now();
    function frame(now) {
      const p = Math.min(1, (now - start) / DURATION);
      const eased = 1 - Math.pow(2, -10 * p); // easeOutExpo
      if (p >= 1) {
        t.el.textContent = t.final; // land exactly on the authored text
        return;
      }
      t.el.textContent = t.prefix + format(t, t.value * eased) + t.suffix;
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const t = targets.find((x) => x.el === entry.target);
        if (t) run(t);
        io.unobserve(entry.target);
      });
    },
    { threshold: 0.5 }
  );

  targets.forEach((t) => {
    t.el.textContent = t.prefix + format(t, 0) + t.suffix;
    io.observe(t.el);
  });
})();

(function initImgReveal() {
  // Blur-up for hero-scale imagery: fade in from a soft blur instead of popping.
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  document
    .querySelectorAll(".product-frame img, .reach-globe-img")
    .forEach((img) => {
      if (img.complete && img.naturalWidth > 0) return; // cached — show instantly
      img.classList.add("img-blurup");
      const done = () => img.classList.add("is-loaded");
      img.addEventListener("load", done, { once: true });
      img.addEventListener("error", done, { once: true });
    });
})();

(function initMagneticButtons() {
  // CTAs lean gently toward the cursor, spring back on leave.
  if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  if (!matchMedia("(hover: hover) and (pointer: fine)").matches) return;

  document.querySelectorAll(".nav-cta, .primary-button, .contact-submit").forEach((el) => {
    el.classList.add("is-magnetic");
    el.addEventListener("mousemove", (e) => {
      const r = el.getBoundingClientRect();
      const dx = (e.clientX - (r.left + r.width / 2)) * 0.18;
      const dy = (e.clientY - (r.top + r.height / 2)) * 0.26;
      el.style.transform =
        "translate(" + dx.toFixed(1) + "px, " + (dy - 2).toFixed(1) + "px)";
    });
    el.addEventListener("mouseleave", () => {
      el.style.transform = "";
    });
  });
})();

(function initAnchorScroll() {
  // Fragment navigation is unreliable in Chromium when body/ancestor overflow
  // or view transitions are in play — the hash changes but the page never
  // scrolls. Drive same-page anchor scrolling explicitly instead;
  // scrollIntoView honors the CSS scroll-padding-top navbar offset.
  document.addEventListener("click", (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute("href").slice(1);
    const target = id && document.getElementById(id);
    if (!target) return;
    e.preventDefault();
    history.pushState(null, "", "#" + id);
    const behavior = matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "instant"
      : "smooth";
    target.scrollIntoView({ behavior, block: "start" });
  });
})();

(function initPasswordToggles() {
  // Eye button inside .auth-pw fields switches the input between
  // password and text, and swaps the open/closed eye icon.
  document.querySelectorAll("[data-pw-toggle]").forEach((btn) => {
    const input = btn.closest(".auth-pw")?.querySelector("input");
    if (!input) return;
    btn.addEventListener("click", () => {
      const show = input.type === "password";
      input.type = show ? "text" : "password";
      btn.classList.toggle("is-shown", show);
      btn.setAttribute("aria-pressed", String(show));
      btn.setAttribute("aria-label", show ? "Hide password" : "Show password");
      input.focus({ preventScroll: true });
    });
  });
})();
