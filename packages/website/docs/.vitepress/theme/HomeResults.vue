<script setup>
import { useData } from "vitepress";

// The results page screenshot between the home page's hero and its features.
// Each locale's index.md gives the image, its alt text and the caption, under `results`.
const { frontmatter } = useData();
</script>

<template>
  <figure v-if="frontmatter.results" class="HomeResults">
    <div class="container">
      <img
        :src="frontmatter.results.src"
        :alt="frontmatter.results.alt"
        width="1100"
        height="590"
        data-zoomable
      />
      <figcaption v-html="frontmatter.results.caption" />
    </div>
  </figure>
</template>

<style scoped>
/* The same widths as the features below it. */
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
  max-width: 1152px;
}

img {
  display: block;
  width: 100%;
  height: auto;
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
}

figcaption {
  margin-top: 12px;
  font-size: 14px;
  line-height: 22px;
  color: var(--vp-c-text-2);
}

figcaption :deep(code) {
  font-size: 13px;
}
</style>
