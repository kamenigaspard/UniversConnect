
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Camera,
  ArrowLeft,
  Check,
} from "lucide-react";

import { useAuth } from "../../../contexts/AuthContext";

const SignupProfile = ({
  signupData,
  updateSignupData,
  previousStep,
}) => {
  const navigate = useNavigate();
  const { signUp } = useAuth();

  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  /* =========================================================
     AVATAR PREVIEW
  ========================================================= */

  useEffect(() => {
    if (!signupData.avatarFile) {
      setPreviewUrl(null);
      return;
    }

    const url = URL.createObjectURL(signupData.avatarFile);
    setPreviewUrl(url);

    return () => {
      URL.revokeObjectURL(url);
    };
  }, [signupData.avatarFile]);

  /* =========================================================
     AVATAR VALIDATION
  ========================================================= */

  const handleAvatarChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image.");
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Profile image must be smaller than 5 MB.");
      event.target.value = "";
      return;
    }

    setError("");
    updateSignupData({ avatarFile: file });
  };

  /* =========================================================
     ROLE-BASED REDIRECT
  ========================================================= */

  const redirectByRole = (userRole) => {
    switch (userRole) {
      case "student":
        navigate("/student-home", { replace: true });
        break;

      case "teacher":
        navigate("/teacher-home", { replace: true });
        break;

      case "admin":
        navigate("/admin-home", { replace: true });
        break;

      case "super_admin":
        navigate("/super-admin-home", { replace: true });
        break;

      default:
        throw new Error(
          "Your account has an invalid role. Please contact support."
        );
    }
  };

  /* =========================================================
     CREATE ACCOUNT
  ========================================================= */

  const handleCreateAccount = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const result = await signUp({
        email: signupData.email,
        password: signupData.password,
        matricule: signupData.matricule,
        fullName: signupData.fullName,
        username: signupData.username,
        bio: signupData.bio,
        avatarFile: signupData.avatarFile,
      });

      if (!result?.user) {
        throw new Error(
          "Unable to retrieve your newly created account."
        );
      }

      /* -----------------------------------------------------
         SESSION AVAILABLE
      ----------------------------------------------------- */

      if (result.session) {
        const createdProfile = result.profile;

        if (!createdProfile) {
          throw new Error(
            "Your account was created, but your profile could not be loaded. Please contact support."
          );
        }

        /*
         * The role comes from the database-created profile.
         * Never use a role supplied by the signup form.
         */
        redirectByRole(createdProfile.role);

        return;
      }

      /* -----------------------------------------------------
         NO SESSION AVAILABLE
      ----------------------------------------------------- */

      setSuccess(
        "Your account has been created. Please sign in to continue."
      );

    } catch (err) {
      console.error("Signup error:", err);

      setError(
        err.message ||
        "Something went wrong while creating your account."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm">

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Build your profile
        </h1>

        <p className="mt-2 text-sm text-gray-500">
          Add a profile picture and introduce yourself.
        </p>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-600">
          {success}

          <button
            type="button"
            onClick={() => navigate("/login", { replace: true })}
            className="mt-2 block font-semibold underline"
          >
            Go to login
          </button>
        </div>
      )}

      <form onSubmit={handleCreateAccount} className="space-y-6">

        {/* Profile picture */}

        <div className="flex flex-col items-center">
          <label
            htmlFor="avatar"
            className="group relative cursor-pointer"
          >
            <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-full bg-gray-100 ring-4 ring-gray-100">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Profile preview"
                  className="h-full w-full object-cover"
                />
              ) : (
                <Camera size={40} className="text-gray-400" />
              )}
            </div>

            <div className="absolute bottom-1 right-1 flex h-10 w-10 items-center justify-center rounded-full bg-purple-600 text-white shadow">
              <Camera size={18} />
            </div>
          </label>

          <input
            id="avatar"
            type="file"
            accept="image/*"
            onChange={handleAvatarChange}
            disabled={loading}
            className="hidden"
          />

          <p className="mt-3 text-sm text-gray-500">
            Choose profile photo
          </p>

          <p className="text-xs text-gray-400">
            Maximum 5 MB
          </p>
        </div>

        {/* Bio */}

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Bio
          </label>

          <textarea
            value={signupData.bio}
            onChange={(event) =>
              updateSignupData({
                bio: event.target.value,
              })
            }
            rows={4}
            maxLength={160}
            placeholder="Tell people a little about yourself..."
            disabled={loading}
            className="w-full resize-none rounded-lg border border-gray-300 px-3 py-3 outline-none focus:border-purple-500"
          />

          <p className="mt-1 text-right text-xs text-gray-400">
            {signupData.bio.length}/160
          </p>
        </div>

        {/* Navigation */}

        <div className="flex gap-3">

          <button
            type="button"
            onClick={previousStep}
            disabled={loading}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-300 py-3 font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            <ArrowLeft size={18} />
            Back
          </button>

          <button
            type="submit"
            disabled={loading || !!success}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-purple-600 py-3 font-semibold text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Check size={18} />
            {loading ? "Creating..." : "Create account"}
          </button>

        </div>
      </form>
    </div>
  );
};

export default SignupProfile;