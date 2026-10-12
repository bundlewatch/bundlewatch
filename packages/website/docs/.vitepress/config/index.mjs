import { defineConfig } from "vitepress";

import { en } from "./en.mjs";
import { shared } from "./shared.mjs";
import { zh } from "./zh.mjs";

const config = {
  ...shared,

  locales: {
    root: { label: "English", ...en },
    zh: { label: "简体中文", ...zh },
  },
};

export default defineConfig(config);
