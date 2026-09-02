/**
 * ============================================================
 * FORGOT PASSWORD PAGE
 * ============================================================
 *
 * This page allows a user to request a password
 * recovery email from Supabase.
 */

import {
  useState,
} from "react";

import {
  Link,
} from "react-router-dom";

import {
  GraduationCap,
} from "lucide-react";

import {
  supabase,
} from "../../lib/supabase";


function ForgotPasswordPage() {

  const [email, setEmail] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [error, setError] =
    useState("");


  /**
   * Send password recovery request.
   */
  async function handleSubmit(event) {

    event.preventDefault();

    setLoading(true);

    setError("");

    setMessage("");


    const {
      error: resetError,
    } =
      await supabase.auth.resetPasswordForEmail(
        email,
        {
          redirectTo:
            `${window.location.origin}/reset-password`,
        }
      );


    if (resetError) {

      setError(
        resetError.message
      );

    } else {

      setMessage(
        "If an account exists for this email, a password recovery link has been sent."
      );

    }


    setLoading(false);
  }


  return (

    <main className="
      flex
      min-h-screen
      items-center
      justify-center
      bg-slate-50
      px-4
    ">

      <div className="
        w-full
        max-w-md
        rounded-3xl
        bg-white
        p-6
        shadow-sm
        sm:p-8
      ">

        <div className="text-center">

          <div className="
            mx-auto
            flex
            h-14
            w-14
            items-center
            justify-center
            rounded-2xl
            bg-purple-600
            text-white
          ">

            <GraduationCap size={30} />

          </div>

          <h1 className="
            mt-4
            text-2xl
            font-bold
            text-slate-900
          ">
            Reset your password
          </h1>

          <p className="
            mt-2
            text-sm
            text-slate-500
          ">
            Enter your email address and we'll send
            you a recovery link.
          </p>

        </div>


        {error && (

          <div className="
            mt-6
            rounded-xl
            bg-red-50
            px-4
            py-3
            text-sm
            text-red-700
          ">

            {error}

          </div>

        )}


        {message && (

          <div className="
            mt-6
            rounded-xl
            bg-green-50
            px-4
            py-3
            text-sm
            text-green-700
          ">

            {message}

          </div>

        )}


        <form
          onSubmit={handleSubmit}
          className="mt-6 space-y-5"
        >

          <div>

            <label
              htmlFor="reset-email"
              className="
                mb-2
                block
                text-sm
                font-medium
                text-slate-700
              "
            >
              Email address
            </label>

            <input
              id="reset-email"
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(
                  event.target.value
                )
              }
              placeholder="you@university.edu"
              required
              className="
                w-full
                rounded-xl
                border
                border-slate-200
                px-4
                py-3
                outline-none
                focus:border-purple-500
                focus:ring-2
                focus:ring-purple-100
              "
            />

          </div>


          <button
            type="submit"
            disabled={loading}
            className="
              w-full
              rounded-xl
              bg-purple-600
              px-4
              py-3
              font-semibold
              text-white
              hover:bg-purple-700
              disabled:opacity-60
            "
          >

            {loading
              ? "Sending..."
              : "Send recovery link"
            }

          </button>

        </form>


        <div className="
          mt-6
          text-center
        ">

          <Link
            to="/login"
            className="
              text-sm
              font-semibold
              text-purple-600
            "
          >
            Back to login
          </Link>

        </div>

      </div>

    </main>
  );
}

export default ForgotPasswordPage;