<script>
// Whether the logo has assembled itself once already: it does on the first page load only, not when
// the reader comes back to the home page.
let assembled = false;
</script>

<script setup>
import { useData } from "vitepress";
import { onBeforeUnmount, onMounted, ref } from "vue";

import { LAYERS } from "./logo-layers.mjs";

// The home page's logo: the three layers of public/logo-large.svg, exactly, so it is the logo at
// rest and without scripts. On the first load the layers come together into it, bottom first. Then
// the layer under the pointer lifts out and the others part from it in turn, on Hairline's lift
// curve: 700ms on (.32, .72, 0, 1), each layer 45ms after the last.

// Where each layer goes when one is picked: the picked one lifts, those above it rise further,
// those below drop. In the logo's units; it is 52.64 tall.
const LIFT = -5, ABOVE = -9, BELOW = 6, STAGGER = 45, DURATION = 700;
const SLOPE = Math.tan(Math.PI / 6), CX = 23.55;
const fixed = (x) => x.toFixed(3);
/** A cubic Bézier coordinate at t, between 0 and 1, with control values a and b. */
const cubic = (t, a, b) => 3 * a * t * (1 - t) ** 2 + 3 * b * t * t * (1 - t) + t ** 3;

const { frontmatter } = useData();
const intro = !assembled;
const svg = ref(null);
const groups = ref([]);
const navy = ref(null);
const ghost = ref(null);

/** The navy layer, its sharp side tips rounded by r. They meet the orange's rounded corners in the logo, so
 * they round off only while the layers are apart. At r = 0 it is the original path, character for character. */
function navyPath(r) {
  if (r <= 0.01) return LAYERS[2].d;
  const t = r * Math.sqrt(3), c = Math.cos(Math.PI / 6), f = fixed;
  const [lx, ly] = [2.81, 41.5], [rx, ry] = [44.3, 41.52];
  return (
    `M26.39,31.15a5.68,5.68,0,0,0-5.68,0L${f(lx + c * t)},${f(ly - t / 2)}` +
    `A${f(r)},${f(r)},0,0,0,${f(lx + c * t)},${f(ly + t / 2)}L20.72,51.88a5.68,5.68,0,0,0,5.68,0` +
    `L${f(rx - c * t)},${f(ry + t / 2)}A${f(r)},${f(r)},0,0,0,${f(rx - c * t)},${f(ry - t / 2)}Z`
  );
}
/** Rounds the navy tips by the gap between the navy and orange layers, which is where they show. */
const tips = (gap) => navy.value?.setAttribute("d", navyPath(Math.min(4, Math.abs(gap) * 0.7)));

/** A CSS cubic-bezier, as a function of progress. */
function bezier(x1, y1, x2, y2) {
  return (p) => {
    let lo = 0, hi = 1;
    for (let i = 0; i < 20; i++) {
      const m = (lo + hi) / 2;
      if (cubic(m, x1, x2) < p) lo = m;
      else hi = m;
    }
    return cubic((lo + hi) / 2, y1, y2);
  };
}
const ease = bezier(0.32, 0.72, 0, 1);
const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
// On narrow screens the logo sits close to the title, so the layers move less: CSS does the same for the intro.
const reach = () => (matchMedia("(max-width: 639px)").matches ? 0.55 : 1);

// One tween per layer: where it is coming from and going to, and when it set off.
const moves = LAYERS.map(() => ({ from: 0, to: 0, start: 0 }));
const valueAt = (m, now) => {
  const p = reduced() ? 1 : Math.min(1, Math.max(0, (now - m.start) / DURATION));
  return m.from + (m.to - m.from) * ease(p);
};

let frame = 0;
function draw(now) {
  let spread = 0, moving = false;
  const ys = moves.map((m, i) => {
    const y = valueAt(m, now);
    spread = Math.max(spread, Math.abs(y));
    groups.value[i]?.setAttribute("transform", y === 0 ? "" : `translate(0 ${y.toFixed(3)})`);
    if (now - m.start < DURATION) moving = true;
    return y;
  });
  tips(ys[2] - ys[1]);
  if (ghost.value) ghost.value.style.opacity = String(Math.min(1, spread / 4));
  frame = moving && !reduced() ? requestAnimationFrame(draw) : 0;
}
const wake = () => {
  if (!frame) frame = requestAnimationFrame(draw);
};

