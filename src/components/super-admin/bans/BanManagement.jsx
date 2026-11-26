
import { useCallback, useEffect, useState } from "react";
import {
  Ban,
  Clock,
  CheckCircle,
  History,
  Search,
  RefreshCw,
  Plus,
  ChevronLeft,
  ChevronRight,
  X,
  User,
  CalendarDays,
  ShieldCheck,
  AlertTriangle,
  Eye,
  Unlock,
} from "lucide-react";

import {
  getBans,
  getBanManagementStats,
  getUsersForBan,
  createBan,
  liftBan,
} from "../../../services/superAdmin/banService";

const PAGE_SIZE = 20;

const initialStats = {
  total: 0,
  active: 0,
  scheduled: 0,
  expired: 0,
  lifted: 0,
};

const durationLabels = {
  "3_days": "3 Days",
  "7_days": "7 Days",
  "30_days": "30 Days",
};

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

function getBanStatus(ban) {
  if (!ban.is_active) return "lifted";

  const now = new Date();
  const start = new Date(ban.starts_at);
  const end = new Date(ban.ends_at);

  if (start > now) return "scheduled";
  if (end <= now) return "expired";

  return "active";
}

function StatusBadge({ status }) {
  const styles = {
    active: "bg-red-100 text-red-700",
    scheduled: "bg-blue-100 text-blue-700",
    expired: "bg-gray-100 text-gray-600",
    lifted: "bg-green-100 text-green-700",
  };

  const labels = {
    active: "Active",
    scheduled: "Scheduled",
    expired: "Expired",
    lifted: "Lifted",
  };

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
        styles[status] || styles.expired
      }`}
    >
      {labels[status] || status}
    </span>
  );
}

function StatCard({ title, value, icon: Icon, color, loading }) {
  return (
    <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-[var(--text-secondary)]">{title}</p>

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

function UserAvatar({ user }) {
  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--page-bg-secondary)] text-sm font-semibold text-[var(--text-primary)]">
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

export default function BanManagement() {
  const [bans, setBans] = useState([]);
  const [stats, setStats] = useState(initialStats);

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [duration, setDuration] = useState("all");

  const [page, setPage] = useState(0);
  const [totalBans, setTotalBans] = useState(0);

  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState("");

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showBanModal, setShowBanModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedBan, setSelectedBan] = useState(null);

  const [userSearch, setUserSearch] = useState("");
  const [users, setUsers] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [banDuration, setBanDuration] = useState("3_days");
  const [banReason, setBanReason] = useState("");
  const [usersLoading, setUsersLoading] = useState(false);
  const [creatingBan, setCreatingBan] = useState(false);

  // ==========================================================
  // LOAD BAN RECORDS AND STATISTICS
  // ==========================================================

  const loadData = useCallback(async () => {
    setLoading(true);
    setStatsLoading(true);
    setError("");

    const [banResult, statsResult] = await Promise.allSettled([
      getBans({
        search,
        status,
        duration,
        page,
      }),
      getBanManagementStats(),
    ]);

    if (banResult.status === "fulfilled") {
      setBans(banResult.value.bans);
      setTotalBans(banResult.value.total);
    } else {
      console.error("Ban loading error:", banResult.reason);
      setError("Unable to load ban records.");
    }

    if (statsResult.status === "fulfilled") {
      setStats(statsResult.value);
    } else {
      console.error("Ban statistics error:", statsResult.reason);
    }

    setLoading(false);
    setStatsLoading(false);
  }, [search, status, duration, page]);

  // Debounce search and load records
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
  // OPEN BAN MODAL
  // ==========================================================

  const openBanModal = () => {
    setSelectedUserId("");
    setUserSearch("");
    setBanDuration("3_days");
    setBanReason("");
    setUsers([]);
    setError("");
    setShowBanModal(true);
  };

  // ==========================================================
  // SEARCH USERS FOR BAN
  // ==========================================================

  useEffect(() => {
    if (!showBanModal) return;

    let cancelled = false;

    const timer = setTimeout(async () => {
      setUsersLoading(true);

      try {
        const result = await getUsersForBan({
          search: userSearch,
        });

        if (!cancelled) {
          setUsers(result);
        }
      } catch (err) {
        console.error("User search error:", err);

        if (!cancelled) {
          setError("Unable to search for users.");
        }
      } finally {
        if (!cancelled) {
          setUsersLoading(false);
        }
      }
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [showBanModal, userSearch]);

  // ==========================================================
  // CREATE BAN
  // ==========================================================

  const handleCreateBan = async (event) => {
    event.preventDefault();

    if (!selectedUserId) {
      setError("Please select a user.");
      return;
    }

    setCreatingBan(true);
    setError("");
    setSuccess("");

    try {
      await createBan({
        userId: selectedUserId,
        duration: banDuration,
        reason: banReason,
      });

      setShowBanModal(false);
      setSuccess("Ban created successfully.");

      await loadData();
    } catch (err) {
      console.error("Create ban error:", err);
      setError(err.message || "Unable to create the ban.");
    } finally {
      setCreatingBan(false);
    }
  };

  // ==========================================================
  // LIFT BAN
  // ==========================================================

  const handleLiftBan = async (ban) => {
    const userName = ban.user?.full_name || "this user";

    const confirmed = window.confirm(
      `Are you sure you want to lift the ban for ${userName}?`
    );

    if (!confirmed) return;

    setActionLoading(ban.id);
    setError("");
    setSuccess("");

    try {
      await liftBan(ban.id);

      setSuccess(`The ban for ${userName} has been lifted.`);

      if (selectedBan?.id === ban.id) {
        setSelectedBan({
          ...ban,
          is_active: false,
        });
      }

      await loadData();
    } catch (err) {
      console.error("Lift ban error:", err);
      setError(err.message || "Unable to lift this ban.");
    } finally {
      setActionLoading("");
    }
  };

  // ==========================================================
  // OPEN DETAILS
  // ==========================================================

  const openDetails = (ban) => {
    setSelectedBan(ban);
    setShowDetailsModal(true);
  };

  const totalPages = Math.ceil(totalBans / PAGE_SIZE);

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
          title="Total Bans"
          value={stats.total}
          icon={History}
          color="bg-purple-100 text-purple-700"
          loading={statsLoading}
        />

        <StatCard
          title="Active Bans"
          value={stats.active}
          icon={Ban}
          color="bg-red-100 text-red-700"
          loading={statsLoading}
        />

        <StatCard
          title="Expired Bans"
          value={stats.expired}
          icon={Clock}
          color="bg-gray-100 text-gray-700"
          loading={statsLoading}
        />

        <StatCard
          title="Lifted Bans"
          value={stats.lifted}
          icon={CheckCircle}
          color="bg-green-100 text-green-700"
          loading={statsLoading}
        />
      </div>

      {/* BAN RECORDS */}

      <div className="overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--surface)]">

        {/* HEADER */}

        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border-color)] p-5">
          <div>
            <h2 className="text-lg font-semibold">Ban Records</h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Review and manage platform-wide user bans.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
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

            <button
              type="button"
              onClick={openBanModal}
              className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700"
            >
              <Plus size={17} />
              Issue Ban
            </button>
          </div>
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
              placeholder="Search users..."
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
            <option value="active">Active</option>
            <option value="scheduled">Scheduled</option>
            <option value="expired">Expired</option>
            <option value="lifted">Lifted</option>
          </select>

          <select
            value={duration}
            onChange={(event) => {
              setDuration(event.target.value);
              setPage(0);
            }}
            className="rounded-xl border border-[var(--border-color)] bg-[var(--page-bg)] px-4 py-2.5 text-sm outline-none focus:border-violet-500"
          >
            <option value="all">All durations</option>
            <option value="3_days">3 Days</option>
            <option value="7_days">7 Days</option>
            <option value="30_days">30 Days</option>
          </select>
        </div>

        {/* TABLE */}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[950px] text-left text-sm">

            <thead className="bg-[var(--page-bg-secondary)] text-xs uppercase text-[var(--text-secondary)]">
              <tr>
                <th className="px-5 py-4 font-semibold">User</th>
                <th className="px-5 py-4 font-semibold">Duration</th>
                <th className="px-5 py-4 font-semibold">Reason</th>
                <th className="px-5 py-4 font-semibold">Issued By</th>
                <th className="px-5 py-4 font-semibold">Expires</th>
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
                      Loading ban records...
                    </p>
                  </td>
                </tr>
              ) : bans.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-5 py-16 text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--page-bg-secondary)]">
                      <ShieldCheck
                        size={26}
                        className="text-[var(--text-secondary)]"
                      />
                    </div>

                    <h3 className="mt-4 font-semibold">
                      No ban records found
                    </h3>

                    <p className="mt-1 text-sm text-[var(--text-secondary)]">
                      {search || status !== "all" || duration !== "all"
                        ? "Try changing your search or filters."
                        : "There are currently no user bans on the platform."}
                    </p>
                  </td>
                </tr>
              ) : (
                bans.map((ban) => {
                  const banStatus = getBanStatus(ban);

                  return (
                    <tr
                      key={ban.id}
                      className="transition hover:bg-[var(--page-bg-secondary)]/50"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <UserAvatar user={ban.user} />

                          <div>
                            <p className="font-semibold">
                              {ban.user?.full_name || "Unknown user"}
                            </p>

                            <p className="text-xs text-[var(--text-secondary)]">
                              @{ban.user?.username || "unknown"}
                            </p>

                            <p className="text-xs text-[var(--text-secondary)]">
                              {ban.user?.school?.name || "No school"}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4 font-medium">
                        {durationLabels[ban.duration] || ban.duration}
                      </td>

                      <td className="max-w-[180px] px-5 py-4">
                        <p className="truncate text-[var(--text-secondary)]">
                          {ban.reason || "No reason provided"}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        {ban.administrator?.full_name || "Unknown"}
                      </td>

                      <td className="px-5 py-4 whitespace-nowrap">
                        {formatDate(ban.ends_at)}
                      </td>

                      <td className="px-5 py-4">
                        <StatusBadge status={banStatus} />
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-2">

                          <button
                            type="button"
                            onClick={() => openDetails(ban)}
                            title="View details"
                            className="rounded-lg border border-[var(--border-color)] p-2 transition hover:bg-[var(--page-bg-secondary)]"
                          >
                            <Eye size={16} />
                          </button>

                          {banStatus === "active" && (
                            <button
                              type="button"
                              onClick={() => handleLiftBan(ban)}
                              disabled={actionLoading === ban.id}
                              title="Lift ban"
                              className="rounded-lg border border-green-200 p-2 text-green-700 transition hover:bg-green-50 disabled:opacity-50"
                            >
                              {actionLoading === ban.id ? (
                                <RefreshCw
                                  size={16}
                                  className="animate-spin"
                                />
                              ) : (
                                <Unlock size={16} />
                              )}
                            </button>
                          )}
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
            {totalBans === 0 ? 0 : page * PAGE_SIZE + 1}
            {" "}to{" "}
            {Math.min((page + 1) * PAGE_SIZE, totalBans)}
            {" "}of {totalBans} records
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
          ISSUE BAN MODAL
      ===================================================== */}

      {showBanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
          <div className="my-auto w-full max-w-lg rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] shadow-2xl">

            <div className="flex items-center justify-between border-b border-[var(--border-color)] p-5">
              <div>
                <h2 className="text-lg font-bold">Issue a Ban</h2>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  Temporarily restrict a user's account.
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

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Search for a user
                </label>

                <div className="relative">
                  <Search
                    size={17}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]"
                  />

                  <input
                    type="text"
                    value={userSearch}
                    onChange={(event) => setUserSearch(event.target.value)}
                    placeholder="Search name, username or email..."
                    className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--page-bg)] py-3 pl-10 pr-4 text-sm outline-none focus:border-violet-500"
                  />
                </div>

                <div className="mt-2 max-h-48 space-y-1 overflow-y-auto">
                  {usersLoading ? (
                    <p className="py-4 text-center text-sm text-[var(--text-secondary)]">
                      Searching users...
                    </p>
                  ) : users.length === 0 ? (
                    <p className="py-4 text-center text-sm text-[var(--text-secondary)]">
                      No users found.
                    </p>
                  ) : (
                    users.map((user) => (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => setSelectedUserId(user.id)}
                        className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${
                          selectedUserId === user.id
                            ? "border-violet-500 bg-violet-50"
                            : "border-transparent hover:bg-[var(--page-bg-secondary)]"
                        }`}
                      >
                        <UserAvatar user={user} />

                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">
                            {user.full_name || "Unnamed user"}
                          </p>

                          <p className="truncate text-xs text-[var(--text-secondary)]">
                            {user.email || user.username}
                          </p>

                          <p className="text-xs text-[var(--text-secondary)]">
                            {user.school?.name || "No school"} · {user.role}
                          </p>
                        </div>

                        {selectedUserId === user.id && (
                          <CheckCircle
                            size={18}
                            className="shrink-0 text-violet-600"
                          />
                        )}
                      </button>
                    ))
                  )}
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
                  placeholder="Explain why this user is being banned..."
                  className="w-full resize-none rounded-xl border border-[var(--border-color)] bg-[var(--page-bg)] p-3 text-sm outline-none focus:border-violet-500"
                />
              </div>

              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                <div className="flex items-start gap-2">
                  <AlertTriangle size={18} className="mt-0.5 shrink-0" />
                  <p>
                    This action will create a temporary ban. The selected
                    user's ban history and the administrative audit log
                    will be updated.
                  </p>
                </div>
              </div>

              {error && (
                <p className="text-sm text-red-600">{error}</p>
              )}

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
                  disabled={creatingBan || !selectedUserId}
                  className="flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
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

      {/* =====================================================
          BAN DETAILS MODAL
      ===================================================== */}

      {showDetailsModal && selectedBan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-black/50 p-4">
          <div className="my-auto w-full max-w-lg rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] shadow-2xl">

            <div className="flex items-center justify-between border-b border-[var(--border-color)] p-5">
              <div>
                <h2 className="text-lg font-bold">Ban Details</h2>
                <p className="mt-1 text-xs text-[var(--text-secondary)]">
                  Record ID: {selectedBan.id}
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

            <div className="space-y-5 p-5">

              <div className="flex items-center gap-3">
                <UserAvatar user={selectedBan.user} />

                <div>
                  <p className="font-semibold">
                    {selectedBan.user?.full_name || "Unknown user"}
                  </p>

                  <p className="text-sm text-[var(--text-secondary)]">
                    {selectedBan.user?.email || "No email available"}
                  </p>

                  <p className="text-xs text-[var(--text-secondary)]">
                    {selectedBan.user?.school?.name || "No school assigned"}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--text-secondary)]">
                  Status
                </span>

                <StatusBadge status={getBanStatus(selectedBan)} />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--text-secondary)]">
                  Duration
                </span>

                <span className="text-sm font-medium">
                  {durationLabels[selectedBan.duration] || selectedBan.duration}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--text-secondary)]">
                  Issued by
                </span>

                <span className="text-sm font-medium">
                  {selectedBan.administrator?.full_name || "Unknown"}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--text-secondary)]">
                  Start date
                </span>

                <span className="text-sm font-medium">
                  {formatDateTime(selectedBan.starts_at)}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--text-secondary)]">
                  Expiration date
                </span>

                <span className="text-sm font-medium">
                  {formatDateTime(selectedBan.ends_at)}
                </span>
              </div>

              <div>
                <p className="mb-2 text-sm font-medium">Reason</p>

                <div className="rounded-xl bg-[var(--page-bg-secondary)] p-4 text-sm">
                  {selectedBan.reason || "No reason provided."}
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm font-medium">Record created</p>

                <p className="text-sm text-[var(--text-secondary)]">
                  {formatDateTime(selectedBan.created_at)}
                </p>
              </div>

              {getBanStatus(selectedBan) === "active" && (
                <button
                  type="button"
                  onClick={() => handleLiftBan(selectedBan)}
                  disabled={actionLoading === selectedBan.id}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-green-700 disabled:opacity-50"
                >
                  <Unlock size={17} />
                  {actionLoading === selectedBan.id
                    ? "Lifting Ban..."
                    : "Lift This Ban"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}