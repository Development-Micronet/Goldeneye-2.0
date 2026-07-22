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
<<<<<<< HEAD
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
// 👇 ADD THIS
=======
>>>>>>> 4798ab56ee171861f11e9355ee280e306f7e0395
import { configDefaults } from "vitest/config";

export default defineConfig({
  plugins: [react(), tailwindcss()],

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
<<<<<<< HEAD
    // optional but recommended
=======
>>>>>>> 4798ab56ee171861f11e9355ee280e306f7e0395
    exclude: [...configDefaults.exclude],
  },
});
