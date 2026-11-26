
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Link,
} from "react-router-dom";

import { useAuth } from "../contexts/AuthContext";

import ProtectedRoute from "./ProtectedRoute";
import PublicAuthRoute from "./PublicAuthRoute";

// Public pages
import LandingPage from "../pages/LandingPage";
import Login from "../pages/auth/LoginPage";
import Signup from "../pages/auth/Signup/SignUpPage";
import ForgotPasswordPage from "../pages/auth/ForgotPasswordPage";

// Home pages
import StudentsHome from "../pages/StudentsHome";
import TeacherHome from "../pages/TeacherHome";
import AdminHome from "../pages/AdminHome";
import SuperAdminHome from "../pages/SuperAdminHome";
import PublicProfilePage from "../pages/PublicProfilePage";

// Application pages
import CreatePost from "../pages/CreatePost";
import MessagesPage from "../pages/MessagesPage";
import NotificationsPage from "../pages/NotificationsPage";
import RequestsPage from "../pages/RequestsPage";
import ProfilePage from "../pages/ProfilePage";
import SettingsPage from "../pages/SettingsPage";
import SearchPage from "../pages/SearchPage";

// Account pages
import AccountBanned from "../pages/AccountBanned";


/*
 * ============================================================
 * DEFAULT HOME REDIRECT
 * ============================================================
 */

function HomeRedirect() {
  const {
    user,
    profile,
    loading,
    ban,
    banLoading,
    banCheckError,
  } = useAuth();

  if (loading || banLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--page-bg)]">
        <p className="text-[var(--text-secondary)]">
          Loading your account...
        </p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/landing-page" replace />;
  }

  if (banCheckError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--page-bg)] px-4">
        <div className="max-w-md text-center">
          <h2 className="text-xl font-bold text-[var(--text-primary)]">
            Unable to verify your account
          </h2>

          <p className="mt-3 text-[var(--text-secondary)]">
            We couldn't verify your account suspension status.
            Please try again.
          </p>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-5 rounded-lg bg-purple-600 px-5 py-3 font-semibold text-white"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!profile) {
    return <Navigate to="/login" replace />;
  }

  // Banned users must see the account-banned page.
  if (ban) {
    return <Navigate to="/account-banned" replace />;
  }

  const destinations = {
    student: "/student-home",
    teacher: "/teacher-home",
    admin: "/admin-home",
    super_admin: "/super-admin-home",
  };

  return (
    <Navigate
      to={destinations[profile.role] || "/unauthorized"}
      replace
    />
  );
}


/*
 * ============================================================
 * APP ROUTES
 * ============================================================
 */

function AppRoutes() {
  return (
    <BrowserRouter>
      <Routes>

        {/* DEFAULT */}
        <Route path="/" element={<HomeRedirect />} />

        {/* PUBLIC LANDING PAGE */}
        <Route
          path="/landing-page"
          element={<LandingPage />}
        />

        {/* LOGIN */}
        <Route
          path="/login"
          element={
            <PublicAuthRoute>
              <Login />
            </PublicAuthRoute>
          }
        />

        {/* SIGNUP */}
        <Route
          path="/signup"
          element={
            <PublicAuthRoute>
              <Signup />
            </PublicAuthRoute>
          }
        />

        {/* FORGOT PASSWORD */}
        <Route
          path="/forgot-password"
          element={<ForgotPasswordPage />}
        />

        {/* STUDENT HOME */}
        <Route
          path="/student-home"
          element={
            <ProtectedRoute allowedRoles={["student"]}>
              <StudentsHome />
            </ProtectedRoute>
          }
        />

        {/* TEACHER HOME */}
        <Route
          path="/teacher-home"
          element={
            <ProtectedRoute allowedRoles={["teacher"]}>
              <TeacherHome />
            </ProtectedRoute>
          }
        />

        {/* ADMIN HOME */}
        <Route
          path="/admin-home"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminHome />
            </ProtectedRoute>
          }
        />

        {/* SUPER ADMIN HOME */}
        <Route
          path="/super-admin-home"
          element={
            <ProtectedRoute allowedRoles={["super_admin"]}>
              <SuperAdminHome />
            </ProtectedRoute>
          }
        />

        {/* CREATE POST */}
        <Route
          path="/create-post"
          element={
            <ProtectedRoute>
              <CreatePost />
            </ProtectedRoute>
          }
        />

        {/* SEARCH */}
        <Route
          path="/search"
          element={
            <ProtectedRoute>
              <SearchPage />
            </ProtectedRoute>
          }
        />

        {/* MESSAGES */}
        <Route
          path="/messages"
          element={
            <ProtectedRoute
              allowedRoles={["student", "teacher", "admin"]}
            >
              <MessagesPage />
            </ProtectedRoute>
          }
        />

        {/* NOTIFICATIONS */}
        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <NotificationsPage />
            </ProtectedRoute>
          }
        />

        {/* REQUESTS */}
        <Route
          path="/requests"
          element={
            <ProtectedRoute>
              <RequestsPage />
            </ProtectedRoute>
          }
        />

        {/* PROFILE */}
        <Route
          path="/profile"
          element={
            <ProtectedRoute
              allowedRoles={[
                "student",
                "teacher",
                "admin",
                "super_admin",
              ]}
            >
              <ProfilePage />
            </ProtectedRoute>
          }
        />

        {/* PUBLIC USER PROFILE */}
