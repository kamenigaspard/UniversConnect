import { useCallback, useEffect, useState } from "react";
import {
  Users,
  GraduationCap,
  UserCog,
  Search,
  RefreshCw,
  Eye,
  Power,
  ChevronLeft,
  ChevronRight,
  X,
  Mail,
  CalendarDays,
  School,
  ShieldCheck,
} from "lucide-react";

import {
  getUsers,
  getSchoolsForUserFilter,
  getUserManagementStats,
  setUserAccountStatus,
  getUserDetails,
} from "../../../services/superAdmin/userService";

const roleLabels = {
  student: "Student",
  teacher: "Teacher",
  admin: "Administrator",
  super_admin: "Super Admin",
};

const roleStyles = {
  student: "bg-blue-100 text-blue-700",
  teacher: "bg-violet-100 text-violet-700",
  admin: "bg-fuchsia-100 text-fuchsia-700",
  super_admin: "bg-amber-100 text-amber-700",
};

export default function UsersManagement() {
  const [users, setUsers] = useState([]);
  const [schools, setSchools] = useState([]);
  const [stats, setStats] = useState(null);

  const [search, setSearch] = useState("");
  const [role, setRole] = useState("all");
  const [schoolId, setSchoolId] = useState("all");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(0);
  const [totalUsers, setTotalUsers] = useState(0);

  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [selectedUser, setSelectedUser] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const totalPages = Math.max(1, Math.ceil(totalUsers / 20));

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const result = await getUsers({
        search,
        role,
        schoolId,
        status,
        page,
      });

      setUsers(result.users);
      setTotalUsers(result.total);
    } catch (err) {
      console.error("Load users error:", err);
      setError(err.message || "Unable to load users.");
    } finally {
      setLoading(false);
    }
  }, [search, role, schoolId, status, page]);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);

    try {
      const result = await getUserManagementStats();
      setStats(result);
    } catch (err) {
      console.error("User statistics error:", err);
      setError((previous) =>
        previous || "Unable to load user statistics."
      );
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const loadInitialData = useCallback(async () => {
    setError("");

    try {
      const schoolData = await getSchoolsForUserFilter();
      setSchools(schoolData);
    } catch (err) {
      console.error("Load school filters error:", err);
      setError(err.message || "Unable to load school filters.");
    }

    await loadStats();
  }, [loadStats]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  useEffect(() => {
    const timeout = setTimeout(loadUsers, 300);
    return () => clearTimeout(timeout);
  }, [loadUsers]);

  const updateFilters = (setter, value) => {
    setter(value);
    setPage(0);
    setSuccess("");
  };

  const handleToggleStatus = async (user) => {
    if (user.role === "super_admin") {
      setError("Super Admin accounts cannot be changed here.");
      return;
    }

    const nextStatus = !user.is_active;

    const confirmed = window.confirm(
      nextStatus
        ? `Activate ${user.full_name}'s account?`
        : `Deactivate ${user.full_name}'s account?`
    );

    if (!confirmed) return;

    setActionLoading(user.id);
    setError("");
    setSuccess("");

    try {
      await setUserAccountStatus(user.id, nextStatus);

      setSuccess(
        `${user.full_name}'s account has been ${
          nextStatus ? "activated" : "deactivated"
        }.`
      );

      await Promise.all([loadUsers(), loadStats()]);

      if (selectedUser?.id === user.id) {
        const updated = await getUserDetails(user.id);
        setSelectedUser(updated);
      }
    } catch (err) {
      console.error("Update account status error:", err);
      setError(err.message || "Unable to update account status.");
    } finally {
      setActionLoading("");
    }
  };

  const openUserDetails = async (user) => {
    setSelectedUser(user);
    setDetailsLoading(true);
    setError("");

    try {
      const details = await getUserDetails(user.id);
      setSelectedUser(details);
    } catch (err) {
      console.error("User details error:", err);
      setError(err.message || "Unable to load user details.");
    } finally {
      setDetailsLoading(false);
    }
  };

  const refreshAll = async () => {
    await Promise.all([loadUsers(), loadStats()]);
  };

  return (
    <div className="space-y-6">
      {/* Statistics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          label="Total Users"
          value={stats?.total}
          loading={statsLoading}
          icon={Users}
          color="violet"
        />

        <StatCard
          label="Students"
          value={stats?.students}
          loading={statsLoading}
          icon={GraduationCap}
          color="blue"
        />

        <StatCard
          label="Teachers"
          value={stats?.teachers}
          loading={statsLoading}
          icon={UserCog}
          color="fuchsia"
        />

        <StatCard
          label="Administrators"
          value={stats?.admins}
          loading={statsLoading}
          icon={ShieldCheck}
          color="cyan"
        />

        <StatCard
          label="Active Accounts"
          value={stats?.active}
          loading={statsLoading}
          icon={Power}
          color="emerald"
        />

        <StatCard
          label="Inactive Accounts"
          value={stats?.inactive}
          loading={statsLoading}
          icon={Users}
          color="orange"
        />
      </div>

      {/* Search and filters */}
      <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] p-4">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-4">
          <div className="relative xl:col-span-1">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]"
            />

            <input
              value={search}
              onChange={(event) =>
                updateFilters(setSearch, event.target.value)
              }
              placeholder="Search name, username or email..."
              className="form-input pl-10"
            />
          </div>

          <select
            value={role}
            onChange={(event) =>
              updateFilters(setRole, event.target.value)
            }
            className="form-input"
          >
            <option value="all">All roles</option>
            <option value="student">Students</option>
            <option value="teacher">Teachers</option>
            <option value="admin">Administrators</option>
            <option value="super_admin">Super Admins</option>
          </select>

          <select
            value={schoolId}
            onChange={(event) =>
              updateFilters(setSchoolId, event.target.value)
            }
            className="form-input"
          >
            <option value="all">All schools</option>
            <option value="none">No school assigned</option>

            {schools.map((school) => (
              <option key={school.id} value={school.id}>
                {school.name}
              </option>
            ))}
          </select>

          <select
            value={status}
            onChange={(event) =>
              updateFilters(setStatus, event.target.value)
            }
            className="form-input"
          >
            <option value="all">All account statuses</option>
            <option value="active">Active accounts</option>
            <option value="inactive">Inactive accounts</option>
          </select>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-[var(--text-secondary)]">
            {totalUsers.toLocaleString()} matching users
          </p>

          <button
            type="button"
            onClick={refreshAll}
            disabled={loading || statsLoading}
            className="flex items-center gap-2 rounded-xl border border-[var(--border-color)] px-4 py-2.5 text-sm font-medium hover:bg-[var(--page-bg-secondary)] disabled:opacity-50"
          >
            <RefreshCw
              size={16}
              className={
                loading || statsLoading ? "animate-spin" : ""
              }
            />
            Refresh
          </button>
        </div>
      </section>

      {error && <Notice type="error" message={error} />}
      {success && <Notice type="success" message={success} />}

      {/* Users table */}
      <section className="overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--surface)]">
        <div className="border-b border-[var(--border-color)] p-5">
          <h2 className="font-semibold">Platform Users</h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Users registered across all schools.
          </p>
        </div>

        {loading ? (
          <div className="p-10 text-center text-sm text-[var(--text-secondary)]">
            Loading users...
          </div>
        ) : users.length === 0 ? (
          <div className="p-10 text-center">
            <Users size={36} className="mx-auto text-violet-500" />
            <p className="mt-3 font-medium">No users found</p>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Try changing your search or filters.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left text-sm">
                <thead className="bg-[var(--page-bg-secondary)] text-xs uppercase text-[var(--text-secondary)]">
                  <tr>
                    <th className="px-5 py-4">User</th>
                    <th className="px-5 py-4">Role</th>
                    <th className="px-5 py-4">School</th>
                    <th className="px-5 py-4">Status</th>
                    <th className="px-5 py-4">Joined</th>
                    <th className="px-5 py-4 text-right">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-[var(--border-color)]">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-[var(--page-bg)]">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar user={user} />

                          <div className="min-w-0">
                            <p className="max-w-[210px] truncate font-semibold">
                              {user.full_name || "Unnamed user"}
                            </p>
                            <p className="max-w-[210px] truncate text-xs text-[var(--text-secondary)]">
                              @{user.username || "no-username"}
                            </p>
                            <p className="max-w-[210px] truncate text-xs text-[var(--text-secondary)]">
                              {user.email}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-5 py-4">
                        <RoleBadge role={user.role} />
                      </td>

                      <td className="px-5 py-4">
                        <span className="text-[var(--text-secondary)]">
                          {user.school?.name || "No school"}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <StatusBadge active={user.is_active} />
                      </td>

                      <td className="px-5 py-4 text-xs text-[var(--text-secondary)]">
                        {user.created_at
                          ? new Date(user.created_at).toLocaleDateString()
                          : "—"}
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <IconButton
                            title="View profile"
                            onClick={() => openUserDetails(user)}
                          >
                            <Eye size={17} />
                          </IconButton>

                          {user.role !== "super_admin" && (
                            <IconButton
                              title={
                                user.is_active
                                  ? "Deactivate account"
                                  : "Activate account"
                              }
                              disabled={actionLoading === user.id}
                              onClick={() => handleToggleStatus(user)}
                            >
                              <Power
                                size={17}
                                className={
                                  user.is_active
                                    ? "text-orange-500"
                                    : "text-emerald-600"
                                }
                              />
                            </IconButton>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between gap-3 border-t border-[var(--border-color)] p-4">
              <p className="text-xs text-[var(--text-secondary)]">
                Page {page + 1} of {totalPages}
              </p>

              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={page === 0}
                  onClick={() => setPage((current) => current - 1)}
                  className="rounded-lg border border-[var(--border-color)] p-2 disabled:opacity-40"
                  aria-label="Previous page"
                >
                  <ChevronLeft size={18} />
                </button>

                <button
                  type="button"
                  disabled={page + 1 >= totalPages}
                  onClick={() => setPage((current) => current + 1)}
                  className="rounded-lg border border-[var(--border-color)] p-2 disabled:opacity-40"
                  aria-label="Next page"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          </>
        )}
      </section>

      {/* User details */}
      {selectedUser && (
        <UserDetails
          user={selectedUser}
          loading={detailsLoading}
          onClose={() => setSelectedUser(null)}
          onToggleStatus={handleToggleStatus}
          actionLoading={actionLoading === selectedUser.id}
        />
      )}
    </div>
  );
}
function StatCard({ label, value, loading, icon: Icon, color }) {
  const colors = {
    violet: "bg-violet-100 text-violet-600",
    blue: "bg-blue-100 text-blue-600",
    fuchsia: "bg-fuchsia-100 text-fuchsia-600",
    cyan: "bg-cyan-100 text-cyan-600",
    emerald: "bg-emerald-100 text-emerald-600",
    orange: "bg-orange-100 text-orange-600",
  };

  return (
    <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--text-secondary)]">{label}</p>
        <div className={`rounded-xl p-3 ${colors[color]}`}>
          <Icon size={21} />
        </div>
      </div>

<p className="mt-3 text-3xl font-bold">
  {loading
    ? "..."
    : value == null
      ? "—"
      : value.toLocaleString()}
</p>
    </div>
  );
}

