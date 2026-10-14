import { defineEcConfig } from "@astrojs/starlight/expressive-code";
import { pluginLineNumbers } from "@expressive-code/plugin-line-numbers";

export default defineEcConfig({
  plugins: [pluginLineNumbers()],
  defaultProps: {
    showLineNumbers: true,
    // Agent prompts (```text blocks) wrap instead of scrolling sideways.
    overridesByLang: { text: { wrap: true } },
  },
});
