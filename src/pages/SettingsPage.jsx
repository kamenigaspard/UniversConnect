import { useState } from "react";
import { useTheme } from "../contexts/ThemeContext";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

export default function ThemeSelector() {
  const { savedTheme, changeTheme } = useTheme();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      await signOut();
      navigate("/login", { replace: true });
    } catch (error) {
      console.error("Error logging out:", error);
      setLoggingOut(false);
    }
  };

  return (
    <>
      <div className="glass-card rounded-2xl p-4">
        <label htmlFor="theme-choice">
          Appearance
        </label>

        <select
          id="theme-choice"
          value={savedTheme}
          onChange={(event) => {
            changeTheme(event.target.value).catch((error) => {
              console.error("Could not save theme:", error);
            });
          }}
        >
          <option value="system">Use device setting</option>
          <option value="light">Light mode</option>
          <option value="dark">Dark mode</option>
        </select>
      </div>

      <br />

      <button
        type="button"
        className="glass-card rounded-2xl p-4 w-full text-left"
        onClick={() => navigate("/profile")}
      >
        Profile
      </button>

      <br />

      <button
        type="button"
        disabled={loggingOut}
        className="glass-card rounded-2xl p-4 w-full text-left text-red-500 disabled:opacity-50"
        onClick={handleLogout}
      >
        {loggingOut ? "Logging out..." : "Log out"}
      </button>
    </>
  );
}