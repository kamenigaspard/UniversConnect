/**
 * ============================================================
 * SUPABASE CLIENT
 * ============================================================
 *
 * This file creates the connection between our React
 * application and our Supabase backend.
 *
 * Supabase provides:
 *
 * - Authentication
 * - PostgreSQL database
 * - Storage
 * - Realtime
 * - Row Level Security
 *
 * IMPORTANT:
 *
 * We only use the public/publishable key in the browser.
 *
 * NEVER put the Supabase service-role key inside
 * a React/browser application.
 * ============================================================
 */

import { createClient } from "@supabase/supabase-js";

/**
 * ============================================================
 * SUPABASE PROJECT URL
 * ============================================================
 *
 * Vite reads this value from the .env file.
 */
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

/**
 * ============================================================
 * SUPABASE PUBLISHABLE KEY
 * ============================================================
 *
 * This is the public key intended for browser applications.
 */
const supabasePublishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

/**
 * ============================================================
 * ENVIRONMENT VARIABLE VALIDATION
 * ============================================================
 *
 * These checks make configuration problems easier to
 * identify during development.
 */
if (!supabaseUrl) {
  throw new Error(
    "Missing VITE_SUPABASE_URL environment variable."
  );
}

if (!supabasePublishableKey) {
  throw new Error(
    "Missing VITE_SUPABASE_PUBLISHABLE_KEY environment variable."
  );
}

/**
 * ============================================================
 * CREATE SUPABASE CLIENT
 * ============================================================
 *
 * The auth configuration below is important for our
 * university social-media application.
 */
export const supabase = createClient(
  supabaseUrl,
  supabasePublishableKey,
  {
    auth: {

      /**
       * ------------------------------------------------------
       * PERSIST SESSION
       * ------------------------------------------------------
       *
       * Supabase keeps the authentication session in the
       * browser.
       *
       * Therefore:
       *
       * User logs in
       *       ↓
       * User closes browser
       *       ↓
       * User opens browser later
       *       ↓
       * Supabase restores the session
       *
       * The user does NOT normally need to log in again
       * simply because the browser was closed.
       */
      persistSession: true,

      /**
       * ------------------------------------------------------
       * AUTO REFRESH TOKEN
       * ------------------------------------------------------
       *
       * Supabase automatically refreshes the authentication
       * token when necessary while the user remains logged in.
       */
      autoRefreshToken: true,

      /**
       * ------------------------------------------------------
       * DETECT SESSION IN URL
       * ------------------------------------------------------
       *
       * Allows Supabase to detect authentication information
       * that may be returned through the browser URL.
       *
       * We are NOT creating VerifyEmail.jsx or
       * AuthCallback.jsx for this project.
       */
      detectSessionInUrl: true
    }
  }
);