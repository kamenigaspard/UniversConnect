import { useEffect, useState } from "react";
import { Camera, ArrowLeft, Check } from "lucide-react";
import { useAuth } from "../../../contexts/AuthContext";

const SignupProfile = ({
  signupData,
  updateSignupData,
  previousStep,
}) => {
  const { signUp } = useAuth();

  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  /*
   * Create a temporary browser preview when the user selects
   * a profile image.
   */
  useEffect(() => {
    if (!signupData.avatarFile) {
      setPreviewUrl(null);
      return;
    }

    const url = URL.createObjectURL(signupData.avatarFile);

    setPreviewUrl(url);

    /*
     * Release the temporary browser URL when the component
     * is removed or when the selected image changes.
     */
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [signupData.avatarFile]);

  /*
   * Handle profile photo selection.
   */
  const handleAvatarChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    /*
     * Only allow image files.
     */
    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image.");
      return;
    }

    /*
     * Limit the image size to 5 MB.
     */
    if (file.size > 5 * 1024 * 1024) {
      setError("Profile image must be smaller than 5 MB.");
      return;
    }

    setError("");

    /*
     * Store the actual File object.
     *
     * It will be uploaded after account creation.
     */
    updateSignupData({
      avatarFile: file,
    });
  };

  /*
   * Complete signup.
   */
  const handleCreateAccount = async (event) => {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      /*
       * Send all collected information to AuthContext.
       *
       * AuthContext will be responsible for:
       *
       * 1. Creating the Supabase Auth account
       * 2. Creating/updating the profile
       * 3. Uploading the profile image
       * 4. Updating avatar_url
       * 5. Returning the created user/profile
       */
      const result = await signUp({
        email: signupData.email,
        password: signupData.password,
        fullName: signupData.fullName,
        role: signupData.role,
        schoolId: signupData.schoolId,
        username: signupData.username,
        bio: signupData.bio,
        avatarFile: signupData.avatarFile,
      });

      if (result?.error) {
        setError(result.error.message || "Unable to create account.");
        return;
      }

      /*
       * Navigation will be handled by AuthContext/App routing
       * after successful authentication.
       */
    } catch (err) {
      console.error("Signup error:", err);

      setError(
        err.message || "Something went wrong while creating your account."
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

      <form
        onSubmit={handleCreateAccount}
        className="space-y-6"
      >

        {/* Profile image */}

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
                <Camera
                  size={40}
                  className="text-gray-400"
                />
              )}

            </div>

            {/* Camera overlay */}

            <div className="absolute bottom-1 right-1 flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white shadow">
              <Camera size={18} />
            </div>

          </label>

          <input
            id="avatar"
            type="file"
            accept="image/*"
            onChange={handleAvatarChange}
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
            className="w-full resize-none rounded-lg border border-gray-300 px-3 py-3 outline-none focus:border-blue-500"
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
            disabled={loading}
            className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-600 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
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