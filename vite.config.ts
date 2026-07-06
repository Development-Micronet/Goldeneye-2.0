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


import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// 👇 ADD THIS
import { configDefaults } from "vitest/config";

export default defineConfig({
  plugins: [react(), tailwindcss()],

  server: {
    host: true,
    port: 5174,
  },

  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: "./src/test/setup.ts",
     reporters: ["default", "html"],
    // optional but recommended
    exclude: [...configDefaults.exclude],
  },
});
