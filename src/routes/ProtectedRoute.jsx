import { Navigate } from "react-router-dom";

import { useAuth } from "../contexts/AuthContext";


export default function ProtectedRoute({
    children,
    allowedRoles
}) {

    const {
        user,
        profile,
        loading
    } = useAuth();


    // ========================================================
    // WAIT FOR AUTHENTICATION CHECK
    // ========================================================

    if (loading) {

        return (

            <div className="min-h-screen flex items-center justify-center">

                <div className="text-center">

                    <div className="text-3xl">
                        ⏳
                    </div>

                    <p className="mt-3 text-gray-600">
                        Loading...
                    </p>

                </div>

            </div>
        );
    }


    // ========================================================
    // USER IS NOT LOGGED IN
    // ========================================================

    if (!user) {

        return (
            <Navigate
                to="/login"
                replace
            />
        );
    }


    // ========================================================
    // PROFILE DOES NOT EXIST
    // ========================================================

    if (!profile) {

        return (
            <Navigate
                to="/login"
                replace
            />
        );
    }


    // ========================================================
    // CHECK ROLE
    // ========================================================

    if (
        allowedRoles && profile?.role && !allowedRoles.includes(
            profile.role
        )
    ) {

        return (
            <Navigate
                to="/unauthorized"
                replace
            />
        );
    }


    // ========================================================
    // USER IS AUTHORIZED
    // ========================================================

    return children;
}