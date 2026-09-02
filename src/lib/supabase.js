/**
 * ============================================================
 * SUPABASE CLIENT
 * ============================================================
 *
 * This file creates the connection between our React
 * application and our Supabase backend.
 *
 * Supabase will eventually provide:
 *
 * - Authentication
 * - PostgreSQL database
 * - Storage
 * - Realtime messaging
 * - Row Level Security
 *
 * IMPORTANT:
 *
 * We only use the public/publishable key here.
 *
 * NEVER put the Supabase service-role key inside
 * a browser application.
 * ============================================================
 */

import { createClient } from "@supabase/supabase-js";

/**
 * Read the Supabase project URL from Vite's
 * environment variables.
 */
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

/**
 * Read the public/publishable Supabase key.
 */
const supabasePublishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

/**
 * Check that our environment variables exist.
 *
 * This makes configuration errors much easier to
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
 * Create and export the Supabase client.
 *
 * Every service that needs to communicate with Supabase
 * can import this client.
 */
export const supabase = createClient(
  supabaseUrl,
  supabasePublishableKey
);