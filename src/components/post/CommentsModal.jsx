
import React from "react";
import { X } from "lucide-react";
import CommentSection from "../CommentSection";

const CommentsModal = ({
  postId,
  currentUserId,
  onCommentCountChange,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4">
      <div
        className="w-full sm:max-w-lg max-h-[85vh] rounded-t-2xl sm:rounded-2xl overflow-hidden flex flex-col border theme-border"
        style={{ background: "var(--surface-solid)" }}
      >
        <div className="flex items-center justify-between p-4 border-b theme-border">
          <h2 className="font-semibold text-lg text-primary">
            Comments
          </h2>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full text-secondary transition hover:bg-[var(--surface-hover)] hover:text-[var(--accent-strong)]"
            aria-label="Close comments"
          >
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto p-4">
          <CommentSection
            postId={postId}
            currentUserId={currentUserId}
            onCommentCountChange={onCommentCountChange}
            onClose={onClose}
          />
        </div>
      </div>
    </div>
  );
};

export default CommentsModal;
