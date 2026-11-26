
import { Camera, Loader2, User } from "lucide-react";

export default function ProfileAvatar({
  profile,
  isEditing,
  uploadingPhoto,
  fileInputRef,
  onChoosePhoto,
  onPhotoChange,
}) {
  const avatarUrl = profile?.avatar_url;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-4 border-[var(--surface)] bg-[var(--page-bg-secondary)] shadow-lg">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="Profile"
              className="h-full w-full object-cover"
            />
          ) : (
            <User
              size={48}
              className="text-[var(--text-secondary)]"
            />
          )}
        </div>

        {isEditing && (
          <button
            type="button"
            onClick={onChoosePhoto}
            disabled={uploadingPhoto}
            className="absolute bottom-1 right-1 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--accent-primary)] text-white shadow-md transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            aria-label="Change profile photo"
          >
            {uploadingPhoto ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Camera size={18} />
            )}
          </button>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onPhotoChange}
          disabled={!isEditing || uploadingPhoto}
        />
      </div>

      <div className="text-center">
        <p className="font-semibold text-[var(--text-primary)]">
          {profile?.full_name || "Your Name"}
        </p>

        {profile?.username && (
          <p className="text-sm text-[var(--text-secondary)]">
            @{profile.username}
          </p>
        )}

        {isEditing && (
          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            Click the camera icon to change your photo.
          </p>
        )}
      </div>
    </div>
  );
}
