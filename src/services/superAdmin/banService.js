
import { supabase } from "../../lib/supabase";

// ============================================================
// BAN SERVICE
// ============================================================

const PAGE_SIZE = 20;

// ============================================================
// 1. GET BAN RECORDS
// ============================================================

export async function getBans({
  search = "",
  status = "all",
  duration = "all",
  page = 0,
} = {}) {
  let query = supabase
    .from("bans")
    .select(
      `
        id,
        user_id,
        banned_by,
        duration,
        reason,
        starts_at,
        ends_at,
        is_active,
        created_at,

        user:profiles!bans_user_id_fkey (
          id,
          full_name,
          username,
          email,
          avatar_url,
          role,
          school:schools (
            id,
            name,
            code
          )
        ),

        administrator:profiles!bans_banned_by_fkey (
          id,
          full_name,
          username,
          email,
          avatar_url
        )
      `,
      { count: "exact" }
    )
    .order("created_at", { ascending: false });

  // ----------------------------------------------------------
  // Search banned users
  // ----------------------------------------------------------

  const term = search.trim().replace(/[%_,]/g, "");

  if (term) {
    const { data: matchingUsers, error: searchError } =
      await supabase
        .from("profiles")
        .select("id")
        .or(
          `full_name.ilike.%${term}%,username.ilike.%${term}%,email.ilike.%${term}%`
        );

    if (searchError) throw searchError;

    const userIds = (matchingUsers || []).map((user) => user.id);

    if (userIds.length === 0) {
      return {
        bans: [],
        total: 0,
        page,
        pageSize: PAGE_SIZE,
      };
    }

    query = query.in("user_id", userIds);
  }

  // ----------------------------------------------------------
  // Filter by duration
  // ----------------------------------------------------------

  if (duration !== "all") {
    query = query.eq("duration", duration);
  }

  // ----------------------------------------------------------
  // Filter by ban status
  // ----------------------------------------------------------

  const now = new Date().toISOString();

  if (status === "active") {
    query = query
      .eq("is_active", true)
      .lte("starts_at", now)
      .gt("ends_at", now);
  } else if (status === "scheduled") {
    query = query
      .eq("is_active", true)
      .gt("starts_at", now);
  } else if (status === "expired") {
    query = query
      .eq("is_active", true)
      .lte("ends_at", now);
  } else if (status === "lifted") {
    query = query.eq("is_active", false);
  }

  // ----------------------------------------------------------
  // Pagination
  // ----------------------------------------------------------

  query = query.range(
    page * PAGE_SIZE,
    page * PAGE_SIZE + PAGE_SIZE - 1
  );

  const { data, error, count } = await query;

  if (error) throw error;

  return {
    bans: data || [],
    total: count || 0,
    page,
    pageSize: PAGE_SIZE,
  };
}

// ============================================================
// 2. GET BAN STATISTICS
// ============================================================

export async function getBanManagementStats() {
  const { data, error } = await supabase
    .from("bans")
    .select("id, is_active, starts_at, ends_at");

  if (error) throw error;

  const now = new Date();

  const stats = {
    total: 0,
    active: 0,
    scheduled: 0,
    expired: 0,
    lifted: 0,
  };

  (data || []).forEach((ban) => {
    stats.total++;

    if (!ban.is_active) {
      stats.lifted++;
      return;
    }

    const start = new Date(ban.starts_at);
    const end = new Date(ban.ends_at);

    if (start > now) {
      stats.scheduled++;
    } else if (end <= now) {
      stats.expired++;
    } else {
      stats.active++;
    }
  });

  return stats;
}

// ============================================================
// 3. CREATE A BAN
// ============================================================

export async function createBan({
  userId,
  duration,
  reason = "",
}) {
  if (!userId) {
    throw new Error("Please select a user.");
  }

  const allowedDurations = ["3_days", "7_days", "30_days"];

  if (!allowedDurations.includes(duration)) {
    throw new Error("Invalid ban duration.");
  }

  const { data, error } = await supabase.rpc(
    "super_admin_create_ban",
    {
      target_user_id: userId,
      ban_length: duration,
      ban_reason: reason.trim() || null,
    }
  );

  if (error) throw error;

  return data;
}

// ============================================================
// 4. LIFT A BAN
// ============================================================

export async function liftBan(banId) {
  if (!banId) {
    throw new Error("Invalid ban record.");
  }

  const { data, error } = await supabase.rpc(
    "super_admin_lift_ban",
    {
      target_ban_id: banId,
    }
  );

  if (error) throw error;

  return data;
}

// ============================================================
// 5. GET USERS FOR THE BAN FORM
// ============================================================

export async function getUsersForBan({
  search = "",
} = {}) {
  let query = supabase
    .from("profiles")
    .select(
      `
        id,
        full_name,
        username,
        email,
        avatar_url,
        role,
        school:schools (
          id,
          name,
          code
        )
      `
    )
    .neq("role", "super_admin")
    .order("full_name", { ascending: true })
    .limit(20);

  const term = search.trim().replace(/[%_,]/g, "");

  if (term) {
    query = query.or(
      `full_name.ilike.%${term}%,username.ilike.%${term}%,email.ilike.%${term}%`
    );
  }

  const { data, error } = await query;

  if (error) throw error;

  return data || [];
}