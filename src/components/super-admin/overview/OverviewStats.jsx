import {
  School,
  Users,
  GraduationCap,
  UserCog,
  ShieldBan,
  Flag,
  CheckCircle2,
  Building2,
} from "lucide-react";

const stats = [
  {
    key: "totalSchools",
    label: "Total Schools",
    icon: School,
    color: "text-violet-600",
    background: "bg-violet-100",
  },
  {
    key: "activeSchools",
    label: "Active Schools",
    icon: CheckCircle2,
    color: "text-emerald-600",
    background: "bg-emerald-100",
  },
  {
    key: "inactiveSchools",
    label: "Inactive Schools",
    icon: Building2,
    color: "text-orange-600",
    background: "bg-orange-100",
  },
  {
    key: "totalUsers",
    label: "Registered Users",
    icon: Users,
    color: "text-blue-600",
    background: "bg-blue-100",
  },
  {
    key: "students",
    label: "Students",
    icon: GraduationCap,
    color: "text-indigo-600",
    background: "bg-indigo-100",
  },
  {
    key: "teachers",
    label: "Teachers",
    icon: UserCog,
    color: "text-fuchsia-600",
    background: "bg-fuchsia-100",
  },
  {
    key: "admins",
    label: "Administrators",
    icon: Users,
    color: "text-cyan-600",
    background: "bg-cyan-100",
  },
  {
    key: "pendingReports",
    label: "Pending Reports",
    icon: Flag,
    color: "text-red-600",
    background: "bg-red-100",
  },
  {
    key: "activeBans",
    label: "Active Bans",
    icon: ShieldBan,
    color: "text-rose-600",
    background: "bg-rose-100",
  },
];

export default function OverviewStats({ data, loading }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {stats.map((stat) => {
        const Icon = stat.icon;

        return (
          <div
            key={stat.key}
            className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] p-5 transition hover:-translate-y-1 hover:shadow-lg"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--text-secondary)]">
                  {stat.label}
                </p>

                <h3 className="mt-3 text-3xl font-bold text-[var(--text-primary)]">
                 {loading
                       ? "..."
                       : data
                          ? (data[stat.key] ?? 0).toLocaleString()
                          : "—"}
                </h3>
              </div>

              <div
                className={`flex h-12 w-12 items-center justify-center rounded-xl ${stat.background} ${stat.color}`}
              >
                <Icon size={23} />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}