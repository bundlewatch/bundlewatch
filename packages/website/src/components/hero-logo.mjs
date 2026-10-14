// The home page's logo: the three layers of public/logo-large.svg, exactly, so it is the logo at
// rest and without scripts. HeroLogo.astro makes them move.
export const LAYERS = [
  {
    fill: "#ffcd52",
    blend: true,
    from: -12,
    delay: 300,
    d: "M2.84,26.28,20.72,16a5.68,5.68,0,0,1,5.68,0L44.27,26.28a5.68,5.68,0,0,1,2.84,4.92V16a5.68,5.68,0,0,0-2.84-4.92L26.39.76a5.68,5.68,0,0,0-5.68,0L2.84,11.08A5.68,5.68,0,0,0,0,16v15.2A5.68,5.68,0,0,1,2.84,26.28Z",
  },
  {
    fill: "#d54400",
    from: -5,
    delay: 210,
    d: "M2.78,41.52l.06,0L20.72,31.15a5.68,5.68,0,0,1,5.68,0L44.27,41.47l.06,0a5.67,5.67,0,0,0,2.78-4.87V31.19a5.68,5.68,0,0,0-2.84-4.92L26.39,16a5.68,5.68,0,0,0-5.68,0L2.84,26.28A5.68,5.68,0,0,0,0,31.19v5.45A5.67,5.67,0,0,0,2.78,41.52Z",
  },
  {
    fill: "#000051",
    from: 8,
    delay: 120,
    d: "M26.39,31.15a5.68,5.68,0,0,0-5.68,0L2.84,41.47l-.06,0,.06,0L20.72,51.88a5.68,5.68,0,0,0,5.68,0L44.27,41.56l.06,0-.06,0Z",
  },
];

const escape = (text) => text.replace(/[&<>"]/g, (c) => `&#${c.charCodeAt(0)};`);

/** The logo's markup, for Starlight's `hero.image.html`. */
export const heroLogoSvg = (alt) =>
  [
    `<svg class="HeroLogo intro" viewBox="0 0 47.11 52.64" width="300" height="300" role="img" aria-label="${escape(alt)}">`,
    `<g class="ghost" aria-hidden="true">${LAYERS.map(({ d }) => `<path d="${d}"/>`).join("")}</g>`,
    ...LAYERS.map(
      ({ fill, blend, from, delay, d }) =>
        `<g class="layer" style="--from:${from}px;--delay:${delay}ms"><path d="${d}" fill="${fill}"${blend ? ' style="mix-blend-mode:multiply"' : ""}/></g>`,
    ),
    "</svg>",
  ].join("");

/** The 404 page's logo: the bottom layer is missing, drawn as the dashed outline of where it goes. */
export const missingLayerSvg = (alt) =>
  [
    `<svg class="MissingLayer" viewBox="0 0 47.11 52.64" width="220" height="220" role="img" aria-label="${escape(alt)}">`,
    ...LAYERS.slice(0, 2).map(
      ({ fill, blend, d }) =>
        `<path d="${d}" fill="${fill}"${blend ? ' style="mix-blend-mode:multiply"' : ""}/>`,
    ),
    `<path class="missing" d="${LAYERS[2].d}"/>`,
    "</svg>",
  ].join("");
