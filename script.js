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
