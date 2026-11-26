
import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";

import SuperAdminSidebar from "./SuperAdminSidebar.jsx";
import SuperAdminHeader from "./SuperAdminHeader.jsx";

import OverviewStats from "../src/components/super-admin/overview/OverviewStats.jsx";
import PlatformActivity from "../src/components/super-admin/overview/PlatformActivity.jsx";
import SchoolsManagement from "../src/components/super-admin/schools/SchoolsManagement.jsx";
import UsersManagement from "../src/components/super-admin/users/UsersManagement.jsx";
import MatriculeManagement from "../src/components/super-admin/matricules/MatriculeManagement.jsx";
import BanManagement from "../src/components/super-admin/bans/BanManagement.jsx";
import PlatformReports from "../src/components/super-admin/reports/PlatformReports.jsx";
import AuditLogs from "../src/components/super-admin/audit/AuditLogs.jsx";
import PlatformSettings from "../src/components/super-admin/settings/PlatformSettings.jsx";

import {
  getOverviewStats,
  getRecentPlatformActivity,
} from "../src/services/superAdmin/overviewService.js";

const sections = {
  Overview: {
    title: "Platform Overview",
    description: "Monitor the overall activity of School Connect.",
  },
  "School Management": {
    title: "School Management",
    description: "Create, manage and monitor registered schools.",
  },
  "User Management": {
    title: "User Management",
    description: "Manage platform users and their account status.",
  },
  "Matricule Management": {
    title: "Matricule Management",
    description:
      "Create and manage authorized matricules used during user registration.",
  },
  "Ban Management": {
    title: "Ban Management",
    description: "Manage temporary bans across the platform.",
  },
  "Platform Reports": {
    title: "Platform Reports",
    description: "Review reports submitted across all schools.",
  },
  "Audit Logs": {
    title: "Audit Logs",
    description: "Review important administrative activities.",
  },
  Settings: {
    title: "Platform Settings",
    description: "Manage platform configuration and preferences.",
  },
};

export default function SuperAdminLayout() {
  const [activeSection, setActiveSection] = useState("Overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [stats, setStats] = useState(null);
  const [activities, setActivities] = useState([]);

  const [statsLoading, setStatsLoading] = useState(true);
  const [activityLoading, setActivityLoading] = useState(true);

  const [statsError, setStatsError] = useState("");
  const [activityError, setActivityError] = useState("");

  const loadOverview = useCallback(async () => {
    setStatsLoading(true);
    setActivityLoading(true);
    setStatsError("");
    setActivityError("");

    const [statsResult, activityResult] = await Promise.allSettled([
      getOverviewStats(),
      getRecentPlatformActivity(),
    ]);

    if (statsResult.status === "fulfilled") {
      setStats(statsResult.value);
    } else {
      console.error("Overview statistics error:", statsResult.reason);
      setStatsError("Unable to load platform statistics.");
    }

    if (activityResult.status === "fulfilled") {
      setActivities(activityResult.value);
    } else {
      console.error("Platform activity error:", activityResult.reason);
      setActivityError("Unable to load recent activity.");
    }

    setStatsLoading(false);
    setActivityLoading(false);
  }, []);

  useEffect(() => {
    if (activeSection === "Overview") {
      loadOverview();
    }
  }, [activeSection, loadOverview]);

  const currentSection = sections[activeSection];

  return (
    <div className="min-h-screen bg-[var(--page-bg)] text-[var(--text-primary)]">
      <SuperAdminSidebar
        activeSection={activeSection}
        setActiveSection={setActiveSection}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
      />

      <div className="min-h-screen lg:pl-72">
        <SuperAdminHeader
          activeSection={activeSection}
          setSidebarOpen={setSidebarOpen}
        />

        <main className="mx-auto max-w-[1600px] space-y-6 p-4 sm:p-6 lg:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold sm:text-3xl">
                {currentSection.title}
              </h1>

              <p className="mt-1 text-sm text-[var(--text-secondary)]">
                {currentSection.description}
              </p>
            </div>

            {activeSection === "Overview" && (
              <button
                type="button"
                onClick={loadOverview}
                disabled={statsLoading || activityLoading}
                className="flex items-center gap-2 rounded-xl border border-[var(--border-color)] bg-[var(--surface)] px-4 py-2.5 text-sm font-medium transition hover:bg-[var(--page-bg-secondary)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <RefreshCw
                  size={16}
                  className={
                    statsLoading || activityLoading ? "animate-spin" : ""
                  }
                />
                Refresh
              </button>
            )}
          </div>

          {activeSection === "Overview" ? (
            <div className="space-y-6">
              {statsError && (
                <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-700">
                  {statsError}
                </div>
              )}

              <OverviewStats data={stats} loading={statsLoading} />

              <PlatformActivity
                activities={activities}
                loading={activityLoading}
                error={activityError}
                onRetry={loadOverview}
              />
            </div>
          ) : activeSection === "School Management" ? (
            <SchoolsManagement />
          ) : activeSection === "User Management" ? (
            <UsersManagement />
          ) : activeSection === "Matricule Management" ? (
            <MatriculeManagement />
          ) : activeSection === "Ban Management" ? (
            <BanManagement />
          ) : activeSection === "Platform Reports" ? (
            <PlatformReports />
          ) : activeSection === "Audit Logs" ? (
            <AuditLogs />
          ) : activeSection === "Settings" ? (
            <PlatformSettings />
          ) : (
            <div className="rounded-2xl border border-[var(--border-color)] bg-[var(--surface)] p-8 text-center">
              <h2 className="text-lg font-semibold">
                {currentSection.title}
              </h2>

              <p className="mt-2 text-sm text-[var(--text-secondary)]">
                This section will be implemented in its dedicated step.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
