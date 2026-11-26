import {
  Menu,
  Bell,
  Search,
  ShieldCheck,
} from "lucide-react";

export default function SuperAdminHeader({
  activeSection,
  setSidebarOpen,
}) {
  return (
    <header className="sticky top-0 z-30 flex h-20 items-center justify-between border-b border-[var(--border-color)] bg-[var(--surface)]/90 px-4 backdrop-blur-xl sm:px-6 lg:px-8">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          aria-label="Open navigation"
          className="rounded-xl p-2 hover:bg-[var(--page-bg-secondary)] lg:hidden"
        >
          <Menu size={23} />
        </button>

        <div>
          <p className="text-xs text-[var(--text-secondary)]">
            Super Admin
          </p>
          <h2 className="font-semibold">{activeSection}</h2>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        <button
          type="button"
          aria-label="Search"
          className="rounded-xl p-2 text-[var(--text-secondary)] hover:bg-[var(--page-bg-secondary)]"
        >
          <Search size={20} />
        </button>

        <button
          type="button"
          aria-label="Notifications"
          className="rounded-xl p-2 text-[var(--text-secondary)] hover:bg-[var(--page-bg-secondary)]"
        >
          <Bell size={20} />
        </button>

        <div className="hidden h-9 w-px bg-[var(--border-color)] sm:block" />

        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-100 text-violet-700">
          <ShieldCheck size={21} />
        </div>
      </div>
    </header>
  );
}