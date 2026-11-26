import { supabase } from "../../lib/supabase";

const LOGO_BUCKET = "school-logos";

export async function getSchools({ search = "", status = "all" } = {}) {
  let query = supabase
    .from("schools")
    .select("id, name, code, description, logo_url, is_active, created_at, updated_at")
    .order("created_at", { ascending: false });

  if (search.trim()) {
    const term = search.trim().replace(/[%_,]/g, "");
    query = query.or(`name.ilike.%${term}%,code.ilike.%${term}%`);
  }

  if (status === "active") query = query.eq("is_active", true);
  if (status === "inactive") query = query.eq("is_active", false);

  const { data, error } = await query;

  if (error) throw error;

  return data || [];
}

export async function createSchool(values) {
  const { data, error } = await supabase
    .from("schools")
    .insert({
      name: values.name.trim(),
      code: values.code.trim().toUpperCase(),
      description: values.description.trim() || null,
      is_active: values.is_active,
    })
    .select()
    .single();

  if (error) throw error;

  return data;
}

export async function updateSchool(schoolId, values) {
  const { data, error } = await supabase
    .from("schools")
    .update({
      name: values.name.trim(),
      code: values.code.trim().toUpperCase(),
      description: values.description.trim() || null,
      is_active: values.is_active,
      updated_at: new Date().toISOString(),
    })
    .eq("id", schoolId)
    .select()
    .single();

  if (error) throw error;

  return data;
}

export async function setSchoolStatus(schoolId, isActive) {
  const { data, error } = await supabase
    .from("schools")
    .update({
      is_active: isActive,
      updated_at: new Date().toISOString(),
    })
    .eq("id", schoolId)
    .select()
    .single();

  if (error) throw error;

  return data;
}

export async function uploadSchoolLogo(schoolId, file) {
  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];

  if (!allowedTypes.includes(file.type)) {
    throw new Error("Choose a JPG, PNG or WebP image.");
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new Error("The school logo must be 5 MB or smaller.");
  }

  const extension = file.name.split(".").pop()?.toLowerCase() || "png";
  const filePath = `${schoolId}/${crypto.randomUUID()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from(LOGO_BUCKET)
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    });

  if (uploadError) throw uploadError;

  const { data } = supabase.storage
    .from(LOGO_BUCKET)
    .getPublicUrl(filePath);

  return data.publicUrl;
}

export async function updateSchoolLogo(schoolId, logoUrl) {
  const { data, error } = await supabase
    .from("schools")
    .update({
      logo_url: logoUrl,
      updated_at: new Date().toISOString(),
    })
    .eq("id", schoolId)
    .select()
    .single();

  if (error) throw error;

  return data;
}

async function getSchoolReferenceCounts(schoolId) {
  // These are the known tables in this project that directly
  // associate records with a school.
  const references = [
    ["profiles", "school_id"],
    ["posts", "school_id"],
    ["communities", "school_id"],
    ["message_groups", "school_id"],
    ["admin_spotlights", "school_id"],
  ];

  const results = await Promise.all(
    references.map(async ([table, column]) => {
      const { count, error } = await supabase
        .from(table)
        .select("id", { count: "exact", head: true })
        .eq(column, schoolId);

      if (error) {
        // Fail closed. If we cannot check a dependency,
        // we must not continue with permanent deletion.
        throw new Error(
          `Could not check ${table} before deletion: ${error.message}`
        );
      }

      return { table, count: count || 0 };
    })
  );

  return results;
}

export async function deleteSchoolSafely(schoolId) {
  const references = await getSchoolReferenceCounts(schoolId);

  const inUse = references.filter((item) => item.count > 0);

  if (inUse.length > 0) {
    const details = inUse
      .map((item) => `${item.table}: ${item.count}`)
      .join(", ");

    throw new Error(
      `This school still has associated records (${details}). Deactivate it instead of deleting it.`
    );
  }

  const { error } = await supabase
    .from("schools")
    .delete()
    .eq("id", schoolId);

  if (error) throw error;
}

export async function getSchoolStatistics(schoolId) {
  const countFor = async (table) => {
    const { count, error } = await supabase
      .from(table)
      .select("id", { count: "exact", head: true })
      .eq("school_id", schoolId);

    if (error) throw error;

    return count || 0;
  };

  const [users, posts, communities] = await Promise.all([
    countFor("profiles"),
    countFor("posts"),
    countFor("communities"),
  ]);

  return { users, posts, communities };
}