/** The layer at a point of the logo, judged on the seams at rest, which never move: -1 off the logo. */
function pick(x, y) {
  if (x < -2 || x > 49 || y < -4 || y > 56) return -1;
  const k = Math.abs(x - CX) * SLOPE;
  return y < 16 + k ? 0 : y < 31.15 + k ? 1 : 2;
}

let active = -1, assembling = intro;
function choose(a) {
  if (assembling || a === active) return;
  const now = performance.now(), from = a >= 0 ? a : active;
  active = a;
  moves.forEach((m, i) => {
    m.from = valueAt(m, now);
    m.to = (a < 0 ? 0 : i === a ? LIFT : i < a ? ABOVE : BELOW) * reach();
    m.start = now + Math.abs(i - from) * STAGGER;
  });
  wake();
}

function move(event) {
  const ctm = svg.value?.getScreenCTM();
  if (!ctm) return;
  const p = new DOMPoint(event.clientX, event.clientY).matrixTransform(ctm.inverse());
  choose(pick(p.x, p.y));
}

// The layers come together in CSS, from the first paint. Until they land, this follows them to round the
// navy tips, and the pointer waits.
onMounted(() => {
  assembled = true;
  if (!intro) return;
  const animations = svg.value.getAnimations({ subtree: true });
  if (!animations.length) {
    assembling = false;
    return;
  }
  let follow = 0;
  const track = () => {
    const [, orangeY, navyY] = groups.value.map((g) => new DOMMatrix(getComputedStyle(g).transform).f);
    tips(navyY - orangeY);
    follow = requestAnimationFrame(track);
  };
  track();
  Promise.all(animations.map((a) => a.finished)).then(() => {
    cancelAnimationFrame(follow);
    tips(0);
    assembling = false;
  });
});

onBeforeUnmount(() => cancelAnimationFrame(frame));
</script>

<template>
  <svg
    ref="svg"
    class="image-src HeroLogo"
    :class="{ intro }"
    viewBox="0 0 47.11 52.64"
    width="300"
    height="300"
    role="img"
    :aria-label="frontmatter.hero?.image?.alt ?? 'BundleWatch'"
    @pointermove="move"
    @pointerdown="move"
    @pointerleave="choose(-1)"
  >
    <g ref="ghost" class="ghost" aria-hidden="true">
      <path v-for="layer in LAYERS" :key="layer.fill" :d="layer.d" />
    </g>
    <g
      v-for="(layer, i) in LAYERS"
      :key="layer.fill"
      :ref="(el) => (groups[i] = el)"
      class="layer"
      :style="{ '--from': `${layer.from}px`, '--delay': `${layer.delay}ms` }"
    >
      <path
        :ref="(el) => i === 2 && (navy = el)"
        :d="layer.d"
        :fill="layer.fill"
        :style="layer.blend ? 'mix-blend-mode: multiply' : undefined"
      />
    </g>
  </svg>
</template>

<style scoped>
.HeroLogo {
  width: 300px;
  height: 300px;
  overflow: visible;
  isolation: isolate;
  touch-action: pan-y;
}

/* Where the layers sit at rest, as a thin dashed guide: it shows only while they are apart. The
   stroke is set on the paths, since vector-effect does not inherit. Its dark colour is in custom.css. */
.ghost {
  opacity: 0;
}

.ghost path {
  fill: none;
  stroke: #000051;
  stroke-opacity: 0.45;
  stroke-width: 1px;
  stroke-dasharray: 3 4;
  vector-effect: non-scaling-stroke;
}


/* The first load: each layer comes from --from (in the logo's units) to its place, bottom first. */
.intro .layer {
  animation: assemble 700ms cubic-bezier(0.32, 0.72, 0, 1) var(--delay) backwards;
}

.intro .ghost {
  animation: guide 1000ms cubic-bezier(0.32, 0.72, 0, 1) backwards;
}

@keyframes assemble {
  from {
    transform: translate(0, calc(var(--from) * var(--reach, 1)));
  }
}

@media (max-width: 639px) {
  .HeroLogo {
    --reach: 0.55;
  }
}

@keyframes guide {
  from {
    opacity: 1;
  }
}

@media (prefers-reduced-motion: reduce) {
  .intro .layer,
  .intro .ghost {
    animation: none;
  }
}
</style>
