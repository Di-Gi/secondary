// [[SECONDARY_MIND_DESKTOP]]/vite.config.ts
// Purpose: Vite configuration optimized for Tauri integration with React and TypeScript.
// Architecture: Configures the build process for the frontend, ensuring compatibility with Tauri's requirements.
// Dependencies: Vite, React plugin, path utilities.

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { copyFileSync } from "fs";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react()],

  // Configure base path for GitHub Pages when in demo mode
  base: mode === 'demo' ? '/secondary/' : '/',

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
  
  // Performance optimizations
  build: {
    // Enable code splitting for better loading performance
    rollupOptions: {
      output: {
        manualChunks: {
          // Separate vendor chunks for better caching
          vendor: ['react', 'react-dom'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-toast'],
          icons: ['lucide-react'],
          utils: ['zustand', 'clsx', 'tailwind-merge'],
        },
      },
      plugins: [
        {
          name: 'copy-splash',
          writeBundle() {
            // Copy splash.html to dist directory for Tauri splash screen
            try {
              copyFileSync('splash.html', 'dist/splash.html');
              console.log('✓ Copied splash.html to dist/');
            } catch (error) {
              console.warn('Warning: Failed to copy splash.html:', error.message);
            }
          }
        }
      ]
    },
    // Optimize chunk size
    chunkSizeWarningLimit: 1000,
    // Enable minification
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
  },
  
  // Optimize dependencies
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-window',
      'zustand',
      'lucide-react',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-toast',
    ],
  },
}));

// Integration: Works with this Tauri's build system to create the desktop application bundle.
// Notes: Fixed port ensures consistent development experience. Alias setup enables clean imports.