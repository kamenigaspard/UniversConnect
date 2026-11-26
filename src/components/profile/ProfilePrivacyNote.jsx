
import { ShieldCheck, Lock } from "lucide-react";

export default function ProfilePrivacyNote() {
  return (
    <div className="mt-6 rounded-2xl border border-[var(--border-color)] bg-[var(--page-bg-secondary)]/60 p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--surface)]">
          <ShieldCheck
            size={21}
            className="text-[var(--accent-primary)]"
          />
        </div>

        <div className="min-w-0">
          <h3 className="font-semibold text-[var(--text-primary)]">
            Your Privacy Matters
          </h3>

          <p className="mt-1 text-sm leading-relaxed text-[var(--text-secondary)]">
            Your account information is protected. Some details, such
            as your university role and assigned school, are managed
            by the university administration.
          </p>

          <div className="mt-3 flex items-center gap-2 text-xs text-[var(--text-secondary)]">
            <Lock size={14} />
            Your registered email is not publicly displayed.
          </div>
        </div>
      </div>
    </div>
  );
}
