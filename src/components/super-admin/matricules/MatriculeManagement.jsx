
import { useCallback, useEffect, useState } from "react";
import {
  IdCard,
  Plus,
  Search,
  RefreshCw,
  Users,
  CheckCircle,
  XCircle,
  UserCheck,
  UserPlus,
  ChevronLeft,
  ChevronRight,
  X,
  Power,
  GraduationCap,
  ShieldCheck,
  User,
  School,
  AlertCircle,
  Loader2,
} from "lucide-react";

import { supabase } from "../../../lib/supabase";

import {
  getMatricules,
  getSchoolsForMatricules,
  createMatricules,
  updateMatriculeStatus,
  getMatriculeStats,
} from "../../../services/superAdmin/matriculeService";

const PAGE_SIZE = 20;

const initialForm = {
  matricules: "",
  schoolId: "",
  role: "student",
};

const roleOptions = [
  {
    value: "student",
    label: "Students",
    icon: GraduationCap,
  },
  {
    value: "teacher",
    label: "Teachers",
    icon: User,
  },
  {
    value: "admin",
    label: "Administrators",
    icon: ShieldCheck,
  },
];

const formatRole = (role) => {
  if (role === "admin") return "Administrator";
  if (role === "teacher") return "Teacher";
  return "Student";
};