function Avatar({ user }) {
  return user.avatar_url ? (
    <img
      src={user.avatar_url}
      alt=""
      className="h-11 w-11 shrink-0 rounded-full object-cover"
    />
  ) : (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-violet-100 font-semibold text-violet-700">
      {(user.full_name || user.username || "U")
        .charAt(0)
        .toUpperCase()}
    </div>
  );
}

function RoleBadge({ role }) {
  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${
        roleStyles[role] || "bg-gray-100 text-gray-700"
      }`}
    >
      {roleLabels[role] || role}
    </span>
  );
}

function StatusBadge({ active }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
        active
          ? "bg-emerald-100 text-emerald-700"
          : "bg-orange-100 text-orange-700"
      }`}
    >
      {active ? "Active" : "Inactive"}
    </span>
  );
}

function IconButton({ children, title, onClick, disabled }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      disabled={disabled}
      className="rounded-lg border border-[var(--border-color)] p-2 text-[var(--text-secondary)] transition hover:bg-[var(--page-bg-secondary)] hover:text-violet-600 disabled:opacity-40"
    >
      {children}
    </button>
  );
}

function Notice({ type, message }) {
  return (
    <div
      className={`rounded-xl border p-3 text-sm ${
        type === "error"
          ? "border-red-200 bg-red-50 text-red-700"
          : "border-emerald-200 bg-emerald-50 text-emerald-700"
      }`}
    >
      {message}
    </div>
  );
}

