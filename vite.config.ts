// [[SECONDARY_MIND_DESKTOP]]/vite.config.ts
// Purpose: Vite configuration optimized for Tauri integration with React and TypeScript.
// Architecture: Configures the build process for the frontend, ensuring compatibility with Tauri's requirements.
// Dependencies: Vite, React plugin, path utilities.

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(async () => ({
  plugins: [react()],

  // Vite options tailored for Tauri development and to use `tauri://localhost` in production
  clearScreen: false,
  // tauri expects a fixed port, fail if that port is not available
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      // 3. tell vite to ignore watching `src-tauri`
      ignored: ["**/src-tauri/**"],
    },
  },
  resolve: {
    alias: {
      // Use a relative path from the project root.
      // Vite executes from the root, so this correctly resolves to your src directory.
      "@": path.resolve("./src"),
    },
  },
}));

// Integration: Works with this Tauri's build system to create the desktop application bundle.
// Notes: Fixed port ensures consistent development experience. Alias setup enables clean imports.