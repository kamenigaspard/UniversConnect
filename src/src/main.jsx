/**
 * ============================================================
 * APPLICATION ENTRY POINT
 * ============================================================
 *
 * React starts the application from this file.
 */

import { StrictMode } from "react";

import { createRoot } from "react-dom/client";

import "./index.css";

import App from "./App.jsx";

import { AuthProvider } from "./contexts/AuthContext.jsx";


/**
 * Find the HTML element where React should
 * mount the application.
 */
const rootElement =
  document.getElementById("root");


/**
 * Render our application.
 *
 * AuthProvider surrounds the entire application,
 * which means every page can access authentication
 * information.
 */
createRoot(rootElement).render(

  <StrictMode>

    <AuthProvider>

      <App />

    </AuthProvider>

  </StrictMode>

);