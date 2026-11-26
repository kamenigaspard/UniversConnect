
import { supabase } from "../../lib/supabase";

// ============================================================
// REPORT SERVICE
// ============================================================

const PAGE_SIZE = 20;

const REPORT_STATUSES = [
  "pending",
  "reviewing",
  "resolved",
  "dismissed",
];

const REPORT_TYPES = [
  "user",
  "post",
  "comment",
  "message",
];

// ============================================================
// 1. GET REPORTS
// ============================================================

export async function getReports({
  search = "",
  status = "all",
  type = "all",
  page = 0,
} = {}) {
  let query = supabase
    .from("reports")
    .select(
      `
        id,
        reporter_id,
        reported_user_id,
        post_id,
        comment_id,
        message_id,
        reason,
        description,
        status,
        reviewed_by,
        reviewed_at,
        created_at,

        reporter:profiles!reports_reporter_id_fkey (
          id,
          full_name,
          username,
          email,
          avatar_url,
          role
        ),

        reported_user:profiles!reports_reported_user_id_fkey (
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

        reviewer:profiles!reports_reviewed_by_fkey (
          id,
          full_name,
          username,
          avatar_url
        ),

        reported_post:posts!reports_post_id_fkey (
          id,
          author_id,
          content,
          media_url,
          media_type,
          is_deleted,
          created_at,
          author:profiles!posts_author_id_fkey (
            id,
            full_name,
            username,
            avatar_url
          )
        ),

        reported_comment:comments!reports_comment_id_fkey (
          id,
          post_id,
          author_id,
          content,
          is_deleted,
          created_at,
          author:profiles!comments_author_id_fkey (
            id,
            full_name,
            username,
            avatar_url
          )
        ),

        reported_message:messages!reports_message_id_fkey (
          id,
          conversation_id,
          sender_id,
          content,
          media_url,
          media_type,
          is_deleted,
          created_at,
          sender:profiles!messages_sender_id_fkey (
            id,
            full_name,
            username,
            avatar_url
          ),
          conversation:conversations!messages_conversation_id_fkey (
            id,
            name,
            type
          )
        )
      `,
      { count: "exact" }
    )
    .order("created_at", { ascending: false });

  // Search reporters and reported users
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
        reports: [],
        total: 0,
        page,
        pageSize: PAGE_SIZE,
      };
    }

    query = query.or(
      `reporter_id.in.(${userIds.join(",")}),reported_user_id.in.(${userIds.join(",")})`
    );
  }

  // Filter by status
  if (status !== "all") {
    if (!REPORT_STATUSES.includes(status)) {
      throw new Error("Invalid report status.");
    }

    query = query.eq("status", status);
  }

  // Filter by report type
  if (type !== "all") {
    if (!REPORT_TYPES.includes(type)) {
      throw new Error("Invalid report type.");
    }

    const typeColumn = {
      user: "reported_user_id",
      post: "post_id",
      comment: "comment_id",
      message: "message_id",
    }[type];

    query = query.not(typeColumn, "is", null);
  }

  // Pagination
  query = query.range(
    page * PAGE_SIZE,
    page * PAGE_SIZE + PAGE_SIZE - 1
  );

  const { data, error, count } = await query;

  if (error) throw error;

  return {
    reports: data || [],
    total: count || 0,
    page,
    pageSize: PAGE_SIZE,
  };
}

// ============================================================
// 2. GET REPORT STATISTICS
// ============================================================

export async function getReportManagementStats() {
  const { data, error } = await supabase
    .from("reports")
    .select("id, status, reported_user_id, post_id, comment_id, message_id");

  if (error) throw error;

  const stats = {
    total: 0,
    pending: 0,
    reviewing: 0,
    resolved: 0,
    dismissed: 0,
  };

  (data || []).forEach((report) => {
    stats.total++;

    if (Object.prototype.hasOwnProperty.call(stats, report.status)) {
      stats[report.status]++;
    }
  });

  return stats;
}

// ============================================================
// 3. UPDATE REPORT STATUS
// ============================================================

export async function updateReportStatus(reportId, status) {
  if (!reportId) {
    throw new Error("Invalid report record.");
  }

  if (!REPORT_STATUSES.includes(status)) {
    throw new Error("Invalid report status.");
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) throw userError;

  if (!user) {
    throw new Error("You must be logged in to review reports.");
  }

  const { data, error } = await supabase
    .from("reports")
    .update({
      status,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", reportId)
    .select()
    .single();

  if (error) throw error;

  return data;
}

// ============================================================
// 4. GET REPORT BY ID
// ============================================================

export async function getReportById(reportId) {
  if (!reportId) {
    throw new Error("Invalid report record.");
  }

  const { data, error } = await supabase
    .from("reports")
    .select(
      `
        *,
        reporter:profiles!reports_reporter_id_fkey (
          id,
          full_name,
          username,
          email,
          avatar_url
        ),
        reported_user:profiles!reports_reported_user_id_fkey (
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
        reviewer:profiles!reports_reviewed_by_fkey (
          id,
          full_name,
          username,
          avatar_url
        ),
        reported_post:posts!reports_post_id_fkey (
          id,
          author_id,
          content,
          media_url,
          media_type,
          is_deleted,
          created_at
        ),
        reported_comment:comments!reports_comment_id_fkey (
          id,
          post_id,
          author_id,
          content,
          is_deleted,
          created_at
        ),
        reported_message:messages!reports_message_id_fkey (
          id,
          conversation_id,
          sender_id,
          content,
          media_url,
          media_type,
          is_deleted,
          created_at
        )
      `
    )
    .eq("id", reportId)
    .single();

  if (error) throw error;

  return data;
}
