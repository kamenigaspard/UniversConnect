
import { Pencil } from "lucide-react";

export default function ProfileHeader({ isEditing, onEdit }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          My Profile
        </h1>

        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Manage your personal information and profile settings.
        </p>
      </div>

      {!isEditing && (
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex items-center gap-2 rounded-xl bg-[var(--accent-primary)] px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
        >
          <Pencil size={16} />
          <span>Edit Profile</span>
        </button>
      )}
    </div>
  );
}
