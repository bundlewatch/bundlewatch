// The home page's feature icons build themselves from the first paint, in CSS (feature-icons.css).
// This holds back the ones that are not in view yet, so that each builds when it comes into view,
// and builds an icon again when its card is hovered with a mouse or focused with the keyboard.
// index.mjs calls it on every page; it returns a function that stops it.

const STAGGER = 90;

// Whether the reader has been on a home page. When they come back to one, its icons stay at rest
// until a card is hovered or focused, as the hero logo comes together only once.
let visited = false;

/** Starts the CSS animations of a card's icon again, from the beginning. */
function restart(card) {
  const parts = [...card.querySelectorAll(".icon svg > *")];
  parts.forEach((part) => (part.style.animation = "none"));
  card.getBoundingClientRect();
  parts.forEach((part) => part.style.removeProperty("animation"));
}

export function featureIcons() {
  const root = document.documentElement;
  const cards = [...document.querySelectorAll(".VPFeatures .VPFeature")].filter((card) =>
    card.querySelector(".icon svg"),
  );
  if (!cards.length) {
    if (visited) root.classList.add("feature-icons-told");
    return () => {};
  }
  visited = true;

  // An icon builds once it is wholly in view, above the bottom tenth of the screen. Icons that come
  // into view together follow each other.
  const observer = new IntersectionObserver(
    (entries) => {
      entries
        .filter((entry) => entry.isIntersecting)
        .forEach((entry, i) => {
          const card = entry.target.closest(".VPFeature");
          card.style.setProperty("--card", `${i * STAGGER}ms`);
          card.classList.remove("wait");
          observer.unobserve(entry.target);
        });
    },
    { rootMargin: "0px 0px -10% 0px", threshold: 1 },
  );

  // On the first load, the icons in view are already building. The others go back to the start.
  if (!root.classList.contains("feature-icons-told")) {
    for (const card of cards) {
      const icon = card.querySelector(".icon");
      const { top, bottom } = icon.getBoundingClientRect();
      if (bottom > 0 && top < innerHeight) continue;
      card.classList.add("wait");
      restart(card);
      observer.observe(icon);
    }
  }

  /** Builds a card's icon again, unless it is building already. */
  const tell = (card) => {
    const icon = card.querySelector(".icon");
    if (icon.getAnimations({ subtree: true }).some((a) => a.playState === "running")) return;
    observer.unobserve(icon);
    card.style.setProperty("--card", "0ms");
    card.classList.remove("wait");
    card.classList.add("tell");
    restart(card);
  };
  const enter = (event) => event.pointerType === "mouse" && tell(event.currentTarget);
  const focus = (event) =>
    event.currentTarget.matches(":focus-visible") && tell(event.currentTarget);

  cards.forEach((card) => {
    card.addEventListener("pointerenter", enter);
    card.addEventListener("focus", focus);
  });
  return () => {
    observer.disconnect();
    cards.forEach((card) => {
      card.removeEventListener("pointerenter", enter);
      card.removeEventListener("focus", focus);
    });
  };
}
