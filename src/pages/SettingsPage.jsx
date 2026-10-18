
import { useTheme } from "../contexts/ThemeContext";
import { useNavigate } from "react-router-dom";

export default function ThemeSelector() {
  const { savedTheme, changeTheme } = useTheme();
  const navigation = useNavigate();

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
        <button className="glass-card rounded-2xl p-4 w-full text-left" onClick={() => {
          // Handle profile button click
          navigation.navigate("/profile");
        }}>
       Profile
    </button>

</>
  );
}
