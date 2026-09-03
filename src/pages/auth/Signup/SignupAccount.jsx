import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, Lock, User, ArrowRight } from "lucide-react";

/*
 * STEP 1
 *
 * Collect the basic authentication information.
 */
const SignupAccount = ({
  signupData,
  updateSignupData,
  nextStep,
}) => {
  const [error, setError] = useState("");

  /*
   * Validate the first step before allowing the user
   * to continue.
   */
  const handleNext = (event) => {
    event.preventDefault();

    setError("");

    /*
     * Make sure the full name was provided.
     */
    if (!signupData.fullName.trim()) {
      setError("Please enter your full name.");
      return;
    }

    /*
     * Make sure the email was provided.
     */
    if (!signupData.email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    /*
     * Basic password validation.
     */
    if (signupData.password.length < 6) {
      setError("Password must contain at least 6 characters.");
      return;
    }

    /*
     * Make sure both passwords match.
     */
    if (signupData.password !== signupData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    /*
     * Everything is valid.
     * Move to step 2.
     */
    nextStep();
  };

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm">

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Create your account
        </h1>

        <p className="mt-2 text-sm text-gray-500">
          Start by entering your basic account information.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <form onSubmit={handleNext} className="space-y-4">

        {/* Full name */}

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Full name
          </label>

          <div className="relative">
            <User
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />

            <input
              type="text"
              value={signupData.fullName}
              onChange={(event) =>
                updateSignupData({
                  fullName: event.target.value,
                })
              }
              placeholder="John Doe"
              className="w-full rounded-lg border border-gray-300 py-3 pl-10 pr-3 outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Email */}

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Email address
          </label>

          <div className="relative">
            <Mail
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />

            <input
              type="email"
              value={signupData.email}
              onChange={(event) =>
                updateSignupData({
                  email: event.target.value,
                })
              }
              placeholder="john@example.com"
              className="w-full rounded-lg border border-gray-300 py-3 pl-10 pr-3 outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Password */}

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Password
          </label>

          <div className="relative">
            <Lock
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />

            <input
              type="password"
              value={signupData.password}
              onChange={(event) =>
                updateSignupData({
                  password: event.target.value,
                })
              }
              placeholder="Create a password"
              className="w-full rounded-lg border border-gray-300 py-3 pl-10 pr-3 outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Confirm password */}

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Confirm password
          </label>

          <div className="relative">
            <Lock
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />

            <input
              type="password"
              value={signupData.confirmPassword}
              onChange={(event) =>
                updateSignupData({
                  confirmPassword: event.target.value,
                })
              }
              placeholder="Repeat your password"
              className="w-full rounded-lg border border-gray-300 py-3 pl-10 pr-3 outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {/* Continue */}

        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-3 font-semibold text-white transition hover:bg-blue-700"
        >
          Continue
          <ArrowRight size={18} />
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        Already have an account?{" "}
        <Link
          to="/login"
          className="font-semibold text-blue-600 hover:underline"
        >
          Login
        </Link>
      </p>
    </div>
  );
};

export default SignupAccount;