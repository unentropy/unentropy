// @ts-check
import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import starlightThemeNova from "starlight-theme-nova";

// https://astro.build/config
export default defineConfig({
  integrations: [
    starlight({
      title: "Unentropy",
      logo: {
        src: "./src/assets/logo-icon.svg",
        replacesTitle: true,
      },
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/unentropy/unentropy",
        },
      ],
      customCss: ["./src/styles/custom.css"],
      plugins: [starlightThemeNova(/* options */)],
    }),
  ],
});
