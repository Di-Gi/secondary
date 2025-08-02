// [[SECONDARY_MIND_DESKTOP]]/postcss.config.js
// Purpose: PostCSS configuration for Tailwind CSS processing and optimization.
// Architecture: Standard PostCSS setup required for Tailwind CSS to work properly with Vite.
// Dependencies: tailwindcss, autoprefixer for CSS processing.

export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}

// Integration: Used by Vite during the build process to process CSS with Tailwind and autoprefixer.
// Notes: Required configuration for Tailwind CSS to function properly in the Vite build pipeline.