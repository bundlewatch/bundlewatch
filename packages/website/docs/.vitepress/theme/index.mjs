import mediumZoom from "medium-zoom";
import { useRoute } from "vitepress";
import { enhanceAppWithTabs } from "vitepress-plugin-tabs/client";
// .vitepress/theme/index.mjs
import DefaultTheme from "vitepress/theme";
import { h, onMounted, watch, nextTick } from "vue";

import { featureIcons } from "./feature-icons.mjs";
import HeroLogo from "./HeroLogo.vue";
import HomeResults from "./HomeResults.vue";
import HomeUsedBy from "./HomeUsedBy.vue";
import NotFound from "./NotFound.vue";

import "./custom.css";
import "./feature-icons.css";

const initZoom = () => {
  mediumZoom("[data-zoomable]", { background: "var(--vp-c-bg)" });
};

export default {
  extends: DefaultTheme,
  Layout: () =>
    h(DefaultTheme.Layout, null, {
      "home-hero-image": () => h(HeroLogo),
      "home-features-before": () => h(HomeResults),
      "home-features-after": () => h(HomeUsedBy),
      "not-found": () => h(NotFound),
    }),
  enhanceApp({ app }) {
    enhanceAppWithTabs(app);
  },
  setup() {
    const route = useRoute();
    let stopFeatureIcons;
    onMounted(() => {
      initZoom();
      stopFeatureIcons = featureIcons();
    });
    watch(
      () => route.path,
      () =>
        nextTick(() => {
          initZoom();
          stopFeatureIcons?.();
          stopFeatureIcons = featureIcons();
        }),
    );
  },
};
