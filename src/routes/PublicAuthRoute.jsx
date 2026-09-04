import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

export default function PublicAuthRoute({ children }) {
    const {
        user,
        profile,
        loading
    } = useAuth();

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

    if (!user) {
        return children;
    }

    if (!profile) {
        return children;
    }

    if (profile.is_active === false) {
        return children;
    }

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