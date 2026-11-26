import { useCallback, useEffect, useMemo, useState } from "react";
import {
  School,
  Search,
  Plus,
  Pencil,
  Eye,
  Power,
  Trash2,
  X,
  Upload,
  Users,
  FileText,
  Building2,
  RefreshCw,
  Image as ImageIcon,
} from "lucide-react";

import {
  getSchools,
  createSchool,
  updateSchool,
  setSchoolStatus,
  uploadSchoolLogo,
  updateSchoolLogo,
  deleteSchoolSafely,
  getSchoolStatistics,
} from "../../../services/superAdmin/schoolService";

const emptyForm = {
  name: "",
  code: "",
  description: "",
  is_active: true,
};

export default function SchoolsManagement() {
  const [schools, setSchools] = useState([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editingSchool, setEditingSchool] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState("");

  const [selectedSchool, setSelectedSchool] = useState(null);
  const [schoolStats, setSchoolStats] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const [actionLoading, setActionLoading] = useState("");

  const loadSchools = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await getSchools({ search, status });
      setSchools(data);
    } catch (err) {
      console.error("Load schools error:", err);
      setError(err.message || "Unable to load schools.");
    } finally {
      setLoading(false);
    }
  }, [search, status]);

  useEffect(() => {
    const timeout = setTimeout(loadSchools, 250);
    return () => clearTimeout(timeout);
  }, [loadSchools]);

  useEffect(() => {
    return () => {
      if (logoPreview.startsWith("blob:")) {
        URL.revokeObjectURL(logoPreview);
      }
    };
  }, [logoPreview]);

  const totals = useMemo(() => ({
    total: schools.length,
    active: schools.filter((school) => school.is_active).length,
    inactive: schools.filter((school) => !school.is_active).length,
  }), [schools]);

  const openCreateForm = () => {
    setEditingSchool(null);
    setForm(emptyForm);
    setLogoFile(null);
    setLogoPreview("");
    setError("");
    setSuccess("");
    setShowForm(true);
  };

  const openEditForm = (school) => {
    setEditingSchool(school);
    setForm({
      name: school.name || "",
      code: school.code || "",
      description: school.description || "",
      is_active: school.is_active,
    });
    setLogoFile(null);
    setLogoPreview(school.logo_url || "");
    setError("");
    setSuccess("");
    setShowForm(true);
  };

  const handleLogoChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Choose a JPG, PNG or WebP image.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("The school logo must be 5 MB or smaller.");
      return;
    }

    if (logoPreview.startsWith("blob:")) {
      URL.revokeObjectURL(logoPreview);
    }

    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
    setError("");
  };

  const handleSaveSchool = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!form.name.trim() || !form.code.trim()) {
      setError("School name and school code are required.");
      return;
    }

    setSaving(true);

    try {
      let school;

      if (editingSchool) {
        school = await updateSchool(editingSchool.id, form);
      } else {
        school = await createSchool(form);
      }

      let logoWarning = "";

      if (logoFile) {
        try {
          const logoUrl = await uploadSchoolLogo(school.id, logoFile);
          school = await updateSchoolLogo(school.id, logoUrl);
        } catch (logoError) {
          console.error("School logo upload error:", logoError);
          logoWarning =
            " The school information was saved, but the logo could not be uploaded.";
        }
      }

      setShowForm(false);
      setLogoFile(null);
      setLogoPreview("");

      await loadSchools();

      setSuccess(
        `${editingSchool ? "School updated" : "School created"} successfully.${logoWarning}`
      );
    } catch (err) {
      console.error("Save school error:", err);
      setError(err.message || "Unable to save school.");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (school) => {
    const nextStatus = !school.is_active;

    const confirmed = window.confirm(
      nextStatus
        ? `Activate ${school.name}?`
        : `Deactivate ${school.name}? Users associated with this school may lose access to school features.`
    );

    if (!confirmed) return;

    setActionLoading(school.id);
    setError("");
    setSuccess("");

    try {
      await setSchoolStatus(school.id, nextStatus);
      setSuccess(
        `${school.name} has been ${nextStatus ? "activated" : "deactivated"}.`
      );
      await loadSchools();
    } catch (err) {
      console.error("School status error:", err);
      setError(err.message || "Unable to change school status.");
    } finally {
      setActionLoading("");
    }
  };

  const handleDeleteSchool = async (school) => {
    const confirmed = window.confirm(
      `Permanently delete "${school.name}"? This is allowed only when no associated records exist.`
    );

    if (!confirmed) return;

    setActionLoading(school.id);
    setError("");
    setSuccess("");

    try {
      await deleteSchoolSafely(school.id);
      setSuccess(`${school.name} was deleted successfully.`);
      await loadSchools();
    } catch (err) {
      console.error("Delete school error:", err);
      setError(err.message || "Unable to delete school.");
    } finally {
      setActionLoading("");
    }
  };

  const openSchoolDetails = async (school) => {
    setSelectedSchool(school);
    setSchoolStats(null);
    setDetailsLoading(true);

    try {
      const stats = await getSchoolStatistics(school.id);
      setSchoolStats(stats);
    } catch (err) {
      console.error("School details error:", err);
      setError(err.message || "Unable to load school statistics.");
    } finally {
      setDetailsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard label="Schools found" value={totals.total} icon={School} />
        <SummaryCard label="Active schools" value={totals.active} icon={Building2} />
        <SummaryCard label="Inactive schools" value={totals.inactive} icon={Power} />
      </div>

      {/* Search and filters */}
      <div className="flex flex-col gap-3 rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative flex-1">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-secondary)]"
          />

          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search school name or code..."
            className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--page-bg)] py-3 pl-10 pr-4 text-sm outline-none focus:border-violet-500"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="rounded-xl border border-[var(--border-color)] bg-[var(--page-bg)] px-4 py-3 text-sm outline-none"
          >
            <option value="all">All schools</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          <button
            type="button"
            onClick={loadSchools}
            className="rounded-xl border border-[var(--border-color)] p-3 hover:bg-[var(--page-bg-secondary)]"
            aria-label="Refresh schools"
          >
            <RefreshCw size={18} />
          </button>

          <button
            type="button"
            onClick={openCreateForm}
            className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white hover:bg-violet-700"
          >
            <Plus size={18} />
            Add School
          </button>
        </div>
      </div>

      {error && <Notice type="error" message={error} />}
      {success && <Notice type="success" message={success} />}

      {/* School list */}
      <section className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface)]">
        <div className="border-b border-[var(--border-color)] p-5">
          <h2 className="font-semibold">Registered Schools</h2>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Manage all schools connected to the platform.
          </p>
        </div>

        {loading ? (
          <div className="p-10 text-center text-sm text-[var(--text-secondary)]">
            Loading schools...
          </div>
        ) : schools.length === 0 ? (
          <div className="p-10 text-center">
            <School size={36} className="mx-auto text-violet-500" />
            <p className="mt-3 font-medium">No schools found</p>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Try another search or add a new school.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2 2xl:grid-cols-3">
            {schools.map((school) => (
              <SchoolCard
                key={school.id}
                school={school}
                busy={actionLoading === school.id}
                onView={() => openSchoolDetails(school)}
                onEdit={() => openEditForm(school)}
                onToggle={() => handleToggleStatus(school)}
                onDelete={() => handleDeleteSchool(school)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Create / edit modal */}
      {showForm && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-black/50 p-4">
          <form
            onSubmit={handleSaveSchool}
            className="my-8 w-full max-w-xl rounded-2xl bg-[var(--surface)] p-5 shadow-2xl sm:p-7"
          >
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">
                  {editingSchool ? "Edit School" : "Add New School"}
                </h2>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  Enter the school's official information.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-lg p-2 hover:bg-[var(--page-bg-secondary)]"
              >
                <X size={20} />
              </button>
            </div>

            {error && <Notice type="error" message={error} />}

            <div className="space-y-4">
              <FormField label="School Name" required>
                <input
                  required
                  value={form.name}
                  onChange={(event) =>
                    setForm({ ...form, name: event.target.value })
                  }
                  placeholder="Example: University of..."
                  className="form-input"
                />
              </FormField>

              <FormField label="School Code" required>
                <input
                  required
                  value={form.code}
                  onChange={(event) =>
                    setForm({ ...form, code: event.target.value.toUpperCase() })
                  }
                  placeholder="Example: UNI001"
                  className="form-input"
                />
              </FormField>

              <FormField label="Description">
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(event) =>
                    setForm({ ...form, description: event.target.value })
                  }
                  placeholder="Short description of the school..."
                  className="form-input resize-none"
                />
              </FormField>

              <FormField label="School Logo">
                <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-[var(--border-color)] p-5 hover:border-violet-500">
                  {logoPreview ? (
                    <img
                      src={logoPreview}
                      alt="School logo preview"
                      className="h-24 w-24 rounded-xl object-contain"
                    />
                  ) : (
                    <ImageIcon size={35} className="text-violet-500" />
                  )}

                  <span className="mt-3 flex items-center gap-2 text-sm font-medium">
                    <Upload size={16} />
                    {logoPreview ? "Change logo" : "Upload logo"}
                  </span>

                  <span className="mt-1 text-xs text-[var(--text-secondary)]">
                    JPG, PNG or WebP · Maximum 5 MB
                  </span>

                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleLogoChange}
                    className="hidden"
                  />
                </label>
              </FormField>

              <label className="flex items-center gap-3 rounded-xl bg-[var(--page-bg-secondary)] p-4">
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(event) =>
                    setForm({ ...form, is_active: event.target.checked })
                  }
                  className="h-4 w-4 accent-violet-600"
                />

                <span>
                  <span className="block text-sm font-medium">
                    School is active
                  </span>
                  <span className="text-xs text-[var(--text-secondary)]">
                    Active schools can be used by their members.
                  </span>
                </span>
              </label>
            </div>

            <div className="mt-7 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-xl border border-[var(--border-color)] px-5 py-3 text-sm font-medium"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
              >
                {saving
                  ? "Saving..."
                  : editingSchool
                    ? "Save Changes"
                    : "Create School"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* School details modal */}
      {selectedSchool && (
        <SchoolDetails
          school={selectedSchool}
          stats={schoolStats}
          loading={detailsLoading}
          onClose={() => {
            setSelectedSchool(null);
            setSchoolStats(null);
          }}
        />
      )}
    </div>
  );
}

function SummaryCard({ label, value, icon: Icon }) {
  return (
    <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--text-secondary)]">{label}</p>
        <Icon size={20} className="text-violet-600" />
      </div>
      <p className="mt-3 text-3xl font-bold">{value.toLocaleString()}</p>
    </div>
  );
}

