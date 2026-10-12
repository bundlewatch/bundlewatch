import mediumZoom from "medium-zoom";
import { useRoute } from "vitepress";
import { enhanceAppWithTabs } from "vitepress-plugin-tabs/client";
// .vitepress/theme/index.mjs
import DefaultTheme from "vitepress/theme";
import { onMounted, watch, nextTick } from "vue";

import "./custom.css";

const initZoom = () => {
  mediumZoom("[data-zoomable]", { background: "var(--vp-c-bg)" });
};

export default {
  extends: DefaultTheme,
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
