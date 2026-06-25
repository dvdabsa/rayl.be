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

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (honeypot && honeypot.value) return;
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    btn.disabled = true;
    const originalText = btn.textContent;
    btn.textContent = "Sending…";

    setTimeout(() => {
      btn.classList.add("is-success");
      btn.textContent = "Got it — we’ll be in touch ✓";
      form.querySelectorAll("input, textarea, select").forEach((el) => {
        if (el !== honeypot && el !== btn) el.value = "";
      });
      setTimeout(() => {
        btn.disabled = false;
        btn.classList.remove("is-success");
        btn.textContent = originalText;
      }, 4000);
    }, 700);
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