function SchoolCard({ school, busy, onView, onEdit, onToggle, onDelete }) {
  return (
    <article className="rounded-2xl border border-[var(--border-color)] p-4 transition hover:shadow-md">
      <div className="flex items-start gap-3">
        {school.logo_url ? (
          <img
            src={school.logo_url}
            alt={`${school.name} logo`}
            className="h-14 w-14 rounded-xl border border-[var(--border-color)] object-contain"
          />
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
            <School size={25} />
          </div>
        )}

        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold">{school.name}</h3>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">
            Code: {school.code}
          </p>

          <span
            className={`mt-2 inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
              school.is_active
                ? "bg-emerald-100 text-emerald-700"
                : "bg-orange-100 text-orange-700"
            }`}
          >
            {school.is_active ? "Active" : "Inactive"}
          </span>
        </div>
      </div>

      {school.description && (
        <p className="mt-4 line-clamp-2 text-sm text-[var(--text-secondary)]">
          {school.description}
        </p>
      )}

      <div className="mt-5 flex flex-wrap gap-2 border-t border-[var(--border-color)] pt-4">
        <ActionButton icon={Eye} label="View" onClick={onView} />
        <ActionButton icon={Pencil} label="Edit" onClick={onEdit} />

        <ActionButton
          icon={Power}
          label={school.is_active ? "Deactivate" : "Activate"}
          onClick={onToggle}
          disabled={busy}
        />

        <ActionButton
          icon={Trash2}
          label="Delete"
          onClick={onDelete}
          disabled={busy}
          danger
        />
      </div>
    </article>
  );
}

