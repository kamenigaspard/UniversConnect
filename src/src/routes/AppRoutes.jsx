/**
 * ============================================================
 * APPLICATION ROUTING
 * ============================================================
 *
 * This file controls navigation throughout the application.
 *
 * Roles:
 *
 * - student
 * - teacher
 * - admin
 * - super_admin
 *
 * Authentication is handled through AuthContext.
 *
 * ProtectedRoute:
 *     Protects authenticated application pages.
 *
 * PublicAuthRoute:
 *     Allows logged-out users to access Login/Signup.
 *     Automatically redirects already-authenticated users
 *     to their correct home screen.
 * ============================================================
 */

import {
    BrowserRouter,
    Routes,
    Route,
    Navigate
} from "react-router-dom";

/*
 * ============================================================
 * ROUTE PROTECTION
 * ============================================================
 */

import ProtectedRoute from "./ProtectedRoute";
import PublicAuthRoute from "./PublicAuthRoute";


/*
 * ============================================================
 * PUBLIC PAGES
 * ============================================================
 */

import LandingPage from "../pages/LandingPage";

import Login from "../pages/auth/LoginPage";

import Signup from "../pages/auth/Signup/SignUpPage";

import ForgotPasswordPage
    from "../pages/auth/ForgotPasswordPage";


/*
 * ============================================================
 * HOME PAGES
 * ============================================================
 */

import StudentsHome from "../pages/StudentsHome";

import TeacherHome from "../pages/TeacherHome";

import AdminHome from "../pages/AdminHome";

import SuperAdminHome from "../pages/SuperAdminHome";


/*
 * ============================================================
 * APPLICATION PAGES
 * ============================================================
 */

import CreatePost from "../pages/CreatePost";

import MessagesPage from "../pages/MessagesPage";

import NotificationsPage from "../pages/NotificationsPage";

import RequestsPage from "../pages/RequestsPage";

import ProfilePage from "../pages/ProfilePage";

import SettingsPage from "../pages/SettingsPage";

import SearchPage from "../pages/SearchPage";

/*
 * ============================================================
 * APP ROUTES
 * ============================================================
 */

function AppRoutes() {

    return (

        <BrowserRouter>

            <Routes>

                {/* =================================================
                    PUBLIC LANDING PAGE
                ================================================= */}

                <Route
                    path="/"
                    element={
                        <Navigate
                            to="/landing-page"
                            replace
                        />
                    }
                />

                <Route
                    path="/landing-page"
                    element={
                        <LandingPage />
                    }
                />


                {/* =================================================
                    LOGIN
                =================================================
                
                Logged-out users:
                    → Login page

                Already authenticated users:
                    → Correct role home
                ================================================= */}

                <Route
                    path="/login"
                    element={

                        <PublicAuthRoute>

                            <Login />

                        </PublicAuthRoute>

                    }
                />


                {/* =================================================
                    SIGNUP
                =================================================
                
                Logged-out users:
                    → Signup page

                Already authenticated users:
                    → Correct role home
                ================================================= */}

                <Route
                    path="/signup"
                    element={

                        <PublicAuthRoute>

                            <Signup />

                        </PublicAuthRoute>

                    }
                />


                {/* =================================================
                    FORGOT PASSWORD
                ================================================= */}

                <Route
                    path="/forgot-password"
                    element={
                        <ForgotPasswordPage />
                    }
                />


                {/* =================================================
                    STUDENT HOME
                ================================================= */}

                <Route
                    path="/student-home"
                    element={

                        <ProtectedRoute
                            allowedRoles={[
                                "student"
                            ]}
                        >

                            <StudentsHome />

                        </ProtectedRoute>

                    }
                />


                {/* =================================================
                    TEACHER HOME
                ================================================= */}

                <Route
                    path="/teacher-home"
                    element={

                        <ProtectedRoute
                            allowedRoles={[
                                "teacher"
                            ]}
                        >

                            <TeacherHome />

                        </ProtectedRoute>

                    }
                />


                {/* =================================================
                    ADMIN HOME
                ================================================= */}

                <Route
                    path="/admin-home"
                    element={

                        <ProtectedRoute
                            allowedRoles={[
                                "admin"
                            ]}
                        >

                            <AdminHome />

                        </ProtectedRoute>

                    }
                />


                {/* =================================================
                    SUPER ADMIN HOME
                ================================================= */}

                <Route
                    path="/super-admin-home"
                    element={

                        <ProtectedRoute
                            allowedRoles={[
                                "super_admin"
                            ]}
                        >

                            <SuperAdminHome />

                        </ProtectedRoute>

                    }
                />


                {/* =================================================
                    CREATE POST
                ================================================= */}

                <Route
                    path="/create-post"
                    element={

                        <ProtectedRoute>

                            <CreatePost />

                        </ProtectedRoute>

                    }
                />


                {/* =================================================
                    SEARCH
                ================================================= */}


                <Route
                    path="/search"
                    element={

                        <ProtectedRoute>

                            <SearchPage />

                        </ProtectedRoute>

                    }
                />

                {/* =================================================
                    MESSAGES
                ================================================= */}
            <Route
                    path="/messages"
                    element={
                        <ProtectedRoute
                        allowedRoles={[
                            "student",
                            "teacher",
                            "admin",
                            "super_admin",
                        ]}
                        >
                        <MessagesPage />
                        </ProtectedRoute>
                    }
            />


                {/* =================================================
                    NOTIFICATIONS
                ================================================= */}

                <Route
                    path="/notifications"
                    element={

                        <ProtectedRoute>

                            <NotificationsPage />

                        </ProtectedRoute>

                    }
                />


                {/* =================================================
                    REQUESTS
                ================================================= */}

                <Route
                    path="/requests"
                    element={

                        <ProtectedRoute>

                            <RequestsPage />

                        </ProtectedRoute>

                    }
                />


                {/* =================================================
                    PROFILE
                ================================================= */}
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

                {/* =================================================
                    SETTINGS
                ================================================= */}

                <Route
                    path="/settings"
                    element={

                        <ProtectedRoute>

                            <SettingsPage />

                        </ProtectedRoute>

                    }
                />


                {/* =================================================
                    UNAUTHORIZED
                ================================================= */}

                <Route
                    path="/unauthorized"
                    element={

                        <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">

                            <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-sm">

                                <h1 className="text-4xl font-bold text-gray-900">
                                    Access Denied
                                </h1>

                                <p className="mt-3 text-gray-600">
                                    You do not have permission to access this page.
                                </p>

                                <button
                                    type="button"
                                    onClick={() => window.history.back()}
                                    className="mt-6 rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
                                >
                                    Go Back
                                </button>

                            </div>

                        </div>

                    }
                />


                {/* =================================================
                    UNKNOWN ROUTES
                ================================================= */}

                <Route
                    path="*"
                    element={
                        <Navigate
                            to="/landing-page"
                            replace
                        />
                    }
                />

            </Routes>

        </BrowserRouter>

    );
}


export default AppRoutes;