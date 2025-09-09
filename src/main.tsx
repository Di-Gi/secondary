// [[SECONDARY_MIND_DESKTOP]]/src/main.tsx
// Purpose: React entry point that initializes the application with providers and routing.
// Architecture: Sets up the React app with proper error boundaries and development tools.
// Dependencies: React, ReactDOM, main App component, CSS imports.

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ThemeProvider } from "./components/ThemeProvider";
import "./globals.css";

// Performance optimization: Enable concurrent features
const root = ReactDOM.createRoot(document.getElementById("root") as HTMLElement);

// Wrap app with optimized theme provider
root.render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>,
);

// Integration: Entry point for the React application, rendering the main App component.
// Notes: Strict mode helps catch development issues early. Global CSS provides base styling.