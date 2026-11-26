
import React, {
  useEffect,
  useRef,
  useState,
} from "react";

import { supabase } from "../lib/supabase";

import PostHeader from "./post/PostHeader";
import PostContent from "./post/PostContent";
import PostMedia from "./post/PostMedia";
import PostActions from "./post/PostActions";
import EditPostModal from "./post/EditPostModal";
import CommentsModal from "./post/CommentsModal";
import ReportPostModal from "./post/ReportPostModal";

// ============================================================
// CONFIGURATION
// ============================================================

const EDIT_WINDOW_MINUTES = 15;
const EDIT_WINDOW_MS = EDIT_WINDOW_MINUTES * 60 * 1000;

// ============================================================
// STORAGE HELPER
// ============================================================

const getStoragePathFromPublicUrl = (url) => {
  if (!url) return null;

  try {
    const marker = "/storage/v1/object/public/post-media/";
    const index = url.indexOf(marker);

    if (index === -1) return null;

    return decodeURIComponent(
      url.substring(index + marker.length)
    );
  } catch (error) {
    console.error("Could not extract storage path:", error);
    return null;
  }
};

// ============================================================
// POST CARD
// ============================================================

const PostCard = ({
  post,
  currentUserId,
  onPostUpdated = () => {},
  onPostDeleted = () => {},
}) => {
  // ----------------------------------------------------------
  // LIKE STATES
  // ----------------------------------------------------------

  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [liking, setLiking] = useState(false);

  // ----------------------------------------------------------
  // COMMENT STATES
  // ----------------------------------------------------------

  const [showComments, setShowComments] = useState(false);
  const [commentCount, setCommentCount] = useState(0);

  // ----------------------------------------------------------
  // MENU STATES
  // ----------------------------------------------------------

  const [showMenu, setShowMenu] = useState(false);

  // ----------------------------------------------------------
  // EDIT STATES
  // ----------------------------------------------------------

  const [showEditModal, setShowEditModal] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState("");

  const [editMediaFile, setEditMediaFile] = useState(null);
  const [editMediaPreview, setEditMediaPreview] = useState(null);
  const [removeEditMedia, setRemoveEditMedia] = useState(false);

  const previewUrlRef = useRef(null);

  // ----------------------------------------------------------
  // REPORT STATES
  // ----------------------------------------------------------

  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportDescription, setReportDescription] = useState("");
  const [reporting, setReporting] = useState(false);
  const [reportMessage, setReportMessage] = useState("");
  const [reportSuccess, setReportSuccess] = useState(false);

  const reportCloseTimerRef = useRef(null);

  // ----------------------------------------------------------
  // POST OWNERSHIP
  // ----------------------------------------------------------

  const isOwner = post.author_id === currentUserId;

  // ----------------------------------------------------------
  // EDIT PERMISSION
  // ----------------------------------------------------------

  const canEditPost = () => {
    if (!isOwner || post.is_deleted) return false;

    const createdAt = new Date(post.created_at).getTime();

    if (!Number.isFinite(createdAt)) return false;

    const elapsed = Date.now() - createdAt;

    return elapsed >= 0 && elapsed <= EDIT_WINDOW_MS;
  };

  // ----------------------------------------------------------
  // CLEANUP
  // ----------------------------------------------------------

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        URL.revokeObjectURL(previewUrlRef.current);
      }

      if (reportCloseTimerRef.current) {
        clearTimeout(reportCloseTimerRef.current);
      }
    };
  }, []);

  // ----------------------------------------------------------
  // LOAD LIKES
  // ----------------------------------------------------------

  useEffect(() => {
    let cancelled = false;

    const loadLikes = async () => {
      try {
        const {
          count,
          error: countError,
        } = await supabase
          .from("likes")
          .select("*", {
            count: "exact",
            head: true,
          })
          .eq("post_id", post.id);

        if (countError) throw countError;

        if (!cancelled) {
          setLikeCount(count || 0);
        }

        if (currentUserId) {
          const {
            data,
            error,
          } = await supabase
            .from("likes")
            .select("id")
            .eq("post_id", post.id)
            .eq("user_id", currentUserId)
            .maybeSingle();

          if (error) throw error;

          if (!cancelled) {
            setIsLiked(Boolean(data));
          }
        } else if (!cancelled) {
          setIsLiked(false);
        }
      } catch (error) {
        console.error("Error loading likes:", error);
      }
    };

    loadLikes();

    return () => {
      cancelled = true;
    };
  }, [post.id, currentUserId]);

  // ----------------------------------------------------------
  // LOAD COMMENT COUNT
  // ----------------------------------------------------------

  const loadCommentCount = async () => {
    try {
      const {
        count,
        error,
      } = await supabase
        .from("comments")
        .select("*", {
          count: "exact",
          head: true,
        })
        .eq("post_id", post.id)
        .eq("is_deleted", false);

      if (error) throw error;

      setCommentCount(count || 0);
    } catch (error) {
      console.error("Error loading comment count:", error);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const loadCount = async () => {
      try {
        const {
          count,
          error,
        } = await supabase
          .from("comments")
          .select("*", {
            count: "exact",
            head: true,
          })
          .eq("post_id", post.id)
          .eq("is_deleted", false);

        if (error) throw error;

        if (!cancelled) {
          setCommentCount(count || 0);
        }
      } catch (error) {
        console.error("Error loading comment count:", error);
      }
    };

    loadCount();

    return () => {
      cancelled = true;
    };
  }, [post.id]);

  // ----------------------------------------------------------
  // COMMENT COUNT CALLBACK
  // ----------------------------------------------------------

  const handleCommentCountChange = (change) => {
    if (typeof change === "number" && change > 1) {
      setCommentCount(change);
      return;
    }

    if (change === 1 || change === -1) {
      setCommentCount((previous) =>
        Math.max(previous + change, 0)
      );

      return;
    }

    loadCommentCount();
  };

  // ----------------------------------------------------------
  // LIKE / UNLIKE
  // ----------------------------------------------------------

  const handleLike = async () => {
    if (!currentUserId || liking) return;

    setLiking(true);

    try {
      if (isLiked) {
        const { error } = await supabase
          .from("likes")
          .delete()
          .eq("post_id", post.id)
          .eq("user_id", currentUserId);

        if (error) throw error;

        setIsLiked(false);

        setLikeCount((previous) =>
          Math.max(previous - 1, 0)
        );
      } else {
        const { error } = await supabase
          .from("likes")
          .insert({
            post_id: post.id,
            user_id: currentUserId,
          });

        if (error) throw error;

        setIsLiked(true);
        setLikeCount((previous) => previous + 1);
      }
    } catch (error) {
      console.error("Like error:", error);
      alert(error.message || "Unable to update like.");
    } finally {
      setLiking(false);
    }
  };

  // ----------------------------------------------------------
  // OPEN EDIT MODAL
  // ----------------------------------------------------------

  const handleOpenEdit = () => {
    if (!canEditPost()) {
      setShowMenu(false);

      alert(
        `Posts can only be edited within ${EDIT_WINDOW_MINUTES} minutes of creation.`
      );

      return;
    }

    setEditContent(post.content || "");
    setEditMediaFile(null);
    setEditMediaPreview(null);
    setRemoveEditMedia(false);
    setEditError("");
    setShowMenu(false);
    setShowEditModal(true);
  };

  // ----------------------------------------------------------
  // REMOVE PREVIEW
  // ----------------------------------------------------------

  const clearMediaPreview = () => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }

    setEditMediaFile(null);
    setEditMediaPreview(null);
  };

  // ----------------------------------------------------------
  // SELECT NEW IMAGE OR VIDEO
  // ----------------------------------------------------------

  const handleEditMediaChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    // Allow selecting the same file again.
    event.target.value = "";

    const allowedImageTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/gif",
    ];

    const allowedVideoTypes = [
      "video/mp4",
      "video/webm",
      "video/quicktime",
    ];

    const isImage = allowedImageTypes.includes(file.type);
    const isVideo = allowedVideoTypes.includes(file.type);

    if (!isImage && !isVideo) {
      setEditError(
        "Please select a JPG, PNG, WEBP or GIF image, or an MP4, WEBM or MOV video."
      );

      return;
    }

    if (isImage && file.size > 10 * 1024 * 1024) {
      setEditError("Images must be smaller than 10 MB.");
      return;
    }

    if (isVideo && file.size > 100 * 1024 * 1024) {
      setEditError("Videos must be smaller than 100 MB.");
      return;
    }

    clearMediaPreview();

    const previewUrl = URL.createObjectURL(file);

    previewUrlRef.current = previewUrl;

    setEditMediaFile(file);
    setEditMediaPreview(previewUrl);
    setRemoveEditMedia(false);
    setEditError("");
  };

  // ----------------------------------------------------------
  // CLOSE EDIT MODAL
  // ----------------------------------------------------------

  const handleCloseEdit = () => {
    if (savingEdit) return;

    clearMediaPreview();

    setShowEditModal(false);
    setEditContent("");
    setRemoveEditMedia(false);
    setEditError("");
  };

  // ----------------------------------------------------------
  // SAVE EDITED POST
  // ----------------------------------------------------------

  const handleSaveEdit = async (event) => {
    event.preventDefault();

    if (!isOwner) {
      setEditError("You can only edit your own posts.");
      return;
    }

    if (!canEditPost()) {
      setEditError("The 15-minute editing period has expired.");
      return;
    }

    const cleanedContent = editContent.trim();

    const existingMediaStillExists = Boolean(
      post.media_url && !removeEditMedia
    );

    const newMediaSelected = Boolean(editMediaFile);

    if (
      !cleanedContent &&
      !existingMediaStillExists &&
      !newMediaSelected
    ) {
      setEditError(
        "Your post must contain text, an image, or a video."
      );

      return;
    }

    setSavingEdit(true);
    setEditError("");

    let uploadedMediaPath = null;

    try {
      let newMediaUrl = null;
      let newMediaType = null;

      if (editMediaFile) {
        newMediaType = editMediaFile.type.startsWith("image/")
          ? "image"
          : "video";

        const fileExtension =
          editMediaFile.name
            .split(".")
            .pop()
            ?.toLowerCase() || "file";

        const fileName =
          `${crypto.randomUUID()}.${fileExtension}`;

        uploadedMediaPath =
          `${currentUserId}/${fileName}`;

        const { error: uploadError } =
          await supabase.storage
            .from("post-media")
            .upload(
              uploadedMediaPath,
              editMediaFile,
              {
                cacheControl: "3600",
                upsert: false,
                contentType: editMediaFile.type,
              }
            );

        if (uploadError) throw uploadError;

        const { data: publicUrlData } =
          supabase.storage
            .from("post-media")
            .getPublicUrl(uploadedMediaPath);

        newMediaUrl = publicUrlData.publicUrl;
      }

      let finalMediaUrl = post.media_url || null;
      let finalMediaType = post.media_type || null;

      if (editMediaFile) {
        finalMediaUrl = newMediaUrl;
        finalMediaType = newMediaType;
      }

      if (removeEditMedia && !editMediaFile) {
        finalMediaUrl = null;
        finalMediaType = null;
      }

      const {
        data,
        error: updateError,
      } = await supabase
        .from("posts")
        .update({
          content: cleanedContent || null,
          media_url: finalMediaUrl,
          media_type: finalMediaType,
          edited_at: new Date().toISOString(),
        })
        .eq("id", post.id)
        .eq("author_id", currentUserId)
        .select()
        .single();

      if (updateError) throw updateError;

      // Delete the old media only after the post update succeeds.
      if (
        post.media_url &&
        (editMediaFile || removeEditMedia)
      ) {
        const oldMediaPath =
          getStoragePathFromPublicUrl(post.media_url);

        if (oldMediaPath) {
          const { error: removeError } =
            await supabase.storage
              .from("post-media")
              .remove([oldMediaPath]);

          if (removeError) {
            console.warn(
              "Old media could not be removed:",
              removeError
            );
          }
        }
      }

      if (data) {
        onPostUpdated(data);
      }

      clearMediaPreview();

      setShowEditModal(false);
      setEditContent("");
      setRemoveEditMedia(false);
      setEditError("");

      alert("Post updated successfully.");
    } catch (error) {
      console.error("Edit post error:", error);

      // Remove a newly uploaded file if the database update fails.
      if (uploadedMediaPath) {
        const { error: cleanupError } =
          await supabase.storage
            .from("post-media")
            .remove([uploadedMediaPath]);

        if (cleanupError) {
          console.warn(
            "Uploaded media cleanup failed:",
            cleanupError
          );
        }
      }

      setEditError(
        error.message || "Unable to update your post."
      );
    } finally {
      setSavingEdit(false);
    }
  };

  // ----------------------------------------------------------
  // DELETE POST
  // ----------------------------------------------------------

  const handleDelete = async () => {
    setShowMenu(false);

    const confirmed = window.confirm(
      "Are you sure you want to delete this post?"
    );

    if (!confirmed) return;

    try {
      const {
        data,
        error,
      } = await supabase
        .from("posts")
        .update({
          is_deleted: true,
        })
        .eq("id", post.id)
        .eq("author_id", currentUserId)
        .select()
        .single();

      if (error) throw error;

      onPostDeleted(post.id, data);

      alert("Post deleted successfully.");
    } catch (error) {
      console.error("Delete post error:", error);

      alert(
        error.message || "Unable to delete post."
      );
    }
  };

  // ----------------------------------------------------------
  // SHARE POST
  // ----------------------------------------------------------

  const handleShare = async () => {
    const postUrl =
      `${window.location.origin}/post/${post.id}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: "University Social",
          text: "Check out this post.",
          url: postUrl,
        });

        return;
      }

      if (navigator.clipboard) {
        await navigator.clipboard.writeText(postUrl);

        alert("Post link copied!");

        return;
      }

      alert(`Post link: ${postUrl}`);
    } catch (error) {
      if (error.name !== "AbortError") {
        console.error("Share error:", error);
      }
    }
  };

  // ----------------------------------------------------------
  // OPEN REPORT MODAL
  // ----------------------------------------------------------

  const handleOpenReport = () => {
    if (isOwner) {
      alert("You cannot report your own post.");
      setShowMenu(false);
      return;
    }

    setShowMenu(false);
    setReportReason("");
    setReportDescription("");
    setReportMessage("");
    setReportSuccess(false);
    setShowReportModal(true);
  };

  // ----------------------------------------------------------
  // CLOSE REPORT MODAL
  // ----------------------------------------------------------

  const handleCloseReport = () => {
    if (reporting) return;

    if (reportCloseTimerRef.current) {
      clearTimeout(reportCloseTimerRef.current);
      reportCloseTimerRef.current = null;
    }

    setShowReportModal(false);
    setReportReason("");
    setReportDescription("");
    setReportMessage("");
    setReportSuccess(false);
  };

  // ----------------------------------------------------------
  // SUBMIT REPORT
  // ----------------------------------------------------------

  const handleSubmitReport = async (event) => {
    event.preventDefault();

    if (!reportReason) {
      setReportMessage("Please select a reason.");
      setReportSuccess(false);
      return;
    }

    if (!currentUserId) {
      setReportMessage("You must be logged in.");
      setReportSuccess(false);
      return;
    }

    if (isOwner) {
      setReportMessage("You cannot report your own post.");
      setReportSuccess(false);
      return;
    }

    setReporting(true);
    setReportMessage("");

    try {
      const { error } = await supabase
        .from("reports")
        .insert({
          reporter_id: currentUserId,
          reported_user_id: post.author_id,
          post_id: post.id,
          reason: reportReason,
          description: reportDescription.trim() || null,
          // status defaults to 'pending' in Supabase.
        });

      if (error) throw error;

      setReportSuccess(true);

      setReportMessage(
        "Thank you. Your report has been submitted."
      );

      reportCloseTimerRef.current = setTimeout(() => {
        setShowReportModal(false);
        setReportMessage("");
        setReportSuccess(false);
        reportCloseTimerRef.current = null;
      }, 1800);
    } catch (error) {
      console.error("Report error:", error);

      setReportSuccess(false);

      setReportMessage(
        error.message || "Unable to submit report."
      );
    } finally {
      setReporting(false);
    }
  };

  // ----------------------------------------------------------
  // RENDER
  // ----------------------------------------------------------

  return (
    <>
      <article className="glass-card overflow-hidden">
        <PostHeader
          post={post}
          isOwner={isOwner}
          canEdit={canEditPost()}
          showMenu={showMenu}
          setShowMenu={setShowMenu}
          onEdit={handleOpenEdit}
          onDelete={handleDelete}
          onReport={handleOpenReport}
        />

        <PostContent post={post} />

        <PostMedia post={post} />

        <PostActions
          isLiked={isLiked}
          likeCount={likeCount}
          commentCount={commentCount}
          liking={liking}
          onLike={handleLike}
          onComment={() => setShowComments(true)}
          onShare={handleShare}
        />
      </article>

      {showEditModal && (
        <EditPostModal
          post={post}
          editContent={editContent}
          setEditContent={setEditContent}
          editMediaFile={editMediaFile}
          editMediaPreview={editMediaPreview}
          removeEditMedia={removeEditMedia}
          setRemoveEditMedia={setRemoveEditMedia}
          editError={editError}
          savingEdit={savingEdit}
          onMediaChange={handleEditMediaChange}
          onRemoveSelection={clearMediaPreview}
          onClose={handleCloseEdit}
          onSubmit={handleSaveEdit}
        />
      )}

      {showComments && (
        <CommentsModal
          postId={post.id}
          currentUserId={currentUserId}
          onCommentCountChange={handleCommentCountChange}
          onClose={() => setShowComments(false)}
        />
      )}

      {showReportModal && (
        <ReportPostModal
          reportReason={reportReason}
          setReportReason={setReportReason}
          reportDescription={reportDescription}
          setReportDescription={setReportDescription}
          reporting={reporting}
          reportMessage={reportMessage}
          reportSuccess={reportSuccess}
          onClose={handleCloseReport}
          onSubmit={handleSubmitReport}
        />
      )}
    </>
  );
};

export default PostCard;
