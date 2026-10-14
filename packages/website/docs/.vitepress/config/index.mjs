import { defineConfig } from "vitepress";

import { writeLlmsFiles } from "../llms.mjs";
import { en, sidebar } from "./en.mjs";
import { fr } from "./fr.mjs";
import { shared } from "./shared.mjs";
import { zh } from "./zh.mjs";

const config = {
  ...shared,

  locales: {
    root: { label: "English", ...en },
    fr: { label: "Français", ...fr },
    zh: { label: "简体中文", ...zh },
  },

  buildEnd: ({ srcDir, outDir }) => writeLlmsFiles({ srcDir, outDir, sidebar }),
};

export default defineConfig(config);
