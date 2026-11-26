import { Clock3, History, RefreshCw } from "lucide-react";

export default function PlatformActivity({
  activities,
  loading,
  error,
  onRetry,
}) {
  return (
    <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface)]">
      <div className="flex items-center justify-between border-b border-[var(--border-color)] p-5">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-violet-100 p-2 text-violet-600">
            <History size={20} />
          </div>

          <div>
            <h3 className="font-semibold">Recent Platform Activity</h3>
            <p className="text-xs text-[var(--text-secondary)]">
              Latest administrative actions
            </p>
          </div>
        </div>

        {error && (
          <button
            type="button"
            onClick={onRetry}
            className="rounded-lg p-2 text-violet-600 hover:bg-violet-100"
            aria-label="Retry loading activity"
          >
            <RefreshCw size={18} />
          </button>
        )}
      </div>

      <div className="p-5">
        {loading ? (
          <p className="text-sm text-[var(--text-secondary)]">
            Loading platform activity...
          </p>
        ) : error ? (
          <p className="text-sm text-red-500">
            Unable to load recent activity.
          </p>
        ) : activities.length === 0 ? (
          <p className="text-sm text-[var(--text-secondary)]">
            No administrative activity has been recorded yet.
          </p>
        ) : (
          <div className="space-y-5">
            {activities.map((activity) => (
              <div key={activity.id} className="flex gap-3">
                <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-100 text-violet-600">
                  <Clock3 size={17} />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="break-words text-sm font-medium text-[var(--text-primary)]">
                    {activity.action || "Administrative action"}
                  </p>

                  <p className="mt-1 text-xs text-[var(--text-secondary)]">
                    Actor:{" "}
                    {activity.actor_id
                      ? `${activity.actor_id.slice(0, 8)}...`
                      : "System"}
                  </p>

                  <p className="mt-1 text-xs text-[var(--text-secondary)]">
                    {activity.created_at
                      ? new Date(activity.created_at).toLocaleString()
                      : "Date unavailable"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}