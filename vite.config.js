/**
 * Vite configuration for the University Social application.
 *
 * Vite is responsible for running our React development server
 * and building the application for production.
 */

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  /**
   * React plugin allows Vite to process React JSX files.
   */
  plugins: [
    react(),

    /**
     * Tailwind CSS Vite plugin allows us to use
     * Tailwind utility classes in our React application.
     */
    tailwindcss(),
  ],
});
