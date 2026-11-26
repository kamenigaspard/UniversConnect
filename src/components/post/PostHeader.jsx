
import React, { useEffect, useRef } from "react";
import {
  MoreHorizontal,
  Pencil,
  Trash2,
  Flag,
} from "lucide-react";

const PostHeader = ({
  post,
  isOwner,
  canEdit,
  showMenu,
  setShowMenu,
  onEdit,
  onDelete,
  onReport,
}) => {
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target)
      ) {
        setShowMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [setShowMenu]);

  return (
    <div className="flex items-center justify-between p-4">
      <div className="flex items-center gap-3 min-w-0">
        <img
          src={post.profiles?.avatar_url || "/default-avatar.png"}
          alt={post.profiles?.full_name || "User"}
          className="w-10 h-10 rounded-full object-cover border theme-border"
        />

        <div className="min-w-0">
          <h3 className="font-semibold text-primary truncate">
            {post.profiles?.full_name || "University User"}
          </h3>

          {post.profiles?.username && (
            <p className="text-sm text-secondary truncate">
              @{post.profiles.username}
            </p>
          )}
        </div>
      </div>

      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setShowMenu((previous) => !previous)}
          className="p-2 rounded-full text-secondary transition hover:bg-[var(--surface-hover)] hover:text-[var(--accent-strong)]"
          aria-label="Post options"
          aria-expanded={showMenu}
        >
          <MoreHorizontal size={20} />
        </button>

        {showMenu && (
          <div
            className="absolute right-0 top-11 z-30 w-56 rounded-xl border theme-border shadow-xl overflow-hidden"
            style={{ background: "var(--surface-solid)" }}
          >
            {isOwner ? (
              <>
                {canEdit && (
                  <button
                    type="button"
                    onClick={onEdit}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left text-primary transition hover:bg-[var(--surface-hover)]"
                  >
                    <Pencil
                      size={17}
                      className="text-[var(--accent-strong)]"
                    />

                    <div>
                      <span>Edit post</span>
                      <p className="text-xs text-muted">
                        Available for 15 minutes
                      </p>
                    </div>
                  </button>
                )}

                <button
                  type="button"
                  onClick={onDelete}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left transition hover:bg-[var(--error-bg)]"
                  style={{ color: "var(--error-text)" }}
                >
                  <Trash2 size={17} />
                  <span>Delete post</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={onReport}
                className="w-full flex items-center gap-3 px-4 py-3 text-left text-primary transition hover:bg-[var(--surface-hover)]"
              >
                <Flag
                  size={17}
                  className="text-[var(--accent-strong)]"
                />
                <span>Report post</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default PostHeader;
