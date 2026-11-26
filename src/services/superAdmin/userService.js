import { supabase } from "../../lib/supabase";












const PAGE_SIZE = 20;

export async function getUsers({
  search = "",
  role = "all",
  schoolId = "all",
  status = "all",
  page = 0,
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
        bio,
        role,
        school_id,
        is_active,
        created_at,
        updated_at,
        school:schools (
          id,
          name,
          code,
          logo_url
        )
      `,
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

  const term = search.trim().replace(/[%_,]/g, "");

  if (term) {
    query = query.or(
      `full_name.ilike.%${term}%,username.ilike.%${term}%,email.ilike.%${term}%`
    );
  }

  if (role !== "all") {
    query = query.eq("role", role);
  }

if (schoolId === "none") {
  query = query.is("school_id", null);
} else if (schoolId !== "all") {
  query = query.eq("school_id", schoolId);
}

  if (status === "active") {
    query = query.eq("is_active", true);
  } else if (status === "inactive") {
    query = query.eq("is_active", false);
  }

  const { data, error, count } = await query;

  if (error) throw error;

  return {
    users: data || [],
    total: count || 0,
    page,
    pageSize: PAGE_SIZE,
  };
}

export async function getSchoolsForUserFilter() {
  const { data, error } = await supabase
    .from("schools")
    .select("id, name, code")
    .order("name", { ascending: true });

  if (error) throw error;

  return data || [];
}

async function countProfiles(filters = []) {
  let query = supabase
    .from("profiles")
    .select("id", { count: "exact", head: true });

  filters.forEach(([column, value]) => {
    query = query.eq(column, value);
  });

  const { count, error } = await query;

  if (error) throw error;

  return count || 0;
}

export async function getUserManagementStats() {
  const [
    total,
    students,
    teachers,
    admins,
    active,
    inactive,
  ] = await Promise.all([
    countProfiles(),
    countProfiles([["role", "student"]]),
    countProfiles([["role", "teacher"]]),
    countProfiles([["role", "admin"]]),
    countProfiles([["is_active", true]]),
    countProfiles([["is_active", false]]),
  ]);

  return {
    total,
    students,
    teachers,
    admins,
    active,
    inactive,
  };
}

export async function setUserAccountStatus(userId, isActive) {
  const { data, error } = await supabase.rpc(
    "super_admin_set_user_active",
    {
      target_user_id: userId,
      new_is_active: isActive,
    }
  );

  if (error) throw error;

  return data;
}

export async function getUserDetails(userId) {
  const { data, error } = await supabase
    .from("profiles")
    .select(`
      id,
      full_name,
      username,
      email,
      avatar_url,
      bio,
      role,
      school_id,
      is_active,
      created_at,
      updated_at,
      school:schools (
        id,
        name,
        code,
        logo_url
      )
    `)
    .eq("id", userId)
    .single();

  if (error) throw error;

  return data;
}