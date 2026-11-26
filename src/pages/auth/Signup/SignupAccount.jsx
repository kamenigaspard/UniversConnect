
import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Mail,
  Lock,
  User,
  ArrowRight,
} from "lucide-react";

const SignupAccount = ({
  signupData,
  updateSignupData,
  nextStep,
}) => {
  const [error, setError] = useState("");

  const handleNext = (event) => {
    event.preventDefault();
    setError("");

    if (!signupData.fullName?.trim()) {
      setError("Please enter your full name.");
      return;
    }

    if (!signupData.email?.trim()) {
      setError("Please enter your official university email.");
      return;
    }

    if (signupData.password.length < 6) {
      setError("Password must contain at least 6 characters.");
      return;
    }

    if (
      signupData.password !== signupData.confirmPassword
    ) {
      setError("Passwords do not match.");
      return;
    }

    nextStep();
  };

  return (
    <div className="rounded-2xl bg-[var(--page-bg)] p-6 shadow-sm">

      <div className="mb-6 border-[var(--border)] bg-[var(--surface)]" >
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
              autoComplete="name"
              required
              className="w-full rounded-lg border border-gray-300 py-3 pl-10 pr-3 outline-none focus:border-purple-500"
            />
          </div>
        </div>

        {/* Official university email */}

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Official university email
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
              placeholder="yourname@university.edu"
              autoComplete="email"
              required
              className="w-full rounded-lg border border-gray-300 py-3 pl-10 pr-3 outline-none focus:border-purple-500"
            />
          </div>

          <p className="mt-1 text-xs text-gray-500">
            Use the email address assigned to you by your university.
          </p>
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
              autoComplete="new-password"
              required
              className="w-full rounded-lg border border-gray-300 py-3 pl-10 pr-3 outline-none focus:border-purple-500"
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
              autoComplete="new-password"
              required
              className="w-full rounded-lg border border-gray-300 py-3 pl-10 pr-3 outline-none focus:border-purple-500"
            />
          </div>
        </div>

        {/* Continue */}

        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-purple-600 py-3 font-semibold text-white transition hover:bg-purple-700"
        >
          Continue
          <ArrowRight size={18} />
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        Already have an account?{" "}
        <Link
          to="/login"
          className="font-semibold text-purple-600 hover:underline"
        >
          Login
        </Link>
      </p>
    </div>
  );
};

export default SignupAccount;
