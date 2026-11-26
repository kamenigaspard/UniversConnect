
import {
  LayoutDashboard,
  School,
  Users,
  ShieldBan,
  Flag,
  History,
  Settings,
  X,
  GraduationCap,
  ChevronRight,
  IdCard,
} from "lucide-react";

const navigation = [
  { label: "Overview", icon: LayoutDashboard },
  { label: "School Management", icon: School },
  { label: "User Management", icon: Users },
  { label: "Matricule Management", icon: IdCard },
  { label: "Ban Management", icon: ShieldBan },
  { label: "Platform Reports", icon: Flag },
  { label: "Audit Logs", icon: History },
  { label: "Settings", icon: Settings },
];

export default function SuperAdminSidebar({
  activeSection,
  setActiveSection,
  sidebarOpen,
  setSidebarOpen,
}) {
  const handleNavigation = (label) => {
    setActiveSection(label);
    setSidebarOpen(false);
  };

  return (
    <>
      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
        />
      )}

      <aside
        className={`
          fixed inset-y-0 left-0 z-50 flex w-72 flex-col
          border-r border-[var(--border-color)]
          bg-[var(--surface)] transition-transform duration-300
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0
        `}
      >
        <div className="flex h-20 items-center justify-between border-b border-[var(--border-color)] px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white">
              <GraduationCap size={25} />
            </div>

            <div>
              <h2 className="font-bold">School Connect</h2>
              <p className="text-xs text-[var(--text-secondary)]">
                Platform Administration
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="rounded-lg p-2 hover:bg-[var(--page-bg-secondary)] lg:hidden"
          >
            <X size={20} />
          </button>
        </div>

        <div className="px-5 py-5">
          <div className="rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 p-4 text-white">
            <p className="text-xs opacity-80">SIGNED IN AS</p>
            <p className="mt-1 font-semibold">Super Administrator</p>
            <p className="mt-1 text-xs opacity-80">
              Platform-wide access
            </p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-4 pb-5">
          <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
            Main Menu
          </p>

          {navigation.map(({ label, icon: Icon }) => {
            const active = activeSection === label;

            return (
              <button
                key={label}
                type="button"
                onClick={() => handleNavigation(label)}
                className={`
                  flex w-full items-center justify-between rounded-xl
                  px-3 py-3 text-left text-sm font-medium transition
                  ${
                    active
                      ? "bg-violet-600 text-white shadow-md shadow-violet-600/20"
                      : "text-[var(--text-secondary)] hover:bg-[var(--page-bg-secondary)] hover:text-[var(--text-primary)]"
                  }
                `}
              >
                <span className="flex items-center gap-3">
                  <Icon size={19} />
                  {label}
                </span>

                {active && <ChevronRight size={17} />}
              </button>
            );
          })}
        </nav>

        <div className="border-t border-[var(--border-color)] p-5">
          <p className="text-xs text-[var(--text-secondary)]">
            School Connect Administration
          </p>
        </div>
      </aside>
    </>
  );
}
