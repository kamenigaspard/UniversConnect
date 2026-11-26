
import { useEffect, useRef, useState } from "react";
import { Loader2, UserCircle } from "lucide-react";

import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";

import ProfileHeader from "../components/profile/ProfileHeader";
import ProfileMessages from "../components/profile/ProfileMessages";
import ProfileAvatar from "../components/profile/ProfileAvatar";
import ProfileInformation from "../components/profile/ProfileInformation";
import ProfileSchool from "../components/profile/ProfileSchool";
import ProfileRole from "../components/profile/ProfileRole";
import ProfileActions from "../components/profile/ProfileActions";
import MyPosts from "../components/profile/MyPosts";
import ProfilePrivacyNote from "../components/profile/ProfilePrivacyNote";

const PUBLIC_PROFILE_COLUMNS = `
  id,
  full_name,
  username,
  avatar_url,
  bio,
  role,
  school_id,
  is_active,
  created_at,
  updated_at,
  preferred_language,
  preferred_theme
`;

export default function ProfilePage() {
  const { user, profile, loading, setProfile } = useAuth();

  const fileInputRef = useRef(null);

  // Profile form state
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");

  // Page state
  const [school, setSchool] = useState(null);
  const [loadingSchool, setLoadingSchool] = useState(true);

  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // ============================================================
  // INITIALIZE PROFILE FORM
  // ============================================================

  useEffect(() => {
    if (!profile) return;

    setFullName(profile.full_name || "");
    setUsername(profile.username || "");
    setBio(profile.bio || "");
  }, [profile]);

  // ============================================================
  // LOAD SCHOOL INFORMATION
  // ============================================================

  useEffect(() => {
    let isMounted = true;

    async function loadSchool() {
      setLoadingSchool(true);
      setSchool(null);

      if (!profile?.school_id) {
        setLoadingSchool(false);
        return;
      }

      try {
        const { data, error: schoolError } = await supabase
          .from("schools")
          .select("id, name, code, logo_url")
          .eq("id", profile.school_id)
          .maybeSingle();

        if (schoolError) throw schoolError;

        if (isMounted) {
          setSchool(data || null);
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
    }

    loadSchool();

    return () => {
      isMounted = false;
    };
  }, [profile?.school_id]);

  // ============================================================
  // CLEAR FEEDBACK
  // ============================================================

  function clearFeedback() {
    setMessage("");
    setError("");
  }

  // ============================================================
  // CANCEL EDITING
  // ============================================================

  function handleCancel() {
    setFullName(profile?.full_name || "");
    setUsername(profile?.username || "");
    setBio(profile?.bio || "");

    setIsEditing(false);
    clearFeedback();

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  // ============================================================
  // START EDITING
  // ============================================================

  function handleEdit() {
    setFullName(profile?.full_name || "");
    setUsername(profile?.username || "");
    setBio(profile?.bio || "");

    clearFeedback();
    setIsEditing(true);
  }

  // ============================================================
  // SAVE PROFILE
  // ============================================================

  async function handleSave() {
    if (!user?.id || !profile?.id) {
      setError("Your account information could not be verified.");
      return;
    }

    const cleanFullName = fullName.trim();
    const cleanUsername = username.trim().replace(/^@/, "");
    const cleanBio = bio.trim();

    if (!cleanFullName) {
      setError("Please enter your full name.");
      return;
    }

    if (!cleanUsername) {
      setError("Please enter a username.");
      return;
    }

    if (cleanUsername.length < 3 || cleanUsername.length > 30) {
      setError("Your username must contain between 3 and 30 characters.");
      return;
    }

    if (!/^[a-zA-Z0-9_.]+$/.test(cleanUsername)) {
      setError(
        "Your username can only contain letters, numbers, underscores, and periods."
      );
      return;
    }

    if (cleanBio.length > 300) {
      setError("Your bio cannot exceed 300 characters.");
      return;
    }

    setSaving(true);
    clearFeedback();

    try {
      const { data, error: updateError } = await supabase
        .from("profiles")
        .update({
          full_name: cleanFullName,
          username: cleanUsername,
          bio: cleanBio,
        })
        .eq("id", user.id)
        .select(PUBLIC_PROFILE_COLUMNS)
        .single();

      if (updateError) {
        if (updateError.code === "23505") {
          throw new Error(
            "This username is already taken. Please choose another one."
          );
        }

        throw updateError;
      }

      setProfile(data);

      setFullName(data.full_name || "");
      setUsername(data.username || "");
      setBio(data.bio || "");

      setIsEditing(false);
      setMessage("Your profile has been updated successfully.");
    } catch (err) {
      console.error("Error saving profile:", err);
      setError(err.message || "Unable to update your profile.");
    } finally {
      setSaving(false);
    }
  }

  // ============================================================
  // CHOOSE PROFILE PHOTO
  // ============================================================

  function handleChoosePhoto() {
    fileInputRef.current?.click();
  }

  // ============================================================
  // UPLOAD PROFILE PHOTO
  // ============================================================

  async function handlePhotoChange(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    clearFeedback();

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image.");
      event.target.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Your profile photo must not exceed 5 MB.");
      event.target.value = "";
      return;
    }

    if (!user?.id) {
      setError("You must be logged in to upload a profile photo.");
      event.target.value = "";
      return;
    }

    setUploadingPhoto(true);

    try {
      const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";

      const filePath = `${user.id}/avatar_${Date.now()}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("profile-media")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
          contentType: file.type,
        });

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from("profile-media")
        .getPublicUrl(filePath);

      const avatarUrl = publicUrlData.publicUrl;

      const { data, error: updateError } = await supabase
        .from("profiles")
        .update({
          avatar_url: avatarUrl,
        })
        .eq("id", user.id)
        .select(PUBLIC_PROFILE_COLUMNS)
        .single();

      if (updateError) throw updateError;

      setProfile(data);

      setMessage("Your profile photo has been updated successfully.");
    } catch (err) {
      console.error("Error uploading profile photo:", err);
      setError(err.message || "Unable to upload your profile photo.");
    } finally {
      setUploadingPhoto(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  // ============================================================
  // LOADING STATE
  // ============================================================

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2
            size={35}
            className="animate-spin text-[var(--accent-primary)]"
          />

          <p className="text-sm text-[var(--text-secondary)]">
            Loading your profile...
          </p>
        </div>
      </div>
    );
  }

  // ============================================================
  // PROFILE NOT FOUND
  // ============================================================

  if (!profile) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center px-5 text-center">
        <UserCircle
          size={55}
          className="text-[var(--text-secondary)]"
        />

        <h2 className="mt-4 text-xl font-bold text-[var(--text-primary)]">
          Profile unavailable
        </h2>

        <p className="mt-2 max-w-md text-sm text-[var(--text-secondary)]">
          We could not load your profile information. Please refresh
          the page or sign in again.
        </p>
      </div>
    );
  }

  // ============================================================
  // MAIN PROFILE PAGE
  // ============================================================

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 lg:py-8">
      <div className="space-y-6">

        {/* Page Header */}
        <ProfileHeader
          isEditing={isEditing}
          onEdit={handleEdit}
        />

        {/* Success and Error Messages */}
        <ProfileMessages
          message={message}
          error={error}
        />

        {/* Profile Information Card */}
        <section className="overflow-hidden rounded-3xl border border-[var(--border-color)] bg-[var(--surface)] shadow-sm">

          <div className="border-b border-[var(--border-color)] bg-[var(--page-bg-secondary)]/50 px-5 py-8 sm:px-8">
            <ProfileAvatar
              profile={profile}
              isEditing={isEditing}
              uploadingPhoto={uploadingPhoto}
              fileInputRef={fileInputRef}
              onChoosePhoto={handleChoosePhoto}
              onPhotoChange={handlePhotoChange}
            />
          </div>

          <div className="space-y-7 p-5 sm:p-8">

            <ProfileInformation
              fullName={fullName}
              setFullName={setFullName}
              username={username}
              setUsername={setUsername}
              bio={bio}
              setBio={setBio}
              userEmail={user?.email}
              isEditing={isEditing}
              saving={saving}
            />

            <ProfileActions
              isEditing={isEditing}
              saving={saving}
              uploadingPhoto={uploadingPhoto}
              onSave={handleSave}
              onCancel={handleCancel}
            />

          </div>
        </section>

        {/* School Information */}
        <ProfileSchool
          school={school}
          loadingSchool={loadingSchool}
        />

        {/* Account Role */}
        <ProfileRole role={profile.role} />

        {/* Privacy Information */}
        <ProfilePrivacyNote />

        {/* User's Own Posts */}
        <MyPosts userId={user?.id} />

      </div>
    </main>
  );
}