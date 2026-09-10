/**
 * PublicLayout
 *
 * This layout contains pages that can be accessed
 * without being authenticated.
 *
 * Examples:
 * - Landing page
 * - Login
 * - Signup
 * - Forgot password
 */

import { Outlet } from "react-router-dom";

function PublicLayout() {
  return (
    <div className="min-h-screen bg-slate-50">
      {/*
        Outlet is where React Router will render
        the currently selected child route.
      */}
      <Outlet />
    </div>
  );
}

export default PublicLayout;