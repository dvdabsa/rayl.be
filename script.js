// Year
document.getElementById("yr").textContent = new Date().getFullYear();

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
  .querySelectorAll(".section, .hero__title, .hero__sub, .hero__cta, .venture, .principle, .manifesto__text")
  .forEach((el) => {
    el.style.opacity = 0;
    el.style.transform = "translateY(18px)";
    el.style.transition = "opacity .7s ease, transform .7s ease";
    io.observe(el);
  });
