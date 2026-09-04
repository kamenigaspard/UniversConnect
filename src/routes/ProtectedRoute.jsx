import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

/*
 * ============================================================
 * PROTECTED ROUTE
 * ============================================================
 *
 * This component protects pages that require authentication.
 *
 * Examples:
 *
 * /student-home
 * /teacher-home
 * /admin-home
 * /super-admin-home
 * /messages
 * /notifications
 * /profile
 * /settings
 *
 * It also supports role-based authorization.
 * ============================================================
 */

export default function ProtectedRoute({
    children,
    allowedRoles
}) {

    const {
        user,
        profile,
        loading
    } = useAuth();

    /*
     * --------------------------------------------------------
     * STEP 1
     * Wait for Supabase session restoration.
     * --------------------------------------------------------
     *
     * This is VERY important.
     *
     * When the browser starts, Supabase may need a moment to
     * restore the existing session from browser storage.
     *
     * We don't want to redirect the user to login during
     * that moment.
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
     * STEP 2
     * No authenticated user.
     * --------------------------------------------------------
     */
    if (!user) {
        return (
            <Navigate
                to="/login"
                replace
            />
        );
    }

    /*
     * --------------------------------------------------------
     * STEP 3
     * User exists but profile could not be loaded.
     * --------------------------------------------------------
     */
    if (!profile) {
        return (
            <Navigate
                to="/login"
                replace
            />
        );
    }

    /*
     * --------------------------------------------------------
     * STEP 4
     * Check whether the account is active.
     * --------------------------------------------------------
     */
    if (profile.is_active === false) {
        return (
            <Navigate
                to="/login"
                replace
            />
        );
    }

    /*
     * --------------------------------------------------------
     * STEP 5
     * Check role permissions.
     * --------------------------------------------------------
     *
     * Example:
     *
     * <ProtectedRoute allowedRoles={["student"]}>
     *
     * Only students can access the page.
     */
    if (
        allowedRoles &&
        !allowedRoles.includes(profile.role)
    ) {
        return (
            <Navigate
                to="/unauthorized"
                replace
            />
        );
    }

    /*
     * --------------------------------------------------------
     * STEP 6
     * User is authenticated and authorized.
     * --------------------------------------------------------
     */
    return children;
}