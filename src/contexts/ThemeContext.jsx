
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useAuth } from "./AuthContext";
import { supabase } from "../lib/supabase";

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const { user, profile, setProfile } = useAuth();

  const [systemTheme, setSystemTheme] = useState(() =>
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light"
  );

  const savedTheme = profile?.preferred_theme || "system";

  const theme =
    savedTheme === "system" ? systemTheme : savedTheme;

  useEffect(() => {
    const media = window.matchMedia(
      "(prefers-color-scheme: dark)"
    );

    const updateSystemTheme = (event) => {
      setSystemTheme(event.matches ? "dark" : "light");
    };

    setSystemTheme(media.matches ? "dark" : "light");
    media.addEventListener("change", updateSystemTheme);

    return () => {
      media.removeEventListener("change", updateSystemTheme);
    };
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  const changeTheme = useCallback(
    async (nextTheme) => {
      if (!["system", "light", "dark"].includes(nextTheme)) {
        throw new Error("Unsupported theme.");
      }

      if (!user?.id) {
        throw new Error("Please sign in to save your theme.");
      }

      const previousTheme = profile?.preferred_theme || "system";

      // Optimistically update the UI.
      setProfile((current) =>
        current
          ? { ...current, preferred_theme: nextTheme }
          : current
      );

      const { data, error } = await supabase
        .from("profiles")
        .update({ preferred_theme: nextTheme })
        .eq("id", user.id)
        .select("preferred_theme")
        .single();

      if (error) {
        // Restore the previous setting if saving fails.
        setProfile((current) =>
          current
            ? { ...current, preferred_theme: previousTheme }
            : current
        );

        throw error;
      }

      setProfile((current) =>
        current
          ? { ...current, preferred_theme: data.preferred_theme }
          : current
      );
    },
    [user?.id, profile?.preferred_theme, setProfile]
  );

  const value = useMemo(
    () => ({ theme, savedTheme, changeTheme }),
    [theme, savedTheme, changeTheme]
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error(
      "useTheme must be used inside ThemeProvider."
    );
  }

  return context;
}
