
import { useAuth } from "../contexts/AuthContext";

export default function AccountBanned() {
  const { ban, signOut } = useAuth();

  const formatDate = (date) => {
    if (!date) return "Not available";

    return new Date(date).toLocaleString(undefined, {
      dateStyle: "long",
      timeStyle: "short",
    });
  };

  const durationLabels = {
    "3_days": "3 days",
    "7_days": "7 days",
    "30_days": "30 days",
  };

  const handleSignOut = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error("Sign out failed:", error);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--page-bg)] px-4 py-10">
      <div className="w-full max-w-lg rounded-3xl border border-[var(--border-color)] bg-[var(--surface)] p-7 shadow-xl sm:p-10">

        {/* ICON */}
        <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-100 text-4xl">
          🚫
        </div>

        {/* HEADING */}
        <div className="mt-6 text-center">
          <h1 className="text-2xl font-bold text-[var(--text-primary)] sm:text-3xl">
            Account temporarily suspended
          </h1>

          <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
            Your access to the university social platform
            has been temporarily suspended by an administrator.
          </p>
        </div>

        {/* BAN DETAILS */}
        {ban ? (
          <div className="mt-8 space-y-4 rounded-2xl border border-red-200 bg-red-50/70 p-5">

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-red-600">
                Suspension duration
              </p>

              <p className="mt-1 font-semibold text-gray-900">
                {durationLabels[ban.duration] || ban.duration}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-red-600">
                Reason
              </p>

              <p className="mt-1 text-sm text-gray-800">
                {ban.reason || "No specific reason was provided."}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-red-600">
                Suspension started
              </p>

              <p className="mt-1 text-sm text-gray-800">
                {formatDate(ban.starts_at)}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-red-600">
                Suspension ends
              </p>

              <p className="mt-1 font-semibold text-gray-900">
                {formatDate(ban.ends_at)}
              </p>
            </div>
          </div>
        ) : (
          <div className="mt-8 rounded-xl bg-[var(--page-bg-secondary)] p-4 text-center text-sm text-[var(--text-secondary)]">
            Suspension details are currently unavailable.
          </div>
        )}

        {/* INFORMATION */}
        <p className="mt-6 text-center text-sm leading-6 text-[var(--text-secondary)]">
          If you believe this suspension was made in error,
          please contact your university administrator.
          Your access will be restored after the suspension
          expires, provided it has not been extended.
        </p>

        {/* SIGN OUT */}
        <button
          type="button"
          onClick={handleSignOut}
          className="mt-8 w-full rounded-xl bg-purple-600 px-5 py-3.5 font-semibold text-white transition hover:bg-purple-700"
        >
          Sign out
        </button>

      </div>
    </div>
  );
}
