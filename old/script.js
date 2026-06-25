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

const revealTargets = document.querySelectorAll(
  ".metric-card, .chart-panel, .floating-card, .branch-card, .split-section, .benefit-grid article, .developer-grid article, .final-cta, .site-footer"
);

if ("IntersectionObserver" in window) {
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { rootMargin: "220px 0px", threshold: 0.01 }
  );

  revealTargets.forEach((target) => {
    target.classList.add("reveal");
    revealObserver.observe(target);
  });
} else {
  revealTargets.forEach((target) => target.classList.add("is-visible"));
}
