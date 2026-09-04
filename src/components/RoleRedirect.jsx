import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

/*
 * ============================================================
 * ROLE REDIRECT
 * ============================================================
 *
 * This component checks whether the user is already logged in.
 *
 * If the user already has a valid session, we automatically
 * send them to the correct home page according to their role.
 *
 * This is especially important when:
 *
 * 1. The user closes the browser.
 * 2. Opens the browser again.
 * 3. Visits the application.
 *
 * Supabase restores the session and this component sends the
 * user directly to their appropriate home screen.
 * ============================================================
 */

export default function RoleRedirect() {
    const {
        user,
        profile,
        loading
    } = useAuth();

    /*
     * --------------------------------------------------------
     * Wait until AuthContext finishes checking Supabase.
     * --------------------------------------------------------
     *
     * We MUST NOT redirect while loading.
     *
     * Otherwise, the application might think the user is
     * logged out for a moment while Supabase is restoring
     * the existing session.
     */
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="text-3xl animate-pulse">
                        ⏳
                    </div>

                    <p className="mt-3 text-gray-600">
                        Restoring your session...
                    </p>
                </div>
            </div>
        );
    }

    /*
     * --------------------------------------------------------
     * No authenticated user.
     * --------------------------------------------------------
     *
     * The user is allowed to remain on the public page.
     */
    if (!user || !profile) {
        return <Navigate to="/landing-page" replace />;
    }

    /*
     * --------------------------------------------------------
     * Make sure the account is active.
     * --------------------------------------------------------
     */
    if (profile.is_active === false) {
        return <Navigate to="/login" replace />;
    }

    /*
     * --------------------------------------------------------
     * Redirect according to the user's role.
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

        /*
         * ----------------------------------------------------
         * Unknown role.
         * ----------------------------------------------------
         */
        default:
            return (
                <Navigate
                    to="/unauthorized"
                    replace
                />
            );
    }
}