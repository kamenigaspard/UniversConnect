import React, { useState } from "react";
import {
  Heart,
  MessageCircle,
  Share2,
  MoreHorizontal,
} from "lucide-react";

import CommentSection from "./CommentSection";


import { supabase } from "../lib/supabase";

const PostCard = ({ post, currentUserId }) => {
  // -------------------------------------------------------
  // LIKE STATE
  // -------------------------------------------------------

  // Store whether the current user has liked this post.
  const [isLiked, setIsLiked] = useState(post.isLiked || false);

  // Store the number of likes.
  const [likeCount, setLikeCount] = useState(post.likeCount || 0);

  // Prevent multiple like requests at the same time.
  const [liking, setLiking] = useState(false);

  // -------------------------------------------------------
  // COMMENT STATE
  // -------------------------------------------------------

  // Controls whether the comments modal is visible.
  // IMPORTANT:
  // The comments are NOT rendered inside the post anymore.
  const [showComments, setShowComments] = useState(false);

  //set a counter for comments

const [commentCount, setCommentCount] =
  useState(post.commentCount || 0);

  // -------------------------------------------------------
  // LIKE / UNLIKE
  // -------------------------------------------------------

  const handleLike = async () => {
    // Make sure the user is logged in.
    if (!currentUserId) {
      alert("Please log in to like a post.");
      return;
    }

    // Prevent duplicate clicks.
    if (liking) return;

    setLiking(true);

    try {
      if (isLiked) {
        // ---------------------------------------------
        // REMOVE LIKE
        // ---------------------------------------------

        const { error } = await supabase
          .from("likes")
          .delete()
          .eq("post_id", post.id)
          .eq("user_id", currentUserId);

        if (error) throw error;

        // Update the UI immediately.
        setIsLiked(false);
        setLikeCount((count) => Math.max(0, count - 1));
      } else {
        // ---------------------------------------------
        // ADD LIKE
        // ---------------------------------------------

        const { error } = await supabase
          .from("likes")
          .insert({
            post_id: post.id,
            user_id: currentUserId,
          });

        if (error) throw error;

        // Update the UI immediately.
        setIsLiked(true);
        setLikeCount((count) => count + 1);
      }
    } catch (error) {
      console.error("Like error:", error);

      alert(
        error.message || "Unable to update like."
      );
    } finally {
      setLiking(false);
    }
  };

  // -------------------------------------------------------
  // OPEN COMMENTS
  // -------------------------------------------------------

  const openComments = () => {
    setShowComments(true);
  };

  // -------------------------------------------------------
  // CLOSE COMMENTS
  // -------------------------------------------------------

  const closeComments = () => {
    setShowComments(false);
  };

  // -------------------------------------------------------
  // POST CARD
  // -------------------------------------------------------

  return (
    <>
      {/* ==================================================
          POST CARD
      ================================================== */}

      <article className="overflow-hidden rounded-2xl bg-white shadow-sm">

        {/* ==================================================
            POST HEADER
        ================================================== */}

        <div className="flex items-center justify-between p-4">

          <div className="flex items-center gap-3">

            {/* User avatar */}
            <img
              src={
                post.profiles?.avatar_url ||
                "/default-avatar.png"
              }
              alt={
                post.profiles?.full_name ||
                "User"
              }
              className="h-11 w-11 rounded-full object-cover"
            />

            {/* User information */}
            <div>
              <h3 className="font-semibold text-gray-900">
                {post.profiles?.full_name ||
                  "Unknown user"}
              </h3>

              <p className="text-xs text-gray-500">
                {post.schools?.name ||
                  "University"}
              </p>
            </div>

          </div>

          {/* Three-dot menu */}
          <button
            type="button"
            className="rounded-full p-2 hover:bg-gray-100"
          >
            <MoreHorizontal size={20} />
          </button>

        </div>

        {/* ==================================================
            POST TEXT
        ================================================== */}

        {post.content && (
          <div className="px-4 pb-3">
            <p className="whitespace-pre-wrap text-gray-800">
              {post.content}
            </p>
          </div>
        )}

        {/* ==================================================
            IMAGE
        ================================================== */}

        {post.media_type === "image" &&
          post.media_url && (
            <img
              src={post.media_url}
              alt="Post"
              className="max-h-[600px] w-full object-cover"
            />
          )}

        {/* ==================================================
            VIDEO
        ================================================== */}

        {post.media_type === "video" &&
          post.media_url && (
            <video
              src={post.media_url}
              controls
              className="max-h-[600px] w-full bg-black"
            />
          )}

        {/* ==================================================
            LIKE COUNT
        ================================================== */}

        <div className="px-4 pt-3">

          <p className="text-sm font-medium text-gray-700">
            {likeCount}{" "}
            {likeCount === 1
              ? "like"
              : "likes"}
          </p>

        </div>

        {/* ==================================================
            ACTION BUTTONS
        ================================================== */}

        <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">

          <div className="flex items-center gap-5">

            {/* ==================================================
                LIKE BUTTON
            ================================================== */}

            <button
              type="button"
              onClick={handleLike}
              disabled={liking}
              className={`flex items-center gap-2 transition ${
                isLiked
                  ? "text-red-500"
                  : "text-gray-600 hover:text-red-500"
              }`}
            >
              <Heart
                size={21}
                fill={
                  isLiked
                    ? "currentColor"
                    : "none"
                }
              />

              <span className="text-sm">
                {isLiked
                  ? "Liked"
                  : "Like"}
              </span>
            </button>

            {/* ==================================================
                COMMENT BUTTON

                IMPORTANT:
                This ONLY opens the comment modal.

                It does NOT place comments inside
                the PostCard.
            ================================================== */}

          <button
            onClick={openComments}
            className="flex items-center gap-2"
          >
            <MessageCircle size={22} />

            <span>
              {commentCount === 0
                ? "Comment"
                : `${commentCount} ${
                    commentCount === 1 ? "comment" : "comments"
                  }`}
            </span>
          </button>

            {/* ==================================================
                SHARE BUTTON
            ================================================== */}

            <button
              type="button"
              className="flex items-center gap-2 text-gray-600 transition hover:text-green-600"
            >
              <Share2 size={21} />

              <span className="text-sm">
                Share
              </span>
            </button>

          </div>

        </div>

      </article>

      {/* ======================================================
          COMMENTS MODAL

          IMPORTANT:
          This is OUTSIDE the <article>.

          Therefore comments cannot increase the height
          of the post card or push other posts downward.
      ======================================================= */}

      {showComments && (
        <CommentSection
          postId={post.id}
          currentUserId={currentUserId}
          onClose={closeComments}
          onCommentCountChange={setCommentCount}
        />
      )}
    </>
  );
};

export default PostCard;