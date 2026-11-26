
import { Mail, User, AtSign, FileText } from "lucide-react";

export default function ProfileInformation({
  fullName,
  setFullName,
  username,
  setUsername,
  bio,
  setBio,
  userEmail,
  isEditing,
  saving,
}) {
  const inputClass =
    "w-full rounded-xl border border-[var(--border-color)] bg-[var(--surface)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--accent-primary)] focus:ring-2 focus:ring-[var(--accent-primary)]/20 disabled:cursor-not-allowed disabled:opacity-70";

  const labelClass =
    "mb-2 block text-sm font-medium text-[var(--text-primary)]";

  return (
    <div className="space-y-5">
      {/* Full Name */}
      <div>
        <label className={labelClass}>
          <span className="inline-flex items-center gap-2">
            <User size={16} />
            Full Name
          </span>
        </label>

        <input
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          disabled={!isEditing || saving}
          placeholder="Enter your full name"
          className={inputClass}
        />
      </div>

      {/* Username */}
      <div>
        <label className={labelClass}>
          <span className="inline-flex items-center gap-2">
            <AtSign size={16} />
            Username
          </span>
        </label>

        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          disabled={!isEditing || saving}
          placeholder="Enter your username"
          className={inputClass}
        />

        <p className="mt-1 text-xs text-[var(--text-secondary)]">
          Your username helps other students find your profile.
        </p>
      </div>

      {/* Email */}
      <div>
        <label className={labelClass}>
          <span className="inline-flex items-center gap-2">
            <Mail size={16} />
            Email Address
          </span>
        </label>

        <input
          type="email"
          value={userEmail || ""}
          disabled
          className={inputClass}
        />

        <p className="mt-1 text-xs text-[var(--text-secondary)]">
          Your registered email address cannot be changed here.
        </p>
      </div>

      {/* Bio */}
      <div>
        <label className={labelClass}>
          <span className="inline-flex items-center gap-2">
            <FileText size={16} />
            Bio
          </span>
        </label>

        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          disabled={!isEditing || saving}
          placeholder="Tell the university community a little about yourself..."
          rows={4}
          maxLength={300}
          className={`${inputClass} resize-none`}
        />

        <div className="mt-1 text-right text-xs text-[var(--text-secondary)]">
          {bio.length}/300 characters
        </div>
      </div>
    </div>
  );
}
