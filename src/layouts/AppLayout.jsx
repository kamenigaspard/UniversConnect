/**
 * AppLayout
 *
 * This is the main layout for authenticated users.
 *
 * Students, teachers and administrators will use
 * this general application shell.
 *
 * The actual content changes depending on the
 * user's role.
 */

import {
  Home,
  MessageCircle,
  Bell,
  UserPlus,
  User,
  Settings,
} from "lucide-react";

import { NavLink, Outlet } from "react-router-dom";

/**
 * Navigation items shared by the main application.
 *
 * Later we can customize these depending on the
 * user's role.
 */
const navigationItems = [
  {
    label: "Home",
    path: "/home",
    icon: Home,
  },
  {
    label: "Messages",
    path: "/messages",
    icon: MessageCircle,
  },
  {
    label: "Notifications",
    path: "/notifications",
    icon: Bell,
  },
  {
    label: "Requests",
    path: "/requests",
    icon: UserPlus,
  },
  {
    label: "Profile",
    path: "/profile",
    icon: User,
  },
  {
    label: "Settings",
    path: "/settings",
    icon: Settings,
  },
];

function AppLayout() {
  return (
    <div className="min-h-screen bg-slate-50">

      {/* =====================================================
          DESKTOP SIDEBAR
          Hidden on small screens.
          ===================================================== */}

      <aside
        className="
          fixed
          left-0
          top-0
          hidden
          h-screen
          w-64
          border-r
          border-slate-200
          bg-white
          lg:block
        "
      >

        {/* Application logo/name */}
        <div className="flex h-20 items-center px-6">

          <div
            className="
              flex
              h-10
              w-10
              items-center
              justify-center
              rounded-xl
              bg-purple-600
              text-white
            "
          >
            🎓
          </div>

          <div className="ml-3">
            <h1 className="font-bold text-slate-900">
              UniVerse
            </h1>

            <p className="text-xs text-slate-500">
              University Social
            </p>
          </div>

        </div>

        {/* Navigation */}
        <nav className="px-4 py-4">

          {navigationItems.map((item) => {

            /*
             * Extract the icon component from the
             * navigation item.
             */
            const Icon = item.icon;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `
                  mb-2
                  flex
                  items-center
                  gap-3
                  rounded-xl
                  px-4
                  py-3
                  text-sm
                  font-medium
                  transition

                  ${
                    isActive
                      ? "bg-purple-50 text-purple-700"
                      : "text-slate-600 hover:bg-slate-50"
                  }
                  `
                }
              >

                <Icon size={20} />

                {item.label}

              </NavLink>
            );
          })}

        </nav>

      </aside>


      {/* =====================================================
          MOBILE TOP HEADER
          Visible only on mobile/tablet.
          ===================================================== */}

      <header
        className="
          sticky
          top-0
          z-40
          border-b
          border-slate-200
          bg-white
          lg:hidden
        "
      >

        <div
          className="
            flex
            h-16
            items-center
            justify-between
            px-4
          "
        >

          <div className="flex items-center gap-2">

            <div
              className="
                flex
                h-9
                w-9
                items-center
                justify-center
                rounded-lg
                bg-purple-600
                text-white
              "
            >
              🎓
            </div>

            <span className="font-bold text-slate-900">
              UniVerse
            </span>

          </div>

          <button
            className="
              rounded-full
              p-2
              text-slate-600
              hover:bg-slate-100
            "
            aria-label="Notifications"
          >
            <Bell size={21} />
          </button>

        </div>

      </header>


      {/* =====================================================
          MAIN CONTENT
          ===================================================== */}

      <main
        className="
          min-h-screen
          pb-20
          lg:ml-64
          lg:pb-0
        "
      >

        {/*
          React Router inserts the selected page here.
        */}

        <Outlet />

      </main>


      {/* =====================================================
          MOBILE BOTTOM NAVIGATION
          Hidden on desktop.
          ===================================================== */}

      <nav
        className="
          fixed
          bottom-0
          left-0
          right-0
          z-50
          border-t
          border-slate-200
          bg-white
          lg:hidden
        "
      >

        <div className="grid grid-cols-5">

          {navigationItems
            .filter((item) =>
              [
                "/home",
                "/messages",
                "/notifications",
                "/requests",
                "/profile",
              ].includes(item.path)
            )
            .map((item) => {

              const Icon = item.icon;

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `
                    flex
                    flex-col
                    items-center
                    justify-center
                    gap-1
                    py-3
                    text-xs

                    ${
                      isActive
                        ? "text-purple-600"
                        : "text-slate-500"
                    }
                    `
                  }
                >

                  <Icon size={21} />

                  <span>{item.label}</span>

                </NavLink>
              );
            })}

        </div>

      </nav>

    </div>
  );
}

export default AppLayout;