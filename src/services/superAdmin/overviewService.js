import { supabase } from "../../lib/supabase";

async function getCount(table, filters = []) {
  let query = supabase
    .from(table)
    .select("id", { count: "exact", head: true });

  filters.forEach(([column, value]) => {
    query = query.eq(column, value);
  });

  const { count, error } = await query;

  if (error) throw error;

  return count ?? 0;
}

export async function getOverviewStats() {
  const [
    totalSchools,
    activeSchools,
    inactiveSchools,
    totalUsers,
    students,
    teachers,
    admins,
    pendingReports,
    activeBans,
  ] = await Promise.all([
    getCount("schools"),
    getCount("schools", [["is_active", true]]),
    getCount("schools", [["is_active", false]]),

    getCount("profiles"),
    getCount("profiles", [["role", "student"]]),
    getCount("profiles", [["role", "teacher"]]),
    getCount("profiles", [["role", "admin"]]),

    getCount("reports", [["status", "pending"]]),
    getCount("bans", [["is_active", true]]),
  ]);

  return {
    totalSchools,
    activeSchools,
    inactiveSchools,
    totalUsers,
    students,
    teachers,
    admins,
    pendingReports,
    activeBans,
  };
}

export async function getRecentPlatformActivity() {
  const { data, error } = await supabase
    .from("audit_logs")
    .select("id, actor_id, action, metadata, created_at")
    .order("created_at", { ascending: false })
    .limit(6);

  if (error) throw error;

  return data ?? [];
}