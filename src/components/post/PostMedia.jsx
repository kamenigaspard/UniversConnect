
import React from "react";

const PostMedia = ({ post }) => {
  if (!post.media_url) return null;

  return (
    <div
      className="mx-4 mb-4 overflow-hidden rounded-xl border theme-border p-1"
      style={{
        background:
          "linear-gradient(135deg, var(--page-bg-secondary), var(--surface-solid))",
      }}
    >
      {post.media_type === "video" ? (
        <video
          src={post.media_url}
          controls
          playsInline
          className="w-full max-h-[400px] rounded-lg object-cover bg-black"
        />
      ) : (
        <img
          src={post.media_url}
          alt="Post media"
          loading="lazy"
          className="w-full max-h-[600px] rounded-lg object-cover shadow-sm transition-transform duration-300 hover:scale-[1.01]"
        />
      )}
    </div>
  );
};

export default PostMedia;