export default function MatriculeManagement() {
  const [matricules, setMatricules] = useState([]);
  const [schools, setSchools] = useState([]);
  const [stats, setStats] = useState({});
  const [claimedUsers, setClaimedUsers] = useState({});

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(initialForm);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [schoolFilter, setSchoolFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [creationResult, setCreationResult] = useState(null);

  const matriculeCount = form.matricules
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean).length;

  const loadData = useCallback(
    async (showRefresh = false) => {
      try {
        if (showRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError("");

        const filters = {
          search: search.trim(),
          role: roleFilter,
          schoolId: schoolFilter,
          status: statusFilter,
          page,
          pageSize: PAGE_SIZE,
        };

        const [matriculeResult, schoolResult, statsResult] =
          await Promise.all([
            getMatricules(filters),
            getSchoolsForMatricules(),
            getMatriculeStats(),
          ]);

        const records =
          matriculeResult?.data ??
          matriculeResult?.matricules ??
          [];

        setMatricules(records);
        setSchools(schoolResult ?? []);
        setStats(statsResult ?? {});

        const total =
          matriculeResult?.count ??
          matriculeResult?.total ??
          0;

        setTotalRecords(total);
        setTotalPages(
          Math.max(1, Math.ceil(total / PAGE_SIZE))
        );

        // Load profile information for matricules that have been claimed.
        const claimedIds = [
          ...new Set(
            records
              .map((item) => item.claimed_by)
              .filter(Boolean)
          ),
        ];

        if (claimedIds.length > 0) {
          const { data: profiles, error: profileError } =
            await supabase
              .from("profiles")
              .select(
                "id, full_name, username, email, avatar_url, role"
              )
              .in("id", claimedIds);

          if (profileError) throw profileError;

          const userMap = {};

          (profiles ?? []).forEach((profile) => {
            userMap[profile.id] = profile;
          });

          setClaimedUsers(userMap);
        } else {
          setClaimedUsers({});
        }
      } catch (err) {
        console.error("Matricule loading error:", err);
        setError(
          err.message || "Unable to load matricule records."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [
      search,
      roleFilter,
      schoolFilter,
      statusFilter,
      page,
    ]
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  const updateForm = (field, value) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const handleCreate = async (event) => {
    event.preventDefault();

    setError("");
    setSuccess("");
    setCreationResult(null);

    if (!form.matricules.trim()) {
      setError("Please enter at least one matricule.");
      return;
    }

    if (!form.schoolId) {
      setError("Please select a school.");
      return;
    }

    if (!form.role) {
      setError("Please select a user category.");
      return;
    }

    try {
      setSubmitting(true);

      const result = await createMatricules({
        matricules: form.matricules,
        schoolId: form.schoolId,
        role: form.role,
      });

      const created =
        result?.created ??
        result?.data ??
        [];

      const duplicates = result?.duplicates ?? [];

      const createdCount =
        result?.createdCount ??
        (Array.isArray(created) ? created.length : 0);

      setCreationResult({
        createdCount,
        duplicates,
      });

      if (createdCount > 0) {
        setSuccess(
          `${createdCount} matricule(s) successfully added.`
        );
      } else if (duplicates.length > 0) {
        setSuccess(
          "No new matricules were added. The entered matricules already exist."
        );
      } else {
        setSuccess("Matricule operation completed.");
      }

      setForm(initialForm);
      setShowForm(false);
      setPage(0);

      await loadData(true);
    } catch (err) {
      console.error("Matricule creation error:", err);
      setError(
        err.message || "Unable to create matricules."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (item) => {
    const nextStatus = !item.is_active;

    const confirmed = window.confirm(
      nextStatus
        ? `Activate matricule ${item.matricule}?`
        : `Deactivate matricule ${item.matricule}?`
    );

    if (!confirmed) return;

    try {
      setError("");
      setSuccess("");

      await updateMatriculeStatus(item.id, nextStatus);

      setSuccess(
        `Matricule ${item.matricule} ${
          nextStatus ? "activated" : "deactivated"
        } successfully.`
      );

      await loadData(true);
    } catch (err) {
      console.error("Matricule status error:", err);
      setError(
        err.message || "Unable to update matricule status."
      );
    }
  };

  const clearFilters = () => {
    setSearch("");
    setRoleFilter("");
    setSchoolFilter("");
    setStatusFilter("");
    setPage(0);
  };

  const closeForm = () => {
    setShowForm(false);
    setForm(initialForm);
  };

  const total = stats?.total ?? 0;
  const active = stats?.active ?? 0;
  const inactive = stats?.inactive ?? 0;
  const claimed = stats?.claimed ?? 0;
  const unclaimed = stats?.unclaimed ?? 0;

  const roleStats = stats?.byRole ?? stats?.roles ?? {};

  const statCards = [
    {
      label: "Total Matricules",
      value: total,
      icon: IdCard,
      color: "text-purple-600",
      background: "bg-purple-100 dark:bg-purple-900/30",
    },
    {
      label: "Active",
      value: active,
      icon: CheckCircle,
      color: "text-green-600",
      background: "bg-green-100 dark:bg-green-900/30",
    },
    {
      label: "Inactive",
      value: inactive,
      icon: XCircle,
      color: "text-red-600",
      background: "bg-red-100 dark:bg-red-900/30",
    },
    {
      label: "Registered",
      value: claimed,
      icon: UserCheck,
      color: "text-blue-600",
      background: "bg-blue-100 dark:bg-blue-900/30",
    },
    {
      label: "Unregistered",
      value: unclaimed,
      icon: UserPlus,
      color: "text-orange-600",
      background: "bg-orange-100 dark:bg-orange-900/30",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <IdCard className="h-6 w-6 text-purple-600" />
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              Matricule Management
            </h1>
          </div>

          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage authorized matricules and control university registration.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
          >
            <RefreshCw
              className={`h-4 w-4 ${
                refreshing ? "animate-spin" : ""
              }`}
            />
            Refresh
          </button>

          <button
            type="button"
            onClick={() => {
              setError("");
              setSuccess("");
              setCreationResult(null);
              setShowForm(true);
            }}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-purple-700"
          >
            <Plus className="h-4 w-4" />
            Add Matricules
          </button>
        </div>
      </div>

      {/* Notifications */}
      {error && (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-300">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <p>{error}</p>
          <button
            type="button"
            onClick={() => setError("")}
            className="ml-auto"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {success && (
        <div className="flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700 dark:border-green-900/50 dark:bg-green-900/20 dark:text-green-300">
          <CheckCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <div className="flex-1">
            <p>{success}</p>

            {creationResult?.duplicates?.length > 0 && (
              <div className="mt-2">
                <p className="font-semibold">
                  Existing matricules skipped:
                </p>
                <p className="mt-1 break-words">
                  {creationResult.duplicates.join(", ")}
                </p>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => {
              setSuccess("");
              setCreationResult(null);
            }}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Statistics */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {statCards.map((item) => {
          const Icon = item.icon;

          return (
            <div
              key={item.label}
              className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800"
            >
              <div className="flex items-center justify-between gap-2">
                <div
                  className={`rounded-xl p-2 ${item.background}`}
                >
                  <Icon className={`h-5 w-5 ${item.color}`} />
                </div>
                <span className="text-xl font-bold text-gray-900 dark:text-white">
                  {item.value}
                </span>
              </div>

              <p className="mt-3 text-xs font-medium text-gray-500 dark:text-gray-400">
                {item.label}
              </p>
            </div>
          );
        })}
      </div>

      {/* Role Statistics */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <h2 className="mb-4 font-semibold text-gray-900 dark:text-white">
          Matricules by Category
        </h2>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {roleOptions.map((role) => {
            const Icon = role.icon;

            const count =
              roleStats[role.value] ??
              stats?.[role.value] ??
              0;

            return (
              <div
                key={role.value}
                className="flex items-center gap-3 rounded-xl bg-gray-50 p-3 dark:bg-gray-700/50"
              >
                <div className="rounded-xl bg-purple-100 p-2 dark:bg-purple-900/30">
                  <Icon className="h-5 w-5 text-purple-600" />
                </div>

                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {role.label}
                  </p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">
                    {count}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Matricules Form */}
      {showForm && (
        <div className="rounded-2xl border border-purple-200 bg-white p-5 shadow-sm dark:border-purple-900/50 dark:bg-gray-800">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-gray-900 dark:text-white">
                Add Authorized Matricules
              </h2>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Add one matricule per line. All entries will use the selected school and category.
              </p>
            </div>

            <button
              type="button"
              onClick={closeForm}
              className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleCreate} className="space-y-5">
            {/* Role Tabs */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                User Category
              </label>

              <div className="grid grid-cols-3 gap-2">
                {roleOptions.map((role) => {
                  const Icon = role.icon;
                  const selected = form.role === role.value;

                  return (
                    <button
                      key={role.value}
                      type="button"
                      onClick={() =>
                        updateForm("role", role.value)
                      }
                      className={`flex flex-col items-center justify-center gap-2 rounded-xl border p-3 text-sm font-medium transition ${
                        selected
                          ? "border-purple-600 bg-purple-50 text-purple-700 dark:border-purple-400 dark:bg-purple-900/30 dark:text-purple-300"
                          : "border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700"
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                      {role.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* School */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                <span className="inline-flex items-center gap-2">
                  <School className="h-4 w-4" />
                  School
                </span>
              </label>

              <select
                value={form.schoolId}
                onChange={(event) =>
                  updateForm("schoolId", event.target.value)
                }
                required
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:focus:ring-purple-900/30"
              >
                <option value="">Select a school</option>

                {schools.map((school) => (
                  <option key={school.id} value={school.id}>
                    {school.name}
                    {school.code ? ` (${school.code})` : ""}
                  </option>
                ))}
              </select>

              {schools.length === 0 && (
                <p className="mt-2 text-xs text-orange-600">
                  No active schools are available. Activate or add a school first.
                </p>
              )}
            </div>

            {/* Matricule List */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Matricules
                </label>

                <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                  {matriculeCount} entered
                </span>
              </div>

              <textarea
                value={form.matricules}
                onChange={(event) =>
                  updateForm(
                    "matricules",
                    event.target.value.toUpperCase()
                  )
                }
                rows={7}
                required
                placeholder={`Enter matricules, one per line:

STU2026001
STU2026002
STU2026003
STU2026004`}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 font-mono text-sm text-gray-900 outline-none placeholder:font-sans placeholder:text-gray-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-100 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:focus:ring-purple-900/30"
              />

              <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                Matricules are automatically converted to uppercase. Existing matricules will be skipped.
              </p>
            </div>

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeForm}
                disabled={submitting}
                className="rounded-xl border border-gray-200 px-5 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={
                  submitting ||
                  matriculeCount === 0 ||
                  !form.schoolId
                }
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-purple-600 px-5 py-3 text-sm font-semibold text-white hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Adding Matricules...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Add {matriculeCount} Matricule(s)
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Filters */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />

            <input
              type="text"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(0);
              }}
              placeholder="Search matricule..."
              className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-3 text-sm text-gray-900 outline-none focus:border-purple-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
            />
          </div>

          <select
            value={roleFilter}
            onChange={(event) => {
              setRoleFilter(event.target.value);
              setPage(0);
            }}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-purple-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
          >
            <option value="">All Categories</option>
            <option value="student">Students</option>
            <option value="teacher">Teachers</option>
            <option value="admin">Administrators</option>
          </select>

          <select
            value={schoolFilter}
            onChange={(event) => {
              setSchoolFilter(event.target.value);
              setPage(0);
            }}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-purple-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
          >
            <option value="">All Schools</option>

            {schools.map((school) => (
              <option key={school.id} value={school.id}>
                {school.name}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(event) => {
              setStatusFilter(event.target.value);
              setPage(0);
            }}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-700 outline-none focus:border-purple-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="claimed">Registered</option>
            <option value="unclaimed">Unregistered</option>
          </select>
        </div>

        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={clearFilters}
            className="text-xs font-medium text-purple-600 hover:text-purple-700 dark:text-purple-400"
          >
            Clear filters
          </button>
        </div>
      </div>

      {/* Matricule Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-4 dark:border-gray-700">
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-white">
              Authorized Matricules
            </h2>
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {totalRecords} record(s) found
            </p>
          </div>

          <Users className="h-5 w-5 text-gray-400" />
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-3 py-16 text-sm text-gray-500 dark:text-gray-400">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading matricules...
          </div>
        ) : matricules.length === 0 ? (
          <div className="flex flex-col items-center justify-center px-4 py-16 text-center">
            <IdCard className="mb-3 h-10 w-10 text-gray-300 dark:text-gray-600" />
            <p className="font-medium text-gray-700 dark:text-gray-300">
              No matricules found
            </p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Add matricules or adjust your filters.
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500 dark:bg-gray-900/50 dark:text-gray-400">
                  <tr>
                    <th className="px-4 py-3">Matricule</th>
                    <th className="px-4 py-3">School</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3">Registration</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {matricules.map((item) => {
                    const registeredUser =
                      claimedUsers[item.claimed_by];

                    const schoolName =
                      item.schools?.name ??
                      item.school?.name ??
                      schools.find(
                        (school) => school.id === item.school_id
                      )?.name ??
                      "Unknown school";

                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-gray-50 dark:hover:bg-gray-700/30"
                      >
                        <td className="px-4 py-4">
                          <span className="font-mono font-semibold text-gray-900 dark:text-white">
                            {item.matricule}
                          </span>
                        </td>

                        <td className="px-4 py-4 text-gray-600 dark:text-gray-300">
                          {schoolName}
                        </td>

                        <td className="px-4 py-4">
                          <span className="rounded-full bg-purple-100 px-2.5 py-1 text-xs font-medium text-purple-700 dark:bg-purple-900/30 dark:text-purple-300">
                            {formatRole(item.role)}
                          </span>
                        </td>

                        <td className="px-4 py-4">
                          {registeredUser ? (
                            <div className="flex items-center gap-2">
                              {registeredUser.avatar_url ? (
                                <img
                                  src={registeredUser.avatar_url}
                                  alt=""
                                  className="h-8 w-8 rounded-full object-cover"
                                />
                              ) : (
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700">
                                  <User className="h-4 w-4 text-gray-500" />
                                </div>
                              )}

                              <div className="min-w-0">
                                <p className="truncate font-medium text-gray-900 dark:text-white">
                                  {registeredUser.full_name}
                                </p>
                                <p className="truncate text-xs text-gray-500 dark:text-gray-400">
                                  {registeredUser.email}
                                </p>
                              </div>
                            </div>
                          ) : item.claimed_by ? (
                            <span className="text-xs text-gray-500">
                              Registered user
                            </span>
                          ) : (
                            <span className="text-xs text-orange-600 dark:text-orange-400">
                              Not registered
                            </span>
                          )}
                        </td>

                        <td className="px-4 py-4">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                              item.is_active
                                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300"
                                : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                            }`}
                          >
                            {item.is_active ? "Active" : "Inactive"}
                          </span>
                        </td>

                        <td className="px-4 py-4 text-right">
                          <button
                            type="button"
                            onClick={() =>
                              handleStatusChange(item)
                            }
                            disabled={Boolean(item.claimed_by)}
                            title={
                              item.claimed_by
                                ? "This matricule has already been used"
                                : item.is_active
                                ? "Deactivate matricule"
                                : "Activate matricule"
                            }
                            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium disabled:cursor-not-allowed disabled:opacity-40 ${
                              item.is_active
                                ? "bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/40"
                                : "bg-green-50 text-green-600 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/40"
                            }`}
                          >
                            <Power className="h-3.5 w-3.5" />
                            {item.is_active ? "Deactivate" : "Activate"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex flex-col gap-3 border-t border-gray-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Showing{" "}
                {totalRecords === 0
                  ? 0
                  : page * PAGE_SIZE + 1}{" "}
                to{" "}
                {Math.min(
                  (page + 1) * PAGE_SIZE,
                  totalRecords
                )}{" "}
                of {totalRecords} records
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setPage((previous) =>
                      Math.max(0, previous - 1)
                    )
                  }
                  disabled={page === 0}
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </button>

                <span className="px-2 text-xs font-medium text-gray-600 dark:text-gray-300">
                  Page {page + 1} of {totalPages}
                </span>

                <button
                  type="button"
                  onClick={() =>
                    setPage((previous) =>
                      Math.min(totalPages - 1, previous + 1)
                    )
                  }
                  disabled={page >= totalPages - 1}
                  className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-700"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
