
import { useState } from "react";
import { ArrowLeft, ArrowRight, Hash, User } from "lucide-react";

const SignupUniversity = ({
  signupData,
  updateSignupData,
  nextStep,
  previousStep,
}) => {
  const [error, setError] = useState("");

  const handleNext = (event) => {
    event.preventDefault();
    setError("");

    if (!signupData.matricule?.trim()) {
      setError("Please enter your university matricule.");
      return;
    }

    if (!signupData.username?.trim()) {
      setError("Please choose a username.");
      return;
    }

    const usernameRegex = /^[a-zA-Z0-9_]+$/;

    if (!usernameRegex.test(signupData.username.trim())) {
      setError(
        "Username can only contain letters, numbers and underscores."
      );
      return;
    }

    nextStep();
  };

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm">

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          University identification
        </h1>

        <p className="mt-2 text-sm text-gray-500">
          Enter your university matricule and choose your username.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <form onSubmit={handleNext} className="space-y-4">

        {/* Matricule */}

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            University matricule
          </label>

          <div className="relative">
            <Hash
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />

            <input
              type="text"
              value={signupData.matricule}
              onChange={(event) =>
                updateSignupData({
                  matricule: event.target.value.toUpperCase(),
                })
              }
              placeholder="Enter your matricule"
              autoComplete="off"
              required
              className="w-full rounded-lg border border-gray-300 py-3 pl-10 pr-3 uppercase outline-none focus:border-purple-500"
            />
          </div>

          <p className="mt-1 text-xs text-gray-500">
            Use the matricule registered by your university.
          </p>
        </div>

        {/* Username */}

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Username
          </label>

          <div className="relative">
            <User
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            />

            <input
              type="text"
              value={signupData.username}
              onChange={(event) =>
                updateSignupData({
                  username: event.target.value.toLowerCase(),
                })
              }
              placeholder="john_doe"
              autoComplete="username"
              required
              className="w-full rounded-lg border border-gray-300 py-3 pl-10 pr-3 outline-none focus:border-purple-500"
            />
          </div>

          <p className="mt-1 text-xs text-gray-500">
            Letters, numbers and underscores only.
          </p>
        </div>

        {/* Navigation */}

        <div className="flex gap-3">

          <button
            type="button"
            onClick={previousStep}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-300 py-3 font-semibold text-gray-700 hover:bg-gray-50"
          >
            <ArrowLeft size={18} />
            Back
          </button>

          <button
            type="submit"
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-purple-600 py-3 font-semibold text-white hover:bg-purple-700"
          >
            Continue
            <ArrowRight size={18} />
          </button>

        </div>
      </form>
    </div>
  );
};

export default SignupUniversity;
