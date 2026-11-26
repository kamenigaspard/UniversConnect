
import { Loader2, School, AlertCircle } from "lucide-react";

export default function ProfileSchool({ school, loadingSchool }) {
  return (
    <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] p-5">
      <div className="mb-4 flex items-center gap-2">
        <School
          size={20}
          className="text-[var(--accent-primary)]"
        />

        <h3 className="font-semibold text-[var(--text-primary)]">
          My School
        </h3>
      </div>

      {loadingSchool ? (
        <div className="flex items-center gap-2 py-3 text-sm text-[var(--text-secondary)]">
          <Loader2 size={18} className="animate-spin" />
          Loading school information...
        </div>
      ) : school ? (
        <div className="flex items-center gap-4">
          {school.logo_url ? (
            <img
              src={school.logo_url}
              alt={`${school.name} logo`}
              className="h-14 w-14 rounded-xl border border-[var(--border-color)] bg-white object-contain p-1"
            />
          ) : (
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[var(--page-bg-secondary)]">
              <School
                size={26}
                className="text-[var(--accent-primary)]"
              />
            </div>
          )}

          <div className="min-w-0">
            <p className="font-semibold text-[var(--text-primary)]">
              {school.name}
            </p>

            {school.code && (
              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                School Code: {school.code}
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="flex items-start gap-2 rounded-xl bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-400">
          <AlertCircle size={18} className="mt-0.5 shrink-0" />

          <p>
            Your account has not been assigned to an active school.
            Please contact your university administrator.
          </p>
        </div>
      )}
    </section>
  );
}