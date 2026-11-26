
import { useCallback, useEffect, useState } from "react";
import {
  Flag,
  Clock,
  Eye,
  CheckCircle,
  XCircle,
  Search,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  X,
  User,
  MessageSquare,
  FileText,
  Image,
  ShieldCheck,
  AlertTriangle,
  Ban,
  CalendarDays,
} from "lucide-react";

import {
  getReports,
  getReportManagementStats,
  updateReportStatus,
} from "../../../services/superAdmin/reportService";

import { createBan } from "../../../services/superAdmin/banService";

const PAGE_SIZE = 20;

const initialStats = {
  total: 0,
  pending: 0,
  reviewing: 0,
  resolved: 0,
  dismissed: 0,
};

const statusLabels = {
  pending: "Pending",
  reviewing: "Reviewing",
  resolved: "Resolved",
  dismissed: "Dismissed",
};

const statusStyles = {
  pending: "bg-amber-100 text-amber-700",
  reviewing: "bg-blue-100 text-blue-700",
  resolved: "bg-green-100 text-green-700",
  dismissed: "bg-gray-100 text-gray-600",
};

const typeLabels = {
  user: "User",
  post: "Post",
  comment: "Comment",
  message: "Message",
};

const durationLabels = {
  "3_days": "3 Days",
  "7_days": "7 Days",
  "30_days": "30 Days",
};

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

