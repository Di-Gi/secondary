// [[SECONDARY_MIND_DESKTOP]]/src/main.tsx
// Purpose: React entry point that initializes the application with providers and routing.
// Architecture: Sets up the React app with proper error boundaries and development tools.
// Dependencies: React, ReactDOM, main App component, CSS imports.

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./globals.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

// Integration: Entry point for the React application, rendering the main App component.
// Notes: Strict mode helps catch development issues early. Global CSS provides base styling.