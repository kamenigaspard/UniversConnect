
import React from "react";
import {
  Heart,
  MessageCircle,
  Share2,
} from "lucide-react";

const actionButtonClass =
  "flex items-center gap-2 text-secondary transition duration-200 hover:text-[var(--accent-strong)] active:scale-95 disabled:opacity-50";

const PostActions = ({
  isLiked,
  likeCount,
  commentCount,
  liking,
  onLike,
  onComment,
  onShare,
}) => {
  return (
    <div className="flex items-center px-4 py-3 border-t theme-border">
      <div className="flex items-center gap-5 flex-wrap">
        <button
          type="button"
          onClick={onLike}
          disabled={liking}
          className={actionButtonClass}
          style={{
            color: isLiked ? "var(--accent-pink)" : undefined,
          }}
        >
          <Heart
            size={22}
            fill={isLiked ? "currentColor" : "none"}
          />

          <span>{likeCount}</span>
          <span>Like</span>
        </button>

        <button
          type="button"
          onClick={onComment}
          className={actionButtonClass}
        >
          <MessageCircle size={22} />

          <span>{commentCount}</span>
          <span>Comment</span>
        </button>

        <button
          type="button"
          onClick={onShare}
          className={actionButtonClass}
        >
          <Share2 size={21} />
          <span>Share</span>
        </button>
      </div>
    </div>
  );
};

export default PostActions;