function UserDetails({
  user,
  loading,
  onClose,
  onToggleStatus,
  actionLoading,
}) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-black/50 p-4">
      <div className="my-8 w-full max-w-xl rounded-2xl bg-[var(--surface)] p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold">User Profile</h2>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-[var(--page-bg-secondary)]"
            aria-label="Close user profile"
          >
            <X size={20} />
          </button>
        </div>

        {loading ? (
          <div className="py-12 text-center text-sm text-[var(--text-secondary)]">
            Loading profile...
          </div>
        ) : (
          <>
            <div className="mt-6 flex items-center gap-4">
              <div className="h-20 w-20">
                <Avatar user={user} />
              </div>

              <div className="min-w-0">
                <h3 className="text-lg font-bold">
                  {user.full_name || "Unnamed user"}
                </h3>
                <p className="text-sm text-[var(--text-secondary)]">
                  @{user.username || "no-username"}
                </p>

                <div className="mt-2 flex flex-wrap gap-2">
                  <RoleBadge role={user.role} />
                  <StatusBadge active={user.is_active} />
                </div>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <DetailRow
                icon={Mail}
                label="Email"
                value={user.email || "Not provided"}
              />

              <DetailRow
                icon={School}
                label="School"
                value={user.school?.name || "No school assigned"}
              />

              <DetailRow
                icon={CalendarDays}
                label="Registered"
                value={
                  user.created_at
                    ? new Date(user.created_at).toLocaleString()
                    : "Unavailable"
                }
              />

              <DetailRow
                icon={CalendarDays}
                label="Last profile update"
                value={
                  user.updated_at
                    ? new Date(user.updated_at).toLocaleString()
                    : "Unavailable"
                }
              />
            </div>

            {user.bio && (
              <div className="mt-5 rounded-xl bg-[var(--page-bg-secondary)] p-4">
                <p className="text-xs font-semibold text-[var(--text-secondary)]">
                  BIO
                </p>
                <p className="mt-2 whitespace-pre-wrap text-sm">
                  {user.bio}
                </p>
              </div>
            )}

            {user.role !== "super_admin" && (
              <button
                type="button"
                disabled={actionLoading}
                onClick={() => onToggleStatus(user)}
                className={`mt-7 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white disabled:opacity-50 ${
                  user.is_active
                    ? "bg-orange-600 hover:bg-orange-700"
                    : "bg-emerald-600 hover:bg-emerald-700"
                }`}
              >
                <Power size={17} />
                {actionLoading
                  ? "Updating..."
                  : user.is_active
                    ? "Deactivate Account"
                    : "Activate Account"}
              </button>
            )}

            {user.role === "super_admin" && (
              <p className="mt-6 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
                Super Admin accounts are protected from account-status
                changes in this section.
              </p>
            )}
          </>
        )}

        <button
          type="button"
          onClick={onClose}
          className="mt-3 w-full rounded-xl border border-[var(--border-color)] px-4 py-3 text-sm font-medium"
        >
          Close
        </button>
      </div>
    </div>
  );
}

function DetailRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-3">
      <div className="rounded-lg bg-[var(--page-bg-secondary)] p-2 text-violet-600">
        <Icon size={18} />
      </div>

      <div className="min-w-0">
        <p className="text-xs text-[var(--text-secondary)]">{label}</p>
        <p className="break-words text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}