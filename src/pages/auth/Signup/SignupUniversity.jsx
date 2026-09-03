import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { supabase } from "../../../lib/supabase";

const SignupUniversity = ({
  signupData,
  updateSignupData,
  nextStep,
  previousStep,
}) => {
  const [schools, setSchools] = useState([]);
  const [loadingSchools, setLoadingSchools] = useState(true);
  const [error, setError] = useState("");

  /*
   * Load active schools from Supabase.
   */
  useEffect(() => {
    const loadSchools = async () => {
      setLoadingSchools(true);

      const { data, error } = await supabase
        .from("schools")
        .select("id, name, code")
        .eq("is_active", true)
        .order("name");

      if (error) {
        console.error("Error loading schools:", error);
        setError("Unable to load schools.");
      } else {
        setSchools(data || []);
      }

      setLoadingSchools(false);
    };

    loadSchools();
  }, []);

  const handleNext = async (event) => {
    event.preventDefault();

    setError("");

    if (!signupData.username.trim()) {
      setError("Please choose a username.");
      return;
    }

    /*
     * Username format:
     * letters, numbers and underscores.
     */
    const usernameRegex = /^[a-zA-Z0-9_]+$/;

    if (!usernameRegex.test(signupData.username)) {
      setError(
        "Username can only contain letters, numbers and underscores."
      );
      return;
    }

    if (!signupData.schoolId) {
      setError("Please select your school.");
      return;
    }

    if (!signupData.role) {
      setError("Please select your role.");
      return;
    }

    /*
     * We intentionally do not query profiles here to check username
     * uniqueness.
     *
     * Your database already has:
     *
     * profiles_username_key
     *
     * which enforces uniqueness.
     *
     * The final signup operation will handle conflicts safely.
     */

    nextStep();
  };

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm">

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          University information
        </h1>

        <p className="mt-2 text-sm text-gray-500">
          Tell us how you are connected to the university.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      <form onSubmit={handleNext} className="space-y-4">

        {/* Username */}

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Username
          </label>

          <input
            type="text"
            value={signupData.username}
            onChange={(event) =>
              updateSignupData({
                username: event.target.value,
              })
            }
            placeholder="john_doe"
            className="w-full rounded-lg border border-gray-300 px-3 py-3 outline-none focus:border-blue-500"
          />

          <p className="mt-1 text-xs text-gray-500">
            Letters, numbers and underscores only.
          </p>
        </div>

        {/* Role */}

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Role
          </label>

          <select
            value={signupData.role}
            onChange={(event) =>
              updateSignupData({
                role: event.target.value,
              })
            }
            className="w-full rounded-lg border border-gray-300 px-3 py-3 outline-none focus:border-blue-500"
          >
            <option value="student">Student</option>
            <option value="teacher">Teacher</option>
            <option value="admin">Administrator</option>
          </select>
        </div>

        {/* School */}

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            School
          </label>

          <select
            value={signupData.schoolId}
            onChange={(event) =>
              updateSignupData({
                schoolId: event.target.value,
              })
            }
            disabled={loadingSchools}
            className="w-full rounded-lg border border-gray-300 px-3 py-3 outline-none focus:border-blue-500 disabled:bg-gray-100"
          >
            <option value="">
              {loadingSchools
                ? "Loading schools..."
                : "Select your school"}
            </option>

            {schools.map((school) => (
              <option key={school.id} value={school.id}>
                {school.name}
                {school.code ? ` (${school.code})` : ""}
              </option>
            ))}
          </select>
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
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 py-3 font-semibold text-white hover:bg-blue-700"
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