
import { Check, Loader2, X } from "lucide-react";

export default function ProfileActions({
  isEditing,
  saving,
  uploadingPhoto,
  onSave,
  onCancel,
}) {
  if (!isEditing) return null;

  const isBusy = saving || uploadingPhoto;

  return (
    <div className="flex flex-col-reverse gap-3 border-t border-[var(--border-color)] pt-5 sm:flex-row sm:justify-end">
      <button
        type="button"
        onClick={onCancel}
        disabled={isBusy}
        className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--surface)] px-5 py-3 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-[var(--page-bg-secondary)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        <X size={17} />
        Cancel
      </button>

      <button
        type="button"
        onClick={onSave}
        disabled={isBusy}
        className="inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--accent-primary)] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {saving ? (
          <>
            <Loader2 size={17} className="animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <Check size={17} />
            Save Changes
          </>
        )}
      </button>
    </div>
  );
}
