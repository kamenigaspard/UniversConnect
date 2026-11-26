
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Lock,
  Mail,
  ArrowRight,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";

export default function Login() {
  const navigate = useNavigate();
  const { signIn } = useAuth();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    if (error) setError("");
  };

  const redirectByRole = (role) => {
    const routes = {
      student: "/student-home",
      teacher: "/teacher-home",
      admin: "/admin-home",
      super_admin: "/super-admin-home",
    };

    const destination = routes[role];

    if (!destination) {
      throw new Error(
        "Your account has an invalid role. Please contact the university administrator."
      );
    }

    navigate(destination, { replace: true });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (loading) return;

    setError("");

    const email = formData.email.trim().toLowerCase();
    const password = formData.password;

    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }

    setLoading(true);

    try {
      const result = await signIn({
        email,
        password,
      });

      if (!result?.profile) {
        throw new Error(
          "Your account profile could not be loaded. Please try again."
        );
      }

      redirectByRole(result.profile.role);
    } catch (err) {
      console.error("Login error:", err);

      setError(
        err.message ||
          "Failed to sign in. Please check your credentials and try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--page-bg)] px-4 py-12">
      <div className="w-full max-w-md space-y-8 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-8 shadow-sm backdrop-blur">

        {/* Header */}
        <div>
          <h2 className="text-center text-3xl font-extrabold text-[var(--text-primary)]">
            Welcome back
          </h2>

          <p className="mt-2 text-center text-sm text-[var(--text-secondary)]">
            Sign in to access your university account
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {/* Login Form */}
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">

            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-[var(--text-primary)]"
              >
                Official university email
              </label>

              <div className="relative mt-1">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                  <Mail size={18} />
                </div>

                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  disabled={loading}
                  className="block w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] py-3 pl-10 pr-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 disabled:opacity-60"
                  placeholder="you@university.edu"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-[var(--text-primary)]"
                >
                  Password
                </label>

                <Link
                  to="/forgot-password"
                  className="text-xs font-semibold text-purple-600 hover:text-purple-500"
                >
                  Forgot your password?
                </Link>
              </div>

              <div className="relative mt-1">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">
                  <Lock size={18} />
                </div>

                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  disabled={loading}
                  className="block w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] py-3 pl-10 pr-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 disabled:opacity-60"
                  placeholder="Enter your password"
                />
              </div>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-purple-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              "Signing in..."
            ) : (
              <>
                Sign in
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        {/* Signup Link */}
        <div className="text-center text-sm">
          <span className="text-[var(--text-secondary)]">
            Don't have an account?{" "}
          </span>

          <Link
            to="/signup"
            className="font-semibold text-purple-600 hover:underline"
          >
            Sign up
          </Link>
        </div>
      </div>
    </div>
  );
}