function formatDateTime(value) {
  if (!value) return "—";

  return new Date(value).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function getInitials(name = "") {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function getReportType(report) {
  if (report.reported_user_id) return "user";
  if (report.post_id) return "post";
  if (report.comment_id) return "comment";
  if (report.message_id) return "message";

  return "unknown";
}

function getReportedContent(report) {
  const type = getReportType(report);

  if (type === "user") {
    return report.reported_user;
  }

  if (type === "post") {
    return report.reported_post;
  }

  if (type === "comment") {
    return report.reported_comment;
  }

  if (type === "message") {
    return report.reported_message;
  }

  return null;
}

function getTargetUser(report) {
  const type = getReportType(report);

  if (type === "user") {
    return report.reported_user;
  }

  if (type === "post") {
    return report.reported_post?.author;
  }

  if (type === "comment") {
    return report.reported_comment?.author;
  }

  if (type === "message") {
    return report.reported_message?.sender;
  }

  return null;
}

function getContentPreview(report) {
  const type = getReportType(report);
  const content = getReportedContent(report);

  if (type === "user") {
    return content?.full_name || "User profile";
  }

  if (type === "post") {
    return content?.content || "Post with media";
  }

  if (type === "comment") {
    return content?.content || "Comment";
  }

  if (type === "message") {
    return content?.content || "Message with media";
  }

  return "Unknown content";
}

// ============================================================
// REUSABLE COMPONENTS
// ============================================================

function StatCard({ title, value, icon: Icon, color, loading }) {
  return (
    <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-[var(--text-secondary)]">
            {title}
          </p>

          <p className="mt-2 text-2xl font-bold">
            {loading ? "—" : value.toLocaleString()}
          </p>
        </div>

        <div className={`rounded-xl p-3 ${color}`}>
          <Icon size={21} />
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
        statusStyles[status] || "bg-gray-100 text-gray-600"
      }`}
    >
      {statusLabels[status] || status}
    </span>
  );
}

function UserAvatar({ user, size = "h-10 w-10" }) {
  return (
    <div
      className={`flex ${size} shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--page-bg-secondary)] text-sm font-semibold text-[var(--text-primary)]`}
    >
      {user?.avatar_url ? (
        <img
          src={user.avatar_url}
          alt={user.full_name || "User"}
          className="h-full w-full object-cover"
        />
      ) : (
        getInitials(user?.full_name || user?.username || "U")
      )}
    </div>
  );
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function PlatformReports() {
  const [reports, setReports] = useState([]);
  const [stats, setStats] = useState(initialStats);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [type, setType] = useState("all");

  const [page, setPage] = useState(0);
  const [totalReports, setTotalReports] = useState(0);

  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);

  const [showBanModal, setShowBanModal] = useState(false);
  const [banTarget, setBanTarget] = useState(null);
  const [banDuration, setBanDuration] = useState("3_days");
  const [banReason, setBanReason] = useState("");
  const [creatingBan, setCreatingBan] = useState(false);

  // ==========================================================
  // LOAD REPORTS AND STATISTICS
  // ==========================================================

  const loadData = useCallback(async () => {
    setLoading(true);
    setStatsLoading(true);
    setError("");

    const [reportResult, statsResult] = await Promise.allSettled([
      getReports({
        search,
        status,
        type,
        page,
      }),
      getReportManagementStats(),
    ]);

    if (reportResult.status === "fulfilled") {
      setReports(reportResult.value.reports);
      setTotalReports(reportResult.value.total);
    } else {
      console.error("Report loading error:", reportResult.reason);
      setError("Unable to load platform reports.");
    }

    if (statsResult.status === "fulfilled") {
      setStats(statsResult.value);
    } else {
      console.error("Report statistics error:", statsResult.reason);
    }

    setLoading(false);
    setStatsLoading(false);
  }, [search, status, type, page]);

  // Debounce search and load reports
  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 300);

    return () => clearTimeout(timer);
  }, [loadData]);

  // ==========================================================
  // REFRESH
  // ==========================================================

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // ==========================================================
  // OPEN REPORT DETAILS
  // ==========================================================

  const openDetails = (report) => {
    setSelectedReport(report);
    setShowDetailsModal(true);
  };

  // ==========================================================
  // UPDATE REPORT STATUS
  // ==========================================================

  const handleStatusUpdate = async (report, newStatus) => {
    if (!report?.id || actionLoading) return;

    setActionLoading(report.id);
    setError("");
    setSuccess("");

    try {
      await updateReportStatus(report.id, newStatus);

      setSuccess(
        `Report successfully marked as ${statusLabels[newStatus].toLowerCase()}.`
      );

      setShowDetailsModal(false);
      setSelectedReport(null);

      await loadData();
    } catch (err) {
      console.error("Report status update error:", err);
      setError(err.message || "Unable to update this report.");
    } finally {
      setActionLoading("");
    }
  };

  // ==========================================================
  // OPEN BAN MODAL
  // ==========================================================

  const openBanModal = (report) => {
    const target = getTargetUser(report);

    if (!target?.id) {
      setError("Unable to identify the user responsible for this report.");
      return;
    }

    setBanTarget({
      user: target,
      report,
    });

    setBanDuration("3_days");
    setBanReason(
      `Reported for: ${report.reason || "Violation of platform rules"}`
    );

    setError("");
    setShowBanModal(true);
  };

  // ==========================================================
  // CREATE BAN FROM REPORT
  // ==========================================================

  const handleCreateBan = async (event) => {
    event.preventDefault();

    if (!banTarget?.user?.id) {
      setError("Invalid user selected.");
      return;
    }

    setCreatingBan(true);
    setError("");
    setSuccess("");

    try {
      await createBan({
        userId: banTarget.user.id,
        duration: banDuration,
        reason: banReason,
      });

      setSuccess(
        `A ${durationLabels[banDuration]} ban was created for ${
          banTarget.user.full_name || "the reported user"
        }.`
      );

      setShowBanModal(false);
      setShowDetailsModal(false);
      setBanTarget(null);
      setSelectedReport(null);
    } catch (err) {
      console.error("Report moderation ban error:", err);
      setError(err.message || "Unable to create the ban.");
    } finally {
      setCreatingBan(false);
    }
  };

  const totalPages = Math.ceil(totalReports / PAGE_SIZE);

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <div className="space-y-6">

      {/* NOTICES */}

      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-700">
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <p>{error}</p>

          <button
            type="button"
            onClick={() => setError("")}
            className="ml-auto"
            aria-label="Dismiss error"
          >
            <X size={17} />
          </button>
        </div>
      )}

      {success && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-green-300 bg-green-50 p-4 text-sm text-green-700">
          <div className="flex items-center gap-2">
            <CheckCircle size={18} />
            {success}
          </div>

          <button
            type="button"
            onClick={() => setSuccess("")}
            aria-label="Dismiss success message"
          >
            <X size={17} />
          </button>
        </div>
      )}

      {/* STATISTICS */}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total Reports"
          value={stats.total}
          icon={Flag}
          color="bg-purple-100 text-purple-700"
          loading={statsLoading}
        />

        <StatCard
          title="Pending Reports"
          value={stats.pending}
          icon={Clock}
          color="bg-amber-100 text-amber-700"
          loading={statsLoading}
        />

        <StatCard
          title="Under Review"
          value={stats.reviewing}
          icon={Eye}
          color="bg-blue-100 text-blue-700"
          loading={statsLoading}
        />

        <StatCard
          title="Resolved Reports"
          value={stats.resolved}
          icon={CheckCircle}
          color="bg-green-100 text-green-700"
          loading={statsLoading}
        />
      </div>

      {/* REPORT RECORDS */}

      <div className="overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--surface)]">

        {/* HEADER */}

        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border-color)] p-5">
          <div>
            <h2 className="text-lg font-semibold">
              Report Records
            </h2>

            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Review reports submitted across the platform.
            </p>
          </div>

          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing || loading}
            className="flex items-center gap-2 rounded-xl border border-[var(--border-color)] px-4 py-2.5 text-sm font-medium transition hover:bg-[var(--page-bg-secondary)] disabled:opacity-50"
          >
            <RefreshCw
              size={16}
              className={refreshing || loading ? "animate-spin" : ""}
            />
            Refresh
          </button>
        </div>

        {/* FILTERS */}

        <div className="grid grid-cols-1 gap-3 border-b border-[var(--border-color)] p-5 md:grid-cols-3">

          <div className="relative">
            <Search
              size={17}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]"
            />

            <input
              type="text"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(0);
              }}
              placeholder="Search reporter or reported user..."
              className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--page-bg)] py-2.5 pl-10 pr-4 text-sm outline-none focus:border-violet-500"
            />
          </div>

          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(0);
            }}
            className="rounded-xl border border-[var(--border-color)] bg-[var(--page-bg)] px-4 py-2.5 text-sm outline-none focus:border-violet-500"
          >
            <option value="all">All statuses</option>
            <option value="pending">Pending</option>
            <option value="reviewing">Reviewing</option>
            <option value="resolved">Resolved</option>
            <option value="dismissed">Dismissed</option>
          </select>

          <select
            value={type}
            onChange={(event) => {
              setType(event.target.value);
              setPage(0);
            }}
            className="rounded-xl border border-[var(--border-color)] bg-[var(--page-bg)] px-4 py-2.5 text-sm outline-none focus:border-violet-500"
          >
            <option value="all">All report types</option>
            <option value="user">User reports</option>
            <option value="post">Post reports</option>
            <option value="comment">Comment reports</option>
            <option value="message">Message reports</option>
          </select>
        </div>

        {/* TABLE */}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-left text-sm">

            <thead className="bg-[var(--page-bg-secondary)] text-xs uppercase text-[var(--text-secondary)]">
              <tr>
                <th className="px-5 py-4 font-semibold">Reporter</th>
                <th className="px-5 py-4 font-semibold">Report Type</th>
                <th className="px-5 py-4 font-semibold">Reported Content</th>
                <th className="px-5 py-4 font-semibold">Reason</th>
                <th className="px-5 py-4 font-semibold">Date</th>
                <th className="px-5 py-4 font-semibold">Status</th>
                <th className="px-5 py-4 text-right font-semibold">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-[var(--border-color)]">

              {loading ? (
                <tr>
                  <td colSpan="7" className="px-5 py-12 text-center">
                    <RefreshCw
                      size={22}
                      className="mx-auto animate-spin text-violet-600"
                    />

                    <p className="mt-3 text-[var(--text-secondary)]">
                      Loading reports...
                    </p>
                  </td>
                </tr>
              ) : reports.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-5 py-16 text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--page-bg-secondary)]">
                      <ShieldCheck
                        size={26}
                        className="text-[var(--text-secondary)]"
                      />
                    </div>

                    <h3 className="mt-4 font-semibold">
                      No reports found
                    </h3>

                    <p className="mt-1 text-sm text-[var(--text-secondary)]">
                      {search || status !== "all" || type !== "all"
                        ? "Try changing your search or filters."
                        : "There are currently no reports on the platform."}
                    </p>
                  </td>
                </tr>
              ) : (
                reports.map((report) => {
                  const reportType = getReportType(report);
                  const targetUser = getTargetUser(report);

                  return (
                    <tr
                      key={report.id}
                      className="transition hover:bg-[var(--page-bg-secondary)]/50"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <UserAvatar user={report.reporter} />

                          <div>
                            <p className="font-semibold">
                              {report.reporter?.full_name || "Unknown"}
                            </p>

                            <p className="text-xs text-[var(--text-secondary)]">
                              @{report.reporter?.username || "unknown"}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <span className="inline-flex rounded-lg bg-[var(--page-bg-secondary)] px-3 py-1.5 text-xs font-semibold">
                          {typeLabels[reportType] || "Unknown"}
                        </span>
                      </td>

                      <td className="max-w-[200px] px-5 py-4">
                        <p className="truncate font-medium">
                          {getContentPreview(report)}
                        </p>

                        <p className="mt-1 text-xs text-[var(--text-secondary)]">
                          {targetUser?.full_name || "Unknown user"}
                        </p>
                      </td>

                      <td className="max-w-[180px] px-5 py-4">
                        <p className="truncate text-[var(--text-secondary)]">
                          {report.reason}
                        </p>
                      </td>

                      <td className="whitespace-nowrap px-5 py-4">
                        {formatDate(report.created_at)}
                      </td>

                      <td className="px-5 py-4">
                        <StatusBadge status={report.status} />
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end">
                          <button
                            type="button"
                            onClick={() => openDetails(report)}
                            title="View report details"
                            className="rounded-lg border border-[var(--border-color)] p-2 transition hover:bg-[var(--page-bg-secondary)]"
                          >
                            <Eye size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}

            </tbody>
          </table>
        </div>

        {/* PAGINATION */}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-color)] p-5">
          <p className="text-sm text-[var(--text-secondary)]">
            Showing{" "}
            {totalReports === 0 ? 0 : page * PAGE_SIZE + 1}
            {" "}to{" "}
            {Math.min((page + 1) * PAGE_SIZE, totalReports)}
            {" "}of {totalReports} reports
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page === 0 || loading}
              onClick={() => setPage((current) => current - 1)}
              className="rounded-lg border border-[var(--border-color)] p-2 transition hover:bg-[var(--page-bg-secondary)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft size={18} />
            </button>

            <span className="px-2 text-sm">
              Page {totalPages === 0 ? 0 : page + 1} of {totalPages}
            </span>

            <button
              type="button"
              disabled={page + 1 >= totalPages || loading}
              onClick={() => setPage((current) => current + 1)}
              className="rounded-lg border border-[var(--border-color)] p-2 transition hover:bg-[var(--page-bg-secondary)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* =====================================================
          REPORT DETAILS MODAL
      ===================================================== */}

      {showDetailsModal && selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
          <div className="my-auto w-full max-w-2xl rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] shadow-2xl">

            <div className="flex items-center justify-between border-b border-[var(--border-color)] p-5">
              <div>
                <h2 className="text-lg font-bold">
                  Report Details
                </h2>

                <p className="mt-1 break-all text-xs text-[var(--text-secondary)]">
                  Report ID: {selectedReport.id}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowDetailsModal(false)}
                className="rounded-lg p-2 transition hover:bg-[var(--page-bg-secondary)]"
              >
                <X size={20} />
              </button>
            </div>

            <div className="max-h-[75vh] space-y-5 overflow-y-auto p-5">

              {/* STATUS */}

              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-[var(--text-secondary)]">
                    Current status
                  </p>

                  <div className="mt-2">
                    <StatusBadge status={selectedReport.status} />
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-sm text-[var(--text-secondary)]">
                    Submitted
                  </p>

                  <p className="mt-1 text-sm font-medium">
                    {formatDateTime(selectedReport.created_at)}
                  </p>
                </div>
              </div>

              {/* REPORTER */}

              <div>
                <p className="mb-3 text-sm font-semibold">
                  Reported by
                </p>

                <div className="flex items-center gap-3 rounded-xl bg-[var(--page-bg-secondary)] p-4">
                  <UserAvatar user={selectedReport.reporter} />

                  <div>
                    <p className="font-semibold">
                      {selectedReport.reporter?.full_name || "Unknown user"}
                    </p>

                    <p className="text-sm text-[var(--text-secondary)]">
                      @{selectedReport.reporter?.username || "unknown"}
                    </p>

                    <p className="text-xs text-[var(--text-secondary)]">
                      {selectedReport.reporter?.email || ""}
                    </p>
                  </div>
                </div>
              </div>

              {/* REPORTED USER */}

              <div>
                <p className="mb-3 text-sm font-semibold">
                  Reported account or content author
                </p>

                <div className="flex items-center gap-3 rounded-xl bg-[var(--page-bg-secondary)] p-4">
                  <UserAvatar user={getTargetUser(selectedReport)} />

                  <div>
                    <p className="font-semibold">
                      {getTargetUser(selectedReport)?.full_name || "Unknown user"}
                    </p>

                    <p className="text-sm text-[var(--text-secondary)]">
                      @{getTargetUser(selectedReport)?.username || "unknown"}
                    </p>

                    <p className="text-xs text-[var(--text-secondary)]">
                      {getTargetUser(selectedReport)?.email || ""}
                    </p>
                  </div>
                </div>
              </div>

              {/* REASON */}

              <div>
                <p className="mb-2 text-sm font-semibold">
                  Report reason
                </p>

                <div className="rounded-xl border border-[var(--border-color)] p-4">
                  <p className="font-medium">
                    {selectedReport.reason}
                  </p>

                  <p className="mt-2 whitespace-pre-wrap text-sm text-[var(--text-secondary)]">
                    {selectedReport.description || "No additional description provided."}
                  </p>
                </div>
              </div>

              {/* REPORTED CONTENT */}

              <div>
                <p className="mb-2 text-sm font-semibold">
                  Reported content
                </p>

                <div className="rounded-xl border border-[var(--border-color)] p-4">

                  <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
                    {getReportType(selectedReport) === "user" ? (
                      <User size={17} />
                    ) : getReportType(selectedReport) === "post" ? (
                      <FileText size={17} />
                    ) : getReportType(selectedReport) === "comment" ? (
                      <MessageSquare size={17} />
                    ) : (
                      <MessageSquare size={17} />
                    )}

                    {typeLabels[getReportType(selectedReport)] || "Unknown"}
                  </div>

                  {getReportType(selectedReport) === "user" ? (
                    <div className="text-sm text-[var(--text-secondary)]">
                      This report concerns the user's account and profile.
                    </div>
                  ) : (
                    <>
                      <p className="whitespace-pre-wrap break-words text-sm">
                        {getContentPreview(selectedReport)}
                      </p>

                      {getReportedContent(selectedReport)?.media_url && (
                        <div className="mt-3">
                          {getReportedContent(selectedReport)?.media_type?.startsWith("image") ? (
                            <img
                              src={getReportedContent(selectedReport).media_url}
                              alt="Reported content"
                              className="max-h-64 rounded-xl object-contain"
                            />
                          ) : (
                            <a
                              href={getReportedContent(selectedReport).media_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-2 text-sm font-medium text-violet-600 hover:underline"
                            >
                              <Image size={16} />
                              View reported media
                            </a>
                          )}
                        </div>
                      )}

                      {getReportedContent(selectedReport)?.is_deleted && (
                        <p className="mt-3 text-xs font-medium text-red-600">
                          This content has been deleted.
                        </p>
                      )}

                      <p className="mt-3 text-xs text-[var(--text-secondary)]">
                        Created: {formatDateTime(getReportedContent(selectedReport)?.created_at)}
                      </p>
                    </>
                  )}
                </div>
              </div>

              {/* REVIEW INFORMATION */}

              {selectedReport.reviewed_at && (
                <div className="rounded-xl bg-[var(--page-bg-secondary)] p-4">
                  <p className="text-sm font-semibold">
                    Review information
                  </p>

                  <p className="mt-2 text-sm text-[var(--text-secondary)]">
                    Reviewed by: {selectedReport.reviewer?.full_name || "Administrator"}
                  </p>

                  <p className="mt-1 text-sm text-[var(--text-secondary)]">
                    Reviewed at: {formatDateTime(selectedReport.reviewed_at)}
                  </p>
                </div>
              )}

              {/* MODERATION ACTIONS */}

              <div className="space-y-3 border-t border-[var(--border-color)] pt-5">
                <h3 className="font-semibold">
                  Report actions
                </h3>

                <div className="flex flex-wrap gap-2">

                  {selectedReport.status !== "reviewing" &&
                    selectedReport.status !== "resolved" &&
                    selectedReport.status !== "dismissed" && (
                      <button
                        type="button"
                        onClick={() =>
                          handleStatusUpdate(selectedReport, "reviewing")
                        }
                        disabled={actionLoading === selectedReport.id}
                        className="flex items-center gap-2 rounded-xl border border-blue-200 px-4 py-2.5 text-sm font-semibold text-blue-700 transition hover:bg-blue-50 disabled:opacity-50"
                      >
                        <Eye size={16} />
                        Mark Reviewing
                      </button>
                    )}

                  {selectedReport.status !== "resolved" && (
                    <button
                      type="button"
                      onClick={() =>
                        handleStatusUpdate(selectedReport, "resolved")
                      }
                      disabled={actionLoading === selectedReport.id}
                      className="flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700 disabled:opacity-50"
                    >
                      <CheckCircle size={16} />
                      Resolve
                    </button>
                  )}

                  {selectedReport.status !== "dismissed" && (
                    <button
                      type="button"
                      onClick={() =>
                        handleStatusUpdate(selectedReport, "dismissed")
                      }
                      disabled={actionLoading === selectedReport.id}
                      className="flex items-center gap-2 rounded-xl border border-[var(--border-color)] px-4 py-2.5 text-sm font-semibold transition hover:bg-[var(--page-bg-secondary)] disabled:opacity-50"
                    >
                      <XCircle size={16} />
                      Dismiss
                    </button>
                  )}

                  {getTargetUser(selectedReport)?.id && (
                    <button
                      type="button"
                      onClick={() => openBanModal(selectedReport)}
                      className="flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700"
                    >
                      <Ban size={16} />
                      Issue Ban
                    </button>
                  )}
                </div>

                {actionLoading === selectedReport.id && (
                  <p className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                    <RefreshCw size={15} className="animate-spin" />
                    Updating report...
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          ISSUE BAN MODAL
      ===================================================== */}

      {showBanModal && banTarget && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center overflow-y-auto bg-black/50 p-4">
          <div className="my-auto w-full max-w-lg rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] shadow-2xl">

            <div className="flex items-center justify-between border-b border-[var(--border-color)] p-5">
              <div>
                <h2 className="text-lg font-bold">
                  Issue a Ban
                </h2>

                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  Moderate the user associated with this report.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowBanModal(false)}
                className="rounded-lg p-2 transition hover:bg-[var(--page-bg-secondary)]"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateBan} className="space-y-5 p-5">

              <div className="flex items-center gap-3 rounded-xl bg-[var(--page-bg-secondary)] p-4">
                <UserAvatar user={banTarget.user} />

                <div>
                  <p className="font-semibold">
                    {banTarget.user.full_name || "Unknown user"}
                  </p>

                  <p className="text-sm text-[var(--text-secondary)]">
                    @{banTarget.user.username || "unknown"}
                  </p>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Ban duration
                </label>

                <select
                  value={banDuration}
                  onChange={(event) => setBanDuration(event.target.value)}
                  className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--page-bg)] px-4 py-3 text-sm outline-none focus:border-violet-500"
                >
                  <option value="3_days">3 Days</option>
                  <option value="7_days">7 Days</option>
                  <option value="30_days">30 Days</option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Reason for ban
                </label>

                <textarea
                  value={banReason}
                  onChange={(event) => setBanReason(event.target.value)}
                  rows={4}
                  required
                  placeholder="Explain why this user is being banned..."
                  className="w-full resize-none rounded-xl border border-[var(--border-color)] bg-[var(--page-bg)] p-3 text-sm outline-none focus:border-violet-500"
                />
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                <div className="flex items-start gap-2">
                  <AlertTriangle size={18} className="mt-0.5 shrink-0" />

                  <p>
                    This will create a temporary ban using your existing
                    Super Admin ban service. The ban operation also records
                    its administrative activity through that service.
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-[var(--border-color)] pt-4">
                <button
                  type="button"
                  onClick={() => setShowBanModal(false)}
                  disabled={creatingBan}
                  className="rounded-xl border border-[var(--border-color)] px-4 py-2.5 text-sm font-medium transition hover:bg-[var(--page-bg-secondary)]"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={creatingBan || !banReason.trim()}
                  className="flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {creatingBan && (
                    <RefreshCw size={16} className="animate-spin" />
                  )}

                  {creatingBan ? "Creating..." : "Confirm Ban"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
