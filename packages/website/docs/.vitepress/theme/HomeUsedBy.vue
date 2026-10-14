<script setup>
import { useData, withBase } from "vitepress";

import projects from "./used-by.mjs";

const { frontmatter } = useData();
const midpoint = Math.ceil(projects.length / 2);
const rows = [projects.slice(0, midpoint), projects.slice(midpoint)];
</script>

<template>
  <section v-if="frontmatter.usedBy" class="HomeUsedBy" aria-labelledby="used-by-heading">
    <div class="container">
      <h2 id="used-by-heading">{{ frontmatter.usedBy.title }}</h2>
      <div class="rows" tabindex="0" role="group" :aria-label="frontmatter.usedBy.pauseHint">
        <div v-for="(row, rowIndex) in rows" :key="rowIndex" class="row">
          <div class="track" :class="{ reverse: rowIndex === 1 }">
            <ul
              v-for="copy in 2"
              :key="copy"
              class="projects"
              :class="{ duplicate: copy === 2 }"
              :aria-hidden="copy === 2 ? true : undefined"
              role="list"
            >
              <li v-for="project in row" :key="project.name">
                <div class="logo">
                  <img
                    :src="withBase(`/used-by/${project.logo}`)"
                    :class="{
                      'on-light': project.darkLogo,
                      'light-background': project.lightBackground,
                    }"
                    :width="project.width"
                    :height="project.height"
                    alt=""
                    loading="lazy"
                    decoding="async"
                  />
                  <img
                    v-if="project.darkLogo"
                    class="on-dark"
                    :src="withBase(`/used-by/${project.darkLogo}`)"
                    :width="project.width"
                    :height="project.height"
                    alt=""
                    loading="lazy"
                    decoding="async"
                  />
                </div>
                <span>{{ project.name }}</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.HomeUsedBy {
  margin-top: 80px;
  padding: 0 24px;
}

.container {
  max-width: 1152px;
  margin: 0 auto;
  padding-top: 40px;
  border-top: 1px solid var(--vp-c-divider);
}

h2 {
  margin-bottom: 24px;
  color: var(--vp-c-text-2);
  font-size: 20px;
  font-weight: 600;
  line-height: 28px;
  text-align: center;
}

.rows:focus-visible {
  outline: 2px solid var(--vp-c-text-2);
  outline-offset: 4px;
  border-radius: 8px;
}

.row {
  overflow: hidden;
  padding: 4px 0;
  mask-image: linear-gradient(to right, transparent, #000 24px, #000 calc(100% - 24px), transparent);
}

.track {
  display: flex;
  width: max-content;
  animation: used-by-scroll 160s linear infinite;
}

.track.reverse {
  animation-direction: reverse;
}

.projects {
  display: flex;
  flex-shrink: 0;
  gap: 16px;
  margin: 0;
  padding: 0 8px;
  list-style: none;
}

li {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  width: 160px;
  min-height: 104px;
  padding: 12px 8px;
  color: var(--vp-c-text-2);
  font-size: 14px;
  font-weight: 500;
  line-height: 20px;
  text-align: center;
}

.logo {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 42px;
}

img {
  flex-shrink: 0;
  max-width: 100%;
  object-fit: contain;
  filter: grayscale(1);
}

/* A light surface keeps dark artwork legible without changing its geometry. */
.light-background {
  padding: 3px;
  border-radius: 4px;
  background: #fff;
  color-scheme: light;
}

.on-dark {
  display: none;
}

/* Keyboard users can pause without adding visible carousel controls. */
.rows:focus-within .track {
  animation-play-state: paused;
}

@media (hover: hover) and (pointer: fine) {
  .rows:hover .track {
    animation-play-state: paused;
  }
}

@keyframes used-by-scroll {
  to {
    transform: translateX(-50%);
  }
}

@media (min-width: 640px) {
  .HomeUsedBy {
    padding: 0 48px;
  }
}

@media (min-width: 960px) {
  .HomeUsedBy {
    padding: 0 64px;
  }
}

/* This applies before hydration too, so reduced-motion users never see motion. */
@media (prefers-reduced-motion: reduce) {
  .rows {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(140px, 100%), 1fr));
    gap: 8px;
  }

  .row,
  .track,
  .projects {
    display: contents;
    animation: none;
  }

  .projects.duplicate {
    display: none;
  }

  li {
    width: auto;
  }
}
</style>
