
import { supabase } from "../../lib/supabase";

// ============================================================
// AUDIT LOG SERVICE
// ============================================================

const PAGE_SIZE = 20;

// ============================================================
// 1. GET AUDIT LOGS
// ============================================================

export async function getAuditLogs({
  search = "",
  action = "all",
  targetTable = "all",
  page = 0,
} = {}) {
  let query = supabase
    .from("audit_logs")
    .select(
      `
        id,
        actor_id,
        action,
        target_user_id,
        target_table,
        target_id,
        metadata,
        created_at
      `,
      { count: "exact" }
    )
    .order("created_at", { ascending: false });

  // Search actions, tables, actors and affected users
  const term = search.trim().replace(/[%,_()]/g, "");

  if (term) {
    const { data: matchingUsers, error: searchError } =
      await supabase
        .from("profiles")
        .select("id")
        .or(
          `full_name.ilike.%${term}%,username.ilike.%${term}%,email.ilike.%${term}%`
        );

    if (searchError) throw searchError;

    const userIds = (matchingUsers || []).map(
      (user) => user.id
    );

    const searchConditions = [
      `action.ilike.%${term}%`,
      `target_table.ilike.%${term}%`,
    ];

    if (userIds.length > 0) {
      const ids = userIds.join(",");

      searchConditions.push(`actor_id.in.(${ids})`);
      searchConditions.push(`target_user_id.in.(${ids})`);
    }

    query = query.or(searchConditions.join(","));
  }

  // Filter by action
  if (action !== "all") {
    query = query.eq("action", action);
  }

  // Filter by target table
  if (targetTable !== "all") {
    query = query.eq("target_table", targetTable);
  }

  // Pagination
  query = query.range(
    page * PAGE_SIZE,
    page * PAGE_SIZE + PAGE_SIZE - 1
  );

  const { data, error, count } = await query;

  if (error) throw error;

  const logs = data || [];

  // Load actor and affected-user profiles separately.
  // This avoids assuming foreign-key relationship names.
  const profileIds = [
    ...new Set(
      logs
        .flatMap((log) => [
          log.actor_id,
          log.target_user_id,
        ])
        .filter(Boolean)
    ),
  ];

  let profilesById = {};

  if (profileIds.length > 0) {
    const { data: profiles, error: profilesError } =
      await supabase
        .from("profiles")
        .select(
          `
            id,
            full_name,
            username,
            email,
            avatar_url,
            role
          `
        )
        .in("id", profileIds);

    if (profilesError) throw profilesError;

    profilesById = Object.fromEntries(
      (profiles || []).map((profile) => [
        profile.id,
        profile,
      ])
    );
  }

  const enrichedLogs = logs.map((log) => ({
    ...log,
    actor: log.actor_id
      ? profilesById[log.actor_id] || null
      : null,
    target_user: log.target_user_id
      ? profilesById[log.target_user_id] || null
      : null,
  }));

  return {
    logs: enrichedLogs,
    total: count || 0,
    page,
    pageSize: PAGE_SIZE,
  };
}

// ============================================================
// 2. GET AUDIT LOG STATISTICS
// ============================================================

export async function getAuditLogStats() {
  const { data, error } = await supabase
    .from("audit_logs")
    .select("id, action, created_at");

  if (error) throw error;

  const logs = data || [];

  const today = new Date().toISOString().slice(0, 10);

  const todayLogs = logs.filter(
    (log) =>
      log.created_at &&
      log.created_at.slice(0, 10) === today
  );

  const actionTypes = new Set(
    logs
      .map((log) => log.action)
      .filter(Boolean)
  );

  return {
    total: logs.length,
    today: todayLogs.length,
    actionTypes: actionTypes.size,
  };
}

// ============================================================
// 3. GET AUDIT LOG FILTER OPTIONS
// ============================================================

export async function getAuditLogFilters() {
  const { data, error } = await supabase
    .from("audit_logs")
    .select("action, target_table");

  if (error) throw error;

  const logs = data || [];

  const actions = [
    ...new Set(
      logs
        .map((log) => log.action)
        .filter(Boolean)
    ),
  ].sort();

  const targetTables = [
    ...new Set(
      logs
        .map((log) => log.target_table)
        .filter(Boolean)
    ),
  ].sort();

  return {
    actions,
    targetTables,
  };
}
