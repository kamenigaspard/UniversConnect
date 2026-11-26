
import { supabase } from "../../lib/supabase";

// ============================================================
// SYSTEM SETTINGS SERVICE
// ============================================================

// 1. GET ALL SYSTEM SETTINGS

export async function getSystemSettings() {
  const { data, error } = await supabase
    .from("system_settings")
    .select(`
      id,
      setting_key,
      setting_value,
      description,
      created_at,
      updated_at
    `)
    .order("setting_key", { ascending: true });

  if (error) throw error;

  return data || [];
}

// ============================================================
// 2. UPDATE A SYSTEM SETTING
// ============================================================

export async function updateSystemSetting({
  id,
  settingKey,
  settingValue,
}) {
  if (!id || !settingKey) {
    throw new Error("Invalid system setting.");
  }

  if (settingValue === undefined || settingValue === null) {
    throw new Error("Setting value is required.");
  }

  const { data, error } = await supabase
    .from("system_settings")
    .update({
      setting_value: String(settingValue),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("setting_key", settingKey)
    .select()
    .single();

  if (error) throw error;

  return data;
}

// ============================================================
// 3. GET A SETTING BY KEY
// ============================================================

export async function getSystemSetting(settingKey) {
  if (!settingKey) {
    throw new Error("Setting key is required.");
  }

  const { data, error } = await supabase
    .from("system_settings")
    .select(`
      id,
      setting_key,
      setting_value,
      description,
      created_at,
      updated_at
    `)
    .eq("setting_key", settingKey)
    .maybeSingle();

  if (error) throw error;

  return data;
}
