/**
 * Application routing configuration.
 *
 * React Router determines which page should be
 * displayed based on the current URL.
 *
 * Authentication and role-based protection will be
 * added later after Supabase Auth is implemented.
 */

import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

/**
 * Layouts
 */
import PublicLayout from "../layouts/PublicLayout";
import AppLayout from "../layouts/AppLayout";
import ProtectedRoute from "./ProtectedRoute";

/**
 * Public pages
 */
import CreatePost from "../pages/CreatePost";
import LandingPage from "../pages/LandingPage";
import Login from "../pages/auth/LoginPage";
import Signup from "../pages/auth/SignUpPage";
import ForgotPasswordPage
  from "../pages/auth/ForgotPasswordPage";
//import VerifyEmail from "../pages/VerifyEmail";
//import AuthCallback from "../pages/AuthCallback";  

/**
 * Application pages
 */
import AdminHome from "../pages/AdminHome";
import SuperAdminHome from "../pages/SuperAdminHome";
import StudentsHome from "../pages/StudentsHome";
import MessagesPage from "../pages/MessagesPage";
import NotificationsPage from "../pages/NotificationsPage";
import RequestsPage from "../pages/RequestsPage";
import ProfilePage from "../pages/ProfilePage";
import SettingsPage from "../pages/SettingsPage";

function AppRoutes() {
  return (
    <BrowserRouter>

           <Routes>

            {/* =================================================
                PUBLIC ROUTES
            ================================================= */}

            <Route
                path="/landing-page"
                element={<LandingPage />}
            />
            <Route
                path="/login"
                element={<Login />}
            />


            <Route
                path="/signup"
                element={<Signup />}
            />


            {/* =================================================
                STUDENT HOME
                Only students can access this page.
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
                ADMIN / TEACHER HOME
                Teachers and admins can access this page.
            ================================================= */}

            <Route
                path="/admin-home"
                element={

                    <ProtectedRoute
                        allowedRoles={[
                            "teacher",
                            "admin"
                        ]}
                    >

                        <AdminHome />

                    </ProtectedRoute>
                }
            />


            {/* =================================================
                SUPER ADMIN HOME
                Only super admins can access this page.
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
             <Route
                    path="/create-post"
                      element={
                        <ProtectedRoute>

                            <CreatePost />
                            
                        </ProtectedRoute>
                    }
             />


            {/* =================================================
                UNAUTHORIZED
            ================================================= */}

            <Route
                path="/unauthorized"
                element={

                    <div className="min-h-screen flex items-center justify-center">

                        <div className="text-center">

                            <h1 className="text-4xl font-bold">
                                Access Denied
                            </h1>

                            <p className="mt-3 text-gray-600">
                                You do not have permission
                                to access this page.
                            </p>

                        </div>

                    </div>
                }
            />


            {/* =================================================
                DEFAULT ROUTE
            ================================================= */}

            <Route
                path="*"
                element={
                    <Navigate
                        to="/login"
                        replace
                    />
                }
            />

        

          <Route
            path="/messages"
            element={<MessagesPage />}
          />

          <Route
            path="/notifications"
            element={<NotificationsPage />}
          />

          <Route
            path="/requests"
            element={<RequestsPage />}
          />

          <Route
            path="/profile"
            element={<ProfilePage />}
          />

          <Route
            path="/settings"
            element={<SettingsPage />}
          />

        


        {/* =================================================
            FALLBACK ROUTE
            ================================================= */}

        <Route
          path="*"
          element={<Navigate to="/" replace />}
        />

      </Routes>

    </BrowserRouter>
  );
}

export default AppRoutes;