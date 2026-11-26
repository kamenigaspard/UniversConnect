
import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const ROLE_ROUTES = {
  student: "/student-home",
  teacher: "/teacher-home",
  admin: "/admin-home",
  super_admin: "/super-admin-home",
};

export default function PublicAuthRoute({ children }) {
  const { user, profile, loading } = useAuth();

  // 1. Wait for Supabase session restoration
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

  // 2. Logged-out users can access Login and Signup
  if (!user) {
    return children;
  }

  // 3. Authenticated user has no profile
  if (!profile) {
    return (
      <Navigate
        to="/account-unavailable"
        replace
      />
    );
  }

  // 4. Account is inactive
  if (profile.is_active !== true) {
    return (
      <Navigate
        to="/account-disabled"
        replace
      />
    );
  }

  // 5. Redirect according to database-assigned role
  const destination = ROLE_ROUTES[profile.role];

  if (!destination) {
    return (
      <Navigate
        to="/unauthorized"
        replace
      />
    );
  }

  return (
    <Navigate
      to={destination}
      replace
    />
  );
}
