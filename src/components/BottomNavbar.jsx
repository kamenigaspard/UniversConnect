import { useLocation, useNavigate } from "react-router-dom";
import { Home, Search, Heart, User, Plus,Settings } from "lucide-react";

/**
 * Reusable glassmorphism bottom navigation.
 *
 * Example:
 * <BottomNavbar
 *   items={[
 *     { label: "Home", path: "/student-home", icon: Home },
 *     { label: "Search", path: "/search", icon: Search },
 *     { label: "Requests", path: "/requests", icon: Heart },
 *     { label: "Profile", path: "/profile", icon: User },
 *     { label: "Settings", path: "/settings", icon: Settings },
 *   ]}
 *   createPath="/create-post"
 * />
 */
const BottomNavbar = ({
  items = [],
  createPath = "/create-post",
  createLabel = "Create",
  className = "",
}) => {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path) =>
    location.pathname === path ||
    (path !== "/" && location.pathname.startsWith(`${path}/`));

  return (
    <nav
      className={`fixed inset-x-0 bottom-0 z-50 border-t border-violet-200/70 bg-white/75 shadow-[0_-8px_30px_rgba(109,40,217,0.12)] backdrop-blur-2xl ${className}`}
      aria-label="Bottom navigation"
    >
      <div className="mx-auto grid h-[72px] max-w-3xl grid-cols-5 items-center px-1 pb-[env(safe-area-inset-bottom)] sm:px-3">
        {items.slice(0, 2).map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);

          return (
            <button
              key={item.path}
              type="button"
              onClick={() => navigate(item.path)}
              aria-current={active ? "page" : undefined}
              className={`flex h-full min-w-0 flex-col items-center justify-center gap-1 rounded-xl transition duration-200 active:scale-95 ${
                active
                  ? "text-violet-700 drop-shadow-[0_0_8px_rgba(139,92,246,0.35)]"
                  : "text-slate-500 hover:text-violet-700"
              }`}
            >
              <span
                className={`flex h-8 w-10 items-center justify-center rounded-xl transition ${
                  active
                    ? "border border-violet-200/80 bg-gradient-to-br from-violet-100/95 to-fuchsia-100/90 shadow-[0_0_16px_rgba(139,92,246,0.22)]"
                    : "hover:bg-violet-50/80"
                }`}
              >
                <Icon size={22} strokeWidth={active ? 2.3 : 1.8} />
              </span>
              <span className="max-w-full truncate text-[10px] leading-none">
                {item.label}
              </span>
            </button>
          );
        })}

        <button
          type="button"
          onClick={() => navigate(createPath)}
          aria-label={createLabel}
          className="flex h-full min-w-0 flex-col items-center justify-center gap-1 text-slate-500 transition hover:text-violet-700"
        >
          <span className="flex h-11 w-11 items-center justify-center rounded-full border border-white/85 bg-gradient-to-br from-violet-400 via-purple-600 to-fuchsia-600 text-white shadow-[0_0_12px_rgba(168,85,247,0.95),0_0_28px_rgba(124,58,237,0.48)] transition duration-200 hover:scale-110 hover:shadow-[0_0_20px_rgba(192,132,252,1),0_0_36px_rgba(124,58,237,0.65)] active:scale-95">
            <Plus size={26} strokeWidth={2} />
          </span>
          <span className="text-[10px] leading-none">{createLabel}</span>
        </button>

        {items.slice(2, 4).map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);

          return (
            <button
              key={item.path}
              type="button"
              onClick={() => navigate(item.path)}
              aria-current={active ? "page" : undefined}
              className={`flex h-full min-w-0 flex-col items-center justify-center gap-1 rounded-xl transition duration-200 active:scale-95 ${
                active
                  ? "text-violet-700 drop-shadow-[0_0_8px_rgba(139,92,246,0.35)]"
                  : "text-slate-500 hover:text-violet-700"
              }`}
            >
              <span
                className={`flex h-8 w-10 items-center justify-center rounded-xl transition ${
                  active
                    ? "border border-violet-200/80 bg-gradient-to-br from-violet-100/95 to-fuchsia-100/90 shadow-[0_0_16px_rgba(139,92,246,0.22)]"
                    : "hover:bg-violet-50/80"
                }`}
              >
                <Icon
                  size={22}
                  strokeWidth={active ? 2.3 : 1.8}
                  fill={active && item.fillWhenActive ? "currentColor" : "none"}
                />
              </span>
              <span className="max-w-full truncate text-[10px] leading-none">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNavbar;