<Route
  path="/profile/:userId"
  element={
    <ProtectedRoute
      allowedRoles={[
        "student",
        "teacher",
        "admin",
        "super_admin",
      ]}
    >
      <PublicProfilePage />
    </ProtectedRoute>
  }
/>

        {/* SETTINGS */}
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <SettingsPage />
            </ProtectedRoute>
          }
        />

        {/* ACCOUNT BANNED */}
        <Route
          path="/account-banned"
          element={
            <ProtectedRoute allowBanned>
              <AccountBanned />
            </ProtectedRoute>
          }
        />

        {/* ACCOUNT DISABLED */}
        <Route
          path="/account-disabled"
          element={
            <div className="flex min-h-screen items-center justify-center bg-[var(--page-bg)] px-4">
              <div className="w-full max-w-md rounded-2xl bg-[var(--surface)] p-8 text-center shadow-sm">
                <h1 className="text-2xl font-bold text-[var(--text-primary)]">
                  Account unavailable
                </h1>

                <p className="mt-3 text-[var(--text-secondary)]">
                  Your university account is currently inactive.
                  Please contact your university administrator
                  for assistance.
                </p>
              </div>
            </div>
          }
        />

        {/* ACCOUNT UNAVAILABLE */}
        <Route
          path="/account-unavailable"
          element={
            <div className="flex min-h-screen items-center justify-center bg-[var(--page-bg)] px-4">
              <div className="w-full max-w-md rounded-2xl bg-[var(--surface)] p-8 text-center shadow-sm">
                <h1 className="text-2xl font-bold text-[var(--text-primary)]">
                  Profile unavailable
                </h1>

                <p className="mt-3 text-[var(--text-secondary)]">
                  Your account exists, but your university profile
                  could not be loaded. Please contact the administrator.
                </p>
              </div>
            </div>
          }
        />

        {/* UNAUTHORIZED */}
        <Route
          path="/unauthorized"
          element={
            <div className="flex min-h-screen items-center justify-center bg-[var(--page-bg)] px-4">
              <div className="w-full max-w-md rounded-2xl bg-[var(--surface)] p-8 text-center shadow-sm">
                <h1 className="text-3xl font-bold text-[var(--text-primary)]">
                  Access Denied
                </h1>

                <p className="mt-3 text-[var(--text-secondary)]">
                  You do not have permission to access this page.
                </p>

                <Link
                  to="/"
                  className="mt-6 inline-block rounded-lg bg-purple-600 px-5 py-3 font-semibold text-white hover:bg-purple-700"
                >
                  Return to your home
                </Link>
              </div>
            </div>
          }
        />

        {/* UNKNOWN ROUTES */}
        <Route
          path="*"
          element={<Navigate to="/" replace />}
        />

      </Routes>
    </BrowserRouter>
  );
}

export default AppRoutes;
