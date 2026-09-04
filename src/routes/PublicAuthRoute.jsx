import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

/*
 * ============================================================
 * PUBLIC AUTH ROUTE
 * ============================================================
 *
 * This route is used for pages such as:
 *
 * /login
 * /signup
 *
 * If the user is NOT logged in:
 *     → show the Login or Signup page.
 *
 * If the user IS already logged in:
 *     → automatically send them to their role-based home.
 *
 * This prevents an already-authenticated user from seeing
 * the login/signup screen again.
 * ============================================================
 */

export default function PublicAuthRoute({ children }) {

    const {
        user,
        profile,
        loading
    } = useAuth();

    /*
     * --------------------------------------------------------
     * Wait for Supabase to restore the existing session.
     * --------------------------------------------------------
     */
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">

                    <div className="text-4xl animate-pulse">
                        ⏳
                    </div>

                    <p className="mt-4 text-gray-600">
                        Restoring your session...
                    </p>

                </div>
            </div>
        );
    }

    /*
     * --------------------------------------------------------
     * No authenticated user.
     *
     * Show the requested public authentication page.
     * --------------------------------------------------------
     */
    if (!user) {
        return children;
    }

    /*
     * --------------------------------------------------------
     * We have a user but are still missing the profile.
     *
     * Don't incorrectly redirect to a role home.
     * --------------------------------------------------------
     */
    if (!profile) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">

                    <div className="text-4xl animate-pulse">
                        ⏳
                    </div>

                    <p className="mt-4 text-gray-600">
                        Loading your profile...
                    </p>

                </div>
            </div>
        );
    }

    /*
     * --------------------------------------------------------
     * Check account status.
     * --------------------------------------------------------
     */
    if (profile.is_active === false) {
        return children;
    }

    /*
     * --------------------------------------------------------
     * Send authenticated users to their correct home.
     * --------------------------------------------------------
     */
    switch (profile.role) {

        case "student":
            return (
                <Navigate
                    to="/student-home"
                    replace
                />
            );

        case "teacher":
            return (
                <Navigate
                    to="/teacher-home"
                    replace
                />
            );

        case "admin":
            return (
                <Navigate
                    to="/admin-home"
                    replace
                />
            );

        case "super_admin":
            return (
                <Navigate
                    to="/super-admin-home"
                    replace
                />
            );

        default:
            return (
                <Navigate
                    to="/unauthorized"
                    replace
                />
            );
    }
}