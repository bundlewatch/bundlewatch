<script setup>
import { useData } from "vitepress";

// The change table of a results page, between the home page's hero and its features.
// Each locale's index.md gives the light and dark images, their alt text and the caption,
// under `results`. custom.css shows the one for the current theme.
const { frontmatter } = useData();
</script>

<template>
  <figure v-if="frontmatter.results" class="HomeResults">
    <div class="container">
      <img
        class="on-light"
        :src="frontmatter.results.src"
        :alt="frontmatter.results.alt"
        width="900"
        height="245"
        data-zoomable
      />
      <img
        class="on-dark"
        :src="frontmatter.results.darkSrc"
        :alt="frontmatter.results.alt"
        width="900"
        height="245"
        data-zoomable
      />
      <figcaption v-html="frontmatter.results.caption" />
    </div>
  </figure>
</template>

<style scoped>
/* The same side padding as the features below it. */
.HomeResults {
  margin: 0 0 48px;
  padding: 0 24px;
}

@media (min-width: 640px) {
  .HomeResults {
    padding: 0 48px;
  }
}

@media (min-width: 960px) {
  .HomeResults {
    margin-bottom: 64px;
    padding: 0 64px;
  }
}

.container {
  margin: 0 auto;
  max-width: 900px;
}

img {
  display: block;
  width: 100%;
  height: auto;
}

figcaption {
  margin-top: 16px;
  font-size: 14px;
  line-height: 22px;
  text-align: center;
  color: var(--vp-c-text-2);
}

figcaption :deep(code) {
  font-size: 13px;
}
</style>
