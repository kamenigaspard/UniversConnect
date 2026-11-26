
import React from "react";

const PostContent = ({ post }) => {
  if (!post.content) return null;

  return (
    <div className="px-4 pb-3">
      <p className="text-primary whitespace-pre-wrap break-words">
        {post.content}
      </p>

      {post.edited_at && (
        <p className="text-xs text-muted mt-2">
          Edited
        </p>
      )}
    </div>
  );
};

export default PostContent;
