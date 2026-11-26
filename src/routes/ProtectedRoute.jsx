
import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const ROLE_ROUTES = {
  student: "/student-home",
  teacher: "/teacher-home",
  admin: "/admin-home",
  super_admin: "/super-admin-home",
};

export default function ProtectedRoute({
  children,
  allowedRoles,
  allowBanned = false,
}) {
  const {
    user,
    profile,
    loading,
    ban,
    banLoading,
    banCheckError,
  } = useAuth();

  // 1. Wait for authentication restoration.
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--page-bg)]">
        <div className="text-center">
          <div className="text-4xl animate-pulse">⏳</div>
          <p className="mt-4 text-[var(--text-secondary)]">
            Restoring your session...
          </p>
        </div>
      </div>
    );
  }

  // 2. User is not authenticated.
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // 3. Wait for ban verification.
  if (banLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--page-bg)]">
        <p className="text-[var(--text-secondary)]">
          Verifying your account status...
        </p>
      </div>
    );
  }

  // 4. Fail safely if ban status cannot be verified.
  if (banCheckError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--page-bg)] px-4">
        <div className="max-w-md text-center">
          <h2 className="text-xl font-bold text-[var(--text-primary)]">
            Unable to verify your account
          </h2>

          <p className="mt-3 text-sm text-[var(--text-secondary)]">
            We couldn't verify your account suspension status.
            Please check your internet connection and try again.
          </p>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-5 rounded-lg bg-purple-600 px-5 py-3 font-semibold text-white hover:bg-purple-700"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  // 5. Authenticated user has no profile.
  if (!profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--page-bg)] px-4">
        <div className="max-w-md text-center">
          <h2 className="text-xl font-bold text-[var(--text-primary)]">
            Account profile unavailable
          </h2>

          <p className="mt-3 text-sm text-[var(--text-secondary)]">
            We could not load your university profile.
            Please try again or contact the university administrator.
          </p>
        </div>
      </div>
    );
  }

  const dashboard = ROLE_ROUTES[profile.role];

  // 6. Validate role.
  if (!dashboard) {
    return <Navigate to="/unauthorized" replace />;
  }

  // 7. Special access for the account-banned page.
  if (allowBanned) {
    // Only currently banned users can access this page.
    if (ban) {
      return children;
    }

    // If the ban has been lifted, return to the dashboard.
    return <Navigate to={dashboard} replace />;
  }

  // 8. Redirect banned users away from normal protected pages.
  if (ban) {
    return <Navigate to="/account-banned" replace />;
  }

  // 9. Account is inactive.
  if (profile.is_active !== true) {
    return <Navigate to="/account-disabled" replace />;
  }

  // 10. Check role authorization.
  if (
    allowedRoles &&
    !allowedRoles.includes(profile.role)
  ) {
    return <Navigate to={dashboard} replace />;
  }

  // 11. Authorized.
  return children;
}
