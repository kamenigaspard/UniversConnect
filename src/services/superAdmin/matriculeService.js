
import { supabase } from "../../lib/supabase";

const PAGE_SIZE = 20;

const VALID_ROLES = ["student", "teacher", "admin"];

const MATRICULE_SELECT = `
  id,
  matricule,
  school_id,
  role,
  is_active,
  claimed_by,
  claimed_at,
  created_by,
  created_at,
  updated_at,
  schools (
    id,
    name,
    code
  )
`;

// Fetch authorized matricules with school information

export async function getMatricules({
  search = "",
  role = "",
  schoolId = "",
  status = "",
  page = 0,
  pageSize = 20,
} = {}) {
  let query = supabase
    .from("authorized_matricules")
    .select(
      `
        id,
        matricule,
        school_id,
        role,
        is_active,
        claimed_by,
        claimed_at,
        created_by,
        created_at,
        updated_at,
        schools (
          id,
          name,
          code
        )
      `,
      { count: "exact" }
    )
    .order("created_at", { ascending: false });

  // Apply only filters that have actual values.
  if (search.trim()) {
    query = query.ilike("matricule", `%${search.trim()}%`);
  }

  if (role) {
    query = query.eq("role", role);
  }

  if (schoolId) {
    query = query.eq("school_id", schoolId);
  }

  if (status === "active") {
    query = query.eq("is_active", true);
  } else if (status === "inactive") {
    query = query.eq("is_active", false);
  } else if (status === "claimed") {
    query = query.not("claimed_by", "is", null);
  } else if (status === "unclaimed") {
    query = query.is("claimed_by", null);
  }

  const from = page * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await query.range(from, to);

  if (error) throw error;

  return {
    data: data ?? [],
    count: count ?? 0,
  };
}

// Fetch active schools
export async function getSchoolsForMatricules() {
  const { data, error } = await supabase
    .from("schools")
    .select("id, name, code")
    .eq("is_active", true)
    .order("name", { ascending: true });

  if (error) throw error;

  return data || [];
}

// Bulk create authorized matricules
//
// matricules can be an array or a multiline string.
// Returns created records and any duplicates found.
export async function createMatricules({
  matricules,
  schoolId,
  role,
}) {
  if (!schoolId) {
    throw new Error("Please select a school.");
  }

  if (!VALID_ROLES.includes(role)) {
    throw new Error("Please select a valid user role.");
  }

  // Normalize input into individual matricules
  const inputList = Array.isArray(matricules)
    ? matricules
    : String(matricules || "").split(/\r?\n/);

  const normalizedList = inputList
    .map((item) => String(item || "").trim().toUpperCase())
    .filter(Boolean);

  if (normalizedList.length === 0) {
    throw new Error("Enter at least one matricule.");
  }

  const invalid = normalizedList.filter(
    (item) => item.length < 3
  );

  if (invalid.length > 0) {
    throw new Error(
      `These matricules are too short: ${invalid.join(", ")}`
    );
  }

  // Remove duplicates within the submitted batch
  const uniqueMatricules = [...new Set(normalizedList)];

  const inputDuplicates = normalizedList.filter(
    (item, index) => normalizedList.indexOf(item) !== index
  );

  // Get current authenticated user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) throw authError;

  if (!user) {
    throw new Error("You must be signed in to add matricules.");
  }

  // Check which matricules already exist
  const { data: existingRecords, error: existingError } =
    await supabase
      .from("authorized_matricules")
      .select("matricule")
      .in("matricule", uniqueMatricules);

  if (existingError) throw existingError;

  const existingSet = new Set(
    (existingRecords || []).map((item) => item.matricule)
  );

  const alreadyExists = uniqueMatricules.filter(
    (item) => existingSet.has(item)
  );

  const matriculesToInsert = uniqueMatricules.filter(
    (item) => !existingSet.has(item)
  );

  if (matriculesToInsert.length === 0) {
    return {
      created: [],
      createdCount: 0,
      duplicates: [...new Set([
        ...inputDuplicates,
        ...alreadyExists,
      ])],
      duplicateCount: new Set([
        ...inputDuplicates,
        ...alreadyExists,
      ]).size,
    };
  }

  // Prepare all records
  const records = matriculesToInsert.map((matricule) => ({
    matricule,
    school_id: schoolId,
    role,
    created_by: user.id,
  }));

  // Insert the batch
  const { data, error } = await supabase
    .from("authorized_matricules")
    .insert(records)
    .select(MATRICULE_SELECT);

  if (error) {
    if (error.code === "23505") {
      throw new Error(
        "One or more matricules were registered by another request. Please refresh and try again."
      );
    }

    throw error;
  }

  const duplicates = [...new Set([
    ...inputDuplicates,
    ...alreadyExists,
  ])];

  return {
    created: data || [],
    createdCount: data?.length || 0,
    duplicates,
    duplicateCount: duplicates.length,
  };
}

// Keep single matricule creation available for compatibility
export async function createMatricule({
  matricule,
  schoolId,
  role,
}) {
  const result = await createMatricules({
    matricules: [matricule],
    schoolId,
    role,
  });

  if (result.createdCount === 0) {
    throw new Error(
      `Matricule ${String(matricule).trim().toUpperCase()} already exists.`
    );
  }

  return result.created[0];
}

// Activate or deactivate an authorized matricule
export async function updateMatriculeStatus(id, isActive) {
  if (!id) {
    throw new Error("Matricule ID is required.");
  }

  const { data: existing, error: fetchError } = await supabase
    .from("authorized_matricules")
    .select("id, claimed_by, is_active")
    .eq("id", id)
    .single();

  if (fetchError) throw fetchError;

  if (existing.claimed_by) {
    throw new Error(
      "This matricule has already been claimed and cannot be deactivated or reactivated here."
    );
  }

  const { data, error } = await supabase
    .from("authorized_matricules")
    .update({
      is_active: Boolean(isActive),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;

  return data;
}

// Fetch matricule management statistics
export async function getMatriculeStats() {
  const { data, error } = await supabase
    .from("authorized_matricules")
    .select("is_active, claimed_by, role");

  if (error) throw error;

  const records = data || [];

  return {
    total: records.length,
    active: records.filter((item) => item.is_active).length,
    inactive: records.filter((item) => !item.is_active).length,
    claimed: records.filter((item) => item.claimed_by !== null).length,
    unclaimed: records.filter((item) => item.claimed_by === null).length,
    students: records.filter((item) => item.role === "student").length,
    teachers: records.filter((item) => item.role === "teacher").length,
    admins: records.filter((item) => item.role === "admin").length,
  };
}
