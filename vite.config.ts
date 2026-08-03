// import { defineConfig } from "vite";
// import react from "@vitejs/plugin-react";
// import tailwindcss from "@tailwindcss/vite";
// // https://vite.dev/config/
// export default defineConfig({
//   plugins: [react(), tailwindcss()],
//   server: {
//     host: true,
//     port: 5174,
//   },
//    test: {
//     environment: "jsdom",
//     globals: true,
//     setupFiles: "./src/test/setup.ts",
//   }
// });
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import { configDefaults } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  optimizeDeps: {
    include: ['maplibre-gl'],
  },
  server: {
    host: true,
    port: 5174,
    allowedHosts: [
      "goldeneye.ind.in",
      "www.goldeneye.ind.in",
    ],
  },

  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/test/setup.ts",
    reporters: ["default", "html"],
    exclude: [...configDefaults.exclude],
  },
});