function ActionButton({
  icon: Icon,
  label,
  onClick,
  disabled,
  danger,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-medium transition disabled:opacity-50 ${
        danger
          ? "text-red-600 hover:bg-red-50"
          : "text-[var(--text-secondary)] hover:bg-[var(--page-bg-secondary)] hover:text-violet-600"
      }`}
    >
      <Icon size={14} />
      {label}
    </button>
  );
}

function FormField({ label, required, children }) {
  return (
    <label className="block space-y-2">
      <span className="text-sm font-medium">
        {label} {required && <span className="text-red-500">*</span>}
      </span>
      {children}
    </label>
  );
}

function Notice({ type, message }) {
  return (
    <div
      className={`mb-4 rounded-xl border p-3 text-sm ${
        type === "error"
          ? "border-red-200 bg-red-50 text-red-700"
          : "border-emerald-200 bg-emerald-50 text-emerald-700"
      }`}
    >
      {message}
    </div>
  );
}

function SchoolDetails({ school, stats, loading, onClose }) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-black/50 p-4">
      <div className="my-8 w-full max-w-lg rounded-2xl bg-[var(--surface)] p-6 shadow-2xl">
        <div className="flex items-start justify-between">
          <h2 className="text-xl font-bold">School Details</h2>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-[var(--page-bg-secondary)]"
          >
            <X size={20} />
          </button>
        </div>

        <div className="mt-6 flex items-center gap-4">
          {school.logo_url ? (
            <img
              src={school.logo_url}
              alt={`${school.name} logo`}
              className="h-20 w-20 rounded-xl border border-[var(--border-color)] object-contain"
            />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-violet-100 text-violet-600">
              <School size={35} />
            </div>
          )}

          <div className="min-w-0">
            <h3 className="text-lg font-bold">{school.name}</h3>
            <p className="text-sm text-[var(--text-secondary)]">
              {school.code}
            </p>
            <p className="mt-1 text-xs">
              {school.is_active ? "Active school" : "Inactive school"}
            </p>
          </div>
        </div>

        <p className="mt-5 text-sm text-[var(--text-secondary)]">
          {school.description || "No description provided."}
        </p>

        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <DetailStat icon={Users} label="Users" value={stats?.users} loading={loading} />
          <DetailStat icon={FileText} label="Posts" value={stats?.posts} loading={loading} />
          <DetailStat icon={Building2} label="Communities" value={stats?.communities} loading={loading} />
        </div>

        <button
          type="button"
          onClick={onClose}
          className="mt-7 w-full rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold text-white hover:bg-violet-700"
        >
          Close
        </button>
      </div>
    </div>
  );
}

function DetailStat({ icon: Icon, label, value, loading }) {
  return (
    <div className="rounded-xl bg-[var(--page-bg-secondary)] p-4">
      <Icon size={19} className="text-violet-600" />
      <p className="mt-3 text-xl font-bold">
        {loading ? "..." : (value ?? "—")}
      </p>
      <p className="text-xs text-[var(--text-secondary)]">{label}</p>
    </div>
  );
}