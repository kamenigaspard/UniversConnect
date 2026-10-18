
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
  Sparkles,
} from "lucide-react";

import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";

// ============================================================
// Reusable glass styles
// ============================================================

const glassCard =
  "rounded-3xl border border-white/80 bg-white/75 shadow-[0_12px_40px_rgba(91,33,182,0.08)] backdrop-blur-2xl";

const inputBase =
  "w-full rounded-xl border border-violet-100 bg-white/75 px-4 py-3 text-sm text-slate-800 outline-none transition duration-200 placeholder:text-slate-400 focus:border-violet-400 focus:ring-4 focus:ring-violet-100/80 disabled:cursor-not-allowed disabled:border-violet-100/60 disabled:bg-violet-50/50 disabled:text-slate-500";

const primaryButton =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_5px_18px_rgba(139,92,246,0.28)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(139,92,246,0.4)] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0";

// ============================================================
// ProfilePage
// ============================================================

export default function ProfilePage() {
  const { user, profile, setProfile } = useAuth();

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");

  const [school, setSchool] = useState(null);

  const [isEditing, setIsEditing] = useState(false);

  const [loadingSchool, setLoadingSchool] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const fileInputRef = useRef(null);

  // ==========================================================
  // Populate the form when the profile changes.
  // ==========================================================

  useEffect(() => {
    if (!profile) return;

    setFullName(profile.full_name || "");
    setUsername(profile.username || "");
    setBio(profile.bio || "");
  }, [profile]);

  // ==========================================================
  // Load the user's school.
  // ==========================================================

  useEffect(() => {
    let isMounted = true;

    const loadSchool = async () => {
      if (!profile?.school_id) {
        setSchool(null);
        setLoadingSchool(false);
        return;
      }

      setLoadingSchool(true);

      try {
        const { data, error } = await supabase
          .from("schools")
          .select("id, name, code, logo_url, description")
          .eq("id", profile.school_id)
          .single();

        if (error) throw error;

        if (isMounted) {
          setSchool(data);
        }
      } catch (err) {
        console.error("Error loading school:", err);

        if (isMounted) {
          setSchool(null);
        }
      } finally {
        if (isMounted) {
          setLoadingSchool(false);
        }
      }
    };

    loadSchool();

    return () => {
      isMounted = false;
    };
  }, [profile?.school_id]);

  // ==========================================================
  // Friendly role names.
  // ==========================================================

  const getRoleName = (role) => {
    switch (role) {
      case "student":
        return "Student";

      case "lecturer":
        return "Lecturer";

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
  // Open the image selector.
  // ==========================================================

  const handleChoosePhoto = () => {
    if (!isEditing || uploadingPhoto) return;

    fileInputRef.current?.click();
  };

  // ==========================================================
  // Upload a new profile picture.
  // ==========================================================

  const handlePhotoChange = async (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file.");
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Profile image must be smaller than 5 MB.");
      event.target.value = "";
      return;
    }

    if (!user?.id) {
      setError("You must be logged in to update your profile photo.");
      event.target.value = "";
      return;
    }

    setError("");
    setMessage("");
    setUploadingPhoto(true);

    try {
      const extension = file.name.split(".").pop();

      const fileName = `avatar_${Date.now()}.${extension}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("profile-media")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data: publicUrlData } = supabase.storage
        .from("profile-media")
        .getPublicUrl(filePath);

      const publicUrl = publicUrlData.publicUrl;

      const {
        data: updatedProfile,
        error: updateError,
      } = await supabase
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

      if (setProfile) {
        setProfile(updatedProfile);
      }

      setMessage("Profile photo updated successfully.");
    } catch (err) {
      console.error("Profile photo upload error:", err);

      setError(err.message || "Unable to update profile photo.");
    } finally {
      setUploadingPhoto(false);
      event.target.value = "";
    }
  };

  // ==========================================================
  // Save profile information.
  // ==========================================================

  const handleSave = async () => {
    if (!fullName.trim()) {
      setError("Full name cannot be empty.");
      return;
    }

    if (!username.trim()) {
      setError("Username cannot be empty.");
      return;
    }

    const usernameRegex = /^[a-z0-9_]+$/;
    const cleanUsername = username.trim().toLowerCase();

    if (!usernameRegex.test(cleanUsername)) {
      setError(
        "Username can only contain lowercase letters, numbers and underscores."
      );
      return;
    }

    if (!user?.id) {
      setError("You must be logged in to update your profile.");
      return;
    }

    setError("");
    setMessage("");
    setSaving(true);

    try {
      const {
        data: updatedProfile,
        error: updateError,
      } = await supabase
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
        if (updateError.code === "23505") {
          throw new Error(
            "That username is already taken. Please choose another one."
          );
        }

        throw updateError;
      }

      if (setProfile) {
        setProfile(updatedProfile);
      }

      setFullName(updatedProfile.full_name || "");
      setUsername(updatedProfile.username || "");
      setBio(updatedProfile.bio || "");

      setMessage("Profile updated successfully.");
      setIsEditing(false);
    } catch (err) {
      console.error("Profile update error:", err);

      setError(err.message || "Unable to update your profile.");
    } finally {
      setSaving(false);
    }
  };

  // ==========================================================
  // Cancel editing.
  // ==========================================================

  const handleCancel = () => {
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
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#f8f5ff]">
        <div className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-violet-300/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 -right-20 h-72 w-72 rounded-full bg-fuchsia-300/25 blur-3xl" />

        <div className="relative flex flex-col items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white bg-white/70 shadow-[0_0_35px_rgba(139,92,246,0.22)] backdrop-blur-xl">
            <Loader2 size={30} className="animate-spin text-violet-600" />
          </div>

          <p className="text-sm font-medium text-violet-700">
            Loading your profile...
          </p>
        </div>
      </div>
    );
  }

  // ==========================================================
  // Main UI.
  // ==========================================================

  return (
    <div className="relative min-h-screen overflow-x-clip bg-[#f8f5ff] px-4 py-6 pb-12 text-slate-800 sm:py-9">
      {/* Ambient background glow */}
      <div className="pointer-events-none fixed inset-0 -z-0 overflow-hidden">
        <div className="absolute -left-32 top-20 h-80 w-80 rounded-full bg-violet-300/20 blur-[100px]" />
        <div className="absolute -right-32 top-[35%] h-96 w-96 rounded-full bg-fuchsia-300/20 blur-[120px]" />
        <div className="absolute bottom-0 left-[30%] h-72 w-72 rounded-full bg-indigo-300/15 blur-[100px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-3xl">
        {/* Page heading */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-violet-100 bg-white/70 px-3 py-1.5 text-xs font-semibold text-violet-700 shadow-sm backdrop-blur-xl">
              <Sparkles size={14} />
              Your UniVerse identity
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              My Profile
            </h1>

            <p className="mt-1.5 text-sm text-slate-500">
              Manage your personal information and how others see you.
            </p>
          </div>

          {!isEditing ? (
            <button
              type="button"
              onClick={() => {
                setError("");
                setMessage("");
                setIsEditing(true);
              }}
              className={primaryButton}
            >
              <Pencil size={17} />
              Edit profile
            </button>
          ) : (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleCancel}
                disabled={saving}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-violet-200 bg-white/80 px-4 py-2.5 text-sm font-semibold text-slate-600 shadow-sm backdrop-blur-xl transition hover:border-violet-300 hover:bg-violet-50 disabled:opacity-50"
              >
                <X size={17} />
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={saving || uploadingPhoto}
                className={primaryButton}
              >
                {saving ? (
                  <Loader2 size={17} className="animate-spin" />
                ) : (
                  <Check size={17} />
                )}
                {saving ? "Saving..." : "Save changes"}
              </button>
            </div>
          )}
        </div>

        {/* Success message */}
        {message && (
          <div
            role="status"
            className="mb-5 flex items-start gap-3 rounded-2xl border border-emerald-200/80 bg-emerald-50/90 px-4 py-3.5 text-sm text-emerald-800 shadow-sm backdrop-blur-xl"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-emerald-100">
              <Check size={17} />
            </span>
            <p className="pt-1">{message}</p>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div
            role="alert"
            className="mb-5 flex items-start gap-3 rounded-2xl border border-rose-200/80 bg-rose-50/90 px-4 py-3.5 text-sm text-rose-800 shadow-sm backdrop-blur-xl"
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-rose-100">
              <X size={17} />
            </span>
            <p className="pt-1">{error}</p>
          </div>
        )}

        {/* Main profile card */}
        <div className={`${glassCard} overflow-hidden`}>
          {/* Profile hero */}
          <div className="relative overflow-hidden border-b border-violet-100/80 bg-gradient-to-br from-violet-100/80 via-white/80 to-fuchsia-100/70 px-5 py-8 sm:px-8 sm:py-10">
            <div className="pointer-events-none absolute -right-12 -top-16 h-48 w-48 rounded-full bg-fuchsia-300/25 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 left-1/4 h-40 w-40 rounded-full bg-violet-300/25 blur-3xl" />

            <div className="relative flex flex-col items-center gap-6 sm:flex-row">
              {/* Profile photo */}
              <div className="relative shrink-0">
                <div className="rounded-full bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-500 p-[3px] shadow-[0_0_35px_rgba(139,92,246,0.3)]">
                  <div className="flex h-32 w-32 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-gradient-to-br from-violet-100 to-fuchsia-100">
                    {profile.avatar_url ? (
                      <img
                        src={profile.avatar_url}
                        alt={profile.full_name || "Profile photo"}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <User size={55} className="text-violet-400" />
                    )}
                  </div>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoChange}
                  className="hidden"
                />

                {isEditing && (
                  <button
                    type="button"
                    onClick={handleChoosePhoto}
                    disabled={uploadingPhoto}
                    className="absolute bottom-0 right-0 flex h-11 w-11 items-center justify-center rounded-2xl border-2 border-white bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white shadow-[0_5px_18px_rgba(139,92,246,0.4)] transition hover:scale-105 hover:shadow-[0_0_24px_rgba(168,85,247,0.5)] disabled:opacity-60"
                    title="Change profile photo"
                    aria-label="Change profile photo"
                  >
                    {uploadingPhoto ? (
                      <Loader2 size={19} className="animate-spin" />
                    ) : (
                      <Camera size={19} />
                    )}
                  </button>
                )}
              </div>

              {/* Profile summary */}
              <div className="min-w-0 flex-1 text-center sm:text-left">
                <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-violet-200/80 bg-white/75 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-violet-700 shadow-sm backdrop-blur">
                  <Sparkles size={12} />
                  UniVerse member
                </div>

                <h2 className="break-words text-2xl font-bold tracking-tight text-slate-900">
                  {profile.full_name || "Your name"}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  @{profile.username || "username"}
                </p>

                <div className="mt-4 flex flex-wrap justify-center gap-2 sm:justify-start">
                  <span className="inline-flex items-center gap-2 rounded-xl border border-violet-200/80 bg-white/75 px-3 py-2 text-sm font-semibold text-violet-700 shadow-sm backdrop-blur-xl">
                    <Shield size={15} />
                    {getRoleName(profile.role)}
                  </span>

                  {school?.code && (
                    <span className="inline-flex items-center gap-2 rounded-xl border border-fuchsia-200/80 bg-white/75 px-3 py-2 text-sm font-semibold text-fuchsia-700 shadow-sm backdrop-blur-xl">
                      <School size={15} />
                      {school.code}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Profile information */}
          <div className="p-5 sm:p-8">
            <div className="mb-6">
              <h3 className="text-base font-bold text-slate-900">
                Personal information
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                {isEditing
                  ? "Update your details, then save your changes."
                  : "Your profile details and university affiliation."}
              </p>
            </div>

            <div className="space-y-6">
              {/* Full name */}
              <div>
                <label
                  htmlFor="profile-full-name"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Full name
                </label>

                <input
                  id="profile-full-name"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={!isEditing || saving}
                  autoComplete="name"
                  className={inputBase}
                  placeholder="Enter your full name"
                />
              </div>

              {/* Username */}
              <div>
                <label
                  htmlFor="profile-username"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Username
                </label>

                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 font-semibold text-violet-500">
                    @
                  </span>

                  <input
                    id="profile-username"
                    type="text"
                    value={username}
                    onChange={(e) =>
                      setUsername(
                        e.target.value.toLowerCase().replace(/\s/g, "")
                      )
                    }
                    disabled={!isEditing || saving}
                    autoComplete="username"
                    className={`${inputBase} pl-9`}
                    placeholder="your_username"
                  />
                </div>

                <p className="mt-1.5 text-xs text-slate-400">
                  Use lowercase letters, numbers, and underscores.
                </p>
              </div>

              {/* Email */}
              <div>
                <label
                  htmlFor="profile-email"
                  className="mb-2 block text-sm font-semibold text-slate-700"
                >
                  Email address
                </label>

                <div className="relative">
                  <Mail
                    size={18}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-violet-400"
                  />

                  <input
                    id="profile-email"
                    type="email"
                    value={profile.email || user?.email || ""}
                    disabled
                    className={`${inputBase} bg-violet-50/60 pl-11`}
                  />
                </div>

                <p className="mt-1.5 text-xs text-slate-400">
                  Your email address cannot be changed here.
                </p>
              </div>

              {/* Bio */}
              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label
                    htmlFor="profile-bio"
                    className="block text-sm font-semibold text-slate-700"
                  >
                    Bio
                  </label>

                  {isEditing && (
                    <span className="text-xs font-medium text-violet-500">
                      {bio.length}/500
                    </span>
                  )}
                </div>

                <textarea
                  id="profile-bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  disabled={!isEditing || saving}
                  rows={4}
                  maxLength={500}
                  placeholder="Tell people something about yourself..."
                  className={`${inputBase} resize-none leading-6`}
                />
              </div>

              {/* School */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  School
                </label>

                <div className="flex items-center gap-3 rounded-xl border border-violet-100 bg-gradient-to-r from-violet-50/80 to-fuchsia-50/60 px-4 py-3.5">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white bg-white shadow-sm">
                    {loadingSchool ? (
                      <Loader2
                        size={19}
                        className="animate-spin text-violet-500"
                      />
                    ) : school?.logo_url ? (
                      <img
                        src={school.logo_url}
                        alt={school.name || "School logo"}
                        className="h-full w-full object-contain p-1"
                      />
                    ) : (
                      <School size={21} className="text-violet-400" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <p className="break-words text-sm font-semibold text-slate-800">
                      {loadingSchool
                        ? "Loading school..."
                        : school?.name || "No school assigned"}
                    </p>

                    <p className="mt-0.5 text-xs text-slate-500">
                      {school?.code || "University affiliation"}
                    </p>
                  </div>

                  <Shield
                    size={17}
                    className="ml-auto shrink-0 text-violet-400"
                  />
                </div>
              </div>

              {/* Account role */}
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Account role
                </label>

                <div className="flex items-center gap-3 rounded-xl border border-violet-100 bg-gradient-to-r from-violet-50/80 to-fuchsia-50/60 px-4 py-3.5">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white bg-white text-violet-600 shadow-sm">
                    <Shield size={21} />
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-slate-800">
                      {getRoleName(profile.role)}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Managed by university administration
                    </p>
                  </div>

                  <div className="ml-auto rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                    Protected
                  </div>
                </div>

                <p className="mt-2 text-xs leading-5 text-slate-400">
                  Your role and school assignment are read-only to prevent
                  unauthorized privilege changes.
                </p>
              </div>
            </div>

            {/* Editing footer */}
            {isEditing && (
              <div className="mt-8 flex flex-col gap-3 rounded-2xl border border-violet-100 bg-gradient-to-r from-violet-50/80 to-fuchsia-50/70 p-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs leading-5 text-slate-500">
                  Your role and school cannot be edited from this page.
                </p>

                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={saving || uploadingPhoto}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border border-violet-200 bg-white/80 px-3.5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-white disabled:opacity-50"
                  >
                    <X size={16} />
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving || uploadingPhoto}
                    className={primaryButton}
                  >
                    {saving ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <Check size={16} />
                    )}
                    Save
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Privacy note */}
        <div className="mt-4 flex items-start gap-3 rounded-2xl border border-white/80 bg-white/55 px-4 py-3.5 text-xs leading-5 text-slate-500 shadow-sm backdrop-blur-xl">
          <Shield size={17} className="mt-0.5 shrink-0 text-violet-500" />
          <p>
            Your school and account role are protected. Only your permitted
            profile fields can be edited from this page.
          </p>
        </div>
      </div>
    </div>
  );
}
