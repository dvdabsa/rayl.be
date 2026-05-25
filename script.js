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

// Subtle reveal on scroll
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
  { threshold: 0.12 }
);

document
  .querySelectorAll(
    ".section, .hero__title, .hero__sub, .hero__cta, .venture, .principle, .manifesto__text, " +
    ".stat, .surface-card, .method-card, .security-card, .step, .compare__col, .bigcta__inner"
  )
  .forEach((el) => {
    el.style.opacity = 0;
    el.style.transform = "translateY(18px)";
    el.style.transition = "opacity .7s ease, transform .7s ease";
    io.observe(el);
  });
