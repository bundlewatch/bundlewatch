import mediumZoom from "medium-zoom";
import { useRoute } from "vitepress";
import { enhanceAppWithTabs } from "vitepress-plugin-tabs/client";
// .vitepress/theme/index.mjs
import DefaultTheme from "vitepress/theme";
import { h, onMounted, watch, nextTick } from "vue";

import HeroLogo from "./HeroLogo.vue";
import HomeResults from "./HomeResults.vue";

import "./custom.css";

const initZoom = () => {
  mediumZoom("[data-zoomable]", { background: "var(--vp-c-bg)" });
};

export default {
  extends: DefaultTheme,
  Layout: () =>
    h(DefaultTheme.Layout, null, {
      "home-hero-image": () => h(HeroLogo),
      "home-features-before": () => h(HomeResults),
    }),
  enhanceApp({ app }) {
    enhanceAppWithTabs(app);
  },
  setup() {
    const route = useRoute();
    onMounted(() => {
      initZoom();
    });
    watch(
      () => route.path,
      () => nextTick(() => initZoom()),
    );
  },
};
