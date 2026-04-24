import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";
import adapter from "@sveltejs/adapter-static";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  kit: {
    // Pure client-rendered SPA (ssr disabled in +layout.js). adapter-static
    // emits a single index.html fallback so any route loads the same bundle
    // and the client router takes over. Output goes to `build/`.
    adapter: adapter({
      pages: "build",
      assets: "build",
      fallback: "index.html",
      precompress: false,
      strict: false,
    }),
  },

  preprocess: [vitePreprocess({})],
};

export default config;
