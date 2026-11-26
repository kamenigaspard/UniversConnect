
import { useCallback, useEffect, useState } from "react";

import {
  Activity,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  FileText,
  RefreshCw,
  Search,
  ShieldCheck,
  User,
  X,
} from "lucide-react";

import {
  getAuditLogs,
  getAuditLogStats,
  getAuditLogFilters,
} from "../../../services/superAdmin/auditService";

// ============================================================
// HELPERS
// ============================================================

function formatDate(value) {
  if (!value) return "—";

  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatTime(value) {
  if (!value) return "—";

  return new Date(value).toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatAction(action = "") {
  return action
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getInitials(name = "") {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0])
      .join("")
      .toUpperCase() || "?"
  );
}

function getActorName(actor) {
  return (
    actor?.full_name ||
    actor?.username ||
    actor?.email ||
    "System / Unknown"
  );
}

function getTargetName(user) {
  return (
    user?.full_name ||
    user?.username ||
    user?.email ||
    "No target user"
  );
}

function getActionStyle(action = "") {
  const value = action.toLowerCase();

  if (
    value.includes("delete") ||
    value.includes("ban") ||
    value.includes("remove") ||
    value.includes("reject")
  ) {
    return "bg-red-50 text-red-700 dark:bg-red-500/10 dark:text-red-400";
  }

  if (
    value.includes("create") ||
    value.includes("insert") ||
    value.includes("add") ||
    value.includes("approve")
  ) {
    return "bg-green-50 text-green-700 dark:bg-green-500/10 dark:text-green-400";
  }

  if (
    value.includes("update") ||
    value.includes("edit") ||
    value.includes("resolve")
  ) {
    return "bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400";
  }

  return "bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400";
}

// ============================================================
// STAT CARD
// ============================================================

function StatCard({ title, value, description, icon: Icon }) {
  return (
    <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-[var(--text-secondary)]">
            {title}
          </p>

          <h3 className="mt-2 text-2xl font-bold text-[var(--text-primary)]">
            {value}
          </h3>

          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            {description}
          </p>
        </div>

        <div className="rounded-xl bg-purple-100 p-3 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400">
          <Icon size={22} />
        </div>
      </div>
    </div>
  );
}

// ============================================================
// USER AVATAR
// ============================================================

function UserAvatar({ user }) {
  if (user?.avatar_url) {
    return (
      <img
        src={user.avatar_url}
        alt=""
        className="h-9 w-9 rounded-full object-cover"
      />
    );
  }

  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-purple-100 text-xs font-bold text-purple-700 dark:bg-purple-500/10 dark:text-purple-400">
      {getInitials(
        user?.full_name || user?.username || "?"
      )}
    </div>
  );
}

// ============================================================
// DETAILS MODAL
// ============================================================

