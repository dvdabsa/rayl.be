// Year
const yr = document.getElementById("yr");
if (yr) yr.textContent = new Date().getFullYear();

// Mobile menu
const menuBtn = document.getElementById("menuBtn");
const navLinks = document.querySelector(".nav__links");
if (menuBtn && navLinks) {
  menuBtn.addEventListener("click", () => {
    navLinks.classList.toggle("is-open");
  });
  navLinks.querySelectorAll("a").forEach((a) =>
    a.addEventListener("click", () => navLinks.classList.remove("is-open"))
  );
}

// Dashboard chart draw-in — toggles .is-visible when in view so
// the SVG strokes draw themselves from left to right.
(() => {
  const chart = document.querySelector("[data-chart-anim]");
  if (!chart) return;
  const obs = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (e.isIntersecting) {
          chart.classList.add("is-visible");
          obs.unobserve(chart);
        }
      });
    },
    { threshold: 0.25 }
  );
  obs.observe(chart);
})();

// Terminal status cycle — runs Authorizing → Authorized on a loop
(() => {
  const status = document.querySelector("[data-cycle-status]");
  if (!status) return;
  const label = status.querySelector("[data-cycle-text]");
  const code = document.querySelector("[data-cycle-code]");
  const ms = document.querySelector("[data-cycle-ms]");
  if (!label) return;

  const states = [
    { cls: "status-tag--pending", text: "Authorizing…", code: "202 Accepted", ms: "42" },
    { cls: "status-tag--ok",       text: "Authorized",   code: "200 OK",       ms: "184" },
  ];
  let i = 0;
  const tick = () => {
    const s = states[i];
    status.classList.remove("status-tag--ok", "status-tag--pending", "status-tag--block");
    status.classList.add(s.cls);
    label.textContent = s.text;
    if (code) code.textContent = s.code;
    if (ms) ms.textContent = s.ms;
    i = (i + 1) % states.length;
  };
  tick();
  setInterval(tick, 2800);
})();

// Manifesto scroll-pin — light each word as the page scrolls
// through the pinned section.
(() => {
  const section = document.querySelector(".manifest-scroll");
  if (!section) return;
  const textEl = section.querySelector("[data-manifest]");
  if (!textEl) return;
  const words = Array.from(textEl.querySelectorAll("span"));
  if (!words.length) return;

  const REST = 0.14; // resting opacity for un-revealed words
  let ticking = false;

  const update = () => {
    const rect = section.getBoundingClientRect();
    const sectionHeight = section.offsetHeight;
    const viewHeight = window.innerHeight;
    const scrollable = sectionHeight - viewHeight;

    // How far the user has scrolled INTO the section (clamped 0..1)
    let progress = (-rect.top) / scrollable;
    progress = Math.max(0, Math.min(1, progress));

    // Use 0–0.92 of the section so the last word fully lights
    // slightly before the section ends — feels less abrupt.
    const raw = Math.min(1, progress / 0.92);
    // Smoothstep ease so words feather in rather than landing
    // with linear scroll velocity.
    const eased = raw * raw * (3 - 2 * raw);

    const n = words.length;
    words.forEach((w, i) => {
      const wordStart = i / n;
      const wordEnd = (i + 1) / n;
      let op;
      if (eased >= wordEnd) op = 1;
      else if (eased <= wordStart) op = REST;
      else {
        const t = (eased - wordStart) / (wordEnd - wordStart);
        op = REST + t * (1 - REST);
      }
      w.style.opacity = op.toFixed(3);
    });

    ticking = false;
  };

  window.addEventListener(
    "scroll",
    () => {
      if (!ticking) {
        window.requestAnimationFrame(update);
        ticking = true;
      }
    },
    { passive: true }
  );
  window.addEventListener("resize", update);
  update();
})();

// Floating nav on scroll
const nav = document.querySelector(".nav");
if (nav) {
  const THRESHOLD = 24;
  let ticking = false;
  const update = () => {
    if (window.scrollY > THRESHOLD) nav.classList.add("is-floating");
    else nav.classList.remove("is-floating");
    ticking = false;
  };
  window.addEventListener(
    "scroll",
    () => {
      if (!ticking) {
        window.requestAnimationFrame(update);
        ticking = true;
      }
    },
    { passive: true }
  );
  update();
}

// FAQ accordion — single-open behavior
document.querySelectorAll(".faq__item").forEach((item) => {
  const q = item.querySelector(".faq__q");
  if (!q) return;
  q.addEventListener("click", () => {
    const wasOpen = item.classList.contains("is-open");
    // close all
    document.querySelectorAll(".faq__item").forEach((i) => i.classList.remove("is-open"));
    // re-open if it was closed
    if (!wasOpen) item.classList.add("is-open");
  });
});

// Subtle reveal on scroll — supports stagger for grouped children
const io = new IntersectionObserver(
  (entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.style.opacity = 1;
        e.target.style.transform = "translateY(0)";
        io.unobserve(e.target);
      }
    });
  },
  { threshold: 0.1, rootMargin: "0px 0px -60px 0px" }
);

// Sections + headlines
document
  .querySelectorAll(
    ".section, .hero__copy, .hero__viz, .venture, .principle, .manifesto__text, " +
    ".bigcta__inner, .compliance, .logos"
  )
  .forEach((el) => {
    el.style.opacity = 0;
    el.style.transform = "translateY(18px)";
    el.style.transition = "opacity .8s cubic-bezier(.2,.8,.2,1), transform .8s cubic-bezier(.2,.8,.2,1)";
    io.observe(el);
  });

// Staggered grids — each child gets a small delay so they cascade in
const stagger = (selector, delayStep = 80, maxIndex = 12) => {
  document.querySelectorAll(selector).forEach((parent) => {
    Array.from(parent.children).forEach((child, i) => {
      if (i > maxIndex) return;
      child.style.opacity = 0;
      child.style.transform = "translateY(16px)";
      child.style.transition = `opacity .7s cubic-bezier(.2,.8,.2,1) ${i * delayStep}ms, transform .7s cubic-bezier(.2,.8,.2,1) ${i * delayStep}ms`;
      io.observe(child);
    });
  });
};

stagger(".flow", 90);
stagger(".pillars", 90);
stagger(".security-row", 90);
stagger(".how", 100);
stagger(".faq", 60);
stagger(".logos__row", 60);
stagger(".dashboard__metrics", 80);
stagger(".sdk-row", 30);
// Homepage components
stagger(".ventures", 90);
stagger(".principles", 70);
stagger(".bullets", 50);
