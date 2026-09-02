import React, {
  useEffect,
  useState,
} from "react";

import {
  Send,
  Trash2,
  X,
} from "lucide-react";

import { supabase } from "../lib/supabase";

/**
 * ============================================================
 * COMMENT SECTION
 * ============================================================
 *
 * This component is displayed as a modal/bottom sheet.
 *
 * It is intentionally NOT placed inside the PostCard.
 *
 * Props:
 *
 * postId
 *    The post whose comments we want to display.
 *
 * currentUserId
 *    The currently authenticated user.
 *
 * onClose
 *    Function used to close the comment window.
 */
const CommentSection = ({
  postId,
  currentUserId,
  onClose,
  onCommentCountChange,
}) => {

  // ----------------------------------------------------------
  // COMMENTS
  // ----------------------------------------------------------

  const [comments, setComments] = useState([]);

  // ----------------------------------------------------------
  // COMMENT INPUT
  // ----------------------------------------------------------

  const [commentText, setCommentText] =
    useState("");

  // ----------------------------------------------------------
  // LOADING
  // ----------------------------------------------------------

  const [loading, setLoading] =
    useState(true);

  // ----------------------------------------------------------
  // SUBMITTING
  // ----------------------------------------------------------

  const [submitting, setSubmitting] =
    useState(false);

  // ----------------------------------------------------------
  // LOAD COMMENTS
  // ----------------------------------------------------------

  const loadComments = async () => {
    setLoading(true);

    try {

      const { data, error } =
        await supabase
          .from("comments")
          .select(`
            id,
            post_id,
            author_id,
            content,
            is_deleted,
            created_at,

            profiles (
              id,
              full_name,
              username,
              avatar_url
            )
          `)
          .eq("post_id", postId)
          .eq("is_deleted", false)
          .order("created_at", {
            ascending: true,
          });

      if (error) {
        throw error;
      }

      setComments(data || []);

    } catch (error) {

      console.error(
        "Error loading comments:",
        error
      );

    } finally {

      setLoading(false);

    }
  };

  // ----------------------------------------------------------
  // LOAD COMMENTS WHEN MODAL OPENS
  // ----------------------------------------------------------

  useEffect(() => {

    if (postId) {
      loadComments();
    }

  }, [postId]);

  // ----------------------------------------------------------
  // PREVENT BODY FROM SCROLLING
  // WHILE COMMENT MODAL IS OPEN
  // ----------------------------------------------------------

  useEffect(() => {

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = "";
    };

  }, []);

  // ----------------------------------------------------------
  // CREATE COMMENT
  // ----------------------------------------------------------

  const handleSubmitComment = async (
    event
  ) => {

    event.preventDefault();

    const trimmedComment =
      commentText.trim();

    // Don't allow empty comments.
    if (!trimmedComment) {
      return;
    }

    // Make sure user is logged in.
    if (!currentUserId) {

      alert(
        "Please log in to comment."
      );

      return;
    }

    // Prevent duplicate submissions.
    if (submitting) {
      return;
    }

    setSubmitting(true);

    try {

      const { data, error } =
        await supabase
          .from("comments")
          .insert({
            post_id: postId,
            author_id: currentUserId,
            content: trimmedComment,
          })
          .select(`
            id,
            post_id,
            author_id,
            content,
            is_deleted,
            created_at,

            profiles (
              id,
              full_name,
              username,
              avatar_url
            )
          `)
          .single();

      if (error) {
        throw error;
      }

      // Add the new comment to the list.
      setComments(
        (previousComments) => [
          ...previousComments,
          data,
        ]
      );

      // Clear input.
      setCommentText("");

      //increasing comment immidiately after comment is submitted

       onCommentCountChange((previousCount) => previousCount + 1);

    } catch (error) {

      console.error(
        "Error creating comment:",
        error
      );

      alert(
        error.message ||
          "Unable to create comment."
      );

    } finally {

      setSubmitting(false);

    }
  };

  // ----------------------------------------------------------
  // DELETE COMMENT
  // ----------------------------------------------------------

  const handleDeleteComment = async (
    commentId
  ) => {

    const confirmed =
      window.confirm(
        "Are you sure you want to delete this comment?"
      );

    if (!confirmed) {
      return;
    }

    try {

      const { error } =
        await supabase
          .from("comments")
          .delete()
          .eq("id", commentId)
          .eq(
            "author_id",
            currentUserId
          );

      if (error) {
        throw error;
      }

      // Remove deleted comment
      // from the local interface.
      setComments(
        (previousComments) =>
          previousComments.filter(
            (comment) =>
              comment.id !== commentId
          )
      );
        onCommentCountChange((previousCount) =>
    Math.max(previousCount - 1, 0))

    } catch (error) {

      console.error(
        "Error deleting comment:",
        error
      );

      alert(
        error.message ||
          "Unable to delete comment."
      );
    }
  };

  // ----------------------------------------------------------
  // CLOSE WHEN CLICKING BACKDROP
  // ----------------------------------------------------------

  const handleBackdropClick = (
    event
  ) => {

    // Only close if the user clicked
    // directly on the backdrop.
    if (
      event.target ===
      event.currentTarget
    ) {
      onClose();
    }
  };

  // ----------------------------------------------------------
  // RENDER
  // ----------------------------------------------------------

  return (

    <div
      className="
        fixed
        inset-0
        z-50
        flex
        items-end
        justify-center
        bg-black/50
        sm:items-center
        sm:p-6
      "
      onClick={handleBackdropClick}
    >

      {/* =====================================================
          COMMENT WINDOW
      ====================================================== */}

      <div
        className="
          flex
          h-[85vh]
          w-full
          flex-col
          overflow-hidden
          rounded-t-3xl
          bg-white
          shadow-2xl

          sm:h-[650px]
          sm:max-h-[85vh]
          sm:max-w-lg
          sm:rounded-3xl
        "
      >

        {/* ==================================================
            HEADER
        ================================================== */}

        <div
          className="
            flex
            shrink-0
            items-center
            justify-between
            border-b
            border-gray-100
            px-5
            py-4
          "
        >

          <h2 className="text-lg font-semibold text-gray-900">
            Comments
          </h2>

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="
              rounded-full
              p-2
              text-gray-600
              transition
              hover:bg-gray-100
            "
            aria-label="Close comments"
          >
            <X size={22} />
          </button>

        </div>

        {/* ==================================================
            COMMENTS LIST
        ================================================== */}

        <div
          className="
            flex-1
            overflow-y-auto
            px-5
            py-4
          "
        >

          {loading ? (

            <div className="flex justify-center py-10">

              <p className="text-sm text-gray-500">
                Loading comments...
              </p>

            </div>

          ) : comments.length === 0 ? (

            <div
              className="
                flex
                h-full
                flex-col
                items-center
                justify-center
                text-center
              "
            >

              <MessageCirclePlaceholder />

              <h3 className="mt-4 font-semibold text-gray-800">
                No comments yet
              </h3>

              <p className="mt-1 text-sm text-gray-500">
                Be the first person to comment.
              </p>

            </div>

          ) : (

            <div className="space-y-5">

              {comments.map(
                (comment) => (

                  <div
                    key={comment.id}
                    className="flex gap-3"
                  >

                    {/* Avatar */}
                    <img
                      src={
                        comment.profiles
                          ?.avatar_url ||
                        "/default-avatar.png"
                      }
                      alt={
                        comment.profiles
                          ?.full_name ||
                        "User"
                      }
                      className="
                        h-10
                        w-10
                        shrink-0
                        rounded-full
                        object-cover
                      "
                    />

                    {/* Comment */}
                    <div className="min-w-0 flex-1">

                      <div
                        className="
                          rounded-2xl
                          bg-gray-100
                          px-4
                          py-3
                        "
                      >

                        <p className="text-sm font-semibold text-gray-900">
                          {comment.profiles
                            ?.full_name ||
                            comment.profiles
                              ?.username ||
                            "User"}
                        </p>

                        <p
                          className="
                            mt-1
                            whitespace-pre-wrap
                            break-words
                            text-sm
                            text-gray-700
                          "
                        >
                          {comment.content}
                        </p>

                      </div>

                      {/* Comment information */}
                      <div
                        className="
                          mt-1
                          flex
                          items-center
                          gap-3
                          px-2
                        "
                      >

                        <span className="text-xs text-gray-400">
                          {new Date(
                            comment.created_at
                          ).toLocaleString()}
                        </span>

                        {/* Delete own comment */}
                        {comment.author_id ===
                          currentUserId && (

                          <button
                            type="button"
                            onClick={() =>
                              handleDeleteComment(
                                comment.id
                              )
                            }
                            className="
                              flex
                              items-center
                              gap-1
                              text-xs
                              text-gray-500
                              hover:text-red-500
                            "
                          >

                            <Trash2
                              size={13}
                            />

                            Delete

                          </button>

                        )}

                      </div>

                    </div>

                  </div>

                )
              )}

            </div>

          )}

        </div>

        {/* ==================================================
            COMMENT INPUT
        ================================================== */}

        <div
          className="
            shrink-0
            border-t
            border-gray-100
            bg-white
            p-4
            mb-11
          "
        >

          <form
            onSubmit={
              handleSubmitComment
            }
            className="
              flex
              items-center
              gap-2
            "
          >

            <input
              type="text"
              value={commentText}
              onChange={(event) =>
                setCommentText(
                  event.target.value
                )
              }
              placeholder="Add a comment..."
              maxLength={1000}
              disabled={submitting}
              autoFocus
              className="
                min-w-0
                flex-1
                rounded-full
                border
                border-gray-200
                bg-gray-50
                px-4
                py-3
                text-sm
                outline-none
                transition
                focus:border-blue-400
                focus:bg-white
              "
            />

            <button
              type="submit"
              disabled={
                submitting ||
                !commentText.trim()
              }
              className="
                flex
                h-11
                w-11
                shrink-0
                items-center
                justify-center
                rounded-full
                bg-blue-600
                text-white
                transition
                hover:bg-blue-700
                disabled:cursor-not-allowed
                disabled:opacity-50
              "
              aria-label="Send comment"
            >

              <Send size={18} />

            </button>

          </form>

        </div>

      </div>

    </div>
  );
};

/**
 * Small placeholder icon used when
 * there are no comments.
 */
const MessageCirclePlaceholder = () => (
  <div
    className="
      flex
      h-16
      w-16
      items-center
      justify-center
      rounded-full
      bg-gray-100
    "
  >
    <span className="text-2xl">
      💬
    </span>
  </div>
);

export default CommentSection;