function AuditDetailsModal({ log, onClose }) {
  if (!log) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="sticky top-0 flex items-center justify-between border-b border-[var(--border-color)] bg-[var(--surface)] p-5">
          <div>
            <h2 className="text-lg font-bold text-[var(--text-primary)]">
              Audit Log Details
            </h2>

            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Complete information about this activity
            </p>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-2 text-[var(--text-secondary)] hover:bg-[var(--page-bg-secondary)]"
          >
            <X size={20} />
          </button>
        </div>

        <div className="space-y-5 p-5">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
              Action
            </p>

            <span
              className={`inline-flex rounded-full px-3 py-1.5 text-sm font-semibold ${getActionStyle(
                log.action
              )}`}
            >
              {formatAction(log.action)}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="rounded-xl bg-[var(--page-bg-secondary)] p-4">
              <p className="text-xs text-[var(--text-secondary)]">
                Actor
              </p>

              <div className="mt-3 flex items-center gap-3">
                <UserAvatar user={log.actor} />

                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
                    {getActorName(log.actor)}
                  </p>

                  <p className="text-xs text-[var(--text-secondary)]">
                    {log.actor?.role || "Unknown role"}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-[var(--page-bg-secondary)] p-4">
              <p className="text-xs text-[var(--text-secondary)]">
                Affected user
              </p>

              <div className="mt-3 flex items-center gap-3">
                {log.target_user ? (
                  <UserAvatar user={log.target_user} />
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300">
                    <User size={17} />
                  </div>
                )}

                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[var(--text-primary)]">
                    {getTargetName(log.target_user)}
                  </p>

                  <p className="text-xs text-[var(--text-secondary)]">
                    {log.target_user?.role || "—"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs text-[var(--text-secondary)]">
                Target table
              </p>

              <p className="mt-1 font-medium text-[var(--text-primary)]">
                {log.target_table || "—"}
              </p>
            </div>

            <div>
              <p className="text-xs text-[var(--text-secondary)]">
                Target record ID
              </p>

              <p className="mt-1 break-all font-mono text-xs text-[var(--text-primary)]">
                {log.target_id || "—"}
              </p>
            </div>

            <div>
              <p className="text-xs text-[var(--text-secondary)]">
                Activity date
              </p>

              <p className="mt-1 font-medium text-[var(--text-primary)]">
                {formatDate(log.created_at)}
              </p>
            </div>

            <div>
              <p className="text-xs text-[var(--text-secondary)]">
                Activity time
              </p>

              <p className="mt-1 font-medium text-[var(--text-primary)]">
                {formatTime(log.created_at)}
              </p>
            </div>
          </div>

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
              Metadata
            </p>

            <pre className="overflow-x-auto rounded-xl bg-gray-950 p-4 text-xs leading-6 text-green-300">
              {JSON.stringify(log.metadata ?? {}, null, 2)}
            </pre>
          </div>

          <div>
            <p className="text-xs text-[var(--text-secondary)]">
              Audit Log ID
            </p>

            <p className="mt-1 break-all font-mono text-xs text-[var(--text-primary)]">
              {log.id}
            </p>
          </div>
        </div>

        <div className="border-t border-[var(--border-color)] p-5">
          <button
            onClick={onClose}
            className="w-full rounded-xl bg-purple-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-purple-700"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MAIN AUDIT LOGS COMPONENT
// ============================================================

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    today: 0,
    actionTypes: 0,
  });

  const [filters, setFilters] = useState({
    actions: [],
    targetTables: [],
  });

  const [search, setSearch] = useState("");
  const [action, setAction] = useState("all");
  const [targetTable, setTargetTable] = useState("all");

  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [selectedLog, setSelectedLog] = useState(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  // ==========================================================
  // LOAD DATA
  // ==========================================================

  const loadData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const [
        logsResult,
        statsResult,
        filtersResult,
      ] = await Promise.all([
        getAuditLogs({
          search,
          action,
          targetTable,
          page,
        }),
        getAuditLogStats(),
        getAuditLogFilters(),
      ]);

      setLogs(logsResult.logs);
      setTotal(logsResult.total);
      setStats(statsResult);
      setFilters(filtersResult);
    } catch (err) {
      console.error("Error loading audit logs:", err);

      setError(
        err?.message || "Failed to load audit logs."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search, action, targetTable, page]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ==========================================================
  // SEARCH
  // ==========================================================

  const handleSearch = (value) => {
    setSearch(value);
    setPage(0);
  };

  const handleActionChange = (value) => {
    setAction(value);
    setPage(0);
  };

  const handleTableChange = (value) => {
    setTargetTable(value);
    setPage(0);
  };

  // ==========================================================
  // PAGINATION
  // ==========================================================

  const totalPages = Math.max(
    1,
    Math.ceil(total / 20)
  );

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="space-y-6">
      {/* HEADER */}

      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="flex items-center gap-2">
            <div className="rounded-xl bg-purple-100 p-2 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400">
              <ShieldCheck size={23} />
            </div>

            <h1 className="text-2xl font-bold text-[var(--text-primary)]">
              Audit Logs
            </h1>
          </div>

          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Monitor and review administrative activities across the platform.
          </p>
        </div>

        <button
          onClick={() => loadData(true)}
          disabled={refreshing}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--surface)] px-4 py-2.5 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-[var(--page-bg-secondary)] disabled:opacity-60"
        >
          <RefreshCw
            size={16}
            className={refreshing ? "animate-spin" : ""}
          />

          Refresh
        </button>
      </div>

      {/* STATISTICS */}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          title="Total Activities"
          value={stats.total.toLocaleString()}
          description="Recorded platform activities"
          icon={Activity}
        />

        <StatCard
          title="Today's Activities"
          value={stats.today.toLocaleString()}
          description="Activities recorded today"
          icon={CalendarDays}
        />

        <StatCard
          title="Action Types"
          value={stats.actionTypes.toLocaleString()}
          description="Different recorded action names"
          icon={FileText}
        />
      </div>

      {/* FILTERS */}

      <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className="relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]"
            />

            <input
              type="text"
              value={search}
              onChange={(event) =>
                handleSearch(event.target.value)
              }
              placeholder="Search activities or users..."
              className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--page-bg)] py-3 pl-10 pr-4 text-sm text-[var(--text-primary)] outline-none transition focus:border-purple-500"
            />
          </div>

          <select
            value={action}
            onChange={(event) =>
              handleActionChange(event.target.value)
            }
            className="rounded-xl border border-[var(--border-color)] bg-[var(--page-bg)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-purple-500"
          >
            <option value="all">All Actions</option>

            {filters.actions.map((item) => (
              <option key={item} value={item}>
                {formatAction(item)}
              </option>
            ))}
          </select>

          <select
            value={targetTable}
            onChange={(event) =>
              handleTableChange(event.target.value)
            }
            className="rounded-xl border border-[var(--border-color)] bg-[var(--page-bg)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-purple-500"
          >
            <option value="all">All Target Tables</option>

            {filters.targetTables.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ERROR */}

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
          {error}
        </div>
      )}

      {/* AUDIT LOG TABLE */}

      <div className="overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--surface)]">
        <div className="flex items-center justify-between border-b border-[var(--border-color)] p-5">
          <div>
            <h2 className="font-bold text-[var(--text-primary)]">
              Activity History
            </h2>

            <p className="mt-1 text-xs text-[var(--text-secondary)]">
              {total.toLocaleString()} recorded activities
            </p>
          </div>

          <Clock
            size={20}
            className="text-[var(--text-secondary)]"
          />
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <RefreshCw
              size={25}
              className="animate-spin text-purple-600"
            />

            <p className="mt-3 text-sm text-[var(--text-secondary)]">
              Loading audit logs...
            </p>
          </div>
        ) : logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-5 py-16 text-center">
            <div className="rounded-full bg-[var(--page-bg-secondary)] p-4">
              <Activity
                size={28}
                className="text-[var(--text-secondary)]"
              />
            </div>

            <h3 className="mt-4 font-semibold text-[var(--text-primary)]">
              No audit logs found
            </h3>

            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              No activities match your current search or filters.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left">
                <thead className="bg-[var(--page-bg-secondary)]">
                  <tr className="text-xs font-semibold uppercase tracking-wide text-[var(--text-secondary)]">
                    <th className="px-5 py-4">Actor</th>
                    <th className="px-5 py-4">Action</th>
                    <th className="px-5 py-4">Affected User</th>
                    <th className="px-5 py-4">Target</th>
                    <th className="px-5 py-4">Date & Time</th>
                    <th className="px-5 py-4 text-right">Details</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[var(--border-color)]">
                  {logs.map((log) => (
                    <tr
                      key={log.id}
                      className="transition hover:bg-[var(--page-bg-secondary)]"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <UserAvatar user={log.actor} />

                          <div className="min-w-0">
                            <p className="max-w-[150px] truncate text-sm font-semibold text-[var(--text-primary)]">
                              {getActorName(log.actor)}
                            </p>

                            <p className="text-xs text-[var(--text-secondary)]">
                              {log.actor?.role || "Unknown role"}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${getActionStyle(
                            log.action
                          )}`}
                        >
                          {formatAction(log.action)}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <p className="max-w-[150px] truncate text-sm text-[var(--text-primary)]">
                          {getTargetName(log.target_user)}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <p className="text-sm font-medium text-[var(--text-primary)]">
                          {log.target_table || "—"}
                        </p>

                        <p className="mt-1 max-w-[130px] truncate font-mono text-xs text-[var(--text-secondary)]">
                          {log.target_id || "—"}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <p className="whitespace-nowrap text-sm text-[var(--text-primary)]">
                          {formatDate(log.created_at)}
                        </p>

                        <p className="mt-1 text-xs text-[var(--text-secondary)]">
                          {formatTime(log.created_at)}
                        </p>
                      </td>

                      <td className="px-5 py-4 text-right">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="inline-flex items-center gap-2 rounded-lg border border-[var(--border-color)] px-3 py-2 text-xs font-semibold text-[var(--text-primary)] transition hover:border-purple-400 hover:text-purple-600"
                        >
                          <Eye size={15} />
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* PAGINATION */}

            <div className="flex flex-col justify-between gap-3 border-t border-[var(--border-color)] px-5 py-4 sm:flex-row sm:items-center">
              <p className="text-sm text-[var(--text-secondary)]">
                Page {page + 1} of {totalPages}
              </p>

              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    setPage((current) =>
                      Math.max(0, current - 1)
                    )
                  }
                  disabled={page === 0}
                  className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-color)] px-3 py-2 text-sm text-[var(--text-primary)] transition hover:bg-[var(--page-bg-secondary)] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft size={16} />
                  Previous
                </button>

                <button
                  onClick={() =>
                    setPage((current) =>
                      Math.min(totalPages - 1, current + 1)
                    )
                  }
                  disabled={page >= totalPages - 1}
                  className="inline-flex items-center gap-1 rounded-lg border border-[var(--border-color)] px-3 py-2 text-sm text-[var(--text-primary)] transition hover:bg-[var(--page-bg-secondary)] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* DETAILS MODAL */}

      {selectedLog && (
        <AuditDetailsModal
          log={selectedLog}
          onClose={() => setSelectedLog(null)}
        />
      )}
    </div>
  );
}
