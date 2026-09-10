// ============================================================
// ProfilePage.jsx
// ------------------------------------------------------------
// This page displays the currently logged-in user's profile.
// Users can:
//   - View their profile information
//   - View their school
//   - View their role
//   - Change their username
//   - Change their bio
//   - Upload/change their profile picture
//
// Important:
// Role and school are displayed but are NOT editable here.
// This prevents ordinary users from changing their privileges
// or moving themselves to another school.
// ============================================================

import { useEffect, useRef, useState } from "react";
import {
  Camera,
  Check,
  Loader2,
  Mail,
  Pencil,
  School,
  Shield,
  User,
  X,
} from "lucide-react";

import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";


// ============================================================
// ProfilePage component
// ============================================================

export default function ProfilePage() {

  // ----------------------------------------------------------
  // Get the authenticated user and profile from AuthContext.
  // ----------------------------------------------------------
  const { user, profile, setProfile } = useAuth();


  // ----------------------------------------------------------
  // Local form state.
  // These values are initialized after the profile is loaded.
  // ----------------------------------------------------------
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");


  // ----------------------------------------------------------
  // School information.
  // ----------------------------------------------------------
  const [school, setSchool] = useState(null);


  // ----------------------------------------------------------
  // Edit mode controls whether the form can be modified.
  // ----------------------------------------------------------
  const [isEditing, setIsEditing] = useState(false);


  // ----------------------------------------------------------
  // Loading states.
  // ----------------------------------------------------------
  const [loadingSchool, setLoadingSchool] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);


  // ----------------------------------------------------------
  // Message shown to the user after an operation.
  // ----------------------------------------------------------
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");


  // ----------------------------------------------------------
  // Reference to the hidden file input.
  // ----------------------------------------------------------
  const fileInputRef = useRef(null);


  // ==========================================================
  // Load profile information into the form.
  // ==========================================================

  useEffect(() => {

    if (!profile) return;

    setFullName(profile.full_name || "");
    setUsername(profile.username || "");
    setBio(profile.bio || "");

  }, [profile]);


  // ==========================================================
  // Load the school belonging to the current user.
  // ==========================================================

  useEffect(() => {

    const loadSchool = async () => {

      // No school means there is nothing to load.
      if (!profile?.school_id) {
        setSchool(null);
        return;
      }

      setLoadingSchool(true);

      const { data, error } = await supabase
        .from("schools")
        .select("id, name, code, logo_url, description")
        .eq("id", profile.school_id)
        .single();

      if (error) {
        console.error("Error loading school:", error);
        setSchool(null);
      } else {
        setSchool(data);
      }

      setLoadingSchool(false);
    };

    loadSchool();

  }, [profile?.school_id]);


  // ==========================================================
  // Helper: convert role into a friendly display name.
  // ==========================================================

  const getRoleName = (role) => {

    switch (role) {

      case "student":
        return "Student";

      case "teacher":
        return "Teacher";

      case "admin":
        return "Administrator";

      case "super_admin":
        return "Super Administrator";

      default:
        return "User";
    }
  };


  // ==========================================================
  // Open the file selector.
  // ==========================================================

  const handleChoosePhoto = () => {

    if (!isEditing) return;

    fileInputRef.current?.click();
  };


  // ==========================================================
  // Upload a new profile picture.
  // ==========================================================

  const handlePhotoChange = async (event) => {

    const file = event.target.files?.[0];

    // No file selected.
    if (!file) return;


    // --------------------------------------------------------
    // Make sure the selected file is actually an image.
    // --------------------------------------------------------

    if (!file.type.startsWith("image/")) {

      setError("Please select an image file.");

      return;
    }


    // --------------------------------------------------------
    // Limit profile images to 5 MB.
    // --------------------------------------------------------

    if (file.size > 5 * 1024 * 1024) {

      setError("Profile image must be smaller than 5 MB.");

      return;
    }


    // Clear previous messages.
    setError("");
    setMessage("");
    setUploadingPhoto(true);


    try {

      // ------------------------------------------------------
      // Create a unique filename.
      // ------------------------------------------------------

      const extension = file.name.split(".").pop();

      const fileName =
        `avatar_${Date.now()}.${extension}`;


      // ------------------------------------------------------
      // IMPORTANT:
      // We store the image inside the user's own folder.
      //
      // Example:
      //
      // USER_ID/avatar_123456789.jpg
      //
      // This matches the storage policy structure we created.
      // ------------------------------------------------------

      const filePath = `${user.id}/${fileName}`;


      // ------------------------------------------------------
      // Upload the image to Supabase Storage.
      // ------------------------------------------------------

      const { error: uploadError } = await supabase.storage
        .from("profile-media")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });


      if (uploadError) {
        throw uploadError;
      }


      // ------------------------------------------------------
      // Get the public URL of the uploaded image.
      // ------------------------------------------------------

      const { data: publicUrlData } = supabase.storage
        .from("profile-media")
        .getPublicUrl(filePath);


      const publicUrl = publicUrlData.publicUrl;


      // ------------------------------------------------------
      // Save the image URL inside profiles.avatar_url.
      // ------------------------------------------------------

      const { data: updatedProfile, error: updateError } =
        await supabase
          .from("profiles")
          .update({
            avatar_url: publicUrl,
          })
          .eq("id", user.id)
          .select()
          .single();


      if (updateError) {
        throw updateError;
      }


      // ------------------------------------------------------
      // Update AuthContext so the new image appears everywhere
      // without requiring the user to log out and log in.
      // ------------------------------------------------------

      if (setProfile) {
        setProfile(updatedProfile);
      }


      setMessage("Profile photo updated successfully.");

    } catch (err) {

      console.error("Profile photo upload error:", err);

      setError(
        err.message || "Unable to update profile photo."
      );

    } finally {

      setUploadingPhoto(false);

      // Reset file input so selecting the same image again
      // will trigger the change event.
      event.target.value = "";
    }
  };


  // ==========================================================
  // Save profile information.
  // ==========================================================

  const handleSave = async () => {

    // --------------------------------------------------------
    // Basic validation.
    // --------------------------------------------------------

    if (!fullName.trim()) {

      setError("Full name cannot be empty.");

      return;
    }


    if (!username.trim()) {

      setError("Username cannot be empty.");

      return;
    }


    // --------------------------------------------------------
    // Username validation.
    //
    // We use the same rule as signup:
    // letters, numbers and underscore only.
    // --------------------------------------------------------

    const usernameRegex = /^[a-z0-9_]+$/;

    const cleanUsername =
      username.trim().toLowerCase();


    if (!usernameRegex.test(cleanUsername)) {

      setError(
        "Username can only contain lowercase letters, numbers and underscores."
      );

      return;
    }


    // --------------------------------------------------------
    // Clear old messages.
    // --------------------------------------------------------

    setError("");
    setMessage("");
    setSaving(true);


    try {

      // ------------------------------------------------------
      // Update only fields that users are allowed to modify.
      //
      // Notice that role and school_id are NOT included.
      // ------------------------------------------------------

      const { data: updatedProfile, error: updateError } =
        await supabase
          .from("profiles")
          .update({
            full_name: fullName.trim(),
            username: cleanUsername,
            bio: bio.trim() || null,
          })
          .eq("id", user.id)
          .select()
          .single();


      if (updateError) {

        // Username already exists.
        if (updateError.code === "23505") {

          throw new Error(
            "That username is already taken. Please choose another one."
          );
        }

        throw updateError;
      }


      // ------------------------------------------------------
      // Update the global profile state.
      // ------------------------------------------------------

      if (setProfile) {
        setProfile(updatedProfile);
      }


      // ------------------------------------------------------
      // Update the local username state with the cleaned value.
      // ------------------------------------------------------

      setUsername(updatedProfile.username || "");

      setMessage("Profile updated successfully.");

      setIsEditing(false);

    } catch (err) {

      console.error("Profile update error:", err);

      setError(
        err.message || "Unable to update your profile."
      );

    } finally {

      setSaving(false);
    }
  };


  // ==========================================================
  // Cancel editing.
  // ==========================================================

  const handleCancel = () => {

    // Restore original profile values.
    setFullName(profile?.full_name || "");
    setUsername(profile?.username || "");
    setBio(profile?.bio || "");

    setError("");
    setMessage("");

    setIsEditing(false);
  };


  // ==========================================================
  // Loading state.
  // ==========================================================

  if (!profile) {

    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }


  // ==========================================================
  // Main UI.
  // ==========================================================

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-6">

      <div className="max-w-3xl mx-auto">

        {/* ====================================================
            PAGE HEADER
        ==================================================== */}

        <div className="flex items-center justify-between mb-6">

          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              My Profile
            </h1>

            <p className="text-sm text-gray-500 mt-1">
              Manage your profile information
            </p>
          </div>


          {!isEditing ? (

            <button
              onClick={() => {
                setError("");
                setMessage("");
                setIsEditing(true);
              }}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-black text-white hover:bg-gray-800 transition"
            >
              <Pencil size={17} />

              Edit
            </button>

          ) : (

            <div className="flex gap-2">

              <button
                onClick={handleCancel}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-300 bg-white hover:bg-gray-100 transition"
              >
                <X size={17} />

                Cancel
              </button>


              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-black text-white hover:bg-gray-800 transition disabled:opacity-50"
              >

                {saving ? (
                  <Loader2
                    size={17}
                    className="animate-spin"
                  />
                ) : (
                  <Check size={17} />
                )}

                Save
              </button>

            </div>
          )}

        </div>


        {/* ====================================================
            SUCCESS MESSAGE
        ==================================================== */}

        {message && (

          <div className="mb-4 flex items-center gap-2 rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-green-700">

            <Check size={18} />

            {message}

          </div>
        )}


        {/* ====================================================
            ERROR MESSAGE
        ==================================================== */}

        {error && (

          <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-red-700">

            {error}

          </div>
        )}


        {/* ====================================================
            PROFILE CARD
        ==================================================== */}

        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">


          {/* ==================================================
              PROFILE HEADER
          ================================================== */}

          <div className="p-6 sm:p-8">


            <div className="flex flex-col sm:flex-row items-center gap-6">


              {/* =================================================
                  PROFILE PHOTO
              ================================================= */}

              <div className="relative">

                <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-100 border-4 border-white shadow-lg flex items-center justify-center">

                  {profile.avatar_url ? (

                    <img
                      src={profile.avatar_url}
                      alt={profile.full_name}
                      className="w-full h-full object-cover"
                    />

                  ) : (

                    <User
                      size={55}
                      className="text-gray-400"
                    />

                  )}

                </div>


                {/* Hidden file input */}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="hidden"
                />


                {/* Camera button */}

                {isEditing && (

                  <button
                    type="button"
                    onClick={handleChoosePhoto}
                    disabled={uploadingPhoto}
                    className="absolute bottom-0 right-0 w-10 h-10 rounded-full bg-black text-white flex items-center justify-center shadow-lg hover:bg-gray-800 transition disabled:opacity-50"
                    title="Change profile photo"
                  >

                    {uploadingPhoto ? (

                      <Loader2
                        size={18}
                        className="animate-spin"
                      />

                    ) : (

                      <Camera size={18} />

                    )}

                  </button>

                )}

              </div>


              {/* =================================================
                  BASIC PROFILE SUMMARY
              ================================================= */}

              <div className="text-center sm:text-left">

                <h2 className="text-2xl font-bold text-gray-900">

                  {profile.full_name}

                </h2>


                <p className="text-gray-500 mt-1">

                  @{profile.username || "username"}

                </p>


                <div className="inline-flex items-center gap-2 mt-3 px-3 py-1.5 rounded-full bg-gray-100 text-sm font-medium">

                  <Shield size={15} />

                  {getRoleName(profile.role)}

                </div>

              </div>

            </div>

          </div>


          {/* ==================================================
              PROFILE INFORMATION
          ================================================== */}

          <div className="border-t border-gray-200 p-6 sm:p-8">

            <div className="space-y-6">


              {/* =================================================
                  FULL NAME
              ================================================= */}

              <div>

                <label className="block text-sm font-medium text-gray-700 mb-2">

                  Full Name

                </label>

                <input
                  type="text"
                  value={fullName}
                  onChange={(e) =>
                    setFullName(e.target.value)
                  }
                  disabled={!isEditing}
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:ring-2 focus:ring-black disabled:bg-gray-100 disabled:text-gray-500"
                />

              </div>


              {/* =================================================
                  USERNAME
              ================================================= */}

              <div>

                <label className="block text-sm font-medium text-gray-700 mb-2">

                  Username

                </label>

                <div className="relative">

                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                    @
                  </span>

                  <input
                    type="text"
                    value={username}
                    onChange={(e) =>
                      setUsername(
                        e.target.value
                          .toLowerCase()
                          .replace(/\s/g, "")
                      )
                    }
                    disabled={!isEditing}
                    className="w-full rounded-xl border border-gray-300 pl-9 pr-4 py-3 outline-none focus:ring-2 focus:ring-black disabled:bg-gray-100 disabled:text-gray-500"
                  />

                </div>

              </div>


              {/* =================================================
                  EMAIL
              ================================================= */}

              <div>

                <label className="block text-sm font-medium text-gray-700 mb-2">

                  Email

                </label>

                <div className="relative">

                  <Mail
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                  />

                  <input
                    type="email"
                    value={profile.email || user.email || ""}
                    disabled
                    className="w-full rounded-xl border border-gray-300 pl-11 pr-4 py-3 bg-gray-100 text-gray-500"
                  />

                </div>

              </div>


              {/* =================================================
                  BIO
              ================================================= */}

              <div>

                <label className="block text-sm font-medium text-gray-700 mb-2">

                  Bio

                </label>

                <textarea
                  value={bio}
                  onChange={(e) =>
                    setBio(e.target.value)
                  }
                  disabled={!isEditing}
                  rows={4}
                  maxLength={500}
                  placeholder="Tell people something about yourself..."
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:ring-2 focus:ring-black disabled:bg-gray-100 disabled:text-gray-500 resize-none"
                />

                {isEditing && (

                  <p className="text-xs text-gray-400 mt-1 text-right">

                    {bio.length}/500

                  </p>

                )}

              </div>


              {/* =================================================
                  SCHOOL
              ================================================= */}

              <div>

                <label className="block text-sm font-medium text-gray-700 mb-2">

                  School

                </label>

                <div className="flex items-center gap-3 rounded-xl border border-gray-300 px-4 py-3 bg-gray-100">

                  {loadingSchool ? (

                    <Loader2
                      size={18}
                      className="animate-spin text-gray-400"
                    />

                  ) : school?.logo_url ? (

                    <img
                      src={school.logo_url}
                      alt={school.name}
                      className="w-9 h-9 rounded-lg object-contain bg-white"
                    />

                  ) : (

                    <School
                      size={20}
                      className="text-gray-400"
                    />

                  )}


                  <div>

                    <p className="font-medium text-gray-700">

                      {school?.name || "No school assigned"}

                    </p>

                    {school?.code && (

                      <p className="text-xs text-gray-500">

                        {school.code}

                      </p>

                    )}

                  </div>

                </div>

              </div>


              {/* =================================================
                  ROLE
              ================================================= */}

              <div>

                <label className="block text-sm font-medium text-gray-700 mb-2">

                  Account Role

                </label>

                <div className="flex items-center gap-3 rounded-xl border border-gray-300 px-4 py-3 bg-gray-100">

                  <Shield
                    size={20}
                    className="text-gray-400"
                  />

                  <span className="font-medium text-gray-700">

                    {getRoleName(profile.role)}

                  </span>

                </div>

                <p className="text-xs text-gray-500 mt-2">

                  Your role is managed by the university administration.

                </p>

              </div>

            </div>

          </div>

        </div>

      </div>

    </div>
  );
}