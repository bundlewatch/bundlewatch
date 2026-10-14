<script setup>
import { VPButton } from "vitepress/theme";
import { onMounted, ref } from "vue";

import { LAYERS } from "./logo-layers.mjs";

// The page Amplify serves, with a 404 status, for every path that has no page, in every language.
// It names the missing path in the words the CLI uses for a path that matches no files. The logo
// is missing its bottom layer, drawn as the dashed outline of where it goes.
const [top, middle, bottom] = LAYERS;
const path = ref("this address");
onMounted(() => {
  path.value = decodeURI(location.pathname);
});
</script>

<template>
  <div class="NotFound">
    <svg
      class="logo"
      viewBox="0 0 47.11 52.64"
      width="120"
      height="120"
      role="img"
      aria-label="The BundleWatch logo, missing its bottom layer"
    >
      <path :d="top.d" :fill="top.fill" style="mix-blend-mode: multiply" />
      <path :d="middle.d" :fill="middle.fill" />
      <path class="missing" :d="bottom.d" />
    </svg>
    <h1 class="title">Page not found</h1>
    <p class="cli">
      <span class="error">[ERROR]</span> There is no matching file for <span>{{ path }}</span>
    </p>
    <p class="text">
      Check the address, or start from the guide. The documentation is also in
      <a href="/zh/">简体中文</a>.
    </p>
    <div class="actions">
      <VPButton
        tag="a"
        size="medium"
        theme="brand"
        text="Get started"
        href="/guide/getting-started"
      />
      <VPButton
        tag="a"
        size="medium"
        theme="alt"
        text="Configuration"
        href="/reference/configuration"
      />
    </div>
  </div>
</template>

<style scoped>
.NotFound {
  padding: 64px 24px 96px;
  text-align: center;
}

@media (min-width: 768px) {
  .NotFound {
    padding: 96px 32px 168px;
  }
}

.logo {
  display: block;
  margin: 0 auto 32px;
  overflow: visible;
  isolation: isolate;
}

/* Its dark colour is in custom.css, with the home page logo's. */
.missing {
  fill: none;
  stroke: #000051;
  stroke-opacity: 0.55;
  stroke-width: 1.5px;
  stroke-dasharray: 3 4;
  vector-effect: non-scaling-stroke;
}

.title {
  font-size: 32px;
  line-height: 40px;
  font-weight: 600;
}

/* The CLI's error line, as BundleWatch prints it. */
.cli {
  margin: 16px auto 0;
  max-width: 560px;
  font-family: var(--vp-font-family-mono);
  font-size: 14px;
  line-height: 22px;
  overflow-wrap: anywhere;
}

.error {
  color: var(--vp-c-brand-1);
}

.text {
  margin: 12px auto 0;
  max-width: 480px;
  line-height: 24px;
  color: var(--vp-c-text-2);
}

.text a {
  color: var(--vp-c-brand-1);
  text-decoration: underline;
  text-underline-offset: 2px;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: center;
  margin-top: 32px;
}
</style>
