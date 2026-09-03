/**
 * ============================================================
 * APPLICATION ROUTING
 * ============================================================
 *
 * This file controls navigation throughout the application.
 *
 * React Router determines which page is displayed based
 * on the current URL.
 *
 * Authentication and role-based access are handled through
 * ProtectedRoute.
 *
 * Available roles:
 *
 * student
 * teacher
 * admin
 * super_admin
 *
 * ============================================================
 */

import {
    BrowserRouter,
    Routes,
    Route,
    Navigate
} from "react-router-dom";


// ============================================================
// LAYOUTS
// ============================================================

import PublicLayout from "../layouts/PublicLayout";
import AppLayout from "../layouts/AppLayout";


// ============================================================
// ROUTE PROTECTION
// ============================================================

import ProtectedRoute from "./ProtectedRoute";


// ============================================================
// PUBLIC PAGES
// ============================================================

import LandingPage from "../pages/LandingPage";

import Login from "../pages/auth/LoginPage";

import Signup from "../pages/auth/Signup/SignUpPage";

import ForgotPasswordPage
    from "../pages/auth/ForgotPasswordPage";


// ============================================================
// APPLICATION HOME PAGES
// ============================================================

import StudentsHome from "../pages/StudentsHome";

import AdminHome from "../pages/AdminHome";

import SuperAdminHome from "../pages/SuperAdminHome";


// ============================================================
// TEACHER HOME
// ============================================================
//
// IMPORTANT:
//
// We now separate teacher and administrator navigation.
//
// Teacher:
//     /teacher-home
//
// Administrator:
//     /admin-home
//
// If TeacherHome.jsx does not exist yet, create it next.
// ============================================================

import TeacherHome from "../pages/TeacherHome";


// ============================================================
// APPLICATION PAGES
// ============================================================

import CreatePost from "../pages/CreatePost";

import MessagesPage from "../pages/MessagesPage";

import NotificationsPage from "../pages/NotificationsPage";

import RequestsPage from "../pages/RequestsPage";

import ProfilePage from "../pages/ProfilePage";

import SettingsPage from "../pages/SettingsPage";


// ============================================================
// APP ROUTES COMPONENT
// ============================================================

function AppRoutes() {

    return (

        <BrowserRouter>

            <Routes>


                {/* =================================================
                    PUBLIC ROUTES
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


                <Route
                    path="/login"
                    element={
                        <Login />
                    }
                />


                <Route
                    path="/signup"
                    element={
                        <Signup />
                    }
                />


                <Route
                    path="/forgot-password"
                    element={
                        <ForgotPasswordPage />
                    }
                />


                {/* =================================================
                    STUDENT HOME
                =================================================
                
                Only authenticated students can access this page.
                */}

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
                =================================================
                
                Only teachers can access this page.
                */}

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
                =================================================
                
                Only administrators can access this page.
                */}

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
                =================================================
                
                Only Super Admins can access this page.
                */}

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
                =================================================
                
                Any authenticated user can create a post.
                
                Student
                Teacher
                Admin
                Super Admin
                */}

                <Route
                    path="/create-post"
                    element={

                        <ProtectedRoute>

                            <CreatePost />

                        </ProtectedRoute>

                    }
                />


                {/* =================================================
                    MESSAGES
                =================================================
                
                Any authenticated user can access messaging.
                */}

                <Route
                    path="/messages"
                    element={

                        <ProtectedRoute>

                            <MessagesPage />

                        </ProtectedRoute>

                    }
                />


                {/* =================================================
                    NOTIFICATIONS
                =================================================
                
                Any authenticated user can access notifications.
                */}

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
                =================================================
                
                Any authenticated user can access requests.
                
                The actual request permissions will be controlled
                by the database/RLS and application logic.
                */}

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
                =================================================
                
                Every authenticated user has a profile.
                
                This page will eventually allow users to:
                
                - Change profile photo
                - Change bio
                - Edit username
                - View posts
                - View profile information
                ================================================= */}

                <Route
                    path="/profile"
                    element={

                        <ProtectedRoute>

                            <ProfilePage />

                        </ProtectedRoute>

                    }
                />


                {/* =================================================
                    SETTINGS
                =================================================
                
                Any authenticated user can access settings.
                */}

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
                =================================================
                
                Displayed when a logged-in user attempts to access
                a page that their role is not allowed to access.
                */}

                <Route
                    path="/unauthorized"
                    element={

                        <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">

                            <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-sm">

                                <h1 className="text-4xl font-bold text-gray-900">
                                    Access Denied
                                </h1>


                                <p className="mt-3 text-gray-600">
                                    You do not have permission to
                                    access this page.
                                </p>


                                <button
                                    type="button"
                                    onClick={() => {
                                        window.history.back();
                                    }}
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
                =================================================
                
                Any URL that doesn't exist is redirected to
                the landing page.
                
                We intentionally have ONLY ONE wildcard route.
                */}

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