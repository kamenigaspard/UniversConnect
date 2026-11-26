
import { useCallback, useEffect, useState } from "react";

import {
  Clock,
  RefreshCw,
  Save,
  Settings,
  ShieldCheck,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

import {
  getSystemSettings,
  updateSystemSetting,
} from "../../../services/superAdmin/settingsService";

// ============================================================
// HELPERS
// ============================================================

function formatSettingName(key = "") {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getSettingIcon(key = "") {
  if (key.includes("duration") || key.includes("hours")) {
    return Clock;
  }

  return Settings;
}

// ============================================================
// MAIN COMPONENT
// ============================================================

export default function PlatformSettings() {
  const [settings, setSettings] = useState([]);
  const [editedValues, setEditedValues] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [savingId, setSavingId] = useState(null);

  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // ==========================================================
  // LOAD SETTINGS
  // ==========================================================

  const loadSettings = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setErrorMessage("");
      setSuccessMessage("");

      const data = await getSystemSettings();

      setSettings(data);

      const values = {};

      data.forEach((setting) => {
        values[setting.id] = setting.setting_value;
      });

      setEditedValues(values);
    } catch (error) {
      console.error("Error loading system settings:", error);

      setErrorMessage(
        error.message || "Unable to load platform settings."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  // ==========================================================
  // HANDLE INPUT CHANGE
  // ==========================================================

  const handleValueChange = (id, value) => {
    setEditedValues((current) => ({
      ...current,
      [id]: value,
    }));

    setSuccessMessage("");
    setErrorMessage("");
  };

  // ==========================================================
  // CHECK WHETHER VALUE CHANGED
  // ==========================================================

  const hasChanged = (setting) => {
    return (
      String(editedValues[setting.id] ?? "") !==
      String(setting.setting_value ?? "")
    );
  };

  // ==========================================================
  // SAVE SETTING
  // ==========================================================

  const handleSave = async (setting) => {
    try {
      setSavingId(setting.id);
      setErrorMessage("");
      setSuccessMessage("");

      const value = String(
        editedValues[setting.id] ?? ""
      ).trim();

      if (!value) {
        throw new Error("Setting value cannot be empty.");
      }

      if (
        setting.setting_key === "message_session_duration_hours"
      ) {
        const hours = Number(value);

        if (
          !Number.isInteger(hours) ||
          hours < 1 ||
          hours > 720
        ) {
          throw new Error(
            "Message session duration must be a whole number between 1 and 720 hours."
          );
        }
      }

      await updateSystemSetting({
        id: setting.id,
        settingKey: setting.setting_key,
        settingValue: value,
      });

      setSettings((current) =>
        current.map((item) =>
          item.id === setting.id
            ? {
                ...item,
                setting_value: value,
                updated_at: new Date().toISOString(),
              }
            : item
        )
      );

      setSuccessMessage(
        `${formatSettingName(setting.setting_key)} updated successfully.`
      );
    } catch (error) {
      console.error("Error updating system setting:", error);

      setErrorMessage(
        error.message || "Unable to update this setting."
      );
    } finally {
      setSavingId(null);
    }
  };

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div className="space-y-6">
      {/* HEADER */}

      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-purple-100 p-3 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400">
            <Settings size={24} />
          </div>

          <div>
            <h2 className="text-xl font-bold text-[var(--text-primary)]">
              Platform Settings
            </h2>

            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Manage global settings for School Connect.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => loadSettings(true)}
          disabled={refreshing}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--surface)] px-4 py-2.5 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-[var(--page-bg-secondary)] disabled:opacity-50"
        >
          <RefreshCw
            size={16}
            className={refreshing ? "animate-spin" : ""}
          />
          Refresh
        </button>
      </div>

      {/* MESSAGES */}

      {successMessage && (
        <div className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700 dark:border-green-500/20 dark:bg-green-500/10 dark:text-green-400">
          <CheckCircle size={18} />
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">
          <AlertCircle size={18} />
          {errorMessage}
        </div>
      )}

      {/* SETTINGS INFORMATION */}

      <div className="flex gap-3 rounded-2xl border border-purple-200 bg-purple-50 p-4 dark:border-purple-500/20 dark:bg-purple-500/10">
        <ShieldCheck
          size={22}
          className="shrink-0 text-purple-700 dark:text-purple-400"
        />

        <div>
          <h3 className="text-sm font-semibold text-purple-900 dark:text-purple-300">
            Super Admin privileges
          </h3>

          <p className="mt-1 text-sm text-purple-800 dark:text-purple-300/80">
            Changes made here affect platform-wide settings. Only authorized Super Admins can update these values.
          </p>
        </div>
      </div>

      {/* SETTINGS LIST */}

      <div className="overflow-hidden rounded-2xl border border-[var(--border-color)] bg-[var(--surface)]">
        <div className="flex items-center justify-between border-b border-[var(--border-color)] p-5">
          <div>
            <h3 className="font-bold text-[var(--text-primary)]">
              General Configuration
            </h3>

            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              Existing settings stored in your database.
            </p>
          </div>

          <span className="rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-700 dark:bg-purple-500/10 dark:text-purple-400">
            {settings.length} settings
          </span>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16">
            <RefreshCw
              size={25}
              className="animate-spin text-purple-600"
            />

            <p className="mt-3 text-sm text-[var(--text-secondary)]">
              Loading platform settings...
            </p>
          </div>
        ) : settings.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <Settings
              size={32}
              className="mx-auto text-[var(--text-secondary)]"
            />

            <h3 className="mt-3 font-semibold text-[var(--text-primary)]">
              No settings found
            </h3>

            <p className="mt-1 text-sm text-[var(--text-secondary)]">
              There are currently no system settings stored in the database.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border-color)]">
            {settings.map((setting) => {
              const Icon = getSettingIcon(
                setting.setting_key
              );

              const changed = hasChanged(setting);

              const isDurationSetting =
                setting.setting_key ===
                "message_session_duration_hours";

              return (
                <div
                  key={setting.id}
                  className="p-5"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex min-w-0 items-start gap-3">
                      <div className="rounded-xl bg-[var(--page-bg-secondary)] p-3 text-purple-600">
                        <Icon size={21} />
                      </div>

                      <div className="min-w-0">
                        <h4 className="font-semibold text-[var(--text-primary)]">
                          {formatSettingName(
                            setting.setting_key
                          )}
                        </h4>

                        <p className="mt-1 text-sm text-[var(--text-secondary)]">
                          {setting.description ||
                            "No description available."}
                        </p>

                        <p className="mt-2 break-all text-xs text-[var(--text-secondary)]">
                          Key: {setting.setting_key}
                        </p>
                      </div>
                    </div>

                    <div className="flex w-full flex-col gap-3 sm:flex-row lg:w-auto lg:min-w-[320px]">
                      <div className="flex-1">
                        <label
                          htmlFor={`setting-${setting.id}`}
                          className="mb-1.5 block text-xs font-medium text-[var(--text-secondary)]"
                        >
                          Setting value
                        </label>

                        <input
                          id={`setting-${setting.id}`}
                          type={
                            isDurationSetting
                              ? "number"
                              : "text"
                          }
                          min={
                            isDurationSetting ? "1" : undefined
                          }
                          max={
                            isDurationSetting ? "720" : undefined
                          }
                          step={
                            isDurationSetting ? "1" : undefined
                          }
                          value={
                            editedValues[setting.id] ?? ""
                          }
                          onChange={(event) =>
                            handleValueChange(
                              setting.id,
                              event.target.value
                            )
                          }
                          className="w-full rounded-xl border border-[var(--border-color)] bg-[var(--page-bg)] px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none transition focus:border-purple-500"
                        />

                        {isDurationSetting && (
                          <p className="mt-1 text-xs text-[var(--text-secondary)]">
                            Duration in hours (1–720).
                          </p>
                        )}
                      </div>

                      <div className="flex items-end">
                        <button
                          type="button"
                          onClick={() => handleSave(setting)}
                          disabled={
                            !changed ||
                            savingId !== null
                          }
                          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
                        >
                          {savingId === setting.id ? (
                            <RefreshCw
                              size={16}
                              className="animate-spin"
                            />
                          ) : (
                            <Save size={16} />
                          )}

                          Save
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--text-secondary)]">
                    <span>
                      Last updated:{" "}
                      {setting.updated_at
                        ? new Date(
                            setting.updated_at
                          ).toLocaleString()
                        : "—"}
                    </span>

                    {changed && (
                      <span className="font-medium text-amber-600 dark:text-amber-400">
                        Unsaved changes
